"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelLeft, Plus, ArrowUp } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

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

export function ChatArea({
  onToggleSidebar,
  sidebarOpen,
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Top bar */}
      <div className="flex items-center border-b border-border px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 h-8 w-8"
          onClick={onToggleSidebar}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-center text-sm font-medium text-foreground">
          Help me find a cheaper pharmacy
        </span>
        <div className="w-8" />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
          {MOCK_MESSAGES.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-3xl bg-muted px-5 py-3">
                  <p className="text-[0.9rem] leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div key={msg.id} className="max-w-full">
                <div className="text-[0.9rem] leading-[1.7] text-foreground">
                  {msg.content.split("\n").map((line, i) => (
                    <p key={i} className={line === "" ? "h-3" : "mb-1"}>
                      {renderMarkdown(line)}
                    </p>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2 py-1.5 focus-within:border-muted-foreground/30 transition-colors">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 rounded-full text-muted-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-2"
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
            className="h-8 w-8 flex-shrink-0 rounded-full"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
          Elena can make mistakes. Always verify important health information.
        </p>
      </div>
    </div>
  );
}
