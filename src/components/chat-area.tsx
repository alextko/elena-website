"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PanelLeft, Plus, ArrowUp, Square, Paperclip, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";
import { trackPaywallHit } from "@/lib/tracking-events";
import { usePollChat } from "@/hooks/usePollChat";
import { useBookingPoll } from "@/hooks/useBookingPoll";
import { UpgradeModal } from "@/components/upgrade-modal";
import {
  DoctorResultsCard,
  LocationResultsCard,
  ReviewsCard,
  NegotiationCard,
  SourcesFooter,
  BookingStatusBubble,
  AppointmentConfirmationCard,
  AddToCalendarCard,
  BookingQuestionCard,
  FormRequestCard,
  PriceComparisonCard,
  BillAnalysisCard,
  AppealScriptCard,
  AppealTrackerCard,
  AssistanceProgramsCard,
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
  callResult?: { provider_name: string; summary: string; call_type: string } | null;
  formRequest?: FormRequest | null;
  billAnalysis?: BillAnalysis | null;
  appealScript?: AppealScript | null;
  appealStatus?: AppealStatus | null;
  assistanceResult?: AssistanceResult | null;
  priceComparisonLabel?: string | null;
};

// Link regex: [^)] for URL ensures we don't stop at an unrelated ")" elsewhere in text.
// Only ONE outer capturing group so split() doesn't inject sub-group captures into the array.
const LINK_PATTERN = /(\*\*.*?\*\*|\[[^\]]*\]\(https?:\/\/[^)\n]+\))/g;
const LINK_MATCH_RE = /^\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/;

function renderMarkdown(text: string, streaming = false) {
  if (streaming) {
    // While streaming, strip link syntax to just show the display text
    const cleaned = text.replace(/\[([^\]]*)\]\(https?:\/\/[^)]*\)/g, "$1");
    const parts = cleaned.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  }
  const parts = text.split(LINK_PATTERN);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    const linkMatch = part.match(LINK_MATCH_RE);
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-[#2E6BB5] underline underline-offset-2">{linkMatch[1]}</a>;
    }
    return <span key={i}>{part}</span>;
  });
}

