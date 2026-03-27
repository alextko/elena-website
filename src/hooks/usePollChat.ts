import { useRef, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ChatResponse, PollResponse } from "@/lib/types";

interface PollChatParams {
  message: string;
  session_id: string | null;
  document_keys?: string[];
  patient_info?: Record<string, unknown>;
  prior_assistant_message?: string;
}

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1500;
const POLL_TIMEOUT_MS = 3000; // Abort long-poll after 3s to get tool label updates

export function usePollChat() {
  const activeRequestRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const sendAndPoll = useCallback(
    async (
      params: PollChatParams,
      onToolProgress: (label: string | null) => void,
      onDone: (result: ChatResponse) => void,
      onError: (error: string) => void,
    ) => {
      cancelledRef.current = false;
      let consecutiveFailures = 0;
      let chatRequestId: string | null = null;
      let sessionId: string | null = params.session_id;
      let hitPaywall = false;

      // POST /chat/send to get a chat_request_id
      const sendRequest = async (): Promise<boolean> => {
        try {
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
            return false;
          }

          const data = await sendRes.json();
          chatRequestId = data.chat_request_id;
          sessionId = data.session_id;
          activeRequestRef.current = chatRequestId;
          return true;
        } catch {
          return false;
        }
      };

      // 1. Initial send
      if (!(await sendRequest())) {
        if (hitPaywall) return { session_id: sessionId };

        consecutiveFailures++;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

        if (!(await sendRequest())) {
          if (!chatRequestId && !hitPaywall) {
            onError("Could not reach the server. Please check your connection.");
          }
          return { session_id: sessionId };
        }
      }

      // 2. Poll loop — use short timeouts so tool label updates appear quickly
      while (true) {
        const controller = new AbortController();
        abortRef.current = controller;

        // Auto-abort after POLL_TIMEOUT_MS to break out of the backend's
        // long-poll hold and pick up intermediate tool_label changes.
        const timeout = setTimeout(
          () => controller.abort(),
          POLL_TIMEOUT_MS,
        );

        try {
          const res = await apiFetch(`/chat/poll/${chatRequestId}`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.status === 404) {
            // Server restarted — re-send to get new request ID
            consecutiveFailures++;
            if (consecutiveFailures > MAX_RETRIES) {
              onError("Connection lost after multiple retries. Please try again.");
              break;
            }
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            await sendRequest();
            continue;
          }

          if (!res.ok) {
            throw new Error(`Poll returned ${res.status}`);
          }

          const data: PollResponse = await res.json();
          consecutiveFailures = 0;

          if (data.phase === "completed" && data.result) {
            onDone(data.result);
            break;
          } else if (data.phase === "failed") {
            onError(data.error || "Something went wrong");
            break;
          } else {
            // Still processing — update tool label
            onToolProgress(data.tool_label);
          }
        } catch (err: unknown) {
          clearTimeout(timeout);

          if (err instanceof Error && err.name === "AbortError") {
            if (cancelledRef.current) break; // User cancelled
            continue; // Timeout — re-poll to get fresh tool_label
          }

          consecutiveFailures++;
          if (consecutiveFailures > MAX_RETRIES) {
            onError(
              "Connection lost after multiple retries. Your message is still being processed — please wait a moment and try refreshing.",
            );
            break;
          }

          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }

      activeRequestRef.current = null;
      return { session_id: sessionId };
    },
    [],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    activeRequestRef.current = null;
  }, []);

  return { sendAndPoll, cancel, activeRequestRef };
}
