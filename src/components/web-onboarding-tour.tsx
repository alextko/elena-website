"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, Heart, Users, User, Baby, HelpCircle } from "lucide-react";
import * as analytics from "@/lib/analytics";
import { Joyride as JoyrideComponent } from "react-joyride";
const Joyride = JoyrideComponent as any;

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

// Joyride custom styles matching Elena design system
const joyrideStyles: any = {
  options: {
    primaryColor: "#0F1B3D",
    zIndex: 99999,
    arrowColor: "#fff",
    backgroundColor: "#fff",
    textColor: "#0F1B3D",
    overlayColor: "rgba(0, 0, 0, 0.45)",
  },
  tooltip: {
    borderRadius: 20,
    padding: "28px 32px",
    boxShadow: "0 8px 30px rgba(15, 27, 61, 0.15)",
    fontFamily: "var(--font-inter), Inter, -apple-system, sans-serif",
    maxWidth: 360,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#0F1B3D",
    marginBottom: 6,
    textAlign: "center" as const,
  },
  tooltipContent: {
    fontSize: 15,
    fontWeight: 300,
    color: "#5a6a82",
    lineHeight: 1.65,
    padding: "6px 0 0",
    textAlign: "center" as const,
  },
  tooltipFooter: {
    marginTop: 20,
    justifyContent: "center",
  },
  buttonNext: {
    background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 32px",
    fontFamily: "var(--font-inter), Inter, -apple-system, sans-serif",
    outline: "none",
    border: "none",
  },
  buttonBack: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: 500,
    marginRight: 12,
    fontFamily: "var(--font-inter), Inter, -apple-system, sans-serif",
  },
  buttonSkip: {
    color: "#AEAEB2",
    fontSize: 13,
    fontWeight: 400,
    fontFamily: "var(--font-inter), Inter, -apple-system, sans-serif",
  },
  buttonClose: {
    display: "none",
  },
  spotlight: {
    borderRadius: 14,
  },
  beacon: {
    display: "none",
  },
};

// Tour steps (indices 0-7, Joyride manages sequencing)
const TOUR_STEPS: any[] = [
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
    title: "Welcome to Elena 👋",
    content: "Let me give you a quick tour. This will only take a moment.",
    locale: { next: "Get Started" },
  },
  {
    target: "[data-tour='profile-button']",
    placement: "top",
    disableBeacon: true,
    title: "Your health profile",
    content: "This is where your doctors, medications, insurance, and appointments live. All your health data in one place.",
  },
  {
    target: "[data-tour='tab-health']",
    placement: "right",
    disableBeacon: true,
    title: "Health",
    content: "Your game plan, doctors, medications, and to-dos. As you use Elena, she automatically adds and updates everything here.",
  },
  {
    target: "[data-tour='tab-insurance']",
    placement: "right",
    disableBeacon: true,
    title: "Insurance",
    content: "Your insurance cards are stored here. Elena uses them to check coverage, find in-network doctors, and estimate your costs.",
  },
  {
    target: "[data-tour='profile-switcher']",
    placement: "right",
    disableBeacon: true,
    title: "Family profiles",
    content: "This is where you can add family members. Each person gets their own profile with separate health data, doctors, and insurance.",
  },
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
    title: "Chat with Elena 💬",
    content: "Ask Elena anything about your health, insurance, or appointments. She can make calls, compare prices, and manage your care. Your conversations are saved in the sidebar.",
    locale: { next: "Got it", last: "Got it" },
  },
];

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover }: WebOnboardingTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showCareContext, setShowCareContext] = useState(true);
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    analytics.track("Web Tour Started" as any);
  }, []);

  // Start joyride after care context step
  const startJoyride = useCallback(() => {
    setShowCareContext(false);
    if (careSelections.length > 0) {
      analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    }
    setRun(true);
  }, [careSelections]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    analytics.track("Web Tour Completed" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    setRun(false);
    onShowPaywall();
    onComplete();
  }, [onComplete, onShowPaywall, onProfilePopover]);

  const skip = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    analytics.track("Web Tour Skipped" as any, { at_step: stepIndex });
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    setRun(false);
    onComplete();
  }, [stepIndex, onComplete, onProfilePopover]);

  // Control profile popover based on Joyride step
  const handleJoyrideCallback = useCallback((data: any) => {
    const { status, index, action, type, lifecycle } = data;

    console.log("[tour] callback", { status, index, action, type, lifecycle });

    // Advance step after user clicks Next/Back
    if (type === "step:after" || (action === "next" && lifecycle === "complete")) {
      const nextIndex = action === "prev" ? index - 1 : index + 1;

      if (nextIndex >= TOUR_STEPS.length) {
        finish();
        return;
      }

      setStepIndex(nextIndex);
      analytics.track("Web Tour Step Viewed" as any, { step: nextIndex, step_name: TOUR_STEPS[nextIndex]?.title });

      // Control popover based on which step we're going to
      if (nextIndex === 1) {
        onProfilePopover(false, undefined, false);
      } else if (nextIndex === 2) {
        onProfilePopover(true, "health", false);
      } else if (nextIndex === 3) {
        onProfilePopover(true, "insurance", false);
      } else if (nextIndex === 4) {
        onProfilePopover(true, "health", true);
      } else if (nextIndex >= 5) {
        onProfilePopover(false, undefined, false);
      }
    }

    if (status === "finished" || status === "ready" && action === "close") {
      finish();
    } else if (status === "skipped") {
      skip();
    }
  }, [onProfilePopover, finish, skip]);

  // Show care context modal first
  if (showCareContext) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center font-[family-name:var(--font-inter)]">
        <div className="absolute inset-0 bg-black/45" />

        {/* Skip button */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 z-10 flex items-center gap-1 text-white/60 text-sm hover:text-white transition-colors"
        >
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
                  <button
                    key={opt.id}
                    onClick={() => setCareSelections((prev) => prev.includes(opt.id) ? prev.filter((s) => s !== opt.id) : [...prev, opt.id])}
                    className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                      selected ? "bg-[#0F1B3D]/[0.04] border-[#0F1B3D] shadow-[0_0_0_1px_#0F1B3D]" : "bg-white border-[#E5E5EA] hover:border-[#0F1B3D]/20"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selected ? "bg-[#0F1B3D]" : "bg-[#F5F7FB]"}`}>
                      <Icon className={`w-4 h-4 ${selected ? "text-white" : "text-[#8E8E93]"}`} />
                    </div>
                    <span className={`text-[15px] font-medium ${selected ? "text-[#0F1B3D]" : "text-[#1C1C1E]"}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={startJoyride}
              className="w-full mt-5 py-3.5 rounded-xl text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress={false}
      disableOverlayClose
      disableCloseOnEsc={false}
      callback={handleJoyrideCallback}
      styles={joyrideStyles}
      floaterProps={{
        disableAnimation: true,
        styles: { floater: { zIndex: 99999 } },
      }}
      locale={{
        back: "Back",
        next: "Next",
        skip: "Skip tour",
        last: "Finish",
      }}
    />
  );
}
