"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";

interface HipaaConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned?: () => void;
}

export function HipaaConsentModal({ open, onOpenChange, onSigned }: HipaaConsentModalProps) {
  const { profileId } = useAuth();
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"sign" | "insurer">("sign");

  const canSign = signature.trim().length > 1;

  const handleSign = async () => {
    if (!canSign || !profileId) return;
    setSaving(true);
    try {
      await apiFetch(`/profile/${profileId}/hipaa-consent`, {
        method: "POST",
        body: JSON.stringify({ signature: signature.trim() }),
      });
      analytics.track("HIPAA_CONSENT_SIGNED", { signature_name: signature.trim() });
      setStep("insurer");
    } catch (e) {
      console.error("Failed to save HIPAA consent:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSignature("");
    setStep("sign");
    if (step === "insurer") onSigned?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* z-[400] beats the profile popover's z-[350] fallback AND the
          default z-50 of both the overlay and content. overlayClassName
          matches so the backdrop sits between the profile popover and
          this modal — without it the overlay stays at z-50 and the
          profile popover (z-50 or z-350) visually bleeds through.
          w-[calc(100%-2rem)] ensures the modal fills mobile viewports
          properly — without it the DialogContent defaults to intrinsic
          content width on mobile, which produces a narrow column that
          force-wraps bullets into a cramped stack. */}
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[420px] max-h-[calc(100svh-2rem)] overflow-y-auto p-0 rounded-2xl !z-[400]"
        overlayClassName="!z-[395]"
      >
        {step === "sign" ? (
          <>
            <div className="p-6 pb-0">
              <DialogHeader className="text-center">
                <DialogTitle className="text-xl font-bold text-[#0F1B3D] text-center">
                  Elena needs your permission
                </DialogTitle>
                <DialogDescription className="text-sm text-[#0F1B3D]/60 mt-2 text-center">
                  To call providers and insurers on your behalf, we need your authorization. By agreeing, you:
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[#0F1B3D] mt-0.5">&#8226;</span>
                  <p className="text-sm text-[#0F1B3D]">
                    Authorize Elena to act as your representative with your health plan
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#0F1B3D] mt-0.5">&#8226;</span>
                  <p className="text-sm text-[#0F1B3D]">
                    Allow Elena to access and discuss your health information with providers and insurers
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#0F1B3D] mt-0.5">&#8226;</span>
                  <p className="text-sm text-[#0F1B3D]">
                    Permit Elena to help with claims, billing, appointments, and care coordination
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#0F1B3D]/40 text-center mt-4">
                Valid for 1 year. You can revoke anytime.{" "}
                <a
                  href="https://elena-health.com/hipaa-authorization"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Read full terms
                </a>
              </p>
            </div>

            <div className="p-6 pt-4">
              <label className="block text-xs font-semibold text-[#0F1B3D] mb-1.5">
                Type your full name to sign
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full rounded-xl border border-[#0F1B3D]/10 bg-[#f5f7fb] px-3.5 py-2.5 text-sm text-[#0F1B3D] placeholder:text-[#0F1B3D]/30 focus:outline-none focus:ring-2 focus:ring-[#0F1B3D]/20 transition-all"
                autoFocus
              />

              <button
                onClick={handleSign}
                disabled={!canSign || saving}
                className={`w-full mt-4 rounded-full py-3 text-sm font-semibold text-white transition-all ${
                  canSign && !saving
                    ? "bg-[#0F1B3D] hover:bg-[#0F1B3D]/90 cursor-pointer"
                    : "bg-[#0F1B3D]/30 cursor-not-allowed"
                }`}
              >
                {saving ? "Saving..." : "I Authorize Elena"}
              </button>

              <button
                onClick={handleClose}
                className="w-full mt-2 py-2 text-sm font-medium text-[#0F1B3D]/50 hover:text-[#0F1B3D]/70 transition-colors"
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <div className="p-6">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-bold text-[#0F1B3D] text-center">
                You're all set!
              </DialogTitle>
              <DialogDescription className="text-sm text-[#0F1B3D]/60 mt-2 text-center">
                Your HIPAA authorization has been signed.
              </DialogDescription>
            </DialogHeader>

            <div
              className="mt-5 rounded-2xl p-4 pl-5 flex gap-3"
              style={{
                background: "linear-gradient(135deg, #FFF5EC 0%, #FFEADB 100%)",
                border: "1px solid rgba(244, 176, 132, 0.35)",
              }}
            >
              <div className="shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F4B084, #E8956D)" }}>
                  <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0F1B3D] mb-1">
                  A quick heads up
                </p>
                <p className="text-[13px] text-[#0F1B3D]/75 leading-relaxed">
                  Some insurers require their own authorization form before sharing your information. If that comes up when we call on your behalf, we'll let you know and walk you through it.
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full mt-5 rounded-full py-3 text-sm font-semibold text-white bg-[#0F1B3D] hover:bg-[#0F1B3D]/90 transition-all"
            >
              Got it
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
