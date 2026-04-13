"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Heart, Users, User, Baby, HelpCircle } from "lucide-react";
import * as analytics from "@/lib/analytics";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";

interface WebOnboardingTourProps {
  onComplete: () => void;
  onShowPaywall: () => void;
}

const CARE_OPTIONS = [
  { id: "myself", label: "Myself", icon: User },
  { id: "parent", label: "My parent", icon: Heart },
  { id: "partner", label: "My partner", icon: Users },
  { id: "child", label: "My child", icon: Baby },
  { id: "other", label: "Someone else", icon: HelpCircle },
];

const TOTAL_STEPS = 7;

type TourStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function WebOnboardingTour({ onComplete, onShowPaywall }: WebOnboardingTourProps) {
  const [step, setStep] = useState<TourStep>(0);
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);
  const { profileId } = useAuth();

  useEffect(() => {
    analytics.track("Web Tour Started" as any);
  }, []);

  const trackStep = useCallback((stepNum: number, name: string) => {
    analytics.track("Web Tour Step Viewed" as any, { step: stepNum, step_name: name });
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      const nextStep = Math.min(s + 1, TOTAL_STEPS - 1) as TourStep;
      return nextStep;
    });
  }, []);

  const skip = useCallback(() => {
    analytics.track("Web Tour Skipped" as any, { at_step: step });
    localStorage.setItem("elena_web_tour_done", "true");
    setVisible(false);
    setTimeout(onComplete, 300);
  }, [step, onComplete]);

  const finish = useCallback(() => {
    analytics.track("Web Tour Completed" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    setVisible(false);
    setTimeout(onComplete, 300);
  }, [onComplete]);

  const handleCareSubmit = useCallback(async () => {
    if (careSelections.length > 0 && profileId) {
      analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
      try {
        await apiFetch(`/profile/${profileId}`, {
          method: "PUT",
          body: JSON.stringify({ caregiver_for: careSelections }),
        });
      } catch {}
    }
    next();
  }, [careSelections, profileId, next]);

  // Open profile popover for steps 2-5
  useEffect(() => {
    if (step >= 2 && step <= 5) {
      const profileBtn = document.querySelector('[data-tour="profile-button"]') as HTMLElement;
      if (profileBtn && step === 2) {
        profileBtn.click();
      }
    }
  }, [step]);

  // Switch insurance tab for step 4
  useEffect(() => {
    if (step === 4) {
      const insuranceTab = document.querySelector('[data-tour="tab-insurance"]') as HTMLElement;
      if (insuranceTab) insuranceTab.click();
    }
  }, [step]);

  // Switch back to health tab and highlight switcher for step 5
  useEffect(() => {
    if (step === 5) {
      const healthTab = document.querySelector('[data-tour="tab-health"]') as HTMLElement;
      if (healthTab) healthTab.click();
    }
  }, [step]);

  // Close profile popover for step 6
  useEffect(() => {
    if (step === 6) {
      // Press escape to close any open dialog
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
  }, [step]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] font-[family-name:var(--font-inter)]"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Skip button - always visible */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 z-[310] flex items-center gap-1 text-white/60 text-sm hover:text-white transition-colors"
        >
          Skip tour <X className="w-4 h-4" />
        </button>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {step === 0 && <WelcomeStep onNext={() => { trackStep(0, "welcome"); next(); }} />}
            {step === 1 && (
              <CareContextStep
                selections={careSelections}
                onToggle={(id) => setCareSelections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])}
                onNext={() => { trackStep(1, "care_context"); handleCareSubmit(); }}
              />
            )}
            {step === 2 && <SpotlightStep target="profile-button" title="Your health profile" description="Your doctors, medications, insurance, and appointments live here. Let's take a look." onNext={() => { trackStep(2, "profile"); next(); }} position="above" />}
            {step === 3 && <SpotlightStep target="tab-health" title="Health data" description="As you use Elena, she'll automatically add doctors, medications, and to-dos to your profile. You can also add them yourself anytime." onNext={() => { trackStep(3, "health_data"); next(); }} position="below" />}
            {step === 4 && <SpotlightStep target="tab-insurance" title="Insurance" description="Add your insurance card here. Elena uses it to check coverage, find in-network doctors, and estimate your costs." onNext={() => { trackStep(4, "insurance"); next(); }} position="below" />}
            {step === 5 && <SpotlightStep target="profile-switcher" title="Family members" description="Managing care for someone else? Add family members here. Each person gets their own profile with separate health data." onNext={() => { trackStep(5, "family"); next(); }} position="below" />}
            {step === 6 && (
              <ChatStep
                onNext={() => {
                  trackStep(6, "chat");
                  onShowPaywall();
                  finish();
                }}
                onSkipPaywall={() => {
                  trackStep(6, "chat");
                  finish();
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-[310]">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? "bg-white w-6" : i < step ? "bg-white/60" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Step Components ────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative z-[310] max-w-md w-full mx-6">
      <div className="rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
        <div className="text-center">
          <div className="text-[40px] mb-3">👋</div>
          <h2 className="text-[24px] font-extrabold text-[#0F1B3D] mb-2">Welcome to Elena</h2>
          <p className="text-[15px] text-[#8E8E93] font-light leading-relaxed">
            Let me show you around. This will only take a moment.
          </p>
        </div>
        <button
          onClick={onNext}
          className="w-full mt-6 py-3.5 rounded-xl text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

function CareContextStep({
  selections,
  onToggle,
  onNext,
}: {
  selections: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="relative z-[310] max-w-md w-full mx-6">
      <div className="rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
        <div className="text-center mb-6">
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2">Who are you managing care for?</h2>
          <p className="text-[14px] text-[#8E8E93] font-light">Select all that apply. This helps Elena personalize your experience.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {CARE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = selections.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => onToggle(opt.id)}
                className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                  selected
                    ? "bg-[#0F1B3D]/[0.04] border-[#0F1B3D] shadow-[0_0_0_1px_#0F1B3D]"
                    : "bg-white border-[#E5E5EA] hover:border-[#0F1B3D]/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selected ? "bg-[#0F1B3D]" : "bg-[#F5F7FB]"}`}>
                  <Icon className={`w-4 h-4 ${selected ? "text-white" : "text-[#8E8E93]"}`} />
                </div>
                <span className={`text-[15px] font-medium ${selected ? "text-[#0F1B3D]" : "text-[#1C1C1E]"}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onNext}
          className="w-full mt-6 py-3.5 rounded-xl text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function SpotlightStep({
  target,
  title,
  description,
  onNext,
  position = "below",
}: {
  target: string;
  title: string;
  description: string;
  onNext: () => void;
  position?: "above" | "below";
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
    }
  }, [target]);

  if (!rect) {
    // Fallback: show as centered card if target not found
    return (
      <div className="relative z-[310] max-w-sm w-full mx-6">
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
          <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">{title}</h3>
          <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">{description}</p>
          <button
            onClick={onNext}
            className="mt-4 flex items-center gap-1.5 text-[14px] font-semibold text-[#0F1B3D] hover:opacity-70 transition-opacity"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Spotlight hole position
  const pad = 8;
  const holeStyle: React.CSSProperties = {
    position: "fixed",
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    borderRadius: 16,
    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
    zIndex: 305,
    pointerEvents: "none",
  };

  // Tooltip position
  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 310,
    maxWidth: 320,
  };

  if (position === "above") {
    tooltipStyle.left = Math.max(16, rect.left);
    tooltipStyle.bottom = window.innerHeight - rect.top + pad + 12;
  } else {
    tooltipStyle.left = Math.max(16, rect.left);
    tooltipStyle.top = rect.bottom + pad + 12;
  }

  return (
    <>
      {/* Spotlight hole */}
      <div style={holeStyle} />

      {/* Tooltip */}
      <div ref={tooltipRef} style={tooltipStyle} className="z-[310]">
        <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
          {/* Arrow */}
          <div
            className="absolute w-3 h-3 bg-white rotate-45"
            style={position === "above"
              ? { bottom: -6, left: 24 }
              : { top: -6, left: 24 }
            }
          />
          <h3 className="text-[17px] font-bold text-[#0F1B3D] mb-1.5">{title}</h3>
          <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">{description}</p>
          <button
            onClick={onNext}
            className="mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-[#0F1B3D] hover:opacity-70 transition-opacity"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function ChatStep({ onNext, onSkipPaywall }: { onNext: () => void; onSkipPaywall: () => void }) {
  return (
    <div className="relative z-[310] max-w-md w-full mx-6">
      <div className="rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
        <div className="text-center">
          <div className="text-[40px] mb-3">💬</div>
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2">Chat with Elena</h2>
          <p className="text-[15px] text-[#5a6a82] font-light leading-relaxed">
            Ask Elena anything about your health, insurance, or appointments. She can make calls, compare prices, and manage your care.
          </p>
          <p className="text-[13px] text-[#8E8E93] font-light mt-3">
            Your conversations are saved in the sidebar on the left.
          </p>
        </div>

        <button
          onClick={onNext}
          className="w-full mt-6 py-3.5 rounded-xl text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}
        >
          See Elena Pro
        </button>
        <button
          onClick={onSkipPaywall}
          className="w-full mt-2 py-3 text-[14px] font-medium text-[#8E8E93] hover:text-[#0F1B3D] transition-colors"
        >
          Start using Elena
        </button>
      </div>
    </div>
  );
}
