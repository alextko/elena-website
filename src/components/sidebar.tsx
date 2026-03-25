"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
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
    <div className="flex w-64 flex-shrink-0 flex-col overflow-hidden bg-[#f5f7fb]">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <img
          src="/images/elena-icon-cropped.png"
          alt="Elena"
          className="h-8 w-8 rounded-lg"
        />
        <span className="text-lg font-extrabold text-[#0F1B3D]">elena</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 px-4 pb-3">
        <button className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04] py-2.5 text-sm font-medium text-[#0F1B3D]/70 shadow-[0_2px_8px_rgba(15,27,61,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[#0F1B3D]/[0.08]">
          <Plus className="h-4 w-4" />
          New Chat
        </button>
        <button className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04] py-2.5 text-sm font-medium text-[#0F1B3D]/70 shadow-[0_2px_8px_rgba(15,27,61,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[#0F1B3D]/[0.08]">
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      {/* History */}
      <ScrollArea className="flex-1 px-3">
        {Object.entries(HISTORY).map(([label, items]) => (
          <div key={label}>
            <p className="px-3 pt-4 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[#0F1B3D]/30">
              {label}
            </p>
            {items.map((item, i) => (
              <button
                key={i}
                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-[0.8rem] transition-colors hover:bg-[#0F1B3D]/[0.06] ${
                  i === 0 && label === "Today" ? "bg-[#0F1B3D]/[0.06] font-medium text-[#0F1B3D]" : "text-[#0F1B3D]/60"
                }`}
              >
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        ))}
      </ScrollArea>

      {/* User */}
      <div className="flex items-center gap-2.5 border-t border-[#0F1B3D]/[0.06] px-5 py-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-[#0F1B3D]/[0.06] text-xs font-semibold text-[#0F1B3D]/50">AR</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0F1B3D]">Alex Reinhart</p>
          <p className="truncate text-xs text-[#0F1B3D]/40">alex@example.com</p>
        </div>
      </div>
    </div>
  );
}
