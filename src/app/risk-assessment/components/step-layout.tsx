"use client";

import type { ReactNode } from "react";

interface StepLayoutProps {
  question: string;
  subtitle?: string;
  children: ReactNode;
  ctaLabel?: string;
  ctaEnabled?: boolean;
  onCta?: () => void;
}

export function StepLayout({ question, subtitle, children, ctaLabel, ctaEnabled = true, onCta }: StepLayoutProps) {
  return (
    <div className="flex-1 flex flex-col px-6 pt-16 pb-6 max-w-lg mx-auto w-full font-[family-name:var(--font-inter)]">
      <div className="mb-8">
        <h2 className="text-[clamp(1.4rem,5vw,1.75rem)] font-light text-[#0F1B3D] leading-tight tracking-tight">
          {question}
        </h2>
        {subtitle && (
          <p className="text-[15px] text-[#8E8E93] mt-2 leading-relaxed font-light">{subtitle}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-3 overflow-y-auto p-1 -m-1">
        {children}
      </div>

      {ctaLabel && onCta && (
        <div className="pt-4 mt-auto">
          <button
            type="button"
            onClick={onCta}
            disabled={!ctaEnabled}
            className="w-full py-4 rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] text-white font-semibold text-base disabled:opacity-40 transition-all hover:opacity-90"
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </div>
  );
}
