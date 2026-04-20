"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAppCta } from "@/lib/app-cta-context";

/**
 * Watches the authenticated user's cached data counts (doctors, care visits,
 * insurance cards) and surfaces the "Take Elena with you" CTA the second time
 * a data item is added in this browser. Additions are counted across types;
 * whether the user added two doctors, a doctor + a visit, or a visit + an
 * insurance card all count the same.
 *
 * Counts live in localStorage keyed by profileId so caregiver profile
 * switches don't leak additions across profiles. The one-shot "done" flag is
 * global — once the user has engaged with or dismissed the CTA on this
 * device, we never re-show.
 */

const THRESHOLD = 2;
// Delay after a count increase so we don't interrupt rapid consecutive adds
// (e.g., submitting a form that saves two items) and we only surface once
// the activity has settled.
const TRIGGER_DELAY_MS = 1500;
// Wait this long after profile details load before establishing a baseline.
// Fetches land progressively, and we don't want to treat hydration as growth.
const READY_DELAY_MS = 2000;

type Counts = { doctors: number; visits: number; insurance: number };

function countsKey(profileId: string) { return `elena_data_counts_last:${profileId}`; }
function totalKey(profileId: string) { return `elena_data_additions_total:${profileId}`; }

function readCounts(profileId: string): Counts | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(countsKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.doctors === "number" &&
      typeof parsed?.visits === "number" &&
      typeof parsed?.insurance === "number"
    ) {
      return parsed as Counts;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCounts(profileId: string, c: Counts) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(countsKey(profileId), JSON.stringify(c)); } catch {}
}

function readTotal(profileId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(totalKey(profileId));
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function writeTotal(profileId: string, n: number) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(totalKey(profileId), String(n)); } catch {}
}

function sum(c: Counts) { return c.doctors + c.visits + c.insurance; }

export function DataAdditionTracker() {
  const { doctors, careVisits, insuranceCards, profileId, profileDetailsLoaded } = useAuth();
  const { showAppCta } = useAppCta();

  // Keep current counts in a ref so timer callbacks always read the latest
  // value rather than a stale closure.
  const countsRef = useRef<Counts>({ doctors: 0, visits: 0, insurance: 0 });
  countsRef.current = {
    doctors: doctors.length,
    visits: careVisits.length,
    insurance: insuranceCards.length,
  };

  const readyRef = useRef(false);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeProfileRef = useRef<string | null>(null);

  // Reset ready-state whenever the profile changes so the new profile
  // re-establishes its own baseline.
  useEffect(() => {
    if (activeProfileRef.current !== profileId) {
      activeProfileRef.current = profileId;
      readyRef.current = false;
      if (readyTimerRef.current) {
        clearTimeout(readyTimerRef.current);
        readyTimerRef.current = null;
      }
      if (triggerTimerRef.current) {
        clearTimeout(triggerTimerRef.current);
        triggerTimerRef.current = null;
      }
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId || !profileDetailsLoaded) return;

    const evaluate = () => {
      const current = countsRef.current;
      const last = readCounts(profileId);
      if (!last) {
        // No baseline yet — seed it and bail. Shouldn't normally happen here
        // (the ready-timer seeds first) but guards against racy clears.
        writeCounts(profileId, current);
        return;
      }
      const delta = sum(current) - sum(last);
      if (delta > 0) {
        const newTotal = readTotal(profileId) + delta;
        writeTotal(profileId, newTotal);
        writeCounts(profileId, current);
        if (newTotal >= THRESHOLD) {
          if (triggerTimerRef.current) clearTimeout(triggerTimerRef.current);
          triggerTimerRef.current = setTimeout(() => {
            triggerTimerRef.current = null;
            // Suppress the CTA while the web tour is showing its own data-
            // entry prompts — the tour's z-index is above the dialog portal,
            // and double-nudging mid-tour is bad UX. Counts still accrue, so
            // the CTA fires naturally on the next add after the tour exits.
            if (
              typeof window !== "undefined" &&
              sessionStorage.getItem("elena_tour_in_progress") === "1"
            ) {
              return;
            }
            showAppCta("data_added", {
              additions_count: newTotal,
              doctors: current.doctors,
              visits: current.visits,
              insurance: current.insurance,
            });
          }, TRIGGER_DELAY_MS);
        }
      } else if (delta < 0) {
        // Count decreased (user deleted an item). Update the baseline so a
        // subsequent re-add doesn't inflate the additions counter.
        writeCounts(profileId, current);
      }
    };

    if (readyRef.current) {
      evaluate();
      return;
    }

    // Not yet ready — schedule the baseline seed, but only once per profile.
    if (readyTimerRef.current) return;
    readyTimerRef.current = setTimeout(() => {
      readyTimerRef.current = null;
      readyRef.current = true;
      if (!readCounts(profileId)) {
        writeCounts(profileId, countsRef.current);
      }
      // In case counts already grew past the fresh baseline during the wait
      // (user added something in the 2s window), evaluate once now.
      evaluate();
    }, READY_DELAY_MS);
  }, [
    profileId,
    profileDetailsLoaded,
    doctors.length,
    careVisits.length,
    insuranceCards.length,
    showAppCta,
  ]);

  useEffect(() => {
    return () => {
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
      if (triggerTimerRef.current) clearTimeout(triggerTimerRef.current);
    };
  }, []);

  return null;
}
