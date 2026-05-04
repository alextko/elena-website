"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as analytics from "@/lib/analytics";
import { getOrCreateAnonId } from "@/lib/anonId";
import { trackScanPricingLead } from "@/lib/tracking-events";

const BLOBS = [
  "w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]",
  "w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]",
  "w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,110,0.4)_0%,transparent_70%)] top-[30%] right-[25%]",
  "w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(232,149,109,0.25)_0%,transparent_70%)] bottom-[10%] left-[5%]",
];

const STORAGE_CONFIRMATION_PREVIEW_KEY = "elena_scan_pricing_confirmation_preview";

type ConfirmationPreview = {
  procedure?: string;
  location?: string;
  recommendation?: string;
  rangeLabel?: string;
  reportNote?: string;
  contrastLabel?: string;
  pricingPathLabel?: string;
  insuranceLabel?: string;
  urgencyLabel?: string;
  nextStepLabel?: string;
};

export default function ScanPricingConfirmationPage() {
  const trackedRef = useRef(false);
  const [preview, setPreview] = useState<ConfirmationPreview | null>(null);

  useEffect(() => {
    document.body.style.backgroundColor = "#0F1B3D";
    document.documentElement.style.backgroundColor = "#0F1B3D";
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    analytics.track("Quiz Confirmation Viewed", { quiz: "scan_pricing" });

    const anonId = getOrCreateAnonId();
    if (anonId) {
      void trackScanPricingLead(anonId);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_CONFIRMATION_PREVIEW_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ConfirmationPreview;
      setPreview(parsed);
      sessionStorage.removeItem(STORAGE_CONFIRMATION_PREVIEW_KEY);
    } catch {}
  }, []);

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
      </div>

      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        {BLOBS.map((cls) => (
          <div
            key={cls}
            className={`absolute rounded-full blur-[80px] ${cls}`}
          />
        ))}
      </div>

      <nav className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-4 md:px-8 md:py-5">
        <Link
          href="/"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 max-md:px-4 max-md:py-2 max-md:h-10 max-md:flex max-md:items-center text-[1.35rem] max-md:text-[0.95rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          elena
        </Link>
      </nav>

      <section className="relative z-[4] flex min-h-dvh items-center justify-center px-4 pb-8 pt-20 md:px-6 md:py-28">
        <div className="w-full max-w-[760px] rounded-[28px] border border-white/[0.14] bg-white/[0.08] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:rounded-[32px] md:p-10">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40 md:text-[12px] md:tracking-[0.18em]">
            Request Received
          </p>

          <h1 className="mx-auto mt-3 max-w-[11ch] text-center text-[clamp(2rem,10vw,4rem)] font-light leading-[1.02] tracking-[-0.04em] text-white md:mt-4 md:tracking-[-0.03em]">
            Look out for your MRI report.
          </h1>

          <p className="mx-auto mt-4 max-w-[34rem] text-center text-[0.95rem] font-light leading-7 tracking-[0.01em] text-white/82 md:mt-5 md:max-w-[38rem] md:text-[1rem] md:leading-8">
            Our patient advocates are working on your MRI request now. We&apos;ll
            send your best MRI options to your inbox within 24 hours. If pricing
            is unclear, we&apos;ll call and negotiate on your behalf before we send
            our recommendation.
          </p>

          <div className="mt-7 rounded-[24px] border border-[#f4b084]/35 bg-[linear-gradient(180deg,rgba(244,176,132,0.18),rgba(255,255,255,0.08))] px-5 py-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] md:mt-8 md:px-7 md:py-6">
            <div className="inline-flex rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/72">
              Early read
            </div>
            <p className="mt-4 text-[1.35rem] font-semibold leading-[1.22] tracking-[-0.03em] text-white md:text-[1.75rem]">
              {preview?.procedure ? `For your ${preview.procedure},` : "For your MRI,"} you can usually expect options in the{" "}
              <span className="font-extrabold text-white">{preview?.rangeLabel ?? "$200–$1,500"}</span>{" "}
              range.
            </p>
            <p className="mt-3 text-[14px] leading-6 text-white/72 md:text-[15px] md:leading-7">
              {preview?.reportNote ?? "Your final MRI report will show the cheapest local options, what looks best with insurance vs cash pay, and the next step we’d recommend."}
              {preview?.pricingPathLabel === "Cash pay may win"
                ? " Based on your coverage, cash pay may be your best option."
                : null}
              {preview?.pricingPathLabel === "Prioritize cash-pay MRI pricing"
                ? " Since you said cash pay is on the table, we’ll prioritize those options."
                : null}
              {preview?.pricingPathLabel === "Insurance may be competitive"
                ? " Based on your coverage, using insurance may be worth comparing closely."
                : null}
              {preview?.location ? ` We’ll center it on ${preview.location}.` : ""}
            </p>
          </div>

          <div className="mt-7 overflow-hidden rounded-[24px] border border-white/[0.16] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] md:mt-9 md:rounded-[28px]">
            <div className="grid md:grid-cols-2">
              <div className="px-5 py-5 md:px-7 md:py-7">
                <div className="inline-flex rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/62">
                  Next
                </div>
                <p className="mt-3 text-[1.15rem] font-semibold leading-[1.1] tracking-[-0.02em] text-white md:mt-4 md:text-[1.35rem]">
                  What Happens Next
                </p>
                <p className="mt-2 max-w-none text-[14px] leading-6 text-white/82 md:mt-3 md:max-w-[24ch] md:text-[15px] md:leading-7">
                  We&apos;ll email your MRI report and best options within 24 hours.
                </p>
              </div>

              <div className="border-t border-white/[0.14] px-5 py-5 md:border-l md:border-t-0 md:px-7 md:py-7">
                <div className="inline-flex rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/62">
                  Now
                </div>
                <p className="mt-3 text-[1.15rem] font-semibold leading-[1.1] tracking-[-0.02em] text-white md:mt-4 md:text-[1.35rem]">
                  While You Wait
                </p>
                <p className="mt-2 max-w-none text-[14px] leading-6 text-white/82 md:mt-3 md:max-w-[24ch] md:text-[15px] md:leading-7">
                  Create an Elena account to use our care management platform.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 md:mt-8 md:gap-4">
            <Link
              href="/onboard"
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-4 text-[1rem] font-semibold text-[#0F1B3D] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all hover:bg-white/95 md:min-w-[280px] md:w-auto md:px-10 md:text-[1.02rem]"
            >
              Create My Elena Account
            </Link>

            <div className="flex max-w-[20rem] flex-col items-center justify-center gap-1 text-center text-[12px] font-medium tracking-[0.01em] text-white/42 md:max-w-none md:flex-row md:flex-wrap md:gap-x-4 md:gap-y-2">
              <span>Results in your inbox within 24 hours</span>
              <span className="hidden sm:inline text-white/20">•</span>
              <span>Your MRI report includes price and booking guidance</span>
              <span className="hidden sm:inline text-white/20">•</span>
              <span>Questions? Our team is available anytime</span>
            </div>

            <Link
              href="/scan-pricing"
              className="text-[14px] font-medium text-white/68 transition hover:text-white"
            >
              Submit another request
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
