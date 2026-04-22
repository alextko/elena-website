"use client";

/**
 * Post-signup flush content. Renders inside WebOnboardingTour's shell as
 * a phase (not as a separate overlay), so the transition from auth →
 * flushing → ready feels like the same card morphing its content rather
 * than a new modal popping up on top.
 *
 * Starts as a progress bar + rolling stage label; once the flush hits
 * 100 + stage="done" it morphs into a pain-relief affirmation + Continue
 * button so the user gets one more "you're about to get [hours/dollars]
 * back" beat before landing in chat.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FlushStage } from "@/lib/tourBuffer";

const STAGE_LABELS: Record<FlushStage, string> = {
  saving_profile: "Setting up your profile…",
  creating_family: "Adding your family…",
  switching_profile: "Pulling everything together…",
  saving_health_data: "Building your care plan…",
  loading_chat: "Getting Elena ready to help…",
  done: "All set.",
};

export interface PainAffirmation {
  headline: string;
  subtitle: string;
}

export function OnboardingFlushingContent({
  stage,
  percent,
  affirmation,
  onContinue,
}: {
  stage: FlushStage;
  percent: number;
  /** Pain-relief copy shown once the bar hits 100%. Caller derives this
   *  from the user's pain selection so the closing beat matches the
   *  promise we made during the value step. */
  affirmation: PainAffirmation;
  /** Fired when the user clicks Continue on the finished state.
   *  /onboard wires this to navigate to /chat. */
  onContinue: () => void;
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

  // Once the displayed bar hits 100, flip to the ready state. We wait
  // on the DISPLAYED value (not the target) so the bar visibly reaches
  // the end before the affirmation takes over.
  const isReady = clampedPercent >= 100 && stage === "done";

  // Deliverables list shown below the progress bar — preview of what the
  // user will have once the flush completes. Mirrors Cal AI's loading
  // screen where the list sells the outcome while the bar ticks.
  const SETUP_ITEMS = [
    "Your health profile",
    "Your care plan",
    "Your next actions",
    "Your medication schedule",
    "Elena, ready to help",
  ];

  return (
    <div className="p-5 sm:p-7 flex flex-col min-h-[380px] sm:min-h-[440px]">
      <AnimatePresence mode="wait" initial={false}>
        {!isReady ? (
          <motion.div
            key="flushing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: motionEase }}
            className="flex-1 flex flex-col"
          >
            {/* Big percent + headline block */}
            <div className="text-center pt-2">
              <p className="text-[56px] sm:text-[64px] font-extrabold leading-none tracking-tight text-[#0F1B3D] tabular-nums">
                {clampedPercent}%
              </p>
              <h2 className="text-[20px] sm:text-[22px] font-extrabold text-[#0F1B3D] mt-3 leading-tight text-balance">
                We're setting everything up for you
              </h2>
            </div>
            {/* Gradient progress bar */}
            <div className="mt-5 h-1.5 rounded-full bg-[#0F1B3D]/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${clampedPercent}%`,
                  background: "linear-gradient(90deg, #B5707A 0%, #2E6BB5 60%, #0F1B3D 100%)",
                }}
              />
            </div>
            {/* Current stage */}
            <p className="text-center text-[13px] text-[#5a6a82] mt-3">
              {displayLabel}
            </p>
            {/* Deliverables list — pushed to the bottom of the card */}
            <div className="mt-auto pt-6">
              <p className="text-[13px] font-semibold text-[#0F1B3D] mb-2">
                Setting up for you
              </p>
              <ul className="flex flex-col gap-1 text-[14px] text-[#0F1B3D]/85 font-light">
                {SETUP_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="text-[#0F1B3D]/50 leading-none">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: motionEase, delay: 0.1 }}
            className="flex-1 text-center flex flex-col items-center justify-center gap-4"
          >
            {/* Single check chip in the brand green to close the
                "we just did it" beat before the Continue button. */}
            <span className="w-10 h-10 rounded-full bg-[#34C759] flex items-center justify-center shadow-[0_4px_14px_rgba(52,199,89,0.35)]">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <div>
              <h2 className="text-[22px] font-extrabold text-[#0F1B3D] text-balance leading-tight mb-2">
                {affirmation.headline}
              </h2>
              <p className="text-[14px] text-[#8E8E93] font-light leading-relaxed text-balance max-w-[20rem] mx-auto">
                {affirmation.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onContinue}
              className="w-full mt-2 py-3 rounded-full text-white font-semibold text-[15px] transition-opacity hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
              style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
            >
              Continue
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
