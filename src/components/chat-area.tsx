"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Markdown, stripTrailingIncomplete } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { PanelLeft, Plus, ArrowUp, Square, Paperclip, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";
import { trackPaywallHit, trackActivation } from "@/lib/tracking-events";
import { usePollChat } from "@/hooks/usePollChat";
import { useBookingPoll } from "@/hooks/useBookingPoll";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ReviewsModal } from "@/components/reviews-modal";
import { TrialFlow } from "@/components/paywall/trial-flow";
import { HipaaConsentModal } from "@/components/hipaa-consent-modal";
import { FeedbackModal } from "@/components/feedback-modal";
import {
  DoctorResultsCard,
  LocationResultsCard,
  ReviewsCard,
  NegotiationCard,
  SourcesFooter,
  BookingStatusBubble,
  AppointmentConfirmationCard,
  CallUpdateCard,
  AddToCalendarCard,
  BookingQuestionCard,
  FormRequestCard,
  HealthProfileIntakeCard,
  PriceComparisonCard,
  BillAnalysisCard,
  AppealScriptCard,
  AppealTrackerCard,
  AssistanceProgramsCard,
  InsurancePlanComparisonCard,
  RefillPlanCreatedCard,
  CarePlanCard,
  ScheduledActionCard,
} from "@/components/chat-cards";
import type {
  ChatMessageItem,
  WelcomeResponse,
  ChatResponse,
  DoctorResult,
  LocationResult,
  ReviewResult,
  SourcePayload,
  NegotiationResult,
  BookingResultPayload,
  FormRequest,
  BillAnalysis,
  AppealScript,
  AppealStatus,
  AssistanceResult,
} from "@/lib/types";

type Attachment = {
  name: string;
  key: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  attachments?: Attachment[];
  doctorResults?: DoctorResult[] | null;
  locationResults?: LocationResult[] | null;
  reviewResults?: ReviewResult | null;
  webSources?: SourcePayload[] | null;
  negotiationResult?: NegotiationResult | null;
  bookingResult?: BookingResultPayload | null;
  callResult?: { booking_id?: string; provider_name: string; summary: string; call_type: string } | null;
  formRequest?: FormRequest | null;
  billAnalysis?: BillAnalysis | null;
  appealScript?: AppealScript | null;
  appealStatus?: AppealStatus | null;
  assistanceResult?: AssistanceResult | null;
  priceComparisonLabel?: string | null;
  inviteAccepted?: { accepter_name: string; message: string } | null;
  insurancePlanComparison?: import("@/lib/types").InsurancePlanComparison | null;
  refillPlanCreated?: import("@/components/chat-cards").RefillPlanCreatedPayload | null;
  carePlanShown?: import("@/components/chat-cards").CarePlanShownPayload | null;
  scheduledActionCreated?: import("@/components/chat-cards").ScheduledActionCreatedPayload | null;
  needsHipaaConsent?: boolean;
};

// Streaming text — reveals character by character, snapping to word boundaries.
// The underlying content is already complete (backend is poll-based, not SSE);
// this is a cosmetic typing animation.
function StreamingText({ content, onComplete }: { content: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed("");
    setDone(false);

    const timer = setInterval(() => {
      indexRef.current += 3;
      while (indexRef.current < content.length && content[indexRef.current] !== " " && content[indexRef.current] !== "\n") {
        indexRef.current++;
      }
      if (indexRef.current >= content.length) {
        setDisplayed(content);
        setDone(true);
        onCompleteRef.current?.();
        clearInterval(timer);
      } else {
        setDisplayed(content.slice(0, indexRef.current));
      }
    }, 20);

    return () => clearInterval(timer);
  }, [content]);

  const safe = useMemo(() => (done ? displayed : stripTrailingIncomplete(displayed)), [displayed, done]);

  return (
    <div className={done ? undefined : "elena-streaming-cursor"}>
      <Markdown content={safe} />
    </div>
  );
}

const THINKING_MESSAGES = [
  "Thinking...",
  "Looking into it...",
  "Let me check...",
  "Working on it...",
  "On it...",
  "One moment...",
  "Pulling that up...",
  "Reviewing your info...",
];

function ThinkingIndicator({ toolLabel }: { toolLabel: string | null }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * THINKING_MESSAGES.length));

  useEffect(() => {
    if (toolLabel) return;
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [toolLabel]);

  // Reset to random message when indicator first appears
  useEffect(() => {
    setIdx(Math.floor(Math.random() * THINKING_MESSAGES.length));
  }, []);

  const label = toolLabel || THINKING_MESSAGES[idx];

  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2 w-2 rounded-full bg-[#0F1B3D]/30 animate-thinking-pulse flex-shrink-0" />
      <span className="text-[15px] font-semibold text-[#0F1B3D]/40">
        {label}
      </span>
    </div>
  );
}

