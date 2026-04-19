"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppCta } from "@/lib/app-cta-context";

const APP_STORE_URL = "https://apps.apple.com/us/app/elena-ai-health-navigator/id6760362771";

export function AppCtaModal() {
  const { open, dismiss, onDownloadClick } = useAppCta();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent className="sm:max-w-[340px] p-0 overflow-hidden rounded-2xl">
        <div className="p-8 flex flex-col items-center">
          <img
            src="/assets/elena-app-icon.png"
            alt="Elena"
            className="w-[96px] h-[96px] rounded-[22px] shadow-[0_10px_30px_rgba(15,27,61,0.22)] mb-5"
          />
          <h2 className="text-xl font-bold text-[#0F1B3D] text-center mb-1.5">
            Take Elena with you
          </h2>
          <p className="text-sm text-[#0F1B3D]/60 text-center mb-5">
            Keep your providers, visits, and bills with you on the go.
          </p>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDownloadClick}
            className="transition-transform hover:scale-[1.03] active:scale-[0.98] mb-3"
          >
            <img
              src="/assets/app-store-badge.svg"
              alt="Download on the App Store"
              className="h-[44px] w-auto"
            />
          </a>
          <button
            onClick={dismiss}
            className="text-sm text-[#0F1B3D]/60 hover:text-[#0F1B3D]/80 transition-colors"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
