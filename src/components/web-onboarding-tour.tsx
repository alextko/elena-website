"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

const TOTAL_STEPS = 9;
type TourStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover }: WebOnboardingTourProps) {
  const [step, setStep] = useState<TourStep>(0);
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    analytics.track("Web Tour Started" as any);
  }, []);

  const trackStep = useCallback((stepNum: number, name: string) => {
    analytics.track("Web Tour Step Viewed" as any, { step: stepNum, step_name: name });
  }, []);

  const nextGuard = useRef(false);
  const next = useCallback(() => {
    if (nextGuard.current) return;
    nextGuard.current = true;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1) as TourStep);
    setTimeout(() => { nextGuard.current = false; }, 400);
  }, []);

  const skip = useCallback(() => {
    analytics.track("Web Tour Skipped" as any, { at_step: step });
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false);
    setVisible(false);
    setTimeout(onComplete, 300);
  }, [step, onComplete, onProfilePopover]);

  const finish = useCallback(() => {
    analytics.track("Web Tour Completed" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false);
    setVisible(false);
    setTimeout(onComplete, 300);
  }, [onComplete, onProfilePopover]);

  const advancingRef = useRef(false);
  const handleCareSubmit = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    if (careSelections.length > 0) {
      analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    }
    next();
    setTimeout(() => { advancingRef.current = false; }, 500);
  }, [careSelections, next]);

  // Step 7: open the real paywall and end the tour
  useEffect(() => {
    if (step === 8) {
      trackStep(8, "paywall");
      onShowPaywall();
      finish();
    }
  }, [step, trackStep, onShowPaywall, finish]);

  // Control profile popover based on step
  // Step 2: spotlight the profile button (popover closed)
  // Steps 3-6: popover open with tour cards on top
  useEffect(() => {
    if (step === 3) onProfilePopover(true, "health", false);
    else if (step === 4) onProfilePopover(true, "visits", false);
    else if (step === 5) onProfilePopover(true, "insurance", false);
    else if (step === 6) onProfilePopover(true, "health", true);
    else onProfilePopover(false, undefined, false);
  }, [step, onProfilePopover]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] font-[family-name:var(--font-inter)]"
        style={{ pointerEvents: "none" }}
      >
        {/* Backdrop - always visible but lighter during popover steps */}
        <div
          className={`absolute inset-0 transition-colors duration-300 ${step >= 3 && step <= 6 ? "bg-black/60" : "bg-black/45"}`}
          style={{ pointerEvents: "auto", zIndex: step >= 3 && step <= 6 ? 355 : 301 }}
          data-tour-backdrop
          onClick={(e) => e.stopPropagation()}
        />

        {/* Skip button */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 z-[310] flex items-center gap-1 text-white/60 text-sm hover:text-white transition-colors"
          style={{ pointerEvents: "auto" }}
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
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ pointerEvents: "none" }}
          >
            {step === 0 && <TourCard onNext={() => { trackStep(0, "welcome"); next(); }}>
              <div className="text-center">
                <div className="text-[40px] mb-3">👋</div>
                <h2 className="text-[24px] font-extrabold text-[#0F1B3D] mb-2">Welcome to Elena</h2>
                <p className="text-[15px] text-[#8E8E93] font-light leading-relaxed">
                  Let me show you around. This will only take a moment.
                </p>
              </div>
              <TourButton onClick={() => { trackStep(0, "welcome"); next(); }} label="Get Started" />
            </TourCard>}

            {step === 1 && <TourCard onNext={handleCareSubmit}>
              <div className="text-center mb-5">
                <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2">Who are you managing care for?</h2>
                <p className="text-[14px] text-[#8E8E93] font-light">Select all that apply.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {CARE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = careSelections.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setCareSelections((prev) => prev.includes(opt.id) ? prev.filter((s) => s !== opt.id) : [...prev, opt.id])}
                      className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                        selected ? "bg-[#0F1B3D]/[0.04] border-[#0F1B3D] shadow-[0_0_0_1px_#0F1B3D]" : "bg-white border-[#E5E5EA] hover:border-[#0F1B3D]/20"
                      }`}
                      style={{ pointerEvents: "auto" }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selected ? "bg-[#0F1B3D]" : "bg-[#F5F7FB]"}`}>
                        <Icon className={`w-4 h-4 ${selected ? "text-white" : "text-[#8E8E93]"}`} />
                      </div>
                      <span className={`text-[15px] font-medium ${selected ? "text-[#0F1B3D]" : "text-[#1C1C1E]"}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <TourButton onClick={() => { trackStep(1, "care_context"); handleCareSubmit(); }} label="Continue" />
            </TourCard>}

            {step === 2 && <TourCard onNext={() => { trackStep(2, "profile_button"); next(); }}>
              <div className="text-center">
                <div className="text-[32px] mb-3">📋</div>
                <h3 className="text-[20px] font-bold text-[#0F1B3D] mb-2">Your health profile</h3>
                <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                  Click your name at the bottom of the sidebar to open your profile. This is where your doctors, medications, insurance, and appointments live.
                </p>
              </div>
              <TourButton onClick={() => { trackStep(2, "profile_button"); next(); }} label="Show me" />
            </TourCard>}

            {step === 3 && <TourCard onNext={() => { trackStep(3, "health_tab"); next(); }} position="overlay">
              <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">Health</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                Your game plan, doctors, medications, and to-dos live here. As you use Elena, she automatically adds and updates everything.
              </p>
              <TourNextLink onClick={() => { trackStep(3, "health_tab"); next(); }} />
            </TourCard>}

            {step === 4 && <TourCard onNext={() => { trackStep(4, "visits_tab"); next(); }} position="overlay">
              <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">Visits</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                Your full visit timeline. Past and upcoming appointments, visit notes, and documents are all tracked here.
              </p>
              <TourNextLink onClick={() => { trackStep(4, "visits_tab"); next(); }} />
            </TourCard>}

            {step === 5 && <TourCard onNext={() => { trackStep(5, "insurance_tab"); next(); }} position="overlay">
              <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">Insurance</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                Add your insurance cards here. Elena uses them to check coverage, find in-network doctors, and estimate costs before you go.
              </p>
              <TourNextLink onClick={() => { trackStep(5, "insurance_tab"); next(); }} />
            </TourCard>}

            {step === 6 && <TourCard onNext={() => { trackStep(6, "family_switcher"); next(); }} position="overlay">
              <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">Family profiles</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                Managing care for someone else? Add family members here. Each person gets their own separate profile with their own health data, doctors, and insurance.
              </p>
              <TourNextLink onClick={() => { trackStep(6, "family_switcher"); next(); }} />
            </TourCard>}

            {step === 7 && <TourCard onNext={() => { trackStep(7, "chat"); next(); }}>
              <div className="text-center">
                <div className="text-[32px] mb-3">💬</div>
                <h2 className="text-[20px] font-bold text-[#0F1B3D] mb-2">Chat with Elena</h2>
                <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                  Ask anything about your health, insurance, or appointments. Elena can make calls, compare prices, and manage your care. Your conversations are saved in the sidebar.
                </p>
              </div>
              <TourButton onClick={() => { trackStep(7, "chat"); next(); }} label="Got it" />
            </TourCard>}

            {step === 8 && null}
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-[310]">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "bg-white w-6" : i < step ? "bg-white/60 w-2" : "bg-white/20 w-2"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Shared sub-components ──────────────────────────────────────

function TourCard({ children, onNext, position = "center" }: { children: React.ReactNode; onNext: () => void; position?: "center" | "overlay" }) {
  return (
    <div
      className="relative z-[360] max-w-sm w-full mx-6"
      style={{ pointerEvents: "auto" }}
    >
      <div className="rounded-2xl bg-white p-7 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
        {children}
      </div>
    </div>
  );
}

function TourButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full mt-5 py-3.5 rounded-xl text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)", pointerEvents: "auto" }}
    >
      {label}
    </button>
  );
}

function TourNextLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-[#0F1B3D] hover:opacity-70 transition-opacity"
      style={{ pointerEvents: "auto" }}
    >
      Next <ChevronRight className="w-4 h-4" />
    </button>
  );
}
