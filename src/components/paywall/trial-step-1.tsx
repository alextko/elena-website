"use client";

import { TrialStepShell } from "./trial-step-shell";

interface TrialStep1Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

/**
 * Screen 1 of 3: value-unlock reveal with a phone frame showing the Elena
 * "Game Plan" screenshot. Black CTA "Continue for FREE" advances to step 2.
 *
 * The phone frame CSS is scoped here because this is the only place it
 * appears on the website. Proportions match iPhone 15 Pro (170×365 @ 1:2.15).
 */
export function TrialStep1({ open, onOpenChange, onContinue }: TrialStep1Props) {
  return (
    <TrialStepShell
      open={open}
      onOpenChange={onOpenChange}
      step={1}
      srTitle="Unlock everything in Elena"
      srDescription="Start of the 3-day free trial flow"
      testId="paywall-trial-step-1"
    >
      {/* scoped phone-frame styles */}
      <style jsx>{`
        .device-frame {
          position: relative;
          width: 170px;
          height: 365px;
          flex-shrink: 0;
          background: linear-gradient(145deg, #2a2a2e 0%, #1a1a1c 40%, #252528 100%);
          border-radius: 38px;
          padding: 5px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 0.5px rgba(255, 255, 255, 0.1),
            0 30px 80px rgba(0, 0, 0, 0.35),
            0 15px 35px rgba(0, 0, 0, 0.22),
            0 5px 15px rgba(0, 0, 0, 0.15);
        }
        .device-frame::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 38px;
          background: linear-gradient(165deg, rgba(255, 255, 255, 0.06) 0%, transparent 40%, transparent 80%, rgba(255, 255, 255, 0.03) 100%);
          pointer-events: none;
          z-index: 3;
        }
        .device-screen {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 33px;
          /* Match the game-plan screenshot's near-white bg so there's no
             dark flash while the PNG loads. */
          background: #fafafa;
        }
        .device-screen :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
          display: block;
        }
        /* Bottom-cutoff viewport.
           - Width 330px: 80px of breathing room each side → full side drop
             shadow renders unclipped.
           - Height 350px + phone anchored at top: 40px: the phone's upward
             drop shadow has 40px to fade out before hitting the top edge,
             so the top has NO visible clip line.
           - Phone bottom at 40+365=405 extends past the wrapper's 350 →
             bottom 55px of phone is cleanly cut off (the cutoff line
             falls right past the Village Dental card). */
        .phone-cutoff {
          position: relative;
          width: 330px;
          height: 350px;
          overflow: hidden;
        }
        .phone-cutoff .device-frame {
          position: absolute;
          top: 40px;
          left: 50%;
          transform: translateX(-50%);
        }
        .dynamic-island {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 18px;
          background: #000;
          border-radius: 20px;
          z-index: 5;
        }
        .btn-silent,
        .btn-vol-up,
        .btn-vol-down {
          position: absolute;
          left: -3px;
          width: 3px;
          background: linear-gradient(180deg, #3a3a3e, #2a2a2e, #3a3a3e);
          border-radius: 2px 0 0 2px;
          box-shadow: -1px 0 2px rgba(0, 0, 0, 0.3);
        }
        .btn-silent { top: 95px; height: 24px; }
        .btn-vol-up { top: 140px; height: 44px; }
        .btn-vol-down { top: 195px; height: 44px; }
        .btn-power {
          position: absolute;
          right: -3px;
          top: 160px;
          width: 3px;
          height: 58px;
          background: linear-gradient(180deg, #3a3a3e, #2a2a2e, #3a3a3e);
          border-radius: 0 2px 2px 0;
          box-shadow: 1px 0 2px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <link rel="preload" as="image" href="/images/IMG_0306.PNG" />

      <h1 className="text-[30px] sm:text-[34px] leading-[1.08] font-extrabold tracking-tight text-[#0F1B3D] text-center mt-3 mb-1">
        Unlock everything in Elena, instantly.
      </h1>

      {/* Phone hero — full 365px phone, bottom cut off via the wider wrapper.
          Sides and top render with full shadow (no artifacts). */}
      <div className="flex-1 flex items-start justify-center mt-4">
        <div className="phone-cutoff">
          <div className="device-frame">
            <div className="dynamic-island" />
            <div className="btn-silent" />
            <div className="btn-vol-up" />
            <div className="btn-vol-down" />
            <div className="btn-power" />
            <div className="device-screen">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/IMG_0306.PNG"
                alt="Elena — Game plan"
                loading="eager"
                // @ts-expect-error — valid HTML attribute, not yet in TS DOM types
                fetchpriority="high"
                decoding="sync"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reassurance */}
      <div className="flex items-center justify-center gap-2 mt-4 mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1B3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[15px] font-bold text-[#0F1B3D]">No Payment Due Now</span>
      </div>

      <button
        type="button"
        onClick={onContinue}
        data-testid="paywall-step-1-continue"
        className="w-full rounded-full py-4 text-[16px] font-bold text-white tracking-tight bg-[#0F1B3D] transition-all active:scale-[0.98] active:bg-[#1A3A6E]"
      >
        Continue for FREE
      </button>

      <p className="text-center text-[12.5px] leading-relaxed text-[#0F1B3D]/55 mt-2 px-2">
        Cancel anytime. No payment until trial ends.
      </p>
      <p className="text-center text-[13px] font-medium text-[#0F1B3D]/60 mt-1">
        Just $6.99 per week after trial
      </p>
    </TrialStepShell>
  );
}
