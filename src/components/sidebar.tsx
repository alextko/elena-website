"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search } from "lucide-react";

const HISTORY = {
  Today: [
    "Help me find a cheaper pharmacy",
    "Insurance EOB question",
    "Schedule dentist appointment",
  ],
  Yesterday: [
    "Negotiate my hospital bill",
    "What does my deductible mean",
  ],
  "Last week": [
    "Compare PCP doctors near me",
    "Refill prescription reminder",
  ],
};

export function Sidebar() {
  return (
    <div className="flex w-64 flex-shrink-0 flex-col overflow-hidden border-r border-[#E5E5EA]/50 bg-[#F0EFED]/70 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img
          src="/images/elena-icon-cropped.png"
          alt="Elena"
          className="h-8 w-8 rounded-lg"
        />
        <span className="text-base font-semibold text-foreground">elena</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-0.5 px-3">
        <Button variant="ghost" className="justify-start gap-2.5 text-sm font-normal">
          <Plus className="h-4 w-4 text-muted-foreground" />
          New Chat
        </Button>
        <Button variant="ghost" className="justify-start gap-2.5 text-sm font-normal">
          <Search className="h-4 w-4 text-muted-foreground" />
          Search
        </Button>
      </div>

      <Separator className="my-2 mx-5" />

      {/* History */}
      <ScrollArea className="flex-1 px-3">
        {Object.entries(HISTORY).map(([label, items]) => (
          <div key={label}>
            <p className="px-3 pt-3 pb-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            {items.map((item, i) => (
              <button
                key={i}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                  i === 0 && label === "Today" ? "bg-accent font-medium" : ""
                }`}
              >
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        ))}
      </ScrollArea>

      <Separator />

      {/* User */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">AR</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Alex Reinhart</p>
          <p className="truncate text-xs text-muted-foreground">alex@example.com</p>
        </div>
      </div>
    </div>
  );
}
