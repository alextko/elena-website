"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Heart, Users, User, Baby, HelpCircle } from "lucide-react";
import * as analytics from "@/lib/analytics";

interface WebOnboardingTourProps {
  onComplete: () => void;
  onShowPaywall: () => void;
  onProfilePopover: (open: boolean, tab?: "health" | "visits" | "insurance", showSwitcher?: boolean) => void;
}

const CARE_OPTIONS = [
  { id: "myself", label: "Myself", icon: User },
  { id: "parent", label: "My parent", icon: Heart },
  { id: "partner", label: "My partner", icon: Users },
  { id: "child", label: "My child", icon: Baby },
  { id: "other", label: "Someone else", icon: HelpCircle },
];

const STEPS = [
  { id: "welcome", title: "Welcome to Elena 👋", body: "Let me give you a quick tour. This will only take a moment.", cta: "Get Started" },
  { id: "profile-button", title: "Your health profile", body: "This is where your doctors, medications, insurance, and appointments live.", spotlight: true },
  { id: "health-tab", title: "Health", body: "Your game plan, doctors, medications, and to-dos. As you use Elena, she automatically adds and updates everything here." },
  { id: "visits-tab", title: "Visits", body: "Your full visit timeline. Past and upcoming appointments, visit notes, and documents are all tracked here." },
  { id: "insurance-tab", title: "Insurance", body: "Your insurance cards are stored here. Elena uses them to check coverage, find in-network doctors, and estimate your costs." },
  { id: "family", title: "Family profiles", body: "This is where you can add family members. Each person gets their own profile with separate health data, doctors, and insurance." },
  { id: "chat", title: "Chat with Elena 💬", body: "Ask Elena anything about your health, insurance, or appointments. She can make calls, compare prices, and manage your care.", cta: "Finish" },
];

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover }: WebOnboardingTourProps) {
  const [phase, setPhase] = useState<"care" | "tour">("care");
  const [step, setStep] = useState(0);
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const guardRef = useRef(false);

  useEffect(() => { setMounted(true); analytics.track("Web Tour Started" as any); }, []);

  // Profile popover control
  useEffect(() => {
    if (phase !== "tour") return;
    if (step === 2) onProfilePopover(true, "health", false);
    else if (step === 3) onProfilePopover(true, "visits", false);
    else if (step === 4) onProfilePopover(true, "insurance", false);
    else if (step === 5) onProfilePopover(true, "health", true);
    else onProfilePopover(false, undefined, false);
  }, [phase, step, onProfilePopover]);

  const next = useCallback(() => {
    if (guardRef.current) return;
    guardRef.current = true;
    setTimeout(() => { guardRef.current = false; }, 300);

    analytics.track("Web Tour Step Viewed" as any, { step, step_name: STEPS[step]?.id });

    if (step >= STEPS.length - 1) {
      analytics.track("Web Tour Completed" as any);
      localStorage.setItem("elena_web_tour_done", "true");
      onProfilePopover(false, undefined, false);
      onShowPaywall();
      onComplete();
      return;
    }
    setStep((s) => s + 1);
  }, [step, onComplete, onShowPaywall, onProfilePopover]);

  const skip = useCallback(() => {
    analytics.track("Web Tour Skipped" as any, { at_step: step });
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    onComplete();
  }, [step, onComplete, onProfilePopover]);

  const startTour = useCallback(() => {
    if (careSelections.length > 0) {
      analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    }
    setPhase("tour");
  }, [careSelections]);

  if (!mounted) return null;

  // Phase 1: Care context
  if (phase === "care") {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center font-[family-name:var(--font-inter)]">
        <div className="absolute inset-0 bg-black/45" />
        <button onClick={skip} className="absolute top-4 right-4 z-10 flex items-center gap-1 text-white/60 text-sm hover:text-white transition-colors">
          Skip tour <X className="w-4 h-4" />
        </button>
        <div className="relative z-10 max-w-sm w-full mx-6">
          <div className="rounded-2xl bg-white p-7 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
            <div className="text-center mb-5">
              <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2">Who are you managing care for?</h2>
              <p className="text-[14px] text-[#8E8E93] font-light">Select all that apply.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {CARE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = careSelections.includes(opt.id);
                return (
                  <button key={opt.id} onClick={() => setCareSelections((p) => p.includes(opt.id) ? p.filter((s) => s !== opt.id) : [...p, opt.id])}
                    className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border text-left transition-all ${selected ? "bg-[#0F1B3D]/[0.04] border-[#0F1B3D] shadow-[0_0_0_1px_#0F1B3D]" : "bg-white border-[#E5E5EA] hover:border-[#0F1B3D]/20"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selected ? "bg-[#0F1B3D]" : "bg-[#F5F7FB]"}`}>
                      <Icon className={`w-4 h-4 ${selected ? "text-white" : "text-[#8E8E93]"}`} />
                    </div>
                    <span className={`text-[15px] font-medium ${selected ? "text-[#0F1B3D]" : "text-[#1C1C1E]"}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={startTour} className="w-full mt-5 py-3.5 rounded-xl text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}>
              Continue
            </button>
          </div>
        </div>
        <ProgressDots current={-1} total={STEPS.length} />
      </div>,
      document.body
    );
  }

  // Phase 2: Tour steps
  const currentStep = STEPS[step];
  const isSpotlight = step === 1; // profile button spotlight
  const isPopoverStep = step >= 2 && step <= 5;

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[99999] font-[family-name:var(--font-inter)]"
        style={{ pointerEvents: "none" }}
      >
        {/* Overlay - transparent during spotlight, darker during popover steps */}
        {!isSpotlight && (
          <div className={`absolute inset-0 ${isPopoverStep ? "bg-black/55" : "bg-black/40"}`} style={{ pointerEvents: "auto" }} />
        )}

        {/* Spotlight for profile button */}
        {isSpotlight && <SpotlightOverlay target="[data-tour='profile-button']" />}

        {/* Skip button */}
        <button onClick={skip} className="absolute top-4 right-4 z-10 flex items-center gap-1 text-white/60 text-sm hover:text-white transition-colors" style={{ pointerEvents: "auto" }}>
          Skip tour <X className="w-4 h-4" />
        </button>

        {/* Tooltip card */}
        {isSpotlight ? (
          <SpotlightTooltip target="[data-tour='profile-button']" title={currentStep.title} body={currentStep.body} onNext={next} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
            <div className="max-w-sm w-full mx-6" style={{ pointerEvents: "auto" }}>
              <div className="rounded-2xl bg-white p-7 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
                <div className="text-center">
                  <h3 className="text-[20px] font-extrabold text-[#0F1B3D] mb-2">{currentStep.title}</h3>
                  <p className="text-[15px] text-[#5a6a82] font-light leading-relaxed">{currentStep.body}</p>
                </div>
                <button onClick={next} className="w-full mt-5 py-3.5 rounded-xl text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)", pointerEvents: "auto" }}>
                  {currentStep.cta || "Next"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ProgressDots current={step} total={STEPS.length} />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function SpotlightOverlay({ target }: { target: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector(target);
    if (el) setRect(el.getBoundingClientRect());
  }, [target]);

  if (!rect) return <div className="absolute inset-0 bg-black/40" style={{ pointerEvents: "auto" }} />;

  const pad = 8;
  return (
    <div style={{
      position: "fixed", left: rect.left - pad, top: rect.top - pad,
      width: rect.width + pad * 2, height: rect.height + pad * 2,
      borderRadius: 14, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
      zIndex: 1, pointerEvents: "none",
    }} />
  );
}

function SpotlightTooltip({ target, title, body, onNext }: { target: string; title: string; body: string; onNext: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector(target);
    if (el) setRect(el.getBoundingClientRect());
  }, [target]);

  return (
    <div style={{
      position: "fixed",
      left: rect ? Math.max(16, rect.left) : 16,
      bottom: rect ? (window.innerHeight - rect.top + 20) : 100,
      zIndex: 10, pointerEvents: "auto", maxWidth: 320,
    }}>
      <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(15,27,61,0.15)] relative">
        <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-white rotate-45" />
        <h3 className="text-[17px] font-bold text-[#0F1B3D] mb-1.5">{title}</h3>
        <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">{body}</p>
        <button onClick={onNext} className="mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-[#0F1B3D] hover:opacity-70 transition-opacity">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10" style={{ pointerEvents: "none" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-2 rounded-full transition-all ${i === current ? "bg-white w-6" : i < current ? "bg-white/60 w-2" : "bg-white/20 w-2"}`} />
      ))}
    </div>
  );
}
