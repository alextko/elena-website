"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Phone, FileText, Zap, Users, Shield } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "upgrade_required" | "limit_reached" | "feature_blocked" | "document_limit";
  featureName?: string;
}

type BillingPeriod = "monthly" | "annual";
type Tier = "standard" | "premium";

const PLANS = {
  standard: {
    name: "Standard",
    monthly: 29.99,
    annual: 179.99,
    annualMonthly: 15.0,
    features: [
      { icon: Phone, text: "5 calls per month" },
      { icon: FileText, text: "Unlimited document uploads" },
      { icon: Zap, text: "Unlimited bill analysis" },
      { icon: Shield, text: "All searches free forever" },
    ],
  },
  premium: {
    name: "Premium",
    monthly: 49.99,
    annual: 299.99,
    annualMonthly: 25.0,
    popular: true,
    features: [
      { icon: Phone, text: "Unlimited calls" },
      { icon: FileText, text: "Everything in Standard" },
      { icon: Users, text: "Up to 4 family profiles" },
      { icon: Shield, text: "Lower negotiation fees (10%)" },
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
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  const currentTier = subscription?.tier || "free";
  const isStandardLimitReached = currentTier === "standard" && reason === "limit_reached";

  const featureLabel = featureName?.replace(/_/g, " ") || "this feature";

  const title = isStandardLimitReached
    ? "Monthly limit reached"
    : reason === "feature_blocked"
    ? "Feature not available"
    : reason === "document_limit"
    ? "Document limit reached"
    : "Upgrade your plan";

  const description = isStandardLimitReached
    ? "Upgrade to Premium for unlimited calls and more."
    : reason === "feature_blocked"
    ? `${featureLabel.charAt(0).toUpperCase() + featureLabel.slice(1)} is available on paid plans.`
    : reason === "document_limit"
    ? "Free accounts can upload up to 2 documents."
    : "Unlock the full power of Elena.";

  async function handleUpgrade(tier: Tier) {
    setLoading(true);
    const plan = `${tier}_${billing}` as const;
    try {
      const successUrl = `${window.location.origin}/chat?checkout=success`;
      const cancelUrl = `${window.location.origin}/chat`;
      const res = await apiFetch("/web/checkout", {
        method: "POST",
        body: JSON.stringify({ plan, success_url: successUrl, cancel_url: cancelUrl }),
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
      <DialogContent className="w-full max-w-lg overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_24px_80px_rgba(15,27,61,0.25)]">
        {/* Header with landing-page gradient */}
        <div className="relative px-6 pt-7 pb-5 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)] opacity-40" />
          <div className="relative z-10">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-semibold text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-white/60 leading-relaxed mt-1">
                {description}
              </DialogDescription>
            </DialogHeader>

            {/* Sliding pill toggle */}
            <div className="inline-flex items-center mt-4 rounded-full bg-white/10 p-1 backdrop-blur-sm border border-white/10">
              {(["monthly", "annual"] as BillingPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setBilling(period)}
                  className="relative px-5 py-1.5 text-sm font-medium capitalize transition-colors duration-200"
                >
                  {billing === period && (
                    <motion.div
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${billing === period ? "text-[#0F1B3D]" : "text-white/60"}`}>
                    {period === "annual" ? "Annual (-50%)" : "Monthly"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-5 pb-5 pt-4 space-y-3">
          {tiers.map((tier, i) => {
            const plan = PLANS[tier];
            const price = billing === "annual" ? plan.annualMonthly : plan[billing];
            const isPopular = "popular" in plan && plan.popular;

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className={`relative rounded-xl border p-4 transition-all cursor-pointer group ${
                  isPopular
                    ? "border-[#E8956D]/40 bg-gradient-to-br from-[#FDF8F5] to-white shadow-[0_2px_12px_rgba(232,149,109,0.12)]"
                    : "border-[#E5E5EA] hover:border-[#2E6BB5]/30 bg-white"
                }`}
                onClick={() => handleUpgrade(tier)}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-[#E8956D] to-[#F4B084] px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    Popular
                  </span>
                )}

                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-[15px] font-bold text-[#0F1B3D]">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={`${tier}-${billing}`}
                        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                        transition={{ duration: 0.25 }}
                        className="text-2xl font-bold text-[#0F1B3D]"
                      >
                        ${price}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-[#8E8E93]">/mo</span>
                  </div>
                </div>

                {billing === "annual" && (
                  <p className="text-[11px] text-[#8E8E93] mb-2">
                    Billed as ${plan.annual}/year
                  </p>
                )}

                <ul className="space-y-1.5 mb-3">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2 text-[13px] text-[#0F1B3D]/60">
                      <Check className={`h-3.5 w-3.5 flex-shrink-0 ${isPopular ? "text-[#E8956D]" : "text-[#2E6BB5]"}`} />
                      {f.text}
                    </li>
                  ))}
                </ul>

                <div
                  className={`w-full rounded-full py-2.5 text-center text-sm font-semibold transition-all ${
                    isPopular
                      ? "bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] text-white shadow-[0_4px_16px_rgba(46,107,181,0.25)] group-hover:shadow-[0_6px_24px_rgba(46,107,181,0.35)] group-hover:brightness-110"
                      : "bg-[#0F1B3D]/[0.06] text-[#0F1B3D] group-hover:bg-[#0F1B3D]/[0.1]"
                  }`}
                >
                  {loading ? "Redirecting..." : `Get ${plan.name}`}
                </div>
              </motion.div>
            );
          })}

          <button
            className="w-full text-center text-sm text-[#0F1B3D]/30 transition-colors hover:text-[#0F1B3D]/50 pt-1"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
