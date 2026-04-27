"use client";

import { useState } from "react";

const DEFAULT_QUERY = "Help bring that down.";

export function OnboardChatBackdrop() {
  const [previewQuery] = useState(() => {
    try {
      const stashed = localStorage.getItem("elena_pending_query");
      if (stashed && stashed.trim()) return stashed.trim();
    } catch {}
    return DEFAULT_QUERY;
  });

  return (
    <div className="absolute inset-0 flex bg-white text-[#0F1B3D]" aria-hidden>
      <div className="hidden h-dvh w-64 flex-shrink-0 flex-col bg-[#f5f7fb] md:flex">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#0F1B3D]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/elena-icon-cropped.png"
              alt=""
              className="h-full w-full object-cover"
              style={{ transform: "scale(1.1)" }}
            />
          </div>
          <span className="flex-1 text-lg font-extrabold text-[#0F1B3D]">elena</span>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="relative h-10 flex-1 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04]" />
          <div className="h-10 w-10 shrink-0 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04]" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-3">
          <p className="px-3 pt-4 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[#0F1B3D]/30">
            Today
          </p>
          <div className="truncate rounded-xl bg-[#0F1B3D]/[0.06] px-3 py-2 text-sm text-[#0F1B3D]/80">
            {previewQuery || "New chat"}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center border-b border-[#0F1B3D]/[0.04] px-5">
          <span className="truncate text-sm font-semibold text-[#0F1B3D]/80">
            {previewQuery || "New chat"}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8">
            {previewQuery && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8ecf4] px-5 py-3 text-[15px] text-[#0F1B3D]">
                  {previewQuery}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#0F1B3D]/40" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#0F1B3D]/40 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#0F1B3D]/40 [animation-delay:300ms]" />
            </div>
            <div className="mt-auto px-2 pb-4">
              <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-full border border-[#0F1B3D]/10 bg-white px-5 py-3 shadow-[0_2px_12px_rgba(15,27,61,0.06)]">
                <span className="text-xl leading-none text-[#0F1B3D]/25">+</span>
                <span className="flex-1 text-[15px] text-[#0F1B3D]/28">Ask Elena anything...</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F1B3D]/35 text-white">
                  ↑
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-[#0F1B3D]/20">
                Elena can make mistakes. Always verify important health information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
