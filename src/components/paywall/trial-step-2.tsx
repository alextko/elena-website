"use client";

import { TrialStepShell } from "./trial-step-shell";

interface TrialStep2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Screen 2 of 3: reminder reassurance. Big soft-gray bell with red "1"
 * notification badge. Matches the Cal AI reference the user approved.
 */
export function TrialStep2({ open, onOpenChange, onContinue, onBack }: TrialStep2Props) {
  return (
    <TrialStepShell
      open={open}
      onOpenChange={onOpenChange}
      onBack={onBack}
      step={2}
      srTitle="We'll send you a reminder"
      srDescription="Step 2 of the 3-day free trial flow"
      testId="paywall-trial-step-2"
    >
      <h1 className="text-[28px] sm:text-[32px] leading-[1.1] font-extrabold tracking-tight text-[#0F1B3D] text-center mt-2">
        We&apos;ll send you a reminder before your free trial ends.
      </h1>

      <div className="flex-1 flex items-center justify-center py-6 min-h-[260px]">
        <div className="relative">
          <svg width="180" height="180" viewBox="0 0 24 24" fill="#E5E5EA" stroke="#E5E5EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" fill="#E5E5EA" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" fill="#E5E5EA" />
          </svg>
          <div className="absolute top-2 right-1 w-14 h-14 rounded-full bg-[#EF4444] flex items-center justify-center shadow-[0_6px_20px_rgba(239,68,68,0.45)] border-[3px] border-white">
            <span className="text-[22px] font-extrabold text-white leading-none">1</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3 mt-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1B3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[15px] font-bold text-[#0F1B3D]">No Payment Due Now</span>
      </div>

      <button
        type="button"
        onClick={onContinue}
        data-testid="paywall-step-2-continue"
        className="w-full rounded-full py-4 text-[16px] font-bold text-white tracking-tight bg-[#0F1B3D] transition-all active:scale-[0.98] active:bg-[#1A3A6E]"
      >
        Continue for FREE
      </button>

      <p className="text-center text-[12.5px] leading-relaxed text-[#0F1B3D]/55 mt-3 px-2">
        Cancel anytime in settings. No payment until trial ends.
      </p>
      <p className="text-center text-[13px] font-medium text-[#0F1B3D]/60 mt-1">
        Just $6.99 per week after trial
      </p>
    </TrialStepShell>
  );
}
