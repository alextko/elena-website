"use client";

import { useEffect } from "react";

export type ExitOffer = "extended_7_day_trial" | "remind_tomorrow";

interface ExitIntentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fires when user accepts an exit offer. "extended_7_day_trial" should
   * trigger the 7-day Stripe checkout; "remind_tomorrow" should close the sheet
   * and schedule an email via the onboarding-nudge system (TBD, deferred).
   */
  onAccept: (offer: ExitOffer) => void;
  /**
   * Fires when user taps "No thanks" — truly dismisses and exits the paywall.
   */
  onDismiss: () => void;
  loading?: boolean;
}

/**
 * Bottom-sheet shown after the user taps "Maybe later" on trial step 3.
 * Three tiers: (1) extended 7-day trial — primary, biggest visual weight;
 * (2) remind tomorrow — neutral; (3) no thanks — muted text-only, the only
 * true dismiss. Rendered as an absolutely-positioned sheet via fixed
 * positioning to avoid Dialog conflicts with the underlying Step 3 modal.
 */
export function ExitIntentSheet({
  open,
  onOpenChange,
  onAccept,
  onDismiss,
  loading = false,
}: ExitIntentSheetProps) {
  // Lock body scroll while open for a true modal feel
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 bg-[rgba(10,15,31,0.55)] backdrop-blur-[4px] z-[100] transition-opacity"
        onClick={() => onOpenChange(false)}
        data-testid="paywall-exit-sheet-backdrop"
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wait — still deciding?"
        data-testid="paywall-exit-sheet"
        className="fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-[0_-16px_50px_rgba(0,0,0,0.3)] z-[101] max-w-[420px] mx-auto animate-[slideUp_0.28s_cubic-bezier(0.32,0.72,0,1)_forwards]"
        style={{ animationFillMode: "forwards" }}
      >
        <style jsx>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>

        <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mt-3" aria-hidden />

        <div className="px-6 pt-5 pb-6">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#F4B084] to-[#E8956D] mb-3 shadow-[0_4px_14px_rgba(232,149,109,0.45)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h2 className="text-[22px] font-extrabold tracking-tight text-[#0F1B3D]">
              Wait — still deciding?
            </h2>
            <p className="text-[13px] text-[#0F1B3D]/60 mt-1 leading-relaxed">
              We get it. Here&apos;s a little more time to try Elena for free.
            </p>
          </div>

          {/* Primary: extended 7-day trial */}
          <button
            type="button"
            onClick={() => onAccept("extended_7_day_trial")}
            disabled={loading}
            data-testid="paywall-exit-accept-7day"
            className="w-full rounded-2xl px-4 py-4 text-left mb-2.5 relative border-2 border-[#E8956D] disabled:opacity-60 transition-transform active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg,#FDF8F5 0%,#FFFFFF 100%)" }}
          >
            <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-[#E8956D] to-[#F4B084] px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wide shadow-sm">
              BEST OFFER
            </span>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-extrabold text-[#0F1B3D] leading-tight">
                  Extended 7-day trial
                </div>
                <div className="text-[12px] text-[#0F1B3D]/60 mt-0.5">
                  $6.99/week after, still free to cancel
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8956D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </button>

          {/* Secondary: remind tomorrow */}
          <button
            type="button"
            onClick={() => onAccept("remind_tomorrow")}
            disabled={loading}
            data-testid="paywall-exit-accept-remind"
            className="w-full rounded-2xl border border-[#E5E5EA] bg-white px-4 py-4 text-left mb-2.5 hover:border-[#0F1B3D]/30 transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-[#0F1B3D] leading-tight">Remind me tomorrow</div>
                <div className="text-[12px] text-[#0F1B3D]/55 mt-0.5">
                  We&apos;ll send you one email so you don&apos;t forget
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1B3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </button>

          {/* Tertiary: true dismiss */}
          <button
            type="button"
            onClick={onDismiss}
            disabled={loading}
            data-testid="paywall-exit-dismiss"
            className="w-full text-center py-3 text-[13px] text-[#0F1B3D]/40 hover:text-[#0F1B3D]/70 font-medium disabled:opacity-60"
          >
            No thanks, continue with limited access
          </button>
        </div>
      </div>
    </>
  );
}
