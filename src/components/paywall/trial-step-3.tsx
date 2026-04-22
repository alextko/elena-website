"use client";

import { useMemo, useState } from "react";
import { TrialStepShell } from "./trial-step-shell";

type PlanKey = "standard_annual" | "standard_weekly";

interface TrialStep3Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  /**
   * Fires when the user taps the primary trial CTA. Passes the selected plan
   * and the trial-length override (default 3 days — overridden via the exit
   * sheet for the 7-day offer; this screen always passes 3).
   */
  onStartTrial: (plan: PlanKey, trialDays: number) => void;
  /** Fires when the user taps the "Maybe later" secondary CTA. */
  onMaybeLater: () => void;
  /**
   * Whether a checkout request is in flight. Disables plan taps and swaps CTA
   * copy to "Redirecting..." for feedback.
   */
  loading?: boolean;
}

/**
 * Screen 3 of 3: plan selector + trial timeline + "Start My 3-Day Free
 * Trial" CTA + muted "Maybe later" below a divider. Yearly is the default
 * selection; user can tap Weekly to swap visuals + fine-print text.
 */
export function TrialStep3({
  open,
  onOpenChange,
  onBack,
  onStartTrial,
  onMaybeLater,
  loading = false,
}: TrialStep3Props) {
  // Default to weekly — Stripe Checkout then shows "$6.99/week after trial"
  // instead of the more-aggressive "$179.99/year". Users who want the better
  // deal tap the Yearly card explicitly.
  const [plan, setPlan] = useState<PlanKey>("standard_weekly");

  const isYearly = plan === "standard_annual";

  const finePrint = useMemo(() => {
    return isYearly
      ? "3 days free, then $179.99 per year. Plan auto-renews unless you cancel. Cancel anytime in settings."
      : "3 days free, then $6.99 per week. Plan auto-renews unless you cancel. Cancel anytime in settings.";
  }, [isYearly]);

  const billingLine = isYearly
    ? "You'll be charged $179.99 when the trial ends."
    : "You'll be charged $6.99 when the trial ends.";

  return (
    <TrialStepShell
      open={open}
      onOpenChange={onOpenChange}
      onBack={onBack}
      step={3}
      srTitle="Start your 3-day free trial"
      srDescription="Step 3 of the 3-day free trial flow — select plan and start trial"
      testId="paywall-trial-step-3"
    >
      <style jsx>{`
        .timeline-line {
          position: absolute;
          left: 23px;
          top: 12px;
          bottom: 12px;
          width: 2px;
          background: linear-gradient(180deg, #f4b084 0%, #e8956d 50%, #d1d5db 100%);
          z-index: 0;
        }
        .badge-trial {
          background: linear-gradient(135deg, #0f1b3d 0%, #1a3a6e 100%);
        }
      `}</style>

      <h1 className="text-[28px] sm:text-[32px] leading-[1.05] font-extrabold tracking-tight text-[#0F1B3D] mb-5">
        Start your 3-day <span className="whitespace-nowrap">FREE&nbsp;trial</span> to continue.
      </h1>

      {/* Trial timeline */}
      <div className="relative pl-0 mb-5">
        <div className="timeline-line" />

        <div className="relative flex gap-4 items-start mb-4 z-10">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#F4B084] to-[#E8956D] flex items-center justify-center shadow-[0_2px_10px_rgba(232,149,109,0.4)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          </div>
          <div className="pt-1">
            <div className="text-[16px] font-bold text-[#0F1B3D] leading-tight">Today</div>
            <div className="text-[13px] text-[#0F1B3D]/55 leading-snug mt-0.5">
              Unlock all Elena features — unlimited calls, bill analysis, appeals.
            </div>
          </div>
        </div>

        <div className="relative flex gap-4 items-start mb-4 z-10">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#F4B084] to-[#E8956D] flex items-center justify-center shadow-[0_2px_10px_rgba(232,149,109,0.4)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div className="pt-1">
            <div className="text-[16px] font-bold text-[#0F1B3D] leading-tight">In 2 days — Reminder</div>
            <div className="text-[13px] text-[#0F1B3D]/55 leading-snug mt-0.5">
              We&apos;ll email you before the trial ends so nothing surprises you.
            </div>
          </div>
        </div>

        <div className="relative flex gap-4 items-start z-10">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#0F1B3D] flex items-center justify-center shadow-[0_2px_10px_rgba(15,27,61,0.4)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
              <path d="M5 21h14" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <div className="pt-1">
            <div className="text-[16px] font-bold text-[#0F1B3D] leading-tight">In 3 days — Billing starts</div>
            <div className="text-[13px] text-[#0F1B3D]/55 leading-snug mt-0.5" data-testid="paywall-billing-line">
              {billingLine}
            </div>
          </div>
        </div>
      </div>

      {/* Plan selector — Weekly is the primary/default (user-friendly ask).
          Yearly sits below with a subtle "save $x/yr" badge for those who
          want the better deal. */}
      <div className="space-y-2.5 mb-4">
        <button
          type="button"
          onClick={() => setPlan("standard_weekly")}
          aria-pressed={!isYearly}
          data-testid="paywall-plan-weekly"
          disabled={loading}
          className={`w-full relative rounded-2xl p-4 text-left transition-all ${
            !isYearly
              ? "border-2 border-[#0F1B3D] bg-[#fafafa] shadow-[0_2px_12px_rgba(15,27,61,0.08)]"
              : "border-[1.5px] border-[#E5E5EA] bg-white"
          }`}
        >
          <span className="badge-trial absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide text-white">
            3 DAYS FREE
          </span>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[17px] font-extrabold text-[#0F1B3D] leading-tight">Weekly</div>
              <div className="text-[13px] text-[#0F1B3D]/55 mt-0.5">$6.99 /week · cancel anytime</div>
            </div>
            {!isYearly ? (
              <div className="w-7 h-7 rounded-full bg-[#0F1B3D] flex items-center justify-center shadow-[0_2px_6px_rgba(15,27,61,0.25)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-[#E5E5EA]" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setPlan("standard_annual")}
          aria-pressed={isYearly}
          data-testid="paywall-plan-yearly"
          disabled={loading}
          className={`w-full relative rounded-2xl p-3.5 text-left transition-all hover:border-[#0F1B3D]/30 ${
            isYearly
              ? "border-2 border-[#0F1B3D] bg-[#fafafa] shadow-[0_2px_12px_rgba(15,27,61,0.08)]"
              : "border-[1.5px] border-[#E5E5EA] bg-white"
          }`}
        >
          <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-[#E8956D] to-[#F4B084] px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide text-white shadow-sm">
            SAVE 52%
          </span>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold text-[#0F1B3D] leading-tight">Yearly</div>
              <div className="text-[12px] text-[#0F1B3D]/50 mt-0.5">$3.46 /week · billed $179.99/year</div>
            </div>
            {isYearly ? (
              <div className="w-7 h-7 rounded-full bg-[#0F1B3D] flex items-center justify-center shadow-[0_2px_6px_rgba(15,27,61,0.25)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-[#E5E5EA]" />
            )}
          </div>
        </button>
      </div>

      {/* No Payment Due Now */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-[#0F1B3D] flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="text-[14px] font-semibold text-[#0F1B3D]">No Payment Due Now</span>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        disabled={loading}
        onClick={() => onStartTrial(plan, 3)}
        data-testid="paywall-start-trial"
        className="w-full rounded-full py-4 text-[16px] font-bold text-white tracking-tight bg-[#0F1B3D] transition-all active:scale-[0.98] active:bg-[#1A3A6E] disabled:opacity-60"
      >
        {loading ? "Redirecting..." : "Start My 3-Day Free Trial"}
      </button>

      {/* Fine print */}
      <p
        className="text-center text-[11.5px] leading-relaxed text-[#0F1B3D]/50 mt-3 px-2"
        data-testid="paywall-fine-print"
      >
        {finePrint}
      </p>

      {/* Footer links */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[11.5px] text-[#0F1B3D]/40 font-medium">
        <a href="/terms-of-service" className="hover:text-[#0F1B3D]/70">Terms</a>
        <span>·</span>
        <a href="/privacy-policy" className="hover:text-[#0F1B3D]/70">Privacy</a>
        <span>·</span>
        <button type="button" className="hover:text-[#0F1B3D]/70" onClick={() => onOpenChange(false)}>Restore</button>
      </div>

      {/* Maybe later — below a divider, muted, generous tap target */}
      <div className="mt-6 pt-4 border-t border-[#E5E5EA] text-center">
        <button
          type="button"
          onClick={onMaybeLater}
          data-testid="paywall-maybe-later"
          className="text-[13px] text-[#0F1B3D]/45 hover:text-[#0F1B3D]/75 font-medium px-6 py-2 rounded-lg"
        >
          Maybe later
        </button>
      </div>
    </TrialStepShell>
  );
}
