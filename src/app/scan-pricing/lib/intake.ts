"use client";

import { getOrCreateAnonId } from "@/lib/anonId";
import {
  normalizeScanPricingAnswers,
  type ScanPricingAnswers,
} from "./shared";

export type { ScanPricingAnswers, ScanUrgency } from "./shared";

export async function submitScanPricingRequest(
  answers: ScanPricingAnswers,
  signal?: AbortSignal,
): Promise<void> {
  const anonId = getOrCreateAnonId();
  if (!anonId) {
    throw new Error("Could not create anonymous session");
  }

  const cleaned = normalizeScanPricingAnswers(answers);

  const submittedAt = new Date().toISOString();
  const res = await fetch("/backend/web/scan-pricing-intake", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      anon_id: anonId,
      submitted_at: submittedAt,
      answers: cleaned,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Submit failed with status ${res.status}`);
  }
}
