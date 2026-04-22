"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/apiFetch";
import * as analytics from "@/lib/analytics";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const APP_STORE_URL = "https://apps.apple.com/us/app/elena-ai-health-navigator/id6760362771";

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [phase, setPhase] = useState<"ask" | "feedback" | "download">("ask");
  const [feedbackText, setFeedbackText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleYes = () => {
    analytics.track("Feedback: Yes");
    setPhase("download");
  };

  const handleNo = () => {
    setPhase("feedback");
  };

  const handleDownloadClick = () => {
    analytics.track("Feedback: Download Clicked");
  };

  const handleSubmitFeedback = async () => {
    if (feedbackText.trim()) {
      setSaving(true);
      try {
        await apiFetch("/chat/feedback", {
          method: "POST",
          body: JSON.stringify({ feedback: feedbackText.trim() }),
        });
      } catch {}
      analytics.track("Feedback: Submitted", { feedback: feedbackText.trim() });
      setSaving(false);
    }
    onOpenChange(false);
    setPhase("ask");
    setFeedbackText("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setPhase("ask");
    setFeedbackText("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[22rem] sm:w-full sm:max-w-[340px] max-h-[calc(100svh-1rem)] overflow-y-auto overflow-x-hidden p-0 rounded-2xl">
        <div className="p-6 sm:p-8">
          {phase === "ask" ? (
            <>
              <h2 className="text-xl font-bold text-[#0F1B3D] text-center mb-6">
                Enjoying Elena?
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={handleNo}
                  className="flex-1 rounded-full py-3 text-sm font-semibold text-[#0F1B3D] bg-[#F2F2F7] hover:bg-[#E5E5EA] transition-colors"
                >
                  No
                </button>
                <button
                  onClick={handleYes}
                  className="flex-1 rounded-full py-3 text-sm font-semibold text-white bg-[#0F1B3D] hover:bg-[#0F1B3D]/90 transition-colors"
                >
                  Yes
                </button>
              </div>
            </>
          ) : phase === "download" ? (
            <div className="flex flex-col items-center">
              <img
                src="/assets/elena-app-icon.png"
                alt="Elena"
                className="w-[96px] h-[96px] rounded-[22px] shadow-[0_10px_30px_rgba(15,27,61,0.22)] mb-5"
              />
              <h2 className="text-xl font-bold text-[#0F1B3D] text-center mb-1.5">
                Take Elena with you
              </h2>
              <p className="text-sm text-[#0F1B3D]/60 text-center mb-5">
                Get the iOS app for appointments, bills, and more on the go.
              </p>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownloadClick}
                className="transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <img
                  src="/assets/app-store-badge.svg"
                  alt="Download on the App Store"
                  className="h-[44px] w-auto"
                />
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#0F1B3D] text-center mb-2">
                We&apos;d love your feedback
              </h2>
              <p className="text-sm text-[#0F1B3D]/60 text-center mb-4">
                How can we make Elena better?
              </p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us what you think..."
                autoFocus
                className="w-full rounded-xl border border-[#0F1B3D]/10 bg-[#f5f7fb] px-3.5 py-3 text-sm text-[#0F1B3D] placeholder:text-[#0F1B3D]/30 focus:outline-none focus:ring-2 focus:ring-[#0F1B3D]/20 min-h-[100px] resize-none transition-all"
              />
              <button
                onClick={handleSubmitFeedback}
                disabled={saving}
                className="w-full mt-4 rounded-full py-3 text-sm font-semibold text-white bg-[#0F1B3D] hover:bg-[#0F1B3D]/90 transition-colors"
              >
                {saving ? "Sending..." : feedbackText.trim() ? "Send Feedback" : "Skip"}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
