"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppCta } from "@/lib/app-cta-context";

const APP_STORE_URL = "https://apps.apple.com/us/app/elena-ai-health-navigator/id6760362771";

export function AppCtaModal() {
  const { open, reason, dismiss, onDownloadClick } = useAppCta();
  const subtitle = reason === "upgrade"
    ? "To get more out of your subscription."
    : "Keep your providers, visits, and bills with you on the go.";

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      {/* w-[calc(100vw-2rem)] ensures the card fills mobile viewports with
          a 16px gutter on each side; sm:max-w caps it on tablet+ so it
          doesn't balloon. Without an explicit mobile width the Dialog
          primitive renders at content width and can look awkward. */}
      <DialogContent
        overlayClassName="bg-[#0F1B3D]/22 backdrop-blur-[2px] duration-200"
        className="w-[calc(100vw-2rem)] sm:max-w-[340px] p-0 overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_22px_60px_rgba(15,27,61,0.22)] will-change-[opacity,transform] duration-200 data-open:zoom-in-[0.985] data-open:fade-in-0 data-closed:zoom-out-[0.985]"
      >
        <div className="p-7 sm:p-8 flex flex-col items-center">
          <img
            src="/assets/elena-app-icon.png"
            alt="Elena"
            className="w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-[22px] shadow-[0_10px_30px_rgba(15,27,61,0.22)] mb-5"
          />
          <h2 className="text-[19px] sm:text-xl font-bold text-[#0F1B3D] text-center mb-1.5">
            Take Elena with you
          </h2>
          <p className="text-[13px] sm:text-sm text-[#0F1B3D]/60 text-center mb-5 px-1">
            {subtitle}
          </p>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDownloadClick}
            className="transition-transform hover:scale-[1.03] active:scale-[0.98] mb-2"
          >
            <img
              src="/assets/app-store-badge.svg"
              alt="Download on the App Store"
              className="h-[44px] w-auto"
            />
          </a>
          {/* py-3 px-4 bumps the tap target to ~44px for iOS HIG conformance.
              Text alone is too small to reliably tap on mobile. */}
          <button
            onClick={dismiss}
            className="py-3 px-4 text-sm text-[#0F1B3D]/60 hover:text-[#0F1B3D]/80 transition-colors"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
