"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
import { getStoredAttribution } from "@/lib/attribution";
import * as analytics from "@/lib/analytics";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "upgrade_required" | "limit_reached" | "feature_blocked" | "document_limit" | "soft";
  featureName?: string;
}

type BillingPeriod = "weekly" | "annual";
type Tier = "standard" | "premium";

const PLANS = {
  standard: {
    name: "Pro",
    weekly: 6.99,
    monthly: 19.99, // shown via "prefer monthly" link
    annual: 179.99,
    annualMonthly: 15.0,
    annualWeekly: 3.46, // 179.99 / 52, rounded
    trial: true,
    features: [
      "10 calls per month",
      "Unlimited document uploads",
      "Unlimited bill analysis & searches",
      "Appeal letters & negotiation scripts",
    ],
  },
  premium: {
    name: "Premium",
    weekly: 0, // premium has no weekly; displays annual in weekly column
    monthly: 39.99,
    annual: 299.99,
    annualMonthly: 25.0,
    annualWeekly: 5.77, // 299.99 / 52, rounded
    trial: false,
    popular: true,
    features: [
      "Unlimited calls",
      "Everything in Pro",
      "Up to 4 family profiles",
      "Lower negotiation fees (10%)",
    ],
  },
};

export function UpgradeModal({
  open,
  onOpenChange,
  reason = "upgrade_required",
  featureName,
}: UpgradeModalProps) {
  const { subscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<BillingPeriod>("annual");

  useEffect(() => {
    if (open) analytics.track("Upgrade Modal Shown", { reason, feature_name: featureName });
  }, [open, reason, featureName]);

  const currentTier = subscription?.tier || "free";
  const isStandardLimitReached = currentTier === "standard" && reason === "limit_reached";

  const featureLabel = featureName?.replace(/_/g, " ") || "this feature";

  const isFreeUser = currentTier === "free";

  const title = isStandardLimitReached
    ? "Monthly limit reached"
    : reason === "feature_blocked"
    ? "Feature not available"
    : reason === "document_limit"
    ? "Document limit reached"
    : reason === "soft"
    ? "Get more out of Elena"
    : isFreeUser && reason === "upgrade_required"
    ? "Free limit reached"
    : "Upgrade your plan";

  const featureDescriptions: Record<string, string> = {
    call_provider: "You've used your free calls. Upgrade for more calls each month.",
    search_provider_rates: "Upgrade to search and compare provider pricing.",
    upload_document: "You've reached the free document limit. Upgrade for unlimited uploads.",
    analyze_bill: "Upgrade to get AI-powered bill analysis and savings.",
  };

  const description = isStandardLimitReached
    ? "Upgrade to Premium for unlimited calls and more."
    : reason === "feature_blocked"
    ? `${featureLabel.charAt(0).toUpperCase() + featureLabel.slice(1)} is available on paid plans.`
    : reason === "document_limit"
    ? "You've reached the free document limit. Upgrade for unlimited uploads."
    : reason === "soft"
    ? "Upgrade for unlimited calls, document uploads, and more."
    : featureName && featureDescriptions[featureName]
    ? featureDescriptions[featureName]
    : "Unlock the full power of Elena.";

  async function handleUpgrade(tier: Tier, period?: BillingPeriod | "monthly") {
    const selectedPeriod = period ?? (tier === "premium" && billing === "weekly" ? "monthly" : billing);
    analytics.track("Upgrade Plan Selected", { plan_name: tier, billing_period: selectedPeriod });
    setLoading(true);
    const plan = `${tier}_${selectedPeriod}`;
    try {
      const successUrl = `${window.location.origin}/chat?checkout=success`;
      const cancelUrl = `${window.location.origin}/chat`;
      const attribution = getStoredAttribution();
      const res = await apiFetch("/web/checkout", {
        method: "POST",
        body: JSON.stringify({ plan, success_url: successUrl, cancel_url: cancelUrl, ...(attribution ? { attribution } : {}) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch {
      setLoading(false);
    }
  }

  const tiers = isStandardLimitReached
    ? (["premium"] as Tier[])
    : (["standard", "premium"] as Tier[]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] max-w-[22rem] sm:w-full sm:max-w-lg max-h-[calc(100svh-1rem)] overflow-y-auto overflow-x-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_24px_80px_rgba(15,27,61,0.25)]"
      >
        {/* Header with landing-page gradient */}
        <div className="relative px-5 pt-5 pb-4 sm:px-6 sm:pt-7 sm:pb-5 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)] opacity-40" />
          <button
            type="button"
            onClick={() => { analytics.track("Upgrade Dismissed", { reason }); onOpenChange(false); }}
            aria-label="Close"
            className="absolute top-3 right-3 z-20 flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative z-10">
            <DialogHeader>
              <DialogTitle className="text-center text-lg sm:text-xl font-semibold text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="text-center text-[13px] sm:text-sm text-white/60 leading-relaxed mt-1">
                {description}
              </DialogDescription>
            </DialogHeader>

            {/* Sliding pill toggle */}
            <div className="inline-flex items-center mt-3 sm:mt-4 rounded-full bg-white/10 p-1 backdrop-blur-sm border border-white/10">
              {(["weekly", "annual"] as BillingPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setBilling(period)}
                  className="relative px-4 sm:px-5 py-1.5 text-[13px] sm:text-sm font-medium capitalize transition-colors duration-200"
                >
                  {billing === period && (
                    <motion.div
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${billing === period ? "text-[#0F1B3D]" : "text-white/60"}`}>
                    {period === "annual" ? "Annual (-25%)" : "Weekly"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-4 pb-4 pt-3 space-y-2.5 sm:px-5 sm:pb-5 sm:pt-4 sm:space-y-3">
          {tiers.map((tier, i) => {
            const plan = PLANS[tier];
            const showTrial = plan.trial;
            // Pro: uses weekly toggle directly. Premium has no weekly — fall back to monthly in the "weekly" view.
            // Annual: always display the weekly-equivalent price so the savings are obvious.
            const effectivePeriod: "weekly" | "monthly" | "annual_weekly" =
              billing === "annual" ? "annual_weekly" : tier === "premium" ? "monthly" : "weekly";
            const price =
              effectivePeriod === "annual_weekly"
                ? plan.annualWeekly
                : effectivePeriod === "weekly"
                ? plan.weekly
                : plan.monthly;
            const unit = effectivePeriod === "monthly" ? "/mo" : "/wk";
            const isPopular = "popular" in plan && plan.popular;

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className={`relative rounded-xl border p-3 sm:p-4 transition-all cursor-pointer group ${
                  isPopular
                    ? "border-[#E8956D]/40 bg-gradient-to-br from-[#FDF8F5] to-white shadow-[0_2px_12px_rgba(232,149,109,0.12)]"
                    : "border-[#E5E5EA] hover:border-[#2E6BB5]/30 bg-white"
                }`}
                onClick={() => handleUpgrade(tier)}
              >
                {isPopular && !showTrial && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-[#E8956D] to-[#F4B084] px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    Popular
                  </span>
                )}
                {showTrial && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-[#2E6BB5] to-[#1A3A6E] px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    3-day free trial
                  </span>
                )}

                <div className="flex items-baseline justify-between mb-2 sm:mb-3">
                  <p className="text-[15px] sm:text-[17px] font-extrabold tracking-tight text-[#0F1B3D]">{plan.name}</p>
                  <div className="flex items-baseline">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${tier}-${billing}`}
                        initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                        transition={{ duration: 0.2 }}
                        className="text-xl sm:text-2xl font-bold text-[#0F1B3D]"
                      >
                        ${price}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-[13px] sm:text-sm text-[#8E8E93] ml-0.5">{unit}</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#8E8E93] mb-1.5 sm:mb-2 h-4">
                  <AnimatePresence mode="wait">
                    {billing === "annual" && (
                      <motion.span
                        key="annual-label"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        Billed as ${plan.annual}/year
                      </motion.span>
                    )}
                  </AnimatePresence>
                </p>

                <ul className="space-y-1 mb-2.5 sm:space-y-1.5 sm:mb-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] sm:text-[13px] text-[#0F1B3D]/60">
                      <Check className={`h-3.5 w-3.5 flex-shrink-0 ${isPopular ? "text-[#E8956D]" : "text-[#2E6BB5]"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div
                  className="w-full rounded-full py-2 sm:py-2.5 text-center text-[13px] sm:text-sm font-bold tracking-tight text-white transition-all bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] shadow-[0_4px_16px_rgba(46,107,181,0.25)] group-hover:shadow-[0_6px_24px_rgba(46,107,181,0.35)] group-hover:brightness-110"
                >
                  {loading ? "Redirecting..." : showTrial ? "Start 3-day free trial" : `Get ${plan.name}`}
                </div>
              </motion.div>
            );
          })}

          {!isStandardLimitReached && (
            <button
              type="button"
              onClick={() => handleUpgrade("standard", "monthly")}
              className="w-full text-center text-[11px] text-[#8E8E93] hover:text-[#0F1B3D] underline underline-offset-2 pt-1"
            >
              Prefer monthly? Pro for $19.99/mo without trial
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
