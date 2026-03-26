"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "document_limit" | "credits_exhausted";
  documentLimit?: number;
}

export function UpgradeModal({
  open,
  onOpenChange,
  reason = "credits_exhausted",
  documentLimit = 5,
}: UpgradeModalProps) {
  const { subscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const isPro = subscription?.plan === "pro";

  // Pro user who ran out of credits
  if (isPro && reason === "credits_exhausted") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-sm overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_24px_80px_rgba(15,27,61,0.25)]">
          <div className="relative px-6 pt-8 pb-6 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_50%,#2E6BB5_100%)] text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.3)_0%,rgba(232,149,109,0.15)_25%,transparent_60%)]" />
            <div className="relative z-10">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-center text-lg font-semibold text-white">
                  Credits used up
                </DialogTitle>
                <DialogDescription className="text-center text-sm text-white/70 leading-relaxed">
                  Your monthly credits will refill at the start of your next billing cycle. You can also purchase additional credits now.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <div className="px-6 pb-6 pt-5 space-y-4">
            <Button
              className="w-full rounded-full bg-[linear-gradient(135deg,#1A3A6E_0%,#2E6BB5_100%)] py-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(46,107,181,0.3)] transition-all hover:shadow-[0_6px_24px_rgba(46,107,181,0.4)] hover:brightness-110"
              onClick={async () => {
                setLoading(true);
                try {
                  const successUrl = `${window.location.origin}/chat?checkout=success`;
                  const cancelUrl = `${window.location.origin}/chat`;
                  const res = await apiFetch("/web/checkout", {
                    method: "POST",
                    body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
                  });
                  if (!res.ok) throw new Error();
                  const data = await res.json();
                  window.location.href = data.checkout_url;
                } catch {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? "Redirecting..." : "Buy more credits"}
            </Button>
            <button
              className="w-full text-center text-sm text-[#0F1B3D]/30 transition-colors hover:text-[#0F1B3D]/50"
              onClick={() => onOpenChange(false)}
            >
              Wait for monthly refill
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Free user — upgrade flow
  const title =
    reason === "document_limit"
      ? "Document limit reached"
      : "You\u2019ve used all your credits";

  const description =
    reason === "document_limit"
      ? `Free accounts can upload up to ${documentLimit} documents. Upgrade to Pro for unlimited uploads and 500 credits per month.`
      : "Upgrade to Pro for 500 credits per month and unlimited document uploads.";

  async function handleUpgrade() {
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/chat?checkout=success`;
      const cancelUrl = `${window.location.origin}/chat`;

      const res = await apiFetch("/web/checkout", {
        method: "POST",
        body: JSON.stringify({
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to start checkout");
      }

      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch {
      setLoading(false);
    }
  }

  const features = [
    "500 credits per month",
    "Unlimited document uploads",
    "Priority support",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_24px_80px_rgba(15,27,61,0.25)]">
        {/* Gradient header matching landing hero */}
        <div className="relative px-6 pt-8 pb-6 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_50%,#2E6BB5_100%)] text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.3)_0%,rgba(232,149,109,0.15)_25%,transparent_60%)]" />
          <div className="relative z-10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-semibold text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-white/70 leading-relaxed">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* Plan details */}
        <div className="px-6 pb-6 pt-5 space-y-4">
          <div className="rounded-xl border border-[#2E6BB5]/10 bg-gradient-to-br from-[#f5f7fb] to-white p-4 space-y-2.5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold text-[#0F1B3D]">Pro Plan</p>
              <p className="text-sm text-[#0F1B3D]/40">$9.99/mo</p>
            </div>
            <ul className="space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#0F1B3D]/60">
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#2E6BB5]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <Button
            className="w-full rounded-full bg-[linear-gradient(135deg,#1A3A6E_0%,#2E6BB5_100%)] py-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(46,107,181,0.3)] transition-all hover:shadow-[0_6px_24px_rgba(46,107,181,0.4)] hover:brightness-110"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? "Redirecting to checkout..." : "Upgrade to Pro"}
          </Button>
          <button
            className="w-full text-center text-sm text-[#0F1B3D]/30 transition-colors hover:text-[#0F1B3D]/50"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
