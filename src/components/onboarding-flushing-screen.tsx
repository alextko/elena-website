"use client";

/**
 * Full-screen "Setting up your profile" loader that covers the tour
 * shell while flushTourBuffer runs post-signup. Shows a stage label +
 * animated progress bar so the user sees work happening instead of a
 * frozen elena-plan card behind a dim spinner.
 *
 * The progress value is driven externally (/onboard page owns the
 * FlushStage state and passes it in). The bar uses CSS transitions
 * on width so each stage tick eases smoothly — no library needed.
 */

import { useEffect, useState } from "react";
import type { FlushStage } from "@/lib/tourBuffer";

const STAGE_LABELS: Record<FlushStage, string> = {
  saving_profile: "Saving your information…",
  creating_family: "Creating your family's profiles…",
  switching_profile: "Switching to the right profile…",
  saving_health_data: "Saving your health data…",
  loading_chat: "Loading your chat…",
  done: "All set — opening Elena…",
};

export function OnboardingFlushingScreen({
  stage,
  percent,
}: {
  stage: FlushStage;
  percent: number;
}) {
  // Clamp progress to a visible minimum so the bar always reads as
  // "in motion" even on a fast flush. Also hold the label briefly
  // between stage transitions so fast stages don't flash by.
  const [displayLabel, setDisplayLabel] = useState(STAGE_LABELS[stage]);
  useEffect(() => {
    const t = setTimeout(() => setDisplayLabel(STAGE_LABELS[stage]), 60);
    return () => clearTimeout(t);
  }, [stage]);

  const clampedPercent = Math.max(8, Math.min(100, percent));

  return (
    <div className="fixed inset-0 z-[100002] flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Gradient background matching the landing hero so the transition
          from tour → this screen → chat feels like one app. */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 100%)",
        }}
      />
      {/* Subtle radial highlight behind the text for depth. */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-5 max-w-sm w-full text-center">
        {/* Elena wordmark / logo placeholder — keeps brand present during
            the wait. Circle with an "E" is lightweight; swap for real
            logo asset later if desired. */}
        <div className="w-14 h-14 rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center mb-1">
          <span className="text-white text-[22px] font-extrabold tracking-tight">E</span>
        </div>

        <h1 className="text-white text-[26px] sm:text-[28px] font-extrabold tracking-tight leading-tight text-balance">
          Setting up your profile
        </h1>
        <p className="text-white/70 text-[14px] leading-relaxed text-balance max-w-xs">
          Hang tight — Elena's getting everything organized so you can hit
          the ground running.
        </p>

        {/* Progress bar. Width animates via CSS transition; track is
            softly tinted so an empty bar is still visible. */}
        <div className="w-full mt-2">
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
              style={{ width: `${clampedPercent}%` }}
            />
          </div>
          <p className="text-white/55 text-[12px] font-medium mt-3 min-h-[1.25rem]">
            {displayLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
