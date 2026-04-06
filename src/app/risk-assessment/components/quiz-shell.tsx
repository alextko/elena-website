"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressBar } from "./progress-bar";

interface QuizShellProps {
  step: number;
  direction: 1 | -1;
  onBack?: () => void;
  children: ReactNode;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export function QuizShell({ step, direction, onBack, children }: QuizShellProps) {
  const isIntro = step === 0;
  const isInterstitial = [3, 6, 8].includes(step);
  const isTeaser = step === 11;
  const isResults = step === 12;
  const showProgress = !isIntro && !isInterstitial && !isTeaser && !isResults;

  return (
    <div className={`min-h-dvh flex flex-col font-[family-name:var(--font-inter)] ${showProgress ? "bg-[#F7F6F2]" : ""}`}>
      {showProgress && (
        <ProgressBar
          step={step}
          totalSteps={10}
          onBack={onBack}
          showBack={step >= 1}
        />
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1 flex flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
