"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { getStoredAttribution } from "@/lib/attribution";
import * as analytics from "@/lib/analytics";
import { TrialStep1 } from "./trial-step-1";
import { TrialStep2 } from "./trial-step-2";
import { TrialStep3 } from "./trial-step-3";
import { ExitIntentSheet, type ExitOffer } from "./exit-intent-sheet";

type PlanKey = "standard_annual" | "standard_weekly";
type Step = 1 | 2 | 3 | null;

interface TrialFlowProps {
  /** Which step is active. null = closed. */
  step: Step;
  /** Parent-owned setter so the parent can drive state + dismiss. */
  onStepChange: (step: Step) => void;
  /**
   * Identifier of what kicked off the flow. Included as a property on every
   * `Paywall Screen Viewed` analytics event so we can segment later.
   */
  reason: "post_onboarding" | "upgrade_required" | "soft";
}

/**
 * Orchestrator for the 3-screen trial buildup + exit-intent dismiss path.
 * Owns:
 *   - step transitions (1 → 2 → 3, with back)
 *   - exit-sheet open/close
 *   - /web/checkout request (with trial_days override for 7-day exit offer)
 *   - analytics event firing for every state transition
 *
 * Parent controls when this mounts via `step` prop (null = closed).
 */
export function TrialFlow({ step, onStepChange, reason }: TrialFlowProps) {
  const [exitSheetOpen, setExitSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fire "Paywall Screen Viewed" each time a step becomes active.
  useEffect(() => {
    if (step === null) return;
    const screen = step === 1 ? "step_1" : step === 2 ? "step_2" : "step_3";
    analytics.track("Paywall Screen Viewed", { screen, reason });
  }, [step, reason]);

  // When the exit sheet opens, log it once.
  useEffect(() => {
    if (exitSheetOpen) analytics.track("Paywall Exit Offer Shown", {});
  }, [exitSheetOpen]);

  const handleContinue = useCallback(
    (from: 1 | 2) => {
      analytics.track("Paywall Continue Clicked", {
        from_screen: from === 1 ? "step_1" : "step_2",
      });
      onStepChange((from + 1) as Step);
    },
    [onStepChange],
  );

  const handleBack = useCallback(
    (from: 2 | 3) => {
      analytics.track("Paywall Back Clicked", { from_step: from });
      onStepChange((from - 1) as Step);
    },
    [onStepChange],
  );

  const startCheckout = useCallback(
    async (plan: PlanKey, trialDays: number, source: "primary_cta" | "exit_offer") => {
      analytics.track("Paywall Plan Selected", { plan });
      setLoading(true);
      try {
        const successUrl = `${window.location.origin}/chat?checkout=success`;
        const cancelUrl = `${window.location.origin}/chat`;
        const attribution = getStoredAttribution();
        const res = await apiFetch("/web/checkout", {
          method: "POST",
          body: JSON.stringify({
            plan,
            success_url: successUrl,
            cancel_url: cancelUrl,
            trial_days: trialDays,
            ...(attribution ? { attribution } : {}),
          }),
        });
        if (!res.ok) throw new Error(`checkout failed: ${res.status}`);
        const data = await res.json();

        analytics.track("Paywall Trial Started", {
          plan,
          trial_days: trialDays,
          source,
        });

        window.location.href = data.checkout_url;
      } catch (err) {
        // Non-fatal: re-enable CTA so the user can retry
        console.warn("[paywall] checkout failed", err);
        setLoading(false);
      }
    },
    [],
  );

  const handleMaybeLater = useCallback(() => {
    analytics.track("Paywall Maybe Later Clicked", {});
    setExitSheetOpen(true);
  }, []);

  const handleExitAccept = useCallback(
    (offer: ExitOffer) => {
      analytics.track("Paywall Exit Offer Accepted", { offer });
      if (offer === "extended_7_day_trial") {
        // Extended trial uses the weekly plan so Stripe Checkout shows the
        // less-aggressive "$6.99/week after trial" instead of an annual total.
        // Users who explicitly want annual picked it from the Step 3 card
        // before ever reaching this sheet.
        setExitSheetOpen(false);
        void startCheckout("standard_weekly", 7, "exit_offer");
      } else {
        // "remind_tomorrow" — close everything. Email scheduling deferred
        // (see PAYWALL_NEXT_STEPS.md).
        setExitSheetOpen(false);
        onStepChange(null);
      }
    },
    [onStepChange, startCheckout],
  );

  const handleExitDismiss = useCallback(() => {
    analytics.track("Paywall Exit Offer Dismissed", {});
    setExitSheetOpen(false);
    onStepChange(null);
  }, [onStepChange]);

  // When the parent closes the flow entirely, make sure the exit sheet
  // doesn't linger.
  useEffect(() => {
    if (step === null && exitSheetOpen) setExitSheetOpen(false);
  }, [step, exitSheetOpen]);

  return (
    <>
      <TrialStep1
        open={step === 1}
        onOpenChange={(open) => (open ? null : onStepChange(null))}
        onContinue={() => handleContinue(1)}
      />
      <TrialStep2
        open={step === 2}
        onOpenChange={(open) => (open ? null : onStepChange(null))}
        onContinue={() => handleContinue(2)}
        onBack={() => handleBack(2)}
      />
      <TrialStep3
        open={step === 3}
        onOpenChange={(open) => (open ? null : onStepChange(null))}
        onBack={() => handleBack(3)}
        onStartTrial={(plan) => startCheckout(plan, 3, "primary_cta")}
        onMaybeLater={handleMaybeLater}
        loading={loading}
      />
      <ExitIntentSheet
        open={exitSheetOpen}
        onOpenChange={setExitSheetOpen}
        onAccept={handleExitAccept}
        onDismiss={handleExitDismiss}
        loading={loading}
      />
    </>
  );
}
