"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PanelLeft, Plus, ArrowUp, Paperclip, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import * as analytics from "@/lib/analytics";
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
  formRequest?: FormRequest | null;
};

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// Streaming text — reveals character by character, snapping to word boundaries
function StreamingText({ content, onComplete }: { content: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

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
        onComplete?.();
        clearInterval(timer);
      } else {
        setDisplayed(content.slice(0, indexRef.current));
      }
    }, 20);

    return () => clearInterval(timer);
  }, [content, onComplete]);

  return (
    <>
      {displayed.split("\n").map((line, i) => (
        <p key={i} className={line === "" ? "h-3" : "mb-1"}>
          {renderMarkdown(line)}
        </p>
      ))}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-[#0F1B3D] animate-pulse ml-0.5 align-text-bottom" />}
    </>
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
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  activeSessionId: string | null;
  onSessionCreated: (id: string) => void;
  initialQuery?: string | null;
  bookMessage?: string | null;
  onBookMessageConsumed?: () => void;
  isNewChat?: boolean;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolLabel, setToolLabel] = useState<string | null>(null);
  const [welcomeHeading, setWelcomeHeading] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string | null>(null);

  const [pendingFiles, setPendingFiles] = useState<{ file: File; key: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"upgrade_required" | "limit_reached" | "feature_blocked" | "document_limit">("document_limit");
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sessionIdRef = useRef<string | null>(activeSessionId);
  const hasCreatedSessionRef = useRef(false);
  const initialQuerySentRef = useRef(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const { sendAndPoll, cancel } = usePollChat();
  const booking = useBookingPoll();
  const msgIdCounter = useRef(0);

  const nextId = () => {
    msgIdCounter.current++;
    return `msg-${msgIdCounter.current}`;
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolLabel]);

  // Load session or welcome when activeSessionId changes
  useEffect(() => {
    // If ChatArea already created this session (first message just sent),
    // skip reloading — we already have the messages locally.
    if (activeSessionId && sessionIdRef.current === activeSessionId) {
      return;
    }

    cancel();
    setMessages([]);
    setSuggestions([]);
    setIsLoading(false);
    setToolLabel(null);
    setWelcomeHeading(null);
    setWelcomeMessage(null);
    setStreamingId(null);
    setChatTitle(null);
    setPendingFiles([]);
    hasCreatedSessionRef.current = false;

    if (activeSessionId) {
      // Load existing session messages
      sessionIdRef.current = activeSessionId;
      loadMessages(activeSessionId);
    } else if (isNewChat) {
      sessionIdRef.current = null;
      // If there's a pending query, skip the welcome UI — just get a session ID
      fetchWelcome(!!initialQuery);
    }
    // When activeSessionId is null and isNewChat is false, we're still loading
    // sessions — don't create a new welcome session yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, isNewChat]);

  async function loadMessages(sessionId: string) {
    try {
      const res = await apiFetch(`/chat/${sessionId}/messages`);
      if (!res.ok) return;
      const data: ChatMessageItem[] = await res.json();
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
        }));
      setMessages(mapped);
      // Set title from first user message
      const firstUser = data.find((m) => m.role === "user");
      if (firstUser) setChatTitle(firstUser.text.slice(0, 60));
    } catch {
      // Network error — show empty
    }
  }

  async function fetchWelcome(silent = false) {
    try {
      const res = await apiFetch("/chat/welcome", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const data: WelcomeResponse = await res.json();
      if (!silent) {
        setWelcomeHeading(data.heading);
        setWelcomeMessage(data.message);
        setSuggestions(data.suggestions);
        analytics.track("Welcome Screen Shown");
      }
      sessionIdRef.current = data.session_id;
    } catch {
      if (!silent) {
        setSuggestions(["What can you help me with?", "Find a cheaper pharmacy", "Help with my insurance"]);
      }
    }
  }

  // Auto-send initial query from landing page after welcome loads
  const handleSendRef = useRef<(text?: string) => Promise<void>>(undefined);

  useEffect(() => {
    if (
      initialQuery &&
      !initialQuerySentRef.current &&
      sessionIdRef.current &&
      handleSendRef.current
    ) {
      initialQuerySentRef.current = true;
      localStorage.removeItem("elena_pending_query");
      handleSendRef.current(initialQuery);
    }
  }, [initialQuery, welcomeMessage]);

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

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  }

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text || input).trim();
      if (!message || isLoading) return;

      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setSuggestions([]);
      setToolLabel(null);

      // Collect document keys from pending uploads before clearing
      const sentFiles = pendingFiles.map((f) => ({ name: f.file.name, key: f.key }));
      const docKeys = pendingFiles.map((f) => f.key);
      setPendingFiles([]);

      // Optimistic user message (with inline attachment indicators)
      const userMsgId = nextId();
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: "user",
          content: message,
          attachments: sentFiles.length > 0 ? sentFiles : undefined,
        },
      ]);
      setChatTitle((prev) => prev || message.slice(0, 60));

      analytics.track("Message Sent", {
        is_first_message: messages.length === 0,
        has_attachment: sentFiles.length > 0,
        message_length: message.length,
      });

      setIsLoading(true);

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
          if (chatResult.error_code === "upgrade_required") {
            setUpgradeReason("upgrade_required");
            setUpgradeFeature(chatResult.gated_feature || undefined);
            setUpgradeOpen(true);
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
            { id: errorId, role: "assistant", content: `Something went wrong: ${error}` },
          ]);
          setToolLabel(null);
          setIsLoading(false);
        },
      );

      // Update session ref from poll result
      if (result?.session_id) {
        sessionIdRef.current = result.session_id;
      }
    },
    [input, isLoading, sendAndPoll, onSessionCreated, welcomeMessage, pendingFiles],
  );

  // Keep ref in sync for auto-send effect
  handleSendRef.current = handleSend;

  return (
    <div
      className="relative flex flex-1 flex-col min-w-0 h-dvh overflow-hidden bg-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} featureName={upgradeFeature} />
      {/* Grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top bar */}
      <div className="flex-shrink-0 relative z-10 flex items-center border-b border-[#E5E5EA]/60 bg-white/80 backdrop-blur-sm px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 h-8 w-8"
          onClick={onToggleSidebar}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-center text-sm font-extrabold text-[#0F1B3D] truncate">
          {chatTitle || ""}
        </span>
        <div className="w-8" />
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
          {/* Welcome state — hidden when there's a pending query */}
          {messages.length === 0 && welcomeHeading && !initialQuery && (
            <div className="flex flex-col items-center text-center py-12 animate-in fade-in duration-500">
              <h2 className="text-2xl font-bold text-[#0F1B3D] mb-3">{welcomeHeading}</h2>
              {welcomeMessage && (
                <p className="text-[0.9rem] leading-relaxed text-[#0F1B3D]/60 max-w-md">
                  {welcomeMessage}
                </p>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  <div className={msg.isStreaming === false || !msg.isStreaming ? "elena-card-enter" : ""}>
                    {/* Show location card if present (pharmacies, labs, etc.), otherwise doctor card */}
                    {msg.locationResults && msg.locationResults.length > 0 ? (
                      <LocationResultsCard
                        locations={msg.locationResults}
                        onCall={(loc) => handleSend(`Call ${loc.name} at ${loc.phone_number}`)}
                      />
                    ) : msg.doctorResults && msg.doctorResults.length > 0 ? (
                      <DoctorResultsCard
                        doctors={msg.doctorResults}
                        onBookDoctor={(doc) => handleSend(`Book an appointment with ${doc.name}`)}
                      />
                    ) : null}
                    {msg.reviewResults && (
                      <ReviewsCard data={msg.reviewResults} />
                    )}
                    {msg.negotiationResult && (
                      <NegotiationCard data={msg.negotiationResult} />
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
                    {msg.webSources && msg.webSources.length > 0 && (
                      <SourcesFooter sources={msg.webSources} />
                    )}
                    {msg.formRequest && (
                      <FormRequestCard
                        form={msg.formRequest}
                        onSubmitted={(data) => {
                          analytics.track("Form Submitted", { form_id: msg.formRequest?.form_id });
                          // Send the submitted data as a user message so Elena can continue
                          const summary = Object.entries(data)
                            .filter(([, v]) => v)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ");
                          if (summary) handleSend(`Here's my info: ${summary}`);
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
            <div className="flex items-center gap-2.5 animate-in fade-in duration-300">
              <span className="h-2 w-2 rounded-full bg-[#0F1B3D]/30 animate-thinking-pulse flex-shrink-0" />
              {toolLabel && (
                <span className="text-[15px] font-semibold text-[#0F1B3D]/40 animate-in fade-in duration-200">
                  {toolLabel}
                </span>
              )}
            </div>
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

          {/* Suggestion chips */}
          {!isLoading && !streamingId && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in duration-500">
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
                  className="rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]/70 shadow-[0_2px_8px_rgba(15,27,61,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[#0F1B3D]/[0.08] hover:-translate-y-px"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollEndRef} className="h-6" />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 relative z-10 mx-auto w-full max-w-2xl px-4 pb-6 pt-2"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
        <div className="flex items-end gap-2 rounded-[28px] border border-[#E5E5EA] bg-white px-2 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.1)] focus-within:border-[#AEAEB2]">
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
            onClick={() => handleSend()}
            disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
          >
            <ArrowUp className="h-4 w-4 text-white" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[0.7rem] text-[#AEAEB2]">
          Elena can make mistakes. Always verify important health information.
        </p>
      </div>
    </div>
  );
}
