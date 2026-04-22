"use client";

/**
 * "Setting up your profile" loading card. Rendered as part of the same
 * dim-backdrop + white-card shell the rest of the tour uses so the
 * transition from auth → flushing → chat reads as one continuous flow,
 * not a modal interruption.
 *
 * The progress value is driven externally (/onboard owns the FlushStage
 * state + onProgress callback on flushTourBuffer). The bar uses CSS
 * transitions on width so each stage tick eases smoothly.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { FlushStage } from "@/lib/tourBuffer";

const STAGE_LABELS: Record<FlushStage, string> = {
  saving_profile: "Setting up your profile…",
  creating_family: "Adding your family…",
  switching_profile: "Pulling everything together…",
  saving_health_data: "Building your care plan…",
  loading_chat: "Getting Elena ready to help…",
  done: "All set — let's get going…",
};

export function OnboardingFlushingScreen({
  stage,
  percent,
}: {
  stage: FlushStage;
  percent: number;
}) {
  // Hold the label briefly between stage transitions so fast stages don't
  // flash by too quickly to read.
  const [displayLabel, setDisplayLabel] = useState(STAGE_LABELS[stage]);
  useEffect(() => {
    const t = setTimeout(() => setDisplayLabel(STAGE_LABELS[stage]), 60);
    return () => clearTimeout(t);
  }, [stage]);

  // Minimum visible bar width so an empty bar still reads as "in motion"
  // on a fast flush.
  const clampedPercent = Math.max(8, Math.min(100, percent));
  const motionEase = [0.4, 0, 0.2, 1] as const;

  return (
    <motion.div
      className="fixed inset-0 z-[100002] flex items-center justify-center font-[family-name:var(--font-inter)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: motionEase }}
    >
      {/* Matches the tour shell's dim-blur backdrop — continuity with the
          auth card that was just visible under this overlay. */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: motionEase, delay: 0.08 }}
        className="relative z-10 w-[calc(100%-3rem)] max-w-md rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,27,61,0.15)] p-5 sm:p-7 flex flex-col items-center justify-center gap-5 min-h-[380px] sm:min-h-[440px]"
      >
        {/* Spinner — navy to match the tour palette, not white-on-gradient. */}
        <div className="relative flex items-center justify-center w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-[#0F1B3D]/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#0F1B3D] animate-spin" />
        </div>

        <div className="text-center">
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] text-balance leading-tight mb-2">
            Building your care plan
          </h2>
          <p className="text-[14px] text-[#8E8E93] font-light leading-relaxed text-balance max-w-[18rem] mx-auto">
            Pulling your profile, meds, and game plan together so Elena can
            pick up exactly where we left off.
          </p>
        </div>

        <div className="w-full max-w-[20rem] mt-1">
          {/* Progress bar — navy track/fill so it reads as the same brand
              system as the Continue buttons throughout the tour. */}
          <div className="h-1.5 rounded-full bg-[#0F1B3D]/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0F1B3D] transition-[width] duration-500 ease-out"
              style={{ width: `${clampedPercent}%` }}
            />
          </div>
          <p className="text-[12px] font-medium text-[#0F1B3D]/55 mt-3 min-h-[1.25rem] text-center">
            {displayLabel}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
