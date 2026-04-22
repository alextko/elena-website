"use client";

/**
 * "Setting up your profile" loading card. Minimal: just a progress bar
 * with a percentage + rolling stage label underneath. No spinner, no
 * headline — the bar + percent IS the signal.
 *
 * Rendered inside the same dim-backdrop + white-card shell as the rest
 * of the tour so the transition from auth → flushing → chat feels
 * continuous.
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
  done: "All set — let's go…",
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

  // Visible percent animates continuously between stage jumps instead of
  // snapping. Each render target comes from the flush progress callback;
  // we chase it at ~1% / 30ms so the number + bar tick visibly during
  // longer stages instead of freezing at the last reported value.
  const targetPercent = Math.max(4, Math.min(100, percent));
  const [displayPercent, setDisplayPercent] = useState(targetPercent);
  useEffect(() => {
    if (displayPercent === targetPercent) return;
    const t = setTimeout(() => {
      setDisplayPercent((prev) => {
        if (prev < targetPercent) return Math.min(prev + 1, targetPercent);
        if (prev > targetPercent) return Math.max(prev - 2, targetPercent);
        return prev;
      });
    }, 30);
    return () => clearTimeout(t);
  }, [displayPercent, targetPercent]);
  const clampedPercent = Math.round(displayPercent);
  const motionEase = [0.4, 0, 0.2, 1] as const;

  return (
    <motion.div
      className="fixed inset-0 z-[100002] flex items-center justify-center font-[family-name:var(--font-inter)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: motionEase }}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: motionEase, delay: 0.08 }}
        className="relative z-10 w-[calc(100%-3rem)] max-w-md rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,27,61,0.15)] p-6 sm:p-7"
      >
        <div className="flex items-baseline justify-between mb-2.5">
          <p className="text-[13px] font-semibold text-[#0F1B3D]">{displayLabel}</p>
          <p className="text-[14px] font-extrabold text-[#0F1B3D] tabular-nums">
            {clampedPercent}%
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-[#0F1B3D]/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0F1B3D] transition-[width] duration-500 ease-out"
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
