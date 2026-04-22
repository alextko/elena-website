"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TrialFlow } from "@/components/paywall/trial-flow";

/**
 * Preview / test-harness route for the paywall trial flow.
 *
 * Usage:
 *   /paywall-preview         — opens at step 1 (default)
 *   /paywall-preview?step=1  — same
 *   /paywall-preview?step=2  — opens at step 2 (bell + reminder)
 *   /paywall-preview?step=3  — opens at step 3 (plan selector + Maybe later)
 *
 * The modal auto-opens on page load. Closing via Maybe-later / exit-sheet
 * "No thanks" dismisses it; hit the "Reopen paywall" button to bring it back.
 *
 * Harmless in production — design preview only. No user data, no side effects
 * beyond the standard `/web/checkout` call when the user taps Start Trial.
 */
function PreviewInner() {
  const params = useSearchParams();
  const initialStep = ((): 1 | 2 | 3 => {
    const s = Number(params.get("step"));
    return s === 2 || s === 3 ? (s as 2 | 3) : 1;
  })();

  const [step, setStep] = useState<1 | 2 | 3 | null>(initialStep);

  // Pre-decode the phone-screen image so the preview doesn't show the
  // decode-flash the real funnel has been polished to avoid.
  useEffect(() => {
    const img = new Image();
    img.src = "/images/IMG_0306.PNG";
    img.decode?.().catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1B3D] via-[#1A3A6E] to-[#2E6BB5] flex items-center justify-center p-4">
      <div className="text-center text-white/80 space-y-3 max-w-md">
        <h1 className="text-2xl font-bold text-white">Paywall preview</h1>
        <p className="text-sm">
          Dev-only preview of the trial flow. Jump to a specific step via{" "}
          <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">?step=1|2|3</code>.
          Hot-reload keeps this page in sync with your edits — no need to refresh manually.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="rounded-full bg-white/10 border border-white/20 text-white px-4 py-1.5 text-sm hover:bg-white/20"
          >
            Step 1
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-full bg-white/10 border border-white/20 text-white px-4 py-1.5 text-sm hover:bg-white/20"
          >
            Step 2
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="rounded-full bg-white/10 border border-white/20 text-white px-4 py-1.5 text-sm hover:bg-white/20"
          >
            Step 3
          </button>
        </div>
      </div>

      <TrialFlow step={step} onStepChange={setStep} reason="post_onboarding" />
    </div>
  );
}

export default function PaywallPreviewPage() {
  return (
    <Suspense fallback={null}>
      <PreviewInner />
    </Suspense>
  );
}
