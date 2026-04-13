"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, Heart, Users, User, Baby, HelpCircle } from "lucide-react";
import { useJoyride, EVENTS, STATUS } from "react-joyride";
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

const joyrideStyles: any = {
  options: { primaryColor: "#0F1B3D", zIndex: 99999, arrowColor: "#fff", backgroundColor: "#fff", textColor: "#0F1B3D", overlayColor: "rgba(0,0,0,0.45)" },
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
  { target: "[data-tour='profile-button']", placement: "top", disableBeacon: true, title: "Your health profile", content: "This is where your doctors, medications, insurance, and appointments live.", locale: { next: "Show me" } },
  { target: "[data-tour='tab-health']", placement: "right", disableBeacon: true, title: "Health", content: "Your game plan, doctors, medications, and to-dos. Elena automatically adds and updates everything here." },
  { target: "[data-tour='tab-insurance']", placement: "right", disableBeacon: true, title: "Insurance", content: "Your insurance cards are stored here. Elena uses them to check coverage, find in-network doctors, and estimate your costs." },
  { target: "[data-tour='profile-switcher']", placement: "right", disableBeacon: true, title: "Family profiles", content: "This is where you can add family members. Each person gets their own profile with separate health data." },
];

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover }: WebOnboardingTourProps) {
  const [phase, setPhase] = useState<"care" | "tour" | "done">("care");
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const finishedRef = useRef(false);

  const { controls, state, on, Tour } = useJoyride({
    steps: TOUR_STEPS,
    continuous: true,
  } as any);

  useEffect(() => { setMounted(true); analytics.track("Web Tour Started" as any); }, []);

  // Subscribe to joyride events
  useEffect(() => {
    const unsubAfter = on(EVENTS.STEP_AFTER, (data: any) => {
      console.log("[tour] step:after", data);
      const nextIdx = data.index + 1;
      analytics.track("Web Tour Step Viewed" as any, { step: nextIdx, step_name: TOUR_STEPS[nextIdx]?.title });

      // Control profile popover for next step
      if (nextIdx === 1) onProfilePopover(true, "health", false);
      else if (nextIdx === 2) onProfilePopover(true, "insurance", false);
      else if (nextIdx === 3) onProfilePopover(true, "health", true);
    });

    const unsubEnd = on(EVENTS.TOUR_END, () => {
      console.log("[tour] tour:end");
      if (finishedRef.current) return;
      finishedRef.current = true;
      analytics.track("Web Tour Completed" as any);
      localStorage.setItem("elena_web_tour_done", "true");
      onProfilePopover(false, undefined, false);
      setPhase("done");
      onShowPaywall();
      onComplete();
    });

    const unsubStatus = on(EVENTS.TOUR_STATUS, (data: any) => {
      console.log("[tour] status:", data.status);
      if (data.status === STATUS.SKIPPED) {
        if (finishedRef.current) return;
        finishedRef.current = true;
        analytics.track("Web Tour Skipped" as any);
        localStorage.setItem("elena_web_tour_done", "true");
        onProfilePopover(false, undefined, false);
        setPhase("done");
        onComplete();
      }
    });

    const unsubError = on(EVENTS.TARGET_NOT_FOUND, (data: any) => {
      console.warn("[tour] target not found:", data);
    });

    return () => { unsubAfter(); unsubEnd(); unsubStatus(); unsubError(); };
  }, [on, onComplete, onShowPaywall, onProfilePopover]);

  const handleSkip = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    analytics.track("Web Tour Skipped" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    setPhase("done");
    onComplete();
  }, [onComplete, onProfilePopover]);

  const startTour = useCallback(() => {
    if (careSelections.length > 0) analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    setPhase("tour");
    // Start the tour after a brief delay for DOM targets to be ready
    setTimeout(() => {
      console.log("[tour] calling controls.start()");
      controls.start();
    }, 300);
  }, [careSelections, controls]);

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

  // Phase 2: Tour is rendered by the hook's Tour element
  console.log("[tour] phase=tour, Tour element:", !!Tour);
  return Tour;
}
