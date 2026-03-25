"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelLeft, Plus, ArrowUp } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Transfer my prescription",
  "What's my copay?",
  "Find a cheaper option",
];

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Can you help me find a cheaper pharmacy for my Lipitor refill?",
  },
  {
    id: "2",
    role: "assistant",
    content: `I checked your insurance and searched 4 pricing databases. Here's what I found for generic atorvastatin (Lipitor):

**Costco Pharmacy** — $4.20/mo (no membership needed for pharmacy)
**Rx Outreach (mail order)** — $6.00/mo
**CVS with your insurance** — $12.00/mo
**Walgreens with GoodRx** — $8.50/mo

Costco is your best bet at $4.20/month. Want me to transfer your prescription there? I can call them now.`,
  },
  {
    id: "3",
    role: "user",
    content: "Yes, please transfer it to Costco!",
  },
  {
    id: "4",
    role: "assistant",
    content: `On it! I'll call Costco Pharmacy to transfer your atorvastatin prescription. This usually takes about 24 hours. I'll let you know when it's ready for pickup.

You'll be saving **$7.80/month** compared to your current CVS price. That's $93.60 a year back in your pocket. 💰`,
  },
];

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// Streaming text component — reveals text character by character, snapping to word boundaries
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
      // Snap to word boundary
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
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  const [input, setInput] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>("4"); // Last message streams

  return (
    <div className="relative flex flex-1 flex-col min-w-0 bg-[#F7F6F2]">
      {/* Grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Warm peach glow */}
      <div
        className="pointer-events-none absolute right-[-200px] top-[10%] h-[600px] w-[600px] rounded-full opacity-30 z-0"
        style={{
          background: "radial-gradient(circle, #F4B084 0%, #E8956D 30%, transparent 70%)",
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center border-b border-[#E5E5EA]/60 bg-[#F7F6F2]/80 backdrop-blur-sm px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 h-8 w-8"
          onClick={onToggleSidebar}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-center text-sm font-medium text-[#0F1B3D]">
          Help me find a cheaper pharmacy
        </span>
        <div className="w-8" />
      </div>

      {/* Messages */}
      <ScrollArea className="relative z-10 flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
          {MOCK_MESSAGES.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-white px-5 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
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
              </div>
            )
          )}

          {/* Suggestion chips */}
          {!streamingId && (
            <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in duration-500">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-[#0F1B3D] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:-translate-y-px"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-6 pt-2">
        <div className="flex items-center gap-2 rounded-[28px] border border-[#E5E5EA] bg-white px-2 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.1)] focus-within:border-[#AEAEB2]">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 rounded-full text-[#AEAEB2] hover:text-[#0F1B3D]"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <input
            className="flex-1 bg-transparent text-sm text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] py-2"
            placeholder="Ask Elena anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
              }
            }}
          />
          <Button
            size="icon"
            className="h-[34px] w-[34px] flex-shrink-0 rounded-full bg-[#0F1B3D] hover:bg-[#0F1B3D]/90"
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
