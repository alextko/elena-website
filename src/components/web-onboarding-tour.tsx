"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Heart, Users, User, Baby, HelpCircle } from "lucide-react";
import * as analytics from "@/lib/analytics";

// Use the hook API from react-joyride v3
let useJoyrideHook: any = null;
let JOYRIDE_STATUS: any = {};
let JOYRIDE_EVENTS: any = {};
let JOYRIDE_ACTIONS: any = {};

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

const joyrideStyles: any = {
  options: {
    primaryColor: "#0F1B3D",
    zIndex: 99999,
    arrowColor: "#fff",
    backgroundColor: "#fff",
    textColor: "#0F1B3D",
    overlayColor: "rgba(0, 0, 0, 0.45)",
  },
  tooltip: { borderRadius: 20, padding: "28px 32px", boxShadow: "0 8px 30px rgba(15,27,61,0.15)", maxWidth: 360 },
  tooltipTitle: { fontSize: 20, fontWeight: 800, color: "#0F1B3D", marginBottom: 6, textAlign: "center" as const },
  tooltipContent: { fontSize: 15, fontWeight: 300, color: "#5a6a82", lineHeight: 1.65, padding: "6px 0 0", textAlign: "center" as const },
  tooltipFooter: { marginTop: 20, justifyContent: "center" },
  buttonNext: { background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)", borderRadius: 14, fontSize: 15, fontWeight: 600, padding: "12px 32px", border: "none" },
  buttonBack: { color: "#8E8E93", fontSize: 14, fontWeight: 500, marginRight: 12 },
  buttonSkip: { color: "#AEAEB2", fontSize: 13, fontWeight: 400 },
  buttonClose: { display: "none" },
  spotlight: { borderRadius: 14 },
  beacon: { display: "none" },
};

const TOUR_STEPS: any[] = [
  { target: "[data-tour='profile-button']", placement: "top" as const, disableBeacon: true, title: "Your health profile", content: "This is where your doctors, medications, insurance, and appointments live.", locale: { next: "Show me" } },
  { target: "[data-tour='tab-health']", placement: "right" as const, disableBeacon: true, title: "Health", content: "Your game plan, doctors, medications, and to-dos. Elena automatically adds and updates everything here." },
  { target: "[data-tour='tab-insurance']", placement: "right" as const, disableBeacon: true, title: "Insurance", content: "Your insurance cards are stored here. Elena uses them to check coverage, find in-network doctors, and estimate your costs." },
  { target: "[data-tour='profile-switcher']", placement: "right" as const, disableBeacon: true, title: "Family profiles", content: "This is where you can add family members. Each person gets their own profile with separate health data." },
];

function JoyrideTour({ onStepChange, onFinish, onSkip }: { onStepChange: (idx: number) => void; onFinish: () => void; onSkip: () => void }) {
  const [JoyrideComp, setJoyrideComp] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import("react-joyride").then((mod) => {
      setJoyrideComp(() => mod.Joyride);
      JOYRIDE_STATUS = mod.STATUS;
      JOYRIDE_EVENTS = mod.EVENTS;
      JOYRIDE_ACTIONS = mod.ACTIONS;
      // Delay to ensure DOM targets exist
      setTimeout(() => setReady(true), 200);
    });
  }, []);

  const handleCallback = useCallback((data: any) => {
    const { status, index, action, type } = data;
    console.log("[joyride]", { status, index, action, type });

    if (type === JOYRIDE_EVENTS.STEP_AFTER) {
      const nextIdx = action === JOYRIDE_ACTIONS.PREV ? index - 1 : index + 1;
      if (nextIdx >= TOUR_STEPS.length) {
        onFinish();
      } else {
        onStepChange(nextIdx);
      }
    }

    if (status === JOYRIDE_STATUS.FINISHED) onFinish();
    if (status === JOYRIDE_STATUS.SKIPPED) onSkip();
    if (type === JOYRIDE_EVENTS.TARGET_NOT_FOUND) {
      console.warn("[joyride] target not found at step", index);
    }
  }, [onStepChange, onFinish, onSkip]);

  if (!JoyrideComp || !ready) return null;

  return (
    <JoyrideComp
      steps={TOUR_STEPS}
      run={true}
      continuous
      showSkipButton
      showProgress={false}
      disableOverlayClose
      callback={handleCallback}
      styles={joyrideStyles}
      locale={{ back: "Back", next: "Next", skip: "Skip tour", last: "Finish" }}
    />
  );
}

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover }: WebOnboardingTourProps) {
  const [phase, setPhase] = useState<"care" | "tour" | "done">("care");
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); analytics.track("Web Tour Started" as any); }, []);

  const handleStepChange = useCallback((idx: number) => {
    analytics.track("Web Tour Step Viewed" as any, { step: idx, step_name: TOUR_STEPS[idx]?.title });
    // Control profile popover
    if (idx === 0) onProfilePopover(false);
    else if (idx === 1) onProfilePopover(true, "health", false);
    else if (idx === 2) onProfilePopover(true, "insurance", false);
    else if (idx === 3) onProfilePopover(true, "health", true);
    else onProfilePopover(false);
  }, [onProfilePopover]);

  const handleFinish = useCallback(() => {
    analytics.track("Web Tour Completed" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    setPhase("done");
    onShowPaywall();
    onComplete();
  }, [onComplete, onShowPaywall, onProfilePopover]);

  const handleSkip = useCallback(() => {
    analytics.track("Web Tour Skipped" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    setPhase("done");
    onComplete();
  }, [onComplete, onProfilePopover]);

  const startTour = useCallback(() => {
    if (careSelections.length > 0) analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    // Open profile popover for first step
    onProfilePopover(false);
    setPhase("tour");
  }, [careSelections, onProfilePopover]);

  if (!mounted || phase === "done") return null;

  // Phase 1: Care context
  if (phase === "care") {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center font-[family-name:var(--font-inter)]">
        <div className="absolute inset-0 bg-black/45" />
        <button onClick={handleSkip} className="absolute top-4 right-4 z-10 flex items-center gap-1 text-white/60 text-sm hover:text-white transition-colors">Skip tour <X className="w-4 h-4" /></button>
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
            <button onClick={startTour} className="w-full mt-5 py-3.5 rounded-xl text-white font-semibold text-[15px] hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}>Continue</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Phase 2: Joyride tour
  return <JoyrideTour onStepChange={handleStepChange} onFinish={handleFinish} onSkip={handleSkip} />;
}
