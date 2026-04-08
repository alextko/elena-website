import { useRef, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ChatResponse, PollResponse } from "@/lib/types";
import { matchDemoResponse } from "@/lib/demo-responses";

interface PollChatParams {
  message: string;
  session_id: string | null;
  document_keys?: string[];
  patient_info?: Record<string, unknown>;
  prior_assistant_message?: string;
}

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1500;
const POLL_INTERVAL_MS = 300; // Brief pause between polls

function log(msg: string, ...args: unknown[]) {
  console.log(`[poll] ${msg}`, ...args);
}

export function usePollChat(demoMode = false) {
  const activeRequestRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const sendAndPoll = useCallback(
    async (
      params: PollChatParams,
      onToolProgress: (label: string | null) => void,
      onDone: (result: ChatResponse) => void,
      onError: (error: string) => void,
      options?: { timeoutMs?: number },
    ) => {
      cancelledRef.current = false;
      let consecutiveFailures = 0;
      let timedOut = false;
      const timeoutHandle = options?.timeoutMs
        ? setTimeout(() => {
            timedOut = true;
            abortRef.current?.abort();
          }, options.timeoutMs)
        : undefined;
      let chatRequestId: string | null = null;
      let sessionId: string | null = params.session_id;
      let hitPaywall = false;
      let pollCount = 0;

      // Demo mode: intercept and return hardcoded response
      if (demoMode) {
        const demoMatch = matchDemoResponse(params.message);
        log("DEMO CHECK", { message: params.message.slice(0, 50), match: demoMatch?.name ?? "none" });
        if (demoMatch) {
          // Simulate tool progress
          onToolProgress(demoMatch.toolLabel);
          await new Promise((r) => setTimeout(r, demoMatch.delay));
          onToolProgress(null);
          // Build a fake ChatResponse
          const fakeResponse: ChatResponse = {
            reply: demoMatch.reply,
            session_id: params.session_id || "demo-session",
            suggestions: demoMatch.suggestions,
            doctor_results: demoMatch.cardFields.doctorResults ?? null,
            bill_analysis: demoMatch.cardFields.billAnalysis ?? null,
            appeal_script: demoMatch.cardFields.appealScript ?? null,
            appeal_status: demoMatch.cardFields.appealStatus ?? null,
            assistance_result: demoMatch.cardFields.assistanceResult ?? null,
            price_comparison_label: demoMatch.cardFields.priceComparisonLabel ?? null,
          };
          onDone(fakeResponse);
          return { session_id: params.session_id };
        }
      }

      // POST /chat/send to get a chat_request_id
      const sendRequest = async (): Promise<boolean> => {
        try {
          log("POST /chat/send", { session_id: sessionId, message: params.message.slice(0, 50) });
          const sendRes = await apiFetch("/chat/send", {
            method: "POST",
            body: JSON.stringify({
              message: params.message,
              session_id: sessionId,
              ...(params.document_keys?.length && {
                document_keys: params.document_keys,
              }),
              ...(params.patient_info && { patient_info: params.patient_info }),
              ...(params.prior_assistant_message && {
                prior_assistant_message: params.prior_assistant_message,
              }),
            }),
          });

          if (!sendRes.ok) {
            log("send failed", { status: sendRes.status });
            return false;
          }

          const data = await sendRes.json();
          chatRequestId = data.chat_request_id;
          sessionId = data.session_id;
          activeRequestRef.current = chatRequestId;
          log("send OK", { chatRequestId, sessionId });
          return true;
        } catch (err) {
          log("send error", err);
          return false;
        }
      };

      // 1. Initial send
      if (!(await sendRequest())) {
        if (hitPaywall) return { session_id: sessionId };

        consecutiveFailures++;
        log("first send failed, retrying in", RETRY_DELAY_MS, "ms");
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

        if (!(await sendRequest())) {
          if (!chatRequestId && !hitPaywall) {
            onError("Could not reach the server. Please check your connection.");
          }
          return { session_id: sessionId };
        }
      }

      // 2. Poll loop — backend returns within ~2s with current state or result
      log("starting poll loop for", chatRequestId);
      while (true) {
        if (cancelledRef.current) {
          log("cancelled");
          break;
        }
        if (timedOut) {
          log("timed out");
          onError("The response took too long. Please try sending your message again.");
          break;
        }

        const controller = new AbortController();
        abortRef.current = controller;
        pollCount++;

        try {
          const res = await apiFetch(`/chat/poll/${chatRequestId}`, {
            signal: controller.signal,
          });

          if (res.status === 404) {
            consecutiveFailures++;
            log("poll 404", { chatRequestId, consecutiveFailures });
            if (consecutiveFailures > 5) {
              onError("Something went wrong. Please try again.");
              break;
            }
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            continue;
          }

          if (!res.ok) {
            log("poll error", { status: res.status });
            throw new Error(`Poll returned ${res.status}`);
          }

          const data: PollResponse = await res.json();
          consecutiveFailures = 0;

          if (data.phase === "completed" && data.result) {
            log("completed", {
              pollCount,
              elapsed: data.elapsed_seconds,
              hasResult: !!data.result,
              errorCode: data.result.error_code,
              gatedFeature: data.result.gated_feature,
            });
            onDone(data.result);
            break;
          } else if (data.phase === "failed") {
            log("failed", { error: data.error, pollCount, elapsed: data.elapsed_seconds });
            onError(data.error || "Something went wrong");
            break;
          } else {
            // Still processing — show tool label and re-poll
            if (data.tool_label) {
              log("tool_label:", data.tool_label, { step: data.tool_step, elapsed: data.elapsed_seconds });
            }
            onToolProgress(data.tool_label);
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            if (cancelledRef.current) break;
            log("aborted, retrying");
            continue;
          }

          consecutiveFailures++;
          log("poll exception", { error: String(err), consecutiveFailures });
          if (consecutiveFailures > MAX_RETRIES) {
            onError("Connection lost. Please try again.");
            break;
          }

          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }

      log("poll loop ended", { pollCount, chatRequestId });
      clearTimeout(timeoutHandle);
      activeRequestRef.current = null;
      return { session_id: sessionId };
    },
    [demoMode],
  );

  const cancel = useCallback(() => {
    log("cancel requested");
    cancelledRef.current = true;
    abortRef.current?.abort();
    activeRequestRef.current = null;
  }, []);

  return { sendAndPoll, cancel, activeRequestRef };
}