// Streaming text — reveals character by character, snapping to word boundaries
function StreamingText({ content, onComplete }: { content: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  // Use a ref for onComplete so changing the callback doesn't restart the animation
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
  }, [content]); // onComplete intentionally excluded — accessed via ref

  const lines = displayed.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <p key={i} className={line === "" ? "h-3" : "mb-1"}>
          {renderMarkdown(line, !done)}
          {!done && i === lines.length - 1 && <span className="inline-block w-[2px] h-[1em] bg-[#0F1B3D] animate-pulse ml-0.5 align-text-bottom" />}
        </p>
      ))}
    </>
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
  bookMessage,
  onBookMessageConsumed,
  isNewChat,
  demoMode = false,
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  activeSessionId: string | null;
  onSessionCreated: (id: string, firstMessage?: string) => void;
  initialQuery?: string | null;
  bookMessage?: string | null;
  onBookMessageConsumed?: () => void;
  isNewChat?: boolean;
  demoMode?: boolean;
}) {
  const { profileId, profileData, profiles, refreshInsurance } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolLabel, setToolLabel] = useState<string | null>(null);
  const [welcomeHeading, setWelcomeHeading] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<{ file: File; key: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"upgrade_required" | "limit_reached" | "feature_blocked" | "document_limit">("document_limit");
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sessionIdRef = useRef<string | null>(null);
  const hasCreatedSessionRef = useRef(false);
  const initialQuerySentRef = useRef(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const { sendAndPoll, cancel } = usePollChat(demoMode);
  const booking = useBookingPoll();
  const msgIdCounter = useRef(0);

  const nextId = () => {
    msgIdCounter.current++;
    return `msg-${msgIdCounter.current}`;
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

    // Increment request ID so stale fetches are ignored
    const requestId = ++loadRequestRef.current;

    if (activeSessionId) {
      console.log("[chat-area] loading existing session:", activeSessionId);
      // Keep loadingMessages true — loadMessages() will manage it from here
      setLoadingMessages(true);
      // Load existing session messages
      sessionIdRef.current = activeSessionId;
      loadMessages(activeSessionId, requestId);
    } else if (isNewChat || profileChanged) {
      const pending = initialQuery || localStorage.getItem("elena_pending_query");
      console.log("[chat-area] fetching welcome, silent:", !!pending, "isNewChat:", isNewChat, "profileChanged:", profileChanged);
      setLoadingMessages(false);
      // Start a fresh welcome session for the active profile
      fetchWelcome(!!pending);
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
      const mapped: Message[] = data
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
        }));
      setMessages(mapped);
      // Empty session — show welcome screen rather than leaving the page blank
      if (mapped.length === 0) {
        setWelcomeHeading("What can I help you with?");
        setSuggestions(["What can you help me with?", "Find a cheaper pharmacy", "Help with my insurance"]);
        setLoadingMessages(false);
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
    setLoadError(null);
    try {
      const res = await apiFetch("/chat/welcome", {
        method: "POST",
        body: JSON.stringify({}),
      });
      console.log("[chat-area] fetchWelcome response:", res.status);
      if (!res.ok) {
        console.warn("[chat-area] fetchWelcome failed:", res.status);
        // Fallback — still usable, just no personalized welcome
        setWelcomeHeading("What can I help you with?");
        setSuggestions(["What can you help me with?", "Find a cheaper pharmacy", "Help with my insurance"]);
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
      // Notify sidebar immediately so the session appears
      if (!hasCreatedSessionRef.current && data.session_id) {
        hasCreatedSessionRef.current = true;
        onSessionCreated(data.session_id, silent ? "New conversation" : undefined);
      }
    } catch {
      // Fallback -- show generic welcome so the page is never blank
      if (!silent) {
        setWelcomeHeading("What can I help you with?");
        setSuggestions(["What can you help me with?", "Find a cheaper pharmacy", "Help with my insurance"]);
      }
    }
  }

  // Auto-send initial query from landing page after session is ready
  const handleSendRef = useRef<(text?: string) => Promise<void>>(undefined);
  const initialQuerySending = useRef(false);

  useEffect(() => {
    console.log("[chat-area] auto-send check:", {
      hasInitialQuery: !!initialQuery,
      alreadySent: initialQuerySentRef.current,
      sending: initialQuerySending.current,
      sessionId: sessionIdRef.current,
      hasHandleSend: !!handleSendRef.current,
      sessionReady,
    });
    if (
      initialQuery &&
      !initialQuerySentRef.current &&
      !initialQuerySending.current &&
      sessionIdRef.current &&
      handleSendRef.current
    ) {
      console.log("[chat-area] AUTO-SENDING initial query:", initialQuery.slice(0, 50));
      initialQuerySending.current = true;
      initialQuerySentRef.current = true;
      localStorage.removeItem("elena_pending_query");
      handleSendRef.current(initialQuery);
    }
  }, [initialQuery, welcomeMessage, sessionReady]);

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
        const resolved = msgs.find(
          (m) => m.booking_result?.status === "confirmed" ||
                 (m.booking_result?.booking_id === bid && m.booking_result?.status !== "escalated")
        );
        if (resolved && resolved.booking_result) {
          // Check if we already have this message
          const alreadyShown = messages.some(
            (m) => m.bookingResult?.status === "confirmed" && m.bookingResult?.booking_id === bid
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

      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setSuggestions([]);
      setToolLabel(null);

      // Collect document keys from pending uploads before clearing
      const sentFiles = pendingFiles.map((f) => ({ name: f.file.name, key: f.key }));
      const docKeys = pendingFiles.map((f) => f.key);
      setPendingFiles([]);

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
            },
          ]);
          setStreamingId(assistantId);
          setSuggestions(chatResult.suggestions || []);
          setToolLabel(null);
          setIsLoading(false);

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
          if (chatResult.error_code === "upgrade_required") {
            setUpgradeReason("upgrade_required");
            setUpgradeFeature(chatResult.gated_feature || undefined);
            setUpgradeOpen(true);
            trackPaywallHit("upgrade_required", chatResult.gated_feature || undefined);
          }

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
    [input, isLoading, sendAndPoll, onSessionCreated, welcomeMessage, pendingFiles],
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
        <div className="mx-auto max-w-2xl px-4 md:px-8 py-8 space-y-6 flex-1 flex flex-col w-full">
          {/* Shimmer loading -- shown while waiting for sessions to resolve or messages to load */}
          {messages.length === 0 && !welcomeHeading && !loadError && !initialQuery && !localStorage.getItem("elena_pending_query") && (
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
                    msg.content.split("\n").map((line, i) => (
                      <p key={i} className={line === "" ? "h-3" : "mb-1"}>
                        {renderMarkdown(line)}
                      </p>
                    ))
                  )}
                </div>
                {/* Structured result cards — hidden while streaming, fade in after */}
                {msg.id !== streamingId && (
                  <div className={`${msg.isStreaming === false || !msg.isStreaming ? "elena-card-enter" : ""} max-md:scale-[0.88] max-md:origin-top-left`}>
                    {/* Show location card if present (pharmacies, labs, etc.), otherwise doctor card — skip if form is shown */}
                    {!msg.formRequest && msg.locationResults && msg.locationResults.length > 0 ? (
                      <LocationResultsCard
                        locations={msg.locationResults}
                        onCall={(loc) => handleSend(`Call ${loc.name} at ${loc.phone_number}`)}
                      />
                    ) : !msg.formRequest && msg.doctorResults && msg.doctorResults.length > 0 ? (
                      msg.priceComparisonLabel ? (
                        <PriceComparisonCard
                          doctors={msg.doctorResults}
                          label={msg.priceComparisonLabel}
                          onBookDoctor={(doc) => handleSend(`Book an appointment with ${doc.name}`)}
                        />
                      ) : (
                        <DoctorResultsCard
                          doctors={msg.doctorResults}
                          onBookDoctor={(doc) => handleSend(`Book an appointment with ${doc.name}`)}
                        />
                      )
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
                      <AppealScriptCard data={msg.appealScript} />
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
                    {msg.bookingResult && msg.bookingResult.status === "confirmed" && (
                      <>
                        <AppointmentConfirmationCard result={msg.bookingResult} />
                        <AddToCalendarCard result={msg.bookingResult} />
                      </>
                    )}
                    {msg.bookingResult && msg.bookingResult.status !== "confirmed" && msg.bookingResult.status !== "escalated" && (
                      <AppointmentConfirmationCard result={msg.bookingResult} />
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
                    {msg.webSources && msg.webSources.length > 0 && (
                      <SourcesFooter sources={msg.webSources} />
                    )}
                    {msg.formRequest && (
                      <FormRequestCard
                        form={msg.formRequest}
                        onSubmitted={async (data) => {
                          analytics.track("Form Submitted", { form_id: msg.formRequest?.form_id });
                          const saveTo = msg.formRequest?.save_to || "none";
                          // Save data via the form-submit endpoint
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
                          // Refresh cached data
                          if (saveTo === "insurance") refreshInsurance();
                          // Send form data to the agent without showing a user message bubble
                          const formSummary = Object.entries(data)
                            .filter(([, v]) => v && String(v).trim())
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ");
                          const formMsg = `[FORM SUBMITTED: ${msg.formRequest?.form_id || "unknown"}] ${formSummary}`;
                          // Send directly via poll (no visible user bubble)
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
                          // Refresh insurance display after a short delay for the save to complete
                          if (saveTo === "insurance") setTimeout(() => refreshInsurance(), 3000);
                        }}
                      />
                    )}
                  </div>
                )}
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

          {/* Suggestion chips — inline after last message, left-aligned with text */}
          {messages.length > 0 && !isLoading && !streamingId && suggestions.length > 0 && (
            <div className="mt-3">
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
        <form autoComplete="off" data-lpignore="true" data-1p-ignore onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-end gap-2 rounded-[28px] border border-[#E5E5EA] bg-white px-2 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.1)] focus-within:border-[#AEAEB2]">
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
