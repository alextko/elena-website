"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TrialStepShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user taps the back arrow. Omit to hide the arrow. */
  onBack?: () => void;
  /** 1-indexed step position among the three buildup screens. */
  step: 1 | 2 | 3;
  /** Screen title for accessibility (sr-only). */
  srTitle: string;
  /** Screen description for accessibility (sr-only). */
  srDescription: string;
  children: ReactNode;
  /** Aria label for the entire dialog. */
  testId?: string;
}

/**
 * Shared chrome for the 3-screen trial buildup flow.
 * Hosts the Dialog, the back arrow + elena wordmark top-left, and the bottom
 * step-indicator dots. Inner content flows inside a scrollable white panel.
 */
export function TrialStepShell({
  open,
  onOpenChange,
  onBack,
  step,
  srTitle,
  srDescription,
  children,
  testId,
}: TrialStepShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        data-testid={testId}
        className="w-[calc(100%-2rem)] max-w-[420px] sm:w-full sm:max-w-[420px] h-[100dvh] sm:h-auto sm:max-h-[calc(100svh-1rem)] overflow-hidden rounded-none sm:rounded-3xl border-0 bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.25)] flex flex-col"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{srTitle}</DialogTitle>
          <DialogDescription>{srDescription}</DialogDescription>
        </DialogHeader>

        {/* Top bar — consolidated brand + back arrow. pt-safe respects iOS
            notch; vertical rhythm matches Cal AI ≈24px below logo. */}
        <div className="flex items-center gap-3 px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3 flex-shrink-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              data-testid="paywall-back"
              className="w-8 h-8 flex items-center justify-center text-[#0F1B3D]/70 hover:text-[#0F1B3D] transition"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <div className="w-8 h-8" aria-hidden />
          )}
          <span
            className="text-[18px] text-[#0F1B3D] font-normal italic"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif', letterSpacing: "-0.02em" }}
          >
            elena{" "}
            <span
              className="not-italic font-bold text-[11px] tracking-[0.12em] uppercase text-[#0F1B3D]/50 align-middle ml-0.5"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Health
            </span>
          </span>
        </div>

        {/* Main content — generous vertical rhythm top/bottom; inner
            breathing keeps CTA above home-indicator safe area */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] flex flex-col">
          {children}

          {/* Step indicator — breathing room above so it doesn't hug the CTA */}
          <div className="flex items-center justify-center gap-1.5 mt-6 mb-1 flex-shrink-0" aria-label={`Step ${step} of 3`}>
            <div className={`${step === 1 ? "w-6 h-1.5" : "w-1.5 h-1.5"} rounded-full ${step === 1 ? "bg-[#0F1B3D]" : "bg-[#0F1B3D]/20"}`} />
            <div className={`${step === 2 ? "w-6 h-1.5" : "w-1.5 h-1.5"} rounded-full ${step === 2 ? "bg-[#0F1B3D]" : "bg-[#0F1B3D]/20"}`} />
            <div className={`${step === 3 ? "w-6 h-1.5" : "w-1.5 h-1.5"} rounded-full ${step === 3 ? "bg-[#0F1B3D]" : "bg-[#0F1B3D]/20"}`} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
