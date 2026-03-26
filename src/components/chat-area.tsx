"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PanelLeft, Plus, ArrowUp, Paperclip, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { usePollChat } from "@/hooks/usePollChat";
import {
  DoctorResultsCard,
  LocationResultsCard,
  ReviewsCard,
  SavingsCard,
  NegotiationCard,
  SourcesFooter,
} from "@/components/chat-cards";
import type {
  ChatMessageItem,
  WelcomeResponse,
  ChatResponse,
  DoctorResult,
  LocationResult,
  ReviewResult,
  SourcePayload,
  BillAnalysis,
  NegotiationResult,
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
  billAnalysis?: BillAnalysis | null;
  negotiationResult?: NegotiationResult | null;
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
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  activeSessionId: string | null;
  onSessionCreated: (id: string) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sessionIdRef = useRef<string | null>(activeSessionId);
  const hasCreatedSessionRef = useRef(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const { sendAndPoll, cancel } = usePollChat();
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
    } else {
      // New chat — fetch welcome
      sessionIdRef.current = null;
      fetchWelcome();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

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
          billAnalysis: m.bill_analysis,
          negotiationResult: m.negotiation_result,
        }));
      setMessages(mapped);
      // Set title from first user message
      const firstUser = data.find((m) => m.role === "user");
      if (firstUser) setChatTitle(firstUser.text.slice(0, 60));
    } catch {
      // Network error — show empty
    }
  }

  async function fetchWelcome() {
    try {
      const res = await apiFetch("/chat/welcome", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const data: WelcomeResponse = await res.json();
      setWelcomeHeading(data.heading);
      setWelcomeMessage(data.message);
      setSuggestions(data.suggestions);
      sessionIdRef.current = data.session_id;
    } catch {
      // Fallback — show empty state
      setSuggestions(["What can you help me with?", "Find a cheaper pharmacy", "Help with my insurance"]);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // We need a session_id to upload — use the ref or create a placeholder
    const sid = sessionIdRef.current || "pending";
    setUploading(true);

    const uploaded: { file: File; key: string }[] = [];
    for (const file of Array.from(files)) {
      try {
        // 1. Get presigned URL
        const urlRes = await apiFetch("/documents/upload-url", {
          method: "POST",
          body: JSON.stringify({ session_id: sid, filename: file.name }),
        });
        if (!urlRes.ok) continue;
        const { upload_url, key, content_type, required_headers } = await urlRes.json();

        // 2. Upload file to S3
        const headers: Record<string, string> = { "Content-Type": content_type, ...required_headers };
        await fetch(upload_url, { method: "PUT", body: file, headers });

        uploaded.push({ file, key });
      } catch {
        // Skip failed uploads
      }
    }

    setPendingFiles((prev) => [...prev, ...uploaded]);
    setUploading(false);
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  function removePendingFile(key: string) {
    setPendingFiles((prev) => prev.filter((f) => f.key !== key));
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
              billAnalysis: undefined,
              negotiationResult: undefined,
            },
          ]);
          setStreamingId(assistantId);
          setSuggestions(chatResult.suggestions || []);
          setToolLabel(null);
          setIsLoading(false);

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

  return (
    <div className="relative flex flex-1 flex-col min-w-0 h-dvh overflow-hidden bg-white">
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
          {chatTitle || "New Chat"}
        </span>
        <div className="w-8" />
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
          {/* Welcome state */}
          {messages.length === 0 && welcomeHeading && (
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
                {/* Structured result cards */}
                {msg.doctorResults && msg.doctorResults.length > 0 && (
                  <DoctorResultsCard doctors={msg.doctorResults} />
                )}
                {msg.locationResults && msg.locationResults.length > 0 && (
                  <LocationResultsCard locations={msg.locationResults} />
                )}
                {msg.reviewResults && (
                  <ReviewsCard data={msg.reviewResults} />
                )}
                {msg.billAnalysis && (
                  <SavingsCard data={msg.billAnalysis} />
                )}
                {msg.negotiationResult && (
                  <NegotiationCard data={msg.negotiationResult} />
                )}
                {msg.webSources && msg.webSources.length > 0 && (
                  <SourcesFooter sources={msg.webSources} />
                )}
              </div>
            )
          )}

          {/* Tool progress indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 animate-in fade-in duration-300">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-[#0F1B3D]/30 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-[#0F1B3D]/30 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-[#0F1B3D]/30 animate-bounce [animation-delay:300ms]" />
              </div>
              {toolLabel && (
                <span className="text-sm text-[#0F1B3D]/40 animate-in fade-in duration-200">
                  {toolLabel}
                </span>
              )}
            </div>
          )}

          {/* Suggestion chips */}
          {!isLoading && !streamingId && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in duration-500">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]/70 shadow-[0_2px_8px_rgba(15,27,61,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[#0F1B3D]/[0.08] hover:-translate-y-px"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 relative z-10 mx-auto w-full max-w-2xl px-4 pb-6 pt-2">
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
            accept="image/*,.pdf,.jpg,.jpeg,.png,.heic"
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
