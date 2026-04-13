"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Heart, Users, User, Baby, HelpCircle } from "lucide-react";
import * as analytics from "@/lib/analytics";

interface WebOnboardingTourProps {
  onComplete: () => void;
  onShowPaywall: () => void;
  onProfilePopover: (open: boolean, tab?: "health" | "visits" | "insurance") => void;
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

  // Control profile popover based on step
  useEffect(() => {
    if (step === 2) onProfilePopover(true, "health");
    else if (step === 3) onProfilePopover(true, "health");
    else if (step === 4) onProfilePopover(true, "insurance");
    else if (step === 5) onProfilePopover(true, "health");
    else onProfilePopover(false);
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
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" style={{ pointerEvents: "auto" }} onClick={(e) => e.stopPropagation()} />

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

            {step === 2 && <TourCard onNext={() => { trackStep(2, "profile"); next(); }} position="right">
              <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">Your health profile</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                This is where all your health data lives. Doctors, medications, to-dos, and appointments.
              </p>
              <TourNextLink onClick={() => { trackStep(2, "profile"); next(); }} />
            </TourCard>}

            {step === 3 && <TourCard onNext={() => { trackStep(3, "health_data"); next(); }} position="right">
              <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">It gets smarter over time</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                As you use Elena, she automatically adds doctors, medications, and to-dos to your profile. You can also add them yourself.
              </p>
              <TourNextLink onClick={() => { trackStep(3, "health_data"); next(); }} />
            </TourCard>}

            {step === 4 && <TourCard onNext={() => { trackStep(4, "insurance"); next(); }} position="right">
              <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">Add your insurance</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                Upload your insurance card here. Elena uses it to check coverage, find in-network doctors, and estimate your costs.
              </p>
              <TourNextLink onClick={() => { trackStep(4, "insurance"); next(); }} />
            </TourCard>}

            {step === 5 && <TourCard onNext={() => { trackStep(5, "family"); next(); }} position="right">
              <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">Manage your family</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">
                Managing care for a parent, partner, or child? Add them here. Each person gets their own profile with separate health data.
              </p>
              <TourNextLink onClick={() => { trackStep(5, "family"); next(); }} />
            </TourCard>}

            {step === 6 && <TourCard onNext={finish}>
              <div className="text-center">
                <div className="text-[40px] mb-3">💬</div>
                <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2">Chat with Elena</h2>
                <p className="text-[15px] text-[#5a6a82] font-light leading-relaxed">
                  Ask anything about your health, insurance, or appointments. Elena can make calls, compare prices, and manage your care.
                </p>
                <p className="text-[13px] text-[#8E8E93] font-light mt-3">
                  Your conversations are saved in the sidebar.
                </p>
              </div>
              <TourButton onClick={() => { trackStep(6, "chat"); onShowPaywall(); finish(); }} label="See Elena Pro" />
              <button
                onClick={() => { trackStep(6, "chat"); finish(); }}
                className="w-full mt-2 py-3 text-[14px] font-medium text-[#8E8E93] hover:text-[#0F1B3D] transition-colors"
                style={{ pointerEvents: "auto" }}
              >
                Start using Elena
              </button>
            </TourCard>}
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

function TourCard({ children, onNext, position = "center" }: { children: React.ReactNode; onNext: () => void; position?: "center" | "right" }) {
  return (
    <div
      className={`relative z-[310] max-w-sm w-full mx-6 ${position === "right" ? "ml-auto mr-[calc(50%-180px)] max-md:mx-6" : ""}`}
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
