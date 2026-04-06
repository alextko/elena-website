"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

interface ProgressBarProps {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  showBack?: boolean;
}

export function ProgressBar({ step, totalSteps, onBack, showBack = true }: ProgressBarProps) {
  const progress = Math.max(0, step / totalSteps);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Progress track */}
      <div className="h-1 bg-[#0F1B3D]/[0.06]">
        <motion.div
          className="h-full rounded-r-full"
          style={{ background: "linear-gradient(90deg, #0F1B3D, #2E6BB5)" }}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>

      {/* Back button */}
      {showBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-[#0F1B3D] hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
