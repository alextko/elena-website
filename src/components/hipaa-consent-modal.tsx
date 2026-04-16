"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
      onOpenChange(false);
      setSignature("");
      onSigned?.();
    } catch (e) {
      console.error("Failed to save HIPAA consent:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl">
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
            Type your full legal name to sign
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
            onClick={() => { onOpenChange(false); setSignature(""); }}
            className="w-full mt-2 py-2 text-sm font-medium text-[#0F1B3D]/50 hover:text-[#0F1B3D]/70 transition-colors"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