export function ChatArea({
  onToggleSidebar,
  activeSessionId,
  onSessionCreated,
  initialQuery,
  initialDocName,
  bookMessage,
  onBookMessageConsumed,
  isNewChat,
  demoMode = false,
  autoShowHipaa = false,
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  activeSessionId: string | null;
  onSessionCreated: (id: string, firstMessage?: string) => void;
  initialQuery?: string | null;
  initialDocName?: string | null;
  bookMessage?: string | null;
  onBookMessageConsumed?: () => void;
  isNewChat?: boolean;
  demoMode?: boolean;
  autoShowHipaa?: boolean;
}) {
  const { user, profileId, profileData, profiles, subscription, refreshInsurance, refreshTodos, refreshVisits, refreshDoctors } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const streamingIdRef = useRef<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolLabel, setToolLabel] = useState<string | null>(null);
  const [welcomeHeading, setWelcomeHeading] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  useEffect(() => { streamingIdRef.current = streamingId; }, [streamingId]);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<{ file: File; key: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"upgrade_required" | "limit_reached" | "feature_blocked" | "document_limit" | "soft">("document_limit");
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined);
  // Post-seed tour paywall: the review modal precedes the trial flow
  // (4-screen Cal-AI-style funnel) and fires on the first real value-moment
  // Elena delivers (booking_id, bill_analysis, appeal_script, etc., or a
  // successful todo creation). One-shot: consumes the sessionStorage gate flag.
  const [reviewsOpen, setReviewsOpen] = useState(false);
  // TrialFlow step state. null = closed. Reviews → 1 → 2 → 3 → Stripe checkout.
  const [trialStep, setTrialStep] = useState<1 | 2 | 3 | null>(null);
  const [hipaaConsentOpen, setHipaaConsentOpen] = useState(false);
  // Monotonic marker that bumps each time HIPAA is signed. Passed to every
  // FormRequestCard so any form with a hipaa_consent field can detect the
  // signature, mark the field "signed," and auto-submit.
  const [hipaaSignedAt, setHipaaSignedAt] = useState<number>(0);

  // Auto-open HIPAA consent modal via ?hipaa=1 URL param
  useEffect(() => {
    if (autoShowHipaa) {
      // Small delay to ensure the modal renders after hydration
      const t = setTimeout(() => setHipaaConsentOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [autoShowHipaa]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [softPaywallOpen, setSoftPaywallOpen] = useState(false);
  const userMessageCountRef = useRef(0);
  // Counts ONLY user-typed sends (excludes the auto-sent seed from the
  // tour handoff). When the post-seed tour gate is armed, hitting the
  // 2nd typed send opens reviews → upgrade. Turn-count-based because
  // response-signal triggers (booking_id / bill_analysis / todo_created)
  // were unreliable — they only fire when Elena actually runs a gated
  // tool, which many seeded actions don't.
  const userTypedCountRef = useRef(0);

  // Soft paywall: show upgrade modal once on first value-moment action (free users)
  const triggerSoftPaywall = useCallback(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("elena_soft_paywall_shown")) return;
    // Check if user is paid (subscription data from auth context)
    // For now, always trigger for all users — the upgrade modal handles plan checks
    localStorage.setItem("elena_soft_paywall_shown", "1");
    analytics.track("Soft Paywall Triggered");
    setTimeout(() => setSoftPaywallOpen(true), 2000);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sessionIdRef = useRef<string | null>(null);
  const hasCreatedSessionRef = useRef(false);
  // Prevents StrictMode / effect re-runs from spawning duplicate welcome sessions.
  // Reset when the dispatch effect transitions to an existing session so the next
  // genuine "new chat" transition can fetch again.
  const welcomeInFlightRef = useRef(false);
  const initialQuerySentRef = useRef(false);
  // Tracks the last string we auto-sent. When initialQuery changes to
  // a *new* value (e.g. tour's onSeedQuery callback fires a second
  // pending-query after the landing one was already consumed), we need
  // to reset the sent/sending guards so the new seed can still reach
  // Elena. Without this, the stuck flags silently swallow the seed.
  const lastAutoSentQuery = useRef<string | null>(null);
  // Ref mirror of the initialQuery prop so flushPendingSeed (called from
  // fetchWelcome and other non-effect contexts) always sees the latest
  // value without depending on render / effect order.
  const initialQueryRef = useRef(initialQuery);
  useEffect(() => { initialQueryRef.current = initialQuery; }, [initialQuery]);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const { sendAndPoll, cancel } = usePollChat(demoMode);
  const booking = useBookingPoll();
  const msgIdCounter = useRef(0);
  const msgIdMountToken = useRef(Date.now().toString(36));

  const nextId = () => {
    msgIdCounter.current++;
    return `msg-${msgIdMountToken.current}-${msgIdCounter.current}`;
  };

  // Form-presence sentinel. When the backend emits a form_request, we
  // start a timer and verify the card actually landed in the DOM within
  // 2s. If it didn't, we've got a silent render bug — emit a loud
  // console.error AND an analytics event so we can see aggregate rates
  // and correlate to the agent's next turn. 2s is generous enough to
  // cover the streaming-text animation (~1s for typical replies) and
  // the raf scheduling inside the card's mount effect.
  const scheduleFormPresenceCheck = (formId?: string, saveTo?: string, msgId?: string) => {
    if (!formId || typeof window === "undefined") return;
    const deadline = 2500;
    const timer = window.setTimeout(() => {
      const el = document.querySelector(`[data-form-id="${formId}"]`);
      if (!el) {
        const diag = {
          form_id: formId, save_to: saveTo, msg_id: msgId,
          messages_count: messagesRef.current.length,
          msg_has_form: messagesRef.current.some((m) => m.formRequest?.form_id === formId),
          streaming_id: streamingIdRef.current,
          timestamp: Date.now(),
        };
        console.error("[form-debug] 5/5 FORM MISSING FROM DOM after 2.5s — render bug", diag);
        analytics.track("Form Missing From DOM", diag);
        return;
      }
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0
        && style.display !== "none" && style.visibility !== "hidden"
        && parseFloat(style.opacity) > 0;
      if (!visible) {
        const diag = {
          form_id: formId, save_to: saveTo, msg_id: msgId,
          width: rect.width, height: rect.height, display: style.display,
          visibility: style.visibility, opacity: style.opacity,
        };
        console.error("[form-debug] 5/5 FORM IN DOM BUT INVISIBLE after 2.5s", diag);
        analytics.track("Form Invisible In DOM", diag);
      } else {
        console.log("[form-debug] 5/5 form sentinel OK — form is in DOM and visible", {
          form_id: formId, save_to: saveTo, width: rect.width, height: rect.height,
        });
      }
    }, deadline);
    return () => window.clearTimeout(timer);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolLabel, isLoading]);

  // Persist messages to sessionStorage so they survive refresh and SPA navigation
  useEffect(() => {
    const sid = sessionIdRef.current;
    if (!sid || messages.length === 0 || streamingId || isLoading) return;
    try {
      sessionStorage.setItem(`elena_msgs_${sid}`, JSON.stringify(messages));
    } catch {}
  }, [messages, streamingId, isLoading]);

  // Load session or welcome when activeSessionId, isNewChat, or profileId changes.
  // profileId is included so switching profiles forces a full session reload.
  const loadRequestRef = useRef(0);
  const prevProfileIdRef = useRef(profileId);

  useEffect(() => {
    const prevId = prevProfileIdRef.current;
    prevProfileIdRef.current = profileId;
    // Only treat as a real profile change if switching from one profile to another
    // (not the initial null → value load which happens on every refresh)
    const profileChanged = !!(prevId && profileId && prevId !== profileId);

    console.log("[chat-area] session effect:", { profileChanged, activeSessionId, isNewChat, profileId, sessionId: sessionIdRef.current, msgCount: messages.length, isLoading });

    // If ChatArea already created this session (first message just sent),
    // skip reloading — UNLESS the profile changed, which requires a full reset.
    if (!profileChanged && activeSessionId && sessionIdRef.current === activeSessionId) {
      console.log("[chat-area] skip: session already matches");
      return;
    }

    // If the profile changed but we already have a session in progress (e.g.
    // initial query sent during onboarding), keep it. The session may have
    // messages already, or the query may still be loading.
    const existingSession = sessionIdRef.current || activeSessionId;
    if (profileChanged && existingSession) {
      console.log("[chat-area] profile changed, keeping existing session:", existingSession);
      // The session was already created by the initial query — link it to the new profile
      if (profileId) {
        apiFetch(`/chat/sessions/${existingSession}/link-profile`, {
          method: "POST",
          body: JSON.stringify({ profile_id: profileId }),
        }).catch(() => {});
      }
      return;
    }

    console.log("[chat-area] resetting chat state");
    cancel();
    setMessages([]);
    setSuggestions([]);
    setIsLoading(false);
    setToolLabel(null);
    setWelcomeHeading(null);
    setWelcomeMessage(null);
    setStreamingId(null);
    setChatTitle(null);
    setLoadError(null);
    setPendingFiles([]);
    hasCreatedSessionRef.current = false;
    setSessionReady(false);
    sessionIdRef.current = null;
    // Reset the welcome-in-flight guard so a genuine session transition
    // (new chat button, profile switch) can fetch a fresh welcome. StrictMode
    // double-invokes this effect on mount but the guard inside fetchWelcome
    // still prevents the second call from actually hitting the backend.
    welcomeInFlightRef.current = false;

    // Increment request ID so stale fetches are ignored
    const requestId = ++loadRequestRef.current;

    if (activeSessionId) {
      console.log("[chat-area] loading existing session:", activeSessionId);
      // Keep loadingMessages true — loadMessages() will manage it from here
      setLoadingMessages(true);
      // Load existing session messages
      sessionIdRef.current = activeSessionId;
      // Landing on an existing session counts as completing the current welcome
      // cycle — future transitions back to a new chat are free to fetch again.
      welcomeInFlightRef.current = false;
      setSessionReady(true);
      loadMessages(activeSessionId, requestId);
      // Eager seed flush — the existing-session path never calls
      // fetchWelcome, so the only trigger for the seed is the auto-send
      // effect. When post-tour handoff sets pendingQuery after this
      // effect already fired, the initialQuery-dep re-run might race
      // with handleSendRef assignment; call directly here and with a
      // short retry to cover both orderings.
      queueMicrotask(() => flushPendingSeedRef.current("loadMessages"));
      setTimeout(() => flushPendingSeedRef.current("loadMessages-delayed"), 80);
    } else if (isNewChat || profileChanged) {
      const pending = initialQuery || localStorage.getItem("elena_pending_query");
      console.log("[chat-area] fetching welcome, silent:", !!pending, "isNewChat:", isNewChat, "profileChanged:", profileChanged);
      setLoadingMessages(false);
      // Start a fresh welcome session for the active profile
      fetchWelcome(!!pending);
    } else if (initialQuery || (typeof window !== "undefined" && localStorage.getItem("elena_pending_query") && sessionStorage.getItem("elena_tour_post_seed_gate") === "1")) {
      // Seed is waiting but no session exists yet and no explicit
      // "new chat" signal has been raised. Fetch welcome eagerly so
      // the seed can actually land. This is the tour's "self"
      // handoff case: the user went through the whole tour without
      // switching profiles, so no fetchWelcome was ever triggered
      // during the tour. Without this branch the auto-send effect
      // spins forever with sessionId=null.
      console.log("[chat-area] eager welcome fetch for pending seed (no session yet)");
      setLoadingMessages(false);
      fetchWelcome(true);
    } else {
      console.log("[chat-area] no action — waiting for sessions to load");
      setLoadingMessages(false);
    }
    // When activeSessionId is null and isNewChat is false, we're still loading
    // sessions — don't create a new welcome session yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, isNewChat, profileId]);

  async function loadMessages(sessionId: string, requestId: number) {
    setLoadingMessages(true);
    setLoadError(null);

    // Show cached messages instantly while the network request is in flight
    try {
      const cached = sessionStorage.getItem(`elena_msgs_${sessionId}`);
      if (cached) {
        const parsed: Message[] = JSON.parse(cached);
        if (parsed.length > 0 && loadRequestRef.current === requestId) {
          setMessages(parsed);
          setLoadingMessages(false);
        }
      }
    } catch {}

    try {
      const res = await apiFetch(`/chat/${sessionId}/messages`);
      // Ignore stale responses if the user switched sessions while this was in-flight
      if (loadRequestRef.current !== requestId) return;
      if (!res.ok) {
        setLoadError("Couldn\u2019t load messages. Tap to retry.");
        setLoadingMessages(false);
        return;
      }
      const data: ChatMessageItem[] = await res.json();
      if (loadRequestRef.current !== requestId) return;
      const raw: Message[] = data
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: nextId(),
          role: m.role as "user" | "assistant",
          content: m.text,
          doctorResults: m.doctor_results,
          locationResults: m.location_results,
          reviewResults: m.review_results,
          negotiationResult: m.negotiation_result,
          bookingResult: m.booking_result ?? undefined,
          callResult: m.call_result ?? undefined,
          webSources: m.web_sources,
          formRequest: m.form_request,
          billAnalysis: m.bill_analysis,
          appealScript: m.appeal_script,
          appealStatus: m.appeal_status,
          assistanceResult: m.assistance_result,
          priceComparisonLabel: m.price_comparison_label,
          inviteAccepted: m.invite_accepted ? { accepter_name: m.invite_accepted.accepter_name, message: m.text } : undefined,
          insurancePlanComparison: m.insurance_plan_comparison,
        }));
      // Form-request diagnostic for replayed history. Same payload
      // shape as the live-response log — so a refresh mid-debug still
      // shows whether forms were stored in chat_messages.
      raw.forEach((m) => {
        if (m.formRequest) {
          const fr = m.formRequest as unknown as { form_id?: string; save_to?: string; title?: string; fields?: Array<{ key: string; type: string }> };
          console.log("[form-debug] form_request (history)", {
            form_id: fr.form_id,
            save_to: fr.save_to,
            title: fr.title,
            field_count: fr.fields?.length || 0,
            field_types: (fr.fields || []).map((f) => `${f.key}:${f.type}`),
          });
        }
      });
      // Deduplicate consecutive identical user messages (from retries after errors)
      const mapped = raw.filter((m, i) => {
        if (i === 0 || m.role !== "user") return true;
        const prev = raw[i - 1];
        return !(prev.role === "user" && prev.content === m.content);
      });
      setMessages(mapped);
      // Empty session — show welcome screen rather than leaving the page blank.
      // Mark ready so the auto-send effect can fire when there's a claimed
      // pre-auth message waiting (claim flow passes us an empty pre-created session).
      if (mapped.length === 0) {
        setWelcomeHeading("What can I help you with?");
        setSuggestions(["What can you help me with?", "Find a cheaper pharmacy", "Help with my insurance"]);
        setLoadingMessages(false);
        setSessionReady(true);
        return;
      }
      // Set title from first user message
      const firstUser = data.find((m) => m.role === "user");
      if (firstUser) setChatTitle(firstUser.text.slice(0, 60));
      // Set contextual follow-up suggestions based on conversation content
      if (mapped.length > 0) {
        setSuggestions(["What else can you help with?", "Tell me more", "What should I do next?"]);
      }
      // Recovery: last message is from the user, meaning the assistant response
      // never arrived (e.g. page was refreshed mid-generation). Re-attach to the
      // in-flight backend request (or restart it if the backend also died).
      const lastMsg = mapped[mapped.length - 1];
      if (lastMsg?.role === "user") {
        setIsLoading(true);
        setLoadingMessages(false);
        sendAndPoll(
          { message: lastMsg.content, session_id: sessionId },
          (label) => setToolLabel(label),
          (chatResult: ChatResponse) => {
            const assistantId = nextId();
            setMessages((prev) => [
              ...prev,
              {
                id: assistantId,
                role: "assistant",
                content: chatResult.reply,
                isStreaming: true,
                doctorResults: chatResult.doctor_results,
                locationResults: chatResult.location_results,
                reviewResults: chatResult.review_results,
                webSources: chatResult.web_sources,
                formRequest: chatResult.form_request,
                needsHipaaConsent: !!chatResult.needs_hipaa_consent,
              },
            ]);
            setStreamingId(assistantId);
            setSuggestions(chatResult.suggestions || []);
            setToolLabel(null);
            setIsLoading(false);
            if (chatResult.session_id) sessionIdRef.current = chatResult.session_id;
          },
          (error) => {
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", content: "Sorry, I wasn\u2019t able to finish that response. Please try sending your message again." },
            ]);
            setToolLabel(null);
            setIsLoading(false);
          },
          { timeoutMs: 150_000 }, // 2.5 min — if backend also died, give up gracefully
        );
        return;
      }
    } catch {
      if (loadRequestRef.current === requestId) {
        setLoadError("Connection error. Tap to retry.");
      }
    }
    setLoadingMessages(false);
  }

  const [sessionReady, setSessionReady] = useState(false);

  async function fetchWelcome(silent = false) {
    console.log("[chat-area] fetchWelcome called, silent:", silent);
    // If we already have a live session for this profile, don't create
    // another one — just flush any pending seed against it. This is the
    // belt-and-suspenders guard against the auto-send effect's eager
    // fetch racing with the session effect's fetch.
    if (sessionIdRef.current) {
      console.log("[chat-area] fetchWelcome SKIPPED — session already exists:", sessionIdRef.current);
      flushPendingSeedRef.current?.("fetchWelcome-skip");
      return;
    }
    // Plan A pre-warm: the /onboard flush fires /chat/welcome before
    // redirecting here, stashing the session_id + welcome payload in
    // sessionStorage. Reading it here skips an entire authenticated
    // round-trip and lets the seed auto-send fire immediately on
    // mount instead of waiting for /chat/welcome.
    if (typeof window !== "undefined") {
      try {
        const prewarmRaw = sessionStorage.getItem("elena_prewarmed_welcome");
        if (prewarmRaw) {
          const prewarm = JSON.parse(prewarmRaw) as {
            session_id?: string;
            heading?: string;
            message?: string;
            suggestions?: string[];
          };
          if (prewarm.session_id) {
            console.log("[chat-area] using pre-warmed welcome session:", prewarm.session_id);
            sessionIdRef.current = prewarm.session_id;
            if (!silent) {
              setWelcomeHeading(prewarm.heading || null);
              setWelcomeMessage(prewarm.message || null);
              setSuggestions(prewarm.suggestions || []);
            }
            setSessionReady(true);
            welcomeInFlightRef.current = false;
            // Notify sidebar of the session so it appears in the list.
            if (!hasCreatedSessionRef.current) {
              hasCreatedSessionRef.current = true;
              onSessionCreated(prewarm.session_id, silent ? "New conversation" : undefined);
            }
            try { sessionStorage.removeItem("elena_prewarmed_welcome"); } catch {}
            queueMicrotask(() => flushPendingSeedRef.current("prewarm"));
            return;
          }
        }
      } catch {}
    }
    // In-flight guard. Released on BOTH success and failure below so
    // one failed fetch never permanently locks the component out.
    if (welcomeInFlightRef.current) {
      console.log("[chat-area] fetchWelcome SKIPPED — already in flight");
      return;
    }
    welcomeInFlightRef.current = true;
    setLoadError(null);
    // If the user just finished a post-auth intake funnel (DME / insurance /
    // future funnels), route through the tool-enabled onboarding welcome so the
    // agent's first turn references the intake they just submitted. The intake
    // itself is already persisted by the funnel's own endpoint (e.g. /dme/intake);
    // _build_submissions_context on the backend reads it into the system prompt.
    let justOnboarded = false;
    if (typeof window !== "undefined") {
      const intakeFlag = localStorage.getItem("elena_post_intake_submit");
      if (intakeFlag) {
        justOnboarded = true;
        localStorage.removeItem("elena_post_intake_submit");
      }
    }
    try {
      const res = await apiFetch("/chat/welcome", {
        method: "POST",
        body: JSON.stringify(justOnboarded ? { just_onboarded: true } : {}),
      });
      console.log("[chat-area] fetchWelcome response:", res.status);
      if (!res.ok) {
        console.warn("[chat-area] fetchWelcome failed:", res.status);
        // Fallback — still usable, just no personalized welcome
        setWelcomeHeading("What can I help you with?");
        setSuggestions(["What can you help me with?", "Find a cheaper pharmacy", "Help with my insurance"]);
        // Release the in-flight guard so a retry (eager re-fetch from
        // the auto-send effect when a seed is waiting, or a profile
        // switch) can actually hit the endpoint again. Without this,
        // one failed welcome call permanently locks the component out
        // of session creation and the pending seed hangs forever.
        welcomeInFlightRef.current = false;
        return;
      }
      const data: WelcomeResponse = await res.json();
      console.log("[chat-area] fetchWelcome OK, session_id:", data.session_id);
      if (!silent) {
        setWelcomeHeading(data.heading);
        setWelcomeMessage(data.message);
        setSuggestions(data.suggestions);
        analytics.track("Welcome Screen Shown");
      }
      sessionIdRef.current = data.session_id;
      setSessionReady(true);
      // Release the in-flight guard now that we have a session. Future
      // fetches (profile switch, new chat) get to run. The session-exists
      // guard at the top of fetchWelcome prevents unnecessary duplicates.
      welcomeInFlightRef.current = false;
      // Notify sidebar immediately so the session appears
      if (!hasCreatedSessionRef.current && data.session_id) {
        hasCreatedSessionRef.current = true;
        onSessionCreated(data.session_id, silent ? "New conversation" : undefined);
      }
      // Eager seed flush — don't wait on React effect scheduling.
      // sessionIdRef is set synchronously above; handleSendRef should be
      // assigned by this point (set during the first render). If the
      // refs aren't ready yet (very early mount race), the standard
      // effect-driven path will catch it when sessionReady flips true.
      // Microtask delay lets any pending state flushes settle so
      // handleSend sees up-to-date session state.
      queueMicrotask(() => flushPendingSeedRef.current("fetchWelcome"));
      // Extra safety net — 50ms after welcome lands, try one more time
      // for any case where handleSendRef.current wasn't assigned yet at
      // the microtask point (first render of the chat layout).
      setTimeout(() => flushPendingSeedRef.current("fetchWelcome-delayed"), 50);
    } catch {
      // Fallback -- show generic welcome so the page is never blank
      if (!silent) {
        setWelcomeHeading("What can I help you with?");
        setSuggestions(["What can you help me with?", "Find a cheaper pharmacy", "Help with my insurance"]);
      }
      // See comment on the !res.ok branch above — release the guard on
      // network/parse errors too, so a retry can actually run.
      welcomeInFlightRef.current = false;
    }
  }

  // Auto-send initial query from landing page after session is ready
  const handleSendRef = useRef<(text?: string) => Promise<void>>(undefined);
  const initialQuerySending = useRef(false);

  const initialDocRef = useRef<string | null>(initialDocName ?? null);

  // Sync ref when prop arrives late (useState initializer in parent runs after first render)
  useEffect(() => {
    if (initialDocName && !initialDocRef.current) {
      initialDocRef.current = initialDocName;
    }
  }, [initialDocName]);

  // Single source of truth for seed auto-send. Reads all guards via refs
  // so it can be called from anywhere — the auto-send effect (React
  // lifecycle driven) AND directly at the end of fetchWelcome (synchronous
  // hook into the moment the session actually becomes ready). Belt +
  // suspenders approach: the post-tour seed regressing has been a
  // recurring bug because of the many paths that can race profile switch
  // vs. session creation vs. StrictMode double-invocation. Calling this
  // from multiple observation points makes it robust to any single one
  // of those paths silently misfiring.
  const flushPendingSeed = (source: string) => {
    const state = {
      source,
      sent: initialQuerySentRef.current,
      sending: initialQuerySending.current,
      sessionId: sessionIdRef.current,
      hasHandleSend: !!handleSendRef.current,
      initialQueryRef: !!initialQueryRef.current,
      lastAutoSent: lastAutoSentQuery.current?.slice(0, 30),
    };
    if (initialQuerySentRef.current || initialQuerySending.current) {
      console.log(`[chat-area] flushPendingSeed BLOCKED (already sent/sending)`, state);
      return;
    }
    if (!sessionIdRef.current) {
      console.log(`[chat-area] flushPendingSeed BLOCKED (no sessionId)`, state);
      return;
    }
    if (!handleSendRef.current) {
      console.log(`[chat-area] flushPendingSeed BLOCKED (no handleSend)`, state);
      return;
    }

    let seed = initialQueryRef.current as string | null | undefined;
    let seedSource: "prop" | "stash" | "none" = seed ? "prop" : "none";
    if (!seed && typeof window !== "undefined") {
      try {
        const stashed = localStorage.getItem("elena_pending_query");
        const tourGateFlag = sessionStorage.getItem("elena_tour_post_seed_gate") === "1";
        console.log(`[chat-area] flushPendingSeed stash check`, { stashed: !!stashed, tourGateFlag });
        if (stashed && tourGateFlag) { seed = stashed; seedSource = "stash"; }
      } catch {}
    }
    if (!seed) {
      console.log(`[chat-area] flushPendingSeed BLOCKED (no seed)`, state);
      return;
    }
    if (seed === lastAutoSentQuery.current) {
      console.log(`[chat-area] flushPendingSeed BLOCKED (seed matches lastAutoSent)`, { ...state, seedPreview: seed.slice(0, 40) });
      return;
    }

    console.log(`[chat-area] flushPendingSeed FIRING (source=${source}, seedSource=${seedSource}):`, seed.slice(0, 50));
    initialQuerySending.current = true;
    initialQuerySentRef.current = true;
    lastAutoSentQuery.current = seed;
    try { localStorage.removeItem("elena_pending_query"); } catch {}
    handleSendRef.current(seed);
  };
  const flushPendingSeedRef = useRef(flushPendingSeed);
  flushPendingSeedRef.current = flushPendingSeed;

  useEffect(() => {
    // Reset the sent/sending guards when initialQuery changes to a new
    // value (tour's second-seed handoff, reuse-the-same-chat flow).
    let effectiveSeed = initialQuery;
    if (!effectiveSeed && typeof window !== "undefined") {
      try {
        const stashed = localStorage.getItem("elena_pending_query");
        const tourGateFlag = sessionStorage.getItem("elena_tour_post_seed_gate") === "1";
        if (stashed && tourGateFlag && stashed !== lastAutoSentQuery.current) {
          effectiveSeed = stashed;
        }
      } catch {}
    }
    const isNewQuery = !!effectiveSeed && effectiveSeed !== lastAutoSentQuery.current;
    if (isNewQuery) {
      initialQuerySentRef.current = false;
      initialQuerySending.current = false;
    }
    console.log(
      `[chat-area] auto-send check: hasInitialQuery=${!!initialQuery} fromStash=${!!effectiveSeed && !initialQuery} alreadySent=${initialQuerySentRef.current} sending=${initialQuerySending.current} sessionId=${sessionIdRef.current || "null"} hasHandleSend=${!!handleSendRef.current} sessionReady=${sessionReady} isLoading=${isLoading} isNewQuery=${isNewQuery} seedPreview=${effectiveSeed ? JSON.stringify(effectiveSeed.slice(0, 40)) : "null"}`,
    );
    if (isLoading) return;
    flushPendingSeedRef.current("effect");
    // If we have a seed but no session yet, kick off a welcome fetch
    // eagerly. The session effect only runs when activeSessionId /
    // isNewChat / profileId change — none of which change on the tour's
    // seed handoff. Without this eager fallback, seed arrives after
    // session effect already settled and nothing else triggers fetch.
    if (effectiveSeed && !sessionIdRef.current && !welcomeInFlightRef.current) {
      console.log("[chat-area] auto-send effect: seed waiting but no session — fetching welcome");
      fetchWelcome(true);
    }
  }, [initialQuery, welcomeMessage, sessionReady, isLoading]);

  // Auto-send book message from game plan
  useEffect(() => {
    if (bookMessage && sessionIdRef.current && handleSendRef.current) {
      handleSendRef.current(bookMessage);
      onBookMessageConsumed?.();
    }
  }, [bookMessage, onBookMessageConsumed]);

  // Handle booking completion — add confirmation card + summary as a message
  const bookingCompletedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!booking.status) return;
    const { phase, booking_result: result } = booking.status;
    const id = booking.bookingId;

    // Only process terminal phases once per booking
    if (
      (phase === "completed" || phase === "failed" || phase === "cancelled") &&
      id &&
      bookingCompletedRef.current !== id
    ) {
      bookingCompletedRef.current = id;

      if (phase === "completed") {
        analytics.track("Booking Completed", { booking_id: id });
      } else {
        analytics.track("Booking Failed", { booking_id: id, phase });
      }

      // Add the summary + booking result as an assistant message
      const summaryId = nextId();
      setMessages((prev) => [
        ...prev,
        {
          id: summaryId,
          role: "assistant",
          content: booking.status?.message || "",
          isStreaming: true,
          bookingResult: result || undefined,
        },
      ]);
      setStreamingId(summaryId);

      // Update suggestions if the booking status has them
      if (booking.status?.suggestions) {
        setSuggestions(booking.status.suggestions);
      }
    }
  }, [booking.status, booking.bookingId]);

  // Poll for escalation resolution — when ops resolves via Slack, inject the message live
  const escalatedBookingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!booking.status || !booking.bookingId) return;
    const result = booking.status.booking_result;
    if (result?.status === "escalated" || booking.status.phase === "completed" && result?.status === "escalated") {
      escalatedBookingRef.current = booking.bookingId;
    }
  }, [booking.status, booking.bookingId]);

  useEffect(() => {
    const bid = escalatedBookingRef.current;
    if (!bid || !sessionIdRef.current) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiFetch(`/chat/${sessionIdRef.current}/messages`);
        if (!res.ok) return;
        const msgs: ChatMessageItem[] = await res.json();
        // Look for a resolved escalation message we haven't shown yet
        // Check both booking_result (appointment) and call_result (informational)
        // Only match messages for THIS specific booking
        const resolved = msgs.find(
          (m) => (m.booking_result?.booking_id === bid && m.booking_result?.status !== "escalated") ||
                 (m.call_result?.booking_id === bid)
        );
        if (resolved && (resolved.booking_result || resolved.call_result)) {
          // Check if we already injected this into the UI
          const alreadyShown = messagesRef.current.some(
            (m) => m.bookingResult?.booking_id === bid && m.bookingResult?.status !== "escalated"
          );
          if (!alreadyShown) {
            const newId = nextId();
            setMessages((prev) => [
              ...prev,
              {
                id: newId,
                role: "assistant",
                content: resolved.text || "",
                isStreaming: true,
                bookingResult: resolved.booking_result ?? undefined,
                callResult: resolved.call_result ?? undefined,
              },
            ]);
            setStreamingId(newId);
            escalatedBookingRef.current = null;
            clearInterval(pollInterval);
          }
        }
      } catch {}
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(pollInterval);
  }, [messages]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  function removePendingFile(key: string) {
    setPendingFiles((prev) => prev.filter((f) => f.key !== key));
  }

  const SUPPORTED_EXTENSIONS = new Set([
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif",
  ]);

  function isFileSupported(file: File) {
    const ext = ("." + file.name.split(".").pop()).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) return true;
    if (file.type.startsWith("image/")) return true;
    if (file.type === "application/pdf") return true;
    return false;
  }

  async function uploadFiles(files: File[]) {
    const supported = files.filter(isFileSupported);
    if (supported.length === 0) return;

    // Demo mode: skip S3 upload, use fake keys (check sessionStorage directly as safety net)
    if (demoMode || (typeof window !== "undefined" && sessionStorage.getItem("elena_demo_mode") === "true")) {
      const fakeUploads = supported.map((file) => ({ file, key: `demo-doc-${file.name}` }));
      setPendingFiles((prev) => [...prev, ...fakeUploads]);
      return;
    }

    const sid = sessionIdRef.current || "pending";
    setUploading(true);

    const uploaded: { file: File; key: string }[] = [];
    for (const file of supported) {
      try {
        const urlRes = await apiFetch("/documents/upload-url", {
          method: "POST",
          body: JSON.stringify({ session_id: sid, filename: file.name }),
        });
        // Handle document limit (402)
        if (urlRes.status === 402) {
          setUpgradeReason("document_limit");
          setUpgradeOpen(true);
          trackPaywallHit("document_limit", "upload_document");
          setUploading(false);
          return;
        }
        if (!urlRes.ok) continue;
        const { upload_url, key, content_type, required_headers } = await urlRes.json();
        const headers: Record<string, string> = { "Content-Type": content_type, ...required_headers };
        await fetch(upload_url, { method: "PUT", body: file, headers });
        uploaded.push({ file, key });
      } catch {
        // Skip failed uploads
      }
    }

    if (uploaded.length > 0) {
      analytics.track("File Attached", { count: uploaded.length });
      triggerSoftPaywall();
    }
    setPendingFiles((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDraggingOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  }

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text || input).trim();
      if ((!message && pendingFiles.length === 0) || isLoading) return;

      // Post-seed tour paywall — chat-turn-counter trigger.
      // The auto-send effect fires the tour's seed through this same
      // handleSend, so we skip it via the lastAutoSentQuery comparison;
      // only real user-typed sends bump userTypedCountRef. When the
      // tour gate flag is armed and a free user types their 2nd
      // meaningful message (≥10 chars, so "ok" / "thanks" don't burn
      // the gate), we show the reviews modal → upgrade modal and
      // block the send. Flag is consumed so it only fires once.
      const isAutoSeedSend = !!lastAutoSentQuery.current && message === lastAutoSentQuery.current;
      if (!isAutoSeedSend && message.length > 0) {
        userTypedCountRef.current++;
        const tourGateFlag = typeof window !== "undefined"
          && sessionStorage.getItem("elena_tour_post_seed_gate") === "1";
        const isFreeTier = !(subscription && subscription.tier && subscription.tier !== "free");
        if (
          userTypedCountRef.current === 2
          && tourGateFlag
          && isFreeTier
        ) {
          analytics.track("Tour Post-Seed Paywall Hit" as any, {
            trigger: "second_message",
            message_length: message.length,
          });
          try { sessionStorage.removeItem("elena_tour_post_seed_gate"); } catch {}
          // Soft reason — the user hasn't hit any real quota yet, so the
          // modal reads "Get more out of Elena" rather than "Free limit
          // reached." The reviews modal precedes this, then Continue
          // chains into the upgrade modal carrying this reason.
          setUpgradeReason("soft");
          setReviewsOpen(true);
          return;
        }
      }

      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setSuggestions([]);
      setToolLabel(null);

      // Collect document keys from pending uploads before clearing
      const sentFiles = pendingFiles.map((f) => ({ name: f.file.name, key: f.key }));
      const docKeys = pendingFiles.map((f) => f.key);
      setPendingFiles([]);

      // Inject initial doc from landing page as a fake attachment (check sessionStorage directly)
      const isDemoActive = demoMode || (typeof window !== "undefined" && sessionStorage.getItem("elena_demo_mode") === "true");
      if (initialDocRef.current && isDemoActive) {
        const docName = initialDocRef.current;
        initialDocRef.current = null;
        sentFiles.push({ name: docName, key: `demo-doc-${docName}` });
        docKeys.push(`demo-doc-${docName}`);
      }

      // Promote welcome into the message list so it persists as first message
      const welcomeMsg: typeof messages[number] | null =
        welcomeHeading || welcomeMessage
          ? {
              id: nextId(),
              role: "assistant" as const,
              content: `**${welcomeHeading || ""}**\n\n${welcomeMessage || ""}`.trim(),
            }
          : null;

      // Optimistic user message (with inline attachment indicators)
      const userMsgId = nextId();
      setMessages((prev) => [
        ...(welcomeMsg && prev.length === 0 ? [welcomeMsg] : prev),
        {
          id: userMsgId,
          role: "user",
          content: message,
          attachments: sentFiles.length > 0 ? sentFiles : undefined,
        },
      ]);
      setChatTitle((prev) => prev || message.slice(0, 60) || (sentFiles.length > 0 ? sentFiles[0].name : ""));

      // Notify parent about the session immediately so it shows in sidebar
      if (!hasCreatedSessionRef.current && sessionIdRef.current) {
        hasCreatedSessionRef.current = true;
        onSessionCreated(sessionIdRef.current, message);
      }

      analytics.track("Message Sent", {
        is_first_message: messages.length === 0,
        has_attachment: sentFiles.length > 0,
        message_length: message.length,
        authenticated: true,
        source: initialQuery && messages.length === 0 ? "post_signup" : "chat",
      });

      // Show feedback prompt after 5th message (once per session)
      userMessageCountRef.current++;
      if (userMessageCountRef.current === 5 && !sessionStorage.getItem("elena_feedback_shown")) {
        sessionStorage.setItem("elena_feedback_shown", "1");
        setTimeout(() => setFeedbackOpen(true), 2000);
      }

      if (user?.id) {
        trackActivation(user.id);
      }

      setIsLoading(true);
      console.log("[chat-area] sending message to session:", sessionIdRef.current, "activeSessionId prop:", activeSessionId);

      const result = await sendAndPoll(
        {
          message,
          session_id: sessionIdRef.current,
          prior_assistant_message: welcomeMessage || undefined,
          ...(docKeys.length > 0 && { document_keys: docKeys }),
        },
        // onToolProgress
        (label) => setToolLabel(label),
        // onDone
        (chatResult: ChatResponse) => {
          const assistantId = nextId();
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content: chatResult.reply,
              isStreaming: true,
              doctorResults: chatResult.doctor_results,
              locationResults: chatResult.location_results,
              reviewResults: chatResult.review_results,
              webSources: chatResult.web_sources,
              negotiationResult: undefined,
              formRequest: chatResult.form_request,
              billAnalysis: chatResult.bill_analysis,
              appealScript: chatResult.appeal_script,
              appealStatus: chatResult.appeal_status,
              assistanceResult: chatResult.assistance_result,
              priceComparisonLabel: chatResult.price_comparison_label,
              insurancePlanComparison: chatResult.insurance_plan_comparison,
              refillPlanCreated: chatResult.refill_plan_created,
              carePlanShown: chatResult.care_plan_shown,
              scheduledActionCreated: chatResult.scheduled_action_created,
              needsHipaaConsent: !!chatResult.needs_hipaa_consent,
            },
          ]);
          setStreamingId(assistantId);
          setSuggestions(chatResult.suggestions || []);
          setToolLabel(null);
          setIsLoading(false);
          // Form-request diagnostic pipeline — forms disappearing
          // silently is the #1 chat bug, so we trace every stage:
          //   1) received from backend  (this block)
          //   2) added to message state (setMessages above — verify via render log in FormRequestCard)
          //   3) mounted in DOM         (FormRequestCard / HealthProfileIntakeCard useEffect)
          //   4) actually visible       (DOM-check inside those cards)
          //   5) sentinel fallback      (scheduleFormPresenceCheck — loud error + analytics if missing)
          // HIPAA-miss diagnostic — if the user just asked for HIPAA
          // (common phrasings) and the agent's response came back
          // WITHOUT a hipaa_consent form_request, that's the agent
          // replying in text instead of calling request_user_info. Log
          // it so we can see the miss rate distinct from render bugs.
          try {
            const lastUser = messagesRef.current.filter((m) => m.role === "user").slice(-1)[0]?.content?.toLowerCase() || "";
            const hipaaIntent = /\b(hipaa|authorization form|consent form|sign.*form|sign.*now|give me the form)\b/.test(lastUser);
            const hasHipaaField = !!(chatResult.form_request?.fields || []).find((f: { type?: string }) => f.type === "hipaa_consent");
            if (hipaaIntent && !hasHipaaField) {
              console.warn("[hipaa-debug] user asked for HIPAA but agent response has no hipaa_consent field", {
                user_msg_preview: lastUser.slice(0, 80),
                has_form_request: !!chatResult.form_request,
                form_save_to: (chatResult.form_request as unknown as { save_to?: string } | undefined)?.save_to,
                reply_preview: (chatResult.reply || "").slice(0, 120),
              });
              analytics.track("Hipaa Tool Not Called", { had_form_request: !!chatResult.form_request });
            }
          } catch {}

          if (chatResult.form_request) {
            const fr = chatResult.form_request as unknown as { form_id?: string; save_to?: string; title?: string; fields?: Array<{ key: string; type: string }> };
            const formPayload = {
              form_id: fr.form_id,
              save_to: fr.save_to,
              title: fr.title,
              field_count: fr.fields?.length || 0,
              field_types: (fr.fields || []).map((f) => `${f.key}:${f.type}`),
              msg_id: assistantId,
            };
            console.log("[form-debug] 1/5 form_request received from backend", formPayload);
            const hipaaFieldCount = (fr.fields || []).filter((f) => f.type === "hipaa_consent").length;
            if (hipaaFieldCount > 0) {
              console.log("[hipaa-debug] form_request contains hipaa_consent field", {
                form_id: fr.form_id, save_to: fr.save_to, hipaa_fields: hipaaFieldCount,
              });
              analytics.track("Hipaa Form Requested", { form_id: fr.form_id, save_to: fr.save_to });
            }
            analytics.track("Form Request Received", formPayload);
            // Stage 2 — verify the form made it into the message-state array.
            // Runs right after the setState in the same microtask batch;
            // messagesRef lags by one effect tick, so we check the queued
            // state via a 0ms timeout.
            window.setTimeout(() => {
              const msg = messagesRef.current.find((m) => m.id === assistantId);
              console.log("[form-debug] 2/5 form in message state?", {
                form_id: fr.form_id, msg_id: assistantId,
                msg_exists: !!msg, msg_has_form: !!msg?.formRequest,
                form_id_on_msg: msg?.formRequest?.form_id,
              });
              if (!msg || !msg.formRequest) {
                analytics.track("Form Missing From State", { form_id: fr.form_id, msg_id: assistantId, msg_exists: !!msg });
              }
            }, 0);
            scheduleFormPresenceCheck(fr.form_id, fr.save_to, assistantId);
          }

          analytics.track("Response Received", {
            has_doctor_results: !!(chatResult.doctor_results?.length),
            has_location_results: !!(chatResult.location_results?.length),
            has_sources: !!(chatResult.web_sources?.length),
            has_booking: !!chatResult.booking_id,
          });

          // Show upgrade popup if a gated tool was blocked
          console.log("[chat] response received", {
            error_code: chatResult.error_code,
            gated_feature: chatResult.gated_feature,
            has_form: !!chatResult.form_request,
            has_doctors: !!(chatResult.doctor_results?.length),
            has_locations: !!(chatResult.location_results?.length),
          });
          // Map-readiness debug. Logs per-entry coord state when
          // provider / location cards come down so "no map" bug
          // reports can be diagnosed from devtools alone. Grep the
          // console for [map-debug].
          if (chatResult.doctor_results?.length) {
            const rows = chatResult.doctor_results.map((d) => ({
              name: d.name,
              source: (d as unknown as { source?: string }).source ?? null,
              lat: d.latitude,
              lng: d.longitude,
              has_coords: !!(d.latitude && d.longitude),
              zip: d.postal_code,
            }));
            console.log("[map-debug] doctor_results", {
              total: rows.length,
              map_ready: rows.filter((r) => r.has_coords).length,
              sources: Array.from(new Set(rows.map((r) => r.source))),
              rows,
            });
          }
          if (chatResult.location_results?.length) {
            const rows = chatResult.location_results.map((l) => ({
              name: l.name,
              category: l.category,
              lat: l.latitude,
              lng: l.longitude,
              has_coords: !!(l.latitude && l.longitude),
              address: l.address,
              zip: l.postal_code,
            }));
            console.log("[map-debug] location_results", {
              total: rows.length,
              map_ready: rows.filter((r) => r.has_coords).length,
              rows,
            });
          }
          // Backend quota-block paywall. If the tour post-seed gate is
          // still armed when a free user hits a real upgrade_required
          // from the backend, wrap it through the reviews modal so the
          // social-proof beat still lands. Otherwise open upgrade
          // modal directly. (The chat-turn-counter trigger in
          // handleSend usually consumes the tour gate flag BEFORE this
          // path fires, so this branch mostly handles paid-feature
          // gates mid-session.)
          if (chatResult.error_code === "upgrade_required") {
            const tourGateFlag = typeof window !== "undefined"
              && sessionStorage.getItem("elena_tour_post_seed_gate") === "1";
            const isFreeTier = !(subscription && subscription.tier && subscription.tier !== "free");
            setUpgradeReason("upgrade_required");
            setUpgradeFeature(chatResult.gated_feature || undefined);
            trackPaywallHit("upgrade_required", chatResult.gated_feature || undefined);
            if (tourGateFlag && isFreeTier) {
              setReviewsOpen(true);
              try { sessionStorage.removeItem("elena_tour_post_seed_gate"); } catch {}
            } else {
              setUpgradeOpen(true);
            }
          }

          // needs_hipaa_consent is now attached directly to the message
          // (msg.needsHipaaConsent) in the setMessages call above, so the
          // button renders inline with the assistant turn that requested
          // it — same pattern as RefillPlanCreatedCard / CarePlanCard.

          // Refresh profile data after every agent response — the agent may
          // have updated insurance, created todos, added doctors / visits,
          // etc. Refreshing here catches the "tool call succeeded but UI is
          // stale" case where the user doesn't see the new todo / doctor
          // until they reopen the profile popover.
          refreshInsurance();
          refreshTodos();
          refreshVisits();
          refreshDoctors();

          // Update session ref
          if (chatResult.session_id) {
            sessionIdRef.current = chatResult.session_id;
          }

          // Notify parent about new session
          if (!hasCreatedSessionRef.current && chatResult.session_id) {
            hasCreatedSessionRef.current = true;
            onSessionCreated(chatResult.session_id);
          }

          // Clear welcome after first message
          setWelcomeHeading(null);
          setWelcomeMessage(null);

          // Start booking poll if a call was initiated
          if (chatResult.booking_id) {
            analytics.track("Booking Initiated", { booking_id: chatResult.booking_id });
            booking.start(chatResult.booking_id);
          }
        },
        // onError
        (error) => {
          const errorId = nextId();
          setMessages((prev) => [
            ...prev,
            { id: errorId, role: "assistant", content: "Sorry, something went wrong on my end. Could you try that again?" },
          ]);
          setSuggestions(["Try again", "Start a new chat"]);
          setToolLabel(null);
          setIsLoading(false);
        },
      );

      // Update session ref from poll result — but only if we haven't switched sessions
      if (result?.session_id && (!sessionIdRef.current || sessionIdRef.current === result.session_id)) {
        sessionIdRef.current = result.session_id;
      }
    },
    // `user` must be in deps so `trackActivation(user.id)` sees the populated
    // auth user. In the real OAuth flow, chat-area mounts before useAuth
    // resolves the session, so the first `handleSend` memoization closes over
    // `user = null`. Without `user` in deps, subsequent renders return the
    // stale closure (useCallback returns the same reference), the auto-send
    // path fires the stale handleSend via handleSendRef, and `user?.id`
    // evaluates to undefined — so trackActivation never fires and the Meta
    // `CompleteRegistration` pixel (wired to trackActivation) is silently
    // dropped for every OAuth signup that gets their message auto-sent.
    [input, isLoading, sendAndPoll, onSessionCreated, welcomeMessage, pendingFiles, user, subscription],
  );

  // Keep ref in sync for auto-send effect
  handleSendRef.current = handleSend;

  console.log("[chat-area] RENDER:", { msgCount: messages.length, isLoading, loadingMessages, welcomeHeading: !!welcomeHeading, initialQuery: !!initialQuery, sessionId: sessionIdRef.current, activeSessionId });

  return (
    <div
      className="relative flex flex-1 flex-col min-w-0 h-dvh overflow-hidden bg-white"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} featureName={upgradeFeature} />
      <ReviewsModal
        open={reviewsOpen}
        onOpenChange={setReviewsOpen}
        onContinue={() => {
          setReviewsOpen(false);
          setTrialStep(1);
        }}
      />
      <TrialFlow
        step={trialStep}
        onStepChange={setTrialStep}
        reason="post_onboarding"
      />
      <HipaaConsentModal
        open={hipaaConsentOpen}
        onOpenChange={setHipaaConsentOpen}
        onSigned={() => {
          // Clear the per-message HIPAA flag on every assistant turn so
          // the inline button disappears everywhere the agent had asked.
          setMessages((prev) =>
            prev.map((m) => (m.needsHipaaConsent ? { ...m, needsHipaaConsent: false } : m)),
          );
          // Notify every mounted FormRequestCard so any with a
          // hipaa_consent field can mark it "signed" and auto-submit.
          setHipaaSignedAt(Date.now());
        }}
      />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <UpgradeModal open={softPaywallOpen} onOpenChange={setSoftPaywallOpen} reason="soft" />

      {/* Full-page drag-and-drop overlay */}
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0F1B3D]/[0.06] backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#0F1B3D]/30 bg-white/80 px-10 py-8 shadow-lg">
            <Paperclip className="h-8 w-8 text-[#0F1B3D]/40" />
            <p className="text-base font-semibold text-[#0F1B3D]/70">Drop files to upload</p>
            <p className="text-sm text-[#0F1B3D]/40">Images, PDFs, and documents</p>
          </div>
        </div>
      )}

      {/* Grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Sidebar toggle + viewing-as indicator */}
      <div className="flex-shrink-0 relative z-10 flex items-center gap-2.5 px-4 py-3">
        <button
          className="h-8 w-8 md:h-8 md:w-8 max-md:h-11 max-md:w-11 flex items-center justify-center rounded-full max-md:bg-white max-md:shadow-[0_2px_12px_rgba(15,27,61,0.12)] max-md:border max-md:border-[#0F1B3D]/[0.08] text-[#0F1B3D]/60 hover:text-[#0F1B3D] transition-all"
          onClick={onToggleSidebar}
        >
          <PanelLeft className="h-4 w-4 max-md:h-5 max-md:w-5" />
        </button>
        {(() => {
          const activeProfile = profiles.find((p) => p.id === profileId);
          if (!activeProfile || activeProfile.is_primary) return null;
          const name = profileData?.firstName && profileData?.lastName
            ? `${profileData.firstName} ${profileData.lastName}`
            : activeProfile.first_name + " " + activeProfile.last_name;
          return (
            <span className="text-sm font-extrabold text-[#0F1B3D]">
              {name.trim()}
            </span>
          );
        })()}
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden chat-selectable flex flex-col">
        <div className="mx-auto max-w-2xl px-4 md:px-8 py-8 space-y-4 flex-1 flex flex-col w-full">
          {/* Shimmer loading -- shown while waiting for sessions to resolve, the
              pending-message claim to return, or messages to load.
              Note: we intentionally do NOT gate on localStorage.elena_pending_query
              anymore — that window (post-quiz/DME → claim in-flight) is exactly
              when we want to show the shimmer. initialQuery is only non-null
              once claim has resolved with a synthetic auto-send, which is the
              one case the shimmer should step aside for the incoming user bubble. */}
          {messages.length === 0 && !welcomeHeading && !loadError && !initialQuery && (
            <div className="space-y-6 py-8">
              <p className="text-xs font-medium text-[#0F1B3D]/30 tracking-wide uppercase">
                {loadingMessages ? "Loading conversation…" : "Setting up your chat…"}
              </p>
              <div className="animate-pulse space-y-4">
                <div className="flex justify-end">
                  <div className="h-10 w-48 rounded-2xl bg-[#0F1B3D]/[0.06]" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[#0F1B3D]/[0.06]" />
                  <div className="h-4 w-full rounded bg-[#0F1B3D]/[0.04]" />
                  <div className="h-4 w-2/3 rounded bg-[#0F1B3D]/[0.04]" />
                </div>
                <div className="h-32 w-full rounded-2xl bg-[#0F1B3D]/[0.04]" />
              </div>
            </div>
          )}

          {/* Error loading messages -- retry button */}
          {loadError && messages.length === 0 && !loadingMessages && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <p className="text-sm text-[#0F1B3D]/50">{loadError}</p>
              <button
                onClick={() => {
                  if (activeSessionId) {
                    const requestId = ++loadRequestRef.current;
                    loadMessages(activeSessionId, requestId);
                  }
                }}
                className="rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-5 py-2.5 text-sm font-semibold text-[#0F1B3D]/70 transition-all hover:bg-[#0F1B3D]/[0.08]"
              >
                Retry
              </button>
            </div>
          )}

          {/* Welcome state -- hidden when there's a pending query */}
          {messages.length === 0 && !loadingMessages && !loadError && welcomeHeading && !initialQuery && !localStorage.getItem("elena_pending_query") && (
            <div className="flex-1 flex flex-col items-start justify-center gap-5 md:gap-7 py-8">
              <div>
                <h2 className="text-2xl md:text-[2rem] font-bold text-[#0F1B3D] mb-3 md:mb-4 leading-tight">{welcomeHeading}</h2>
                {welcomeMessage && (
                  <p className="text-[0.9rem] md:text-[1rem] leading-relaxed text-[#0F1B3D]/60 max-w-md md:max-w-lg">
                    {welcomeMessage}
                  </p>
                )}
              </div>
              {!isLoading && !streamingId && suggestions.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        analytics.track("Welcome Suggestion Clicked", { suggestion_text: s });
                        handleSend(s);
                      }}
                      className="rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-medium text-[#0F1B3D]/70 whitespace-nowrap shadow-[0_1px_4px_rgba(15,27,61,0.04)] transition-all hover:bg-[#0F1B3D]/[0.08] hover:-translate-y-px"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8ecf4] px-5 py-3">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {msg.attachments.map((att) => (
                        <span
                          key={att.key}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0F1B3D]/[0.06] px-2.5 py-1 text-xs text-[#0F1B3D]/60"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="max-w-[140px] truncate">{att.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[0.9rem] leading-relaxed text-[#0F1B3D]">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div key={msg.id}>
                <div className="text-[0.9rem] leading-[1.75] text-[#1C1C1E]">
                  {msg.id === streamingId ? (
                    <StreamingText
                      content={msg.content}
                      onComplete={() => setStreamingId(null)}
                    />
                  ) : (
                    <Markdown content={msg.content} />
                  )}
                </div>
                {/* Structured result cards — hidden while streaming, fade in after */}
                {msg.id !== streamingId && (() => {
                  // Stage-3 form-debug log — fires once per message when the
                  // gate opens. If you see 1/5 and 2/5 but never 3/5 for a
                  // given form_id, the message is stuck in streamingId state
                  // (StreamingText.onComplete never fired).
                  if (typeof window !== "undefined" && msg.formRequest) {
                    const w = window as unknown as { __formStage3Logged?: Set<string> };
                    w.__formStage3Logged = w.__formStage3Logged || new Set();
                    if (!w.__formStage3Logged.has(msg.id)) {
                      w.__formStage3Logged.add(msg.id);
                      console.log("[form-debug] 3/5 message render pass (gate open)", {
                        msg_id: msg.id, form_id: msg.formRequest.form_id,
                        save_to: msg.formRequest.save_to,
                      });
                    }
                  }
                  // One-shot per-message map-readiness debug. Fires at
                  // render time (not just on onDone) so cards loaded
                  // from session history also get logged. Side-effect
                  // inside an IIFE is intentional — render-time logs
                  // are fine and we want this visible on every card.
                  if (typeof window !== "undefined") {
                    const w = window as unknown as { __mapDebugLogged?: Set<string> };
                    w.__mapDebugLogged = w.__mapDebugLogged || new Set();
                    if (!w.__mapDebugLogged.has(msg.id)) {
                      if (msg.doctorResults?.length) {
                        const rows = msg.doctorResults.map((d) => ({
                          name: d.name, lat: d.latitude, lng: d.longitude,
                          has_coords: !!(d.latitude && d.longitude), zip: d.postal_code,
                          source: (d as unknown as { source?: string }).source ?? null,
                        }));
                        console.log("[map-debug] doctor_results (render)", {
                          msg_id: msg.id, total: rows.length,
                          map_ready: rows.filter((r) => r.has_coords).length,
                          sources: Array.from(new Set(rows.map((r) => r.source))),
                          rows,
                        });
                        w.__mapDebugLogged.add(msg.id);
                      }
                      if (msg.locationResults?.length) {
                        const rows = msg.locationResults.map((l) => ({
                          name: l.name, lat: l.latitude, lng: l.longitude,
                          has_coords: !!(l.latitude && l.longitude),
                          address: l.address, zip: l.postal_code, category: l.category,
                        }));
                        console.log("[map-debug] location_results (render)", {
                          msg_id: msg.id, total: rows.length,
                          map_ready: rows.filter((r) => r.has_coords).length,
                          rows,
                        });
                        w.__mapDebugLogged.add(msg.id);
                      }
                    }
                  }
                  return (
                  <div className={`${msg.isStreaming === false || !msg.isStreaming ? "elena-card-enter" : ""} max-md:scale-[0.88] max-md:origin-top-left`}>
                    {/* Show location card if present (pharmacies, labs, etc.), otherwise doctor card — skip if form is shown */}
                    {!msg.formRequest && msg.locationResults && msg.locationResults.length > 0 ? (
                      <LocationResultsCard
                        locations={msg.locationResults}
                        onCall={(loc) => handleSend(`Call ${loc.name} at ${loc.phone_number}`)}
                        onSelect={(loc) => {
                          // Disambiguate when multiple results share a
                          // name (e.g. 7 CVSs) by including the address.
                          // Without this, Elena gets "Let's go with CVS"
                          // and can't pick one.
                          const locLabel = [loc.address, loc.city].filter(Boolean).join(", ");
                          const msg = locLabel
                            ? `Let's go with ${loc.name} at ${locLabel}`
                            : `Let's go with ${loc.name}`;
                          handleSend(msg);
                        }}
                      />
                    ) : !msg.formRequest && msg.doctorResults && msg.doctorResults.length > 0 ? (
                      (() => {
                        // Provider names aren't unique (same doctor across
                        // practices, same practice name at multiple sites).
                        // Include the practice and street so Elena knows
                        // exactly which one to book.
                        const bookLabel = (doc: DoctorResult) => {
                          const where = [doc.practice_name, doc.address, doc.city]
                            .filter(Boolean)
                            .join(", ");
                          return where
                            ? `Book an appointment with ${doc.name} at ${where}`
                            : `Book an appointment with ${doc.name}`;
                        };
                        return msg.priceComparisonLabel ? (
                          <PriceComparisonCard
                            doctors={msg.doctorResults}
                            label={msg.priceComparisonLabel}
                            onBookDoctor={(doc) => handleSend(bookLabel(doc))}
                          />
                        ) : (
                          <DoctorResultsCard
                            doctors={msg.doctorResults}
                            onBookDoctor={(doc) => handleSend(bookLabel(doc))}
                          />
                        );
                      })()
                    ) : null}
                    {msg.reviewResults && (
                      <ReviewsCard data={msg.reviewResults} />
                    )}
                    {msg.negotiationResult && (
                      <NegotiationCard data={msg.negotiationResult} />
                    )}
                    {msg.billAnalysis && (
                      <BillAnalysisCard data={msg.billAnalysis} />
                    )}
                    {msg.appealScript && (
                      <AppealScriptCard data={msg.appealScript} onSend={() => handleSend("Send it for me")} />
                    )}
                    {msg.appealStatus && (
                      <AppealTrackerCard data={msg.appealStatus} />
                    )}
                    {msg.assistanceResult && (
                      <AssistanceProgramsCard
                        data={msg.assistanceResult}
                        onCall={({ name, phone }) => handleSend(`Call ${name} at ${phone}`)}
                      />
                    )}
                    {msg.insurancePlanComparison && (
                      <InsurancePlanComparisonCard data={msg.insurancePlanComparison} />
                    )}
                    {msg.refillPlanCreated && (
                      <RefillPlanCreatedCard data={msg.refillPlanCreated} />
                    )}
                    {msg.carePlanShown && (
                      <CarePlanCard data={msg.carePlanShown} />
                    )}
                    {msg.scheduledActionCreated && (
                      <ScheduledActionCard data={msg.scheduledActionCreated} />
                    )}
                    {msg.formRequest && msg.formRequest.save_to === "health_profile" ? (
                      <HealthProfileIntakeCard
                        form={msg.formRequest}
                        onSubmitted={async (data) => {
                          analytics.track("Form Submitted", { form_id: msg.formRequest?.form_id, type: "health_profile" });
                          const parts: string[] = [];
                          if (data.basics) {
                            try {
                              const b = JSON.parse(data.basics) as Record<string, string>;
                              const filled = Object.values(b).filter((v) => (v || "").toString().trim()).length;
                              if (filled > 0) parts.push(`basics (${filled} field${filled === 1 ? "" : "s"})`);
                            } catch {}
                          }
                          if (data.conditions) { try { parts.push(`${JSON.parse(data.conditions).length} condition(s)`); } catch {} }
                          if (data.medications) { try { parts.push(`${JSON.parse(data.medications).length} medication(s)`); } catch {} }
                          if (data.allergies) { try { parts.push(`${JSON.parse(data.allergies).length} allergy/allergies`); } catch {} }
                          if (data.doctors) { try { parts.push(`${JSON.parse(data.doctors).length} doctor(s)`); } catch {} }
                          if (data.visits) { try { parts.push(`${JSON.parse(data.visits).length} past visit(s)`); } catch {} }
                          const summary = parts.length > 0 ? `Added: ${parts.join(", ")}` : "No items added";
                          const formMsg = `[FORM SUBMITTED: ${msg.formRequest?.form_id || "unknown"}] Health profile updated. ${summary}`;
                          setIsLoading(true);
                          sendAndPoll(
                            { message: formMsg, session_id: sessionIdRef.current },
                            (label) => setToolLabel(label),
                            (chatResult) => {
                              const assistantId = nextId();
                              setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: chatResult.reply || "" }]);
                              if (chatResult.suggestions?.length) setSuggestions(chatResult.suggestions);
                              setToolLabel(null);
                              setIsLoading(false);
                            },
                            () => { setToolLabel(null); setIsLoading(false); },
                          );
                        }}
                      />
                    ) : msg.formRequest ? (
                      <FormRequestCard
                        form={msg.formRequest}
                        onOpenHipaa={() => setHipaaConsentOpen(true)}
                        hipaaSignedAt={hipaaSignedAt}
                        onSubmitted={async (data) => {
                          analytics.track("Form Submitted", { form_id: msg.formRequest?.form_id });
                          const saveTo = msg.formRequest?.save_to || "none";
                          try {
                            await apiFetch("/chat/form-submit", {
                              method: "POST",
                              body: JSON.stringify({
                                form_id: msg.formRequest?.form_id,
                                save_to: saveTo,
                                data,
                              }),
                            });
                          } catch {}
                          if (saveTo === "insurance") refreshInsurance();
                          triggerSoftPaywall();
                          const formSummary = Object.entries(data)
                            .filter(([, v]) => v && String(v).trim())
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ");
                          const formMsg = `[FORM SUBMITTED: ${msg.formRequest?.form_id || "unknown"}] ${formSummary}`;
                          setIsLoading(true);
                          sendAndPoll(
                            {
                              message: formMsg,
                              session_id: sessionIdRef.current,
                            },
                            (label) => setToolLabel(label),
                            (chatResult) => {
                              const assistantId = nextId();
                              setMessages((prev) => [
                                ...prev,
                                { id: assistantId, role: "assistant", content: chatResult.reply || "" },
                              ]);
                              if (chatResult.suggestions?.length) setSuggestions(chatResult.suggestions);
                              setToolLabel(null);
                              setIsLoading(false);
                            },
                            () => {
                              setToolLabel(null);
                              setIsLoading(false);
                            },
                          );
                          if (saveTo === "insurance") setTimeout(() => refreshInsurance(), 3000);
                        }}
                      />
                    ) : null}
                    {/* Skip the standalone HIPAA CTA when the message's
                        formRequest already renders a hipaa_consent field —
                        FormRequestCard renders its own "Open Authorization
                        Form" button inline, so showing this one too produces
                        a duplicate button on the same message. */}
                    {msg.needsHipaaConsent && !msg.formRequest?.fields?.some((f) => f.type === "hipaa_consent") && (
                      <div className="mt-3 flex flex-col gap-2 items-start">
                        <button
                          onClick={() => setHipaaConsentOpen(true)}
                          className="rounded-full bg-[#0F1B3D] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#0F1B3D]/90 hover:-translate-y-px"
                        >
                          Open Authorization Form
                        </button>
                        <p className="text-[12px] text-[#8E8E93]">
                          Or sign it from Personal Details in your profile.
                        </p>
                      </div>
                    )}
                    {msg.bookingResult && msg.bookingResult.status === "confirmed" && (
                      <>
                        <AppointmentConfirmationCard result={msg.bookingResult} />
                        <AddToCalendarCard result={msg.bookingResult} />
                      </>
                    )}
                    {msg.bookingResult && msg.bookingResult.status === "failed" && (
                      <CallUpdateCard result={msg.bookingResult} onAction={handleSend} />
                    )}
                    {msg.bookingResult && !["confirmed", "failed", "escalated"].includes(msg.bookingResult.status) && (
                      <CallUpdateCard result={msg.bookingResult} onAction={handleSend} />
                    )}
                    {msg.callResult && (
                      <div className="mt-3 max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <span className="text-sm font-bold text-emerald-800">Call Completed</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0F1B3D] mb-1">Just got off the phone with {msg.callResult.provider_name}</p>
                        <p className="text-[13px] text-[#0F1B3D]/70 leading-relaxed">{msg.callResult.summary}</p>
                      </div>
                    )}
                    {msg.inviteAccepted && (
                      <div className="mt-3 max-w-md rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center">
                            <span className="text-xs">🔗</span>
                          </div>
                          <span className="text-sm font-bold text-indigo-800 tracking-wide">ACCOUNT LINKED</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0F1B3D] mb-1">{msg.inviteAccepted.accepter_name}</p>
                        <p className="text-[13px] text-[#0F1B3D]/70 leading-relaxed">{msg.inviteAccepted.message}</p>
                      </div>
                    )}
                    {msg.webSources && msg.webSources.length > 0 && (
                      <SourcesFooter sources={msg.webSources} />
                    )}
                  </div>
                  );
                })()}
              </div>
            )
          )}

          {/* Thinking / tool progress indicator */}
          {isLoading && (
            <ThinkingIndicator toolLabel={toolLabel} />
          )}

          {/* Active booking call status */}
          {booking.status &&
            booking.status.phase !== "completed" &&
            booking.status.phase !== "failed" &&
            booking.status.phase !== "cancelled" && (
              <BookingStatusBubble
                status={booking.status}
                onCancel={booking.cancel}
              />
            )}

          {/* Mid-call question from voice agent */}
          {booking.status?.phase === "needs_info" && booking.status.question && (
            <BookingQuestionCard
              question={booking.status.question}
              onAnswer={booking.respond}
            />
          )}

          {/* Suggestion chips — inline after last message, left-aligned with text.
              Negative -mt pulls them closer to the preceding card/form — the
              parent's space-y-4 adds 1rem of top margin which on top of the
              card's own bottom padding read as dead space. */}
          {messages.length > 0 && !isLoading && !streamingId && suggestions.length > 0 && (
            <div className="-mt-2">
              <div className="flex gap-1.5 flex-wrap">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      analytics.track(
                        messages.length === 0 ? "Welcome Suggestion Clicked" : "Suggestion Chip Clicked",
                        { suggestion_text: s },
                      );
                      handleSend(s);
                    }}
                    className="rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-3 py-1.5 text-xs font-medium text-[#0F1B3D]/70 whitespace-nowrap shadow-[0_1px_4px_rgba(15,27,61,0.04)] transition-all hover:bg-[#0F1B3D]/[0.08] hover:-translate-y-px"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* HIPAA button now renders per-turn, inline with the assistant
              message that requested it (see msg.needsHipaaConsent in the
              IIFE above). That way it uses the same reliable render path
              as RefillPlanCreatedCard / CarePlanCard / ScheduledActionCard
              and scrolls with the conversation instead of living as a
              single standalone button at the bottom. */}

          <div ref={scrollEndRef} className="h-6" />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 relative z-10 mx-auto w-full max-w-2xl px-4 pb-6 pt-2"
      >
        {/* Pending file chips */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {pendingFiles.map((f) => (
              <span
                key={f.key}
                className="flex items-center gap-1 rounded-full bg-[#e8ecf4] px-3 py-1 text-xs text-[#0F1B3D]/70"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{f.file.name}</span>
                <button onClick={() => removePendingFile(f.key)} className="ml-0.5 text-[#0F1B3D]/30 hover:text-[#0F1B3D]/60">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <form autoComplete="off" data-tour="chat-input" data-lpignore="true" data-1p-ignore onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-end gap-2 rounded-[28px] border border-[#E5E5EA] bg-white px-2 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.1)] focus-within:border-[#AEAEB2]">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
            multiple
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="flex h-8 w-8 mb-0.5 flex-shrink-0 items-center justify-center rounded-full text-[#AEAEB2] hover:text-[#0F1B3D] hover:bg-[#0F1B3D]/[0.04] transition-colors disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#AEAEB2] border-t-transparent" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-sm leading-normal text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] py-2 max-h-32 overflow-y-auto"
            placeholder="Ask Elena anything..."
            rows={1}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize: reset height then set to scrollHeight
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            className="h-[34px] w-[34px] mb-0.5 flex-shrink-0 rounded-full bg-[#0F1B3D] hover:bg-[#0F1B3D]/90 disabled:opacity-40"
            onClick={() => {
              if (isLoading) {
                cancel();
                setIsLoading(false);
                setToolLabel(null);
              } else {
                handleSend();
              }
            }}
            disabled={!isLoading && !input.trim() && pendingFiles.length === 0}
          >
            {isLoading ? (
              <Square className="h-3.5 w-3.5 text-white fill-white" />
            ) : (
              <ArrowUp className="h-4 w-4 text-white" />
            )}
          </Button>
        </form>
        <p className="mt-2 text-center text-[0.7rem] text-[#AEAEB2]">
          Elena can make mistakes. Always verify important health information.
        </p>
      </div>
    </div>
  );
}
