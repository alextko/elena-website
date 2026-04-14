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
  onSidebar: (open: boolean) => void;
}

function TourTooltip({ step, primaryProps }: { step: any; primaryProps: any }) {
  return (
    <div className="font-[family-name:var(--font-inter)] w-[calc(100vw-2rem)] max-w-[360px]">
      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
        <div className="text-center">
          <h3 className="text-[18px] font-extrabold text-[#0F1B3D] mb-1.5">{step.title}</h3>
          <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">{step.content}</p>
        </div>
        <button onClick={primaryProps.onClick} className="w-full mt-4 py-3 rounded-xl text-white font-semibold text-[14px] hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}>
          {primaryProps.children}
        </button>
      </div>
    </div>
  );
}

const CARE_OPTIONS = [
  { id: "myself", label: "Myself", icon: User },
  { id: "parent", label: "My parent", icon: Heart },
  { id: "partner", label: "My partner", icon: Users },
  { id: "child", label: "My child", icon: Baby },
  { id: "other", label: "Someone else", icon: HelpCircle },
];

// Only the profile button step uses Joyride (targets main DOM)
const JOYRIDE_STEPS: any[] = [
  {
    target: "[data-tour='profile-button']",
    placement: "top",
    disableBeacon: true,
    skipBeacon: true,
    title: "This is your profile.",
    content: "All your health data, doctors, insurance, and appointments live here. Let's take a look inside.",
    locale: { next: "Show me", last: "Show me" },
    hideCloseButton: true,
    primaryColor: "#0F1B3D",
    tooltipComponent: TourTooltip,
  },
];

// Profile popover steps use custom overlay cards (can't target portal DOM)
const PROFILE_STEPS = [
  { id: "health", title: "This is your Health tab.", body: "Here you'll find your to-dos, providers, medications, and other health details. As you chat with Elena, she fills this in automatically.", tab: "health" as const },
  { id: "visits", title: "This is your Visits tab.", body: "Every appointment Elena books shows up here. You can also add visits yourself, review past appointments, read notes, and keep track of what's coming up.", tab: "visits" as const },
  { id: "insurance", title: "This is your Insurance tab.", body: "When you've shared your insurance, Elena will use it to check what's covered, find in-network providers, and estimate your costs before you go.", tab: "insurance" as const },
  { id: "family", title: "You can also manage family members.", body: "If you're helping a parent, partner, or child with their care, add them here. Each person gets their own profile with separate health data, doctors, and insurance.", tab: "health" as const, showSwitcher: true },
];

type Phase = "care" | "joyride" | "profile" | "chat" | "done";

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover, onSidebar }: WebOnboardingTourProps) {
  const [phase, setPhase] = useState<Phase>("care");
  const [profileStep, setProfileStep] = useState(0);
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const finishedRef = useRef(false);
  const guardRef = useRef(false);
  const isMobile = useRef(false);

  const { controls, on, Tour } = useJoyride({
    steps: JOYRIDE_STEPS,
    continuous: true,
    styles: {
      options: { primaryColor: "#0F1B3D", zIndex: 99999, overlayColor: "rgba(0,0,0,0.45)" },
      spotlight: { borderRadius: 14 },
      beacon: { display: "none" },
    },
  } as any);

  useEffect(() => {
    setMounted(true);
    isMobile.current = window.innerWidth < 768;
    analytics.track("Web Tour Started" as any);
  }, []);

  // Joyride event: after profile button step, open popover
  useEffect(() => {
    const unsub = on(EVENTS.STEP_AFTER, () => {
      if (isMobile.current) onSidebar(false);
      onProfilePopover(true, "health", false);
      setPhase("profile");
      setProfileStep(0);
    });
    return unsub;
  }, [on, onProfilePopover, onSidebar]);

  // Profile popover tab control
  useEffect(() => {
    if (phase !== "profile") return;
    const step = PROFILE_STEPS[profileStep];
    if (step) {
      onProfilePopover(true, step.tab, !!step.showSwitcher);
    }
  }, [phase, profileStep, onProfilePopover]);

  const nextProfile = useCallback(() => {
    if (guardRef.current) return;
    guardRef.current = true;
    setTimeout(() => { guardRef.current = false; }, 300);

    analytics.track("Web Tour Step Viewed" as any, { step: profileStep + 2, step_name: PROFILE_STEPS[profileStep]?.title });

    if (profileStep >= PROFILE_STEPS.length - 1) {
      onProfilePopover(false, undefined, false);
      setPhase("chat");
      return;
    }
    setProfileStep((s) => s + 1);
  }, [profileStep, onProfilePopover]);

  const finishTour = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    analytics.track("Web Tour Completed" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    if (isMobile.current) onSidebar(false);
    setPhase("done");
    onShowPaywall();
    onComplete();
  }, [onComplete, onShowPaywall, onProfilePopover, onSidebar]);

  const skipTour = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    analytics.track("Web Tour Skipped" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    if (isMobile.current) onSidebar(false);
    controls.stop();
    setPhase("done");
    onComplete();
  }, [onComplete, onProfilePopover, onSidebar, controls]);

  const startJoyride = useCallback(() => {
    if (careSelections.length > 0) analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    if (isMobile.current) onSidebar(true);
    setPhase("joyride");
    // Extra delay on mobile to let sidebar slide animation complete
    setTimeout(() => controls.start(), isMobile.current ? 600 : 300);
  }, [careSelections, controls, onSidebar]);

  if (!mounted || phase === "done") return null;

  // ── Phase: Care context ──
  if (phase === "care") {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center font-[family-name:var(--font-inter)]">
        <div className="absolute inset-0 bg-black/45" />
        <SkipButton onClick={skipTour} />
        <div className="relative z-10 max-w-md w-full mx-6">
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
            <GradientButton onClick={startJoyride} label="Continue" />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Phase: Joyride (profile button spotlight) ──
  if (phase === "joyride") {
    return Tour;
  }

  // ── Phase: Profile walkthrough (custom cards over popover) ──
  if (phase === "profile") {
    const currentStep = PROFILE_STEPS[profileStep];
    return createPortal(
      <div className="fixed z-[99999] font-[family-name:var(--font-inter)] bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto md:top-1/2 md:-translate-y-1/2" style={{ pointerEvents: "auto" }}>
        {/* Desktop: position to the right of the popover (popover is max-w-36rem centered) */}
        <div className="md:fixed md:top-1/2 md:-translate-y-1/2 md:max-w-xs md:w-80" style={{ left: "calc(50% + 19.5rem)" }}>
          <div className="rounded-t-2xl md:rounded-2xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 shadow-[0_-4px_30px_rgba(15,27,61,0.15)] md:shadow-[0_8px_30px_rgba(15,27,61,0.2)] border-t border-[#E5E5EA] md:border">
            <div className="text-center">
              <h3 className="text-[18px] font-extrabold text-[#0F1B3D] mb-1.5">{currentStep.title}</h3>
              <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">{currentStep.body}</p>
            </div>
            <button onClick={nextProfile} className="w-full mt-4 py-3 rounded-xl text-white font-semibold text-[14px] hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}>
              {profileStep >= PROFILE_STEPS.length - 1 ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Phase: Chat explanation (Joyride targeting input bar) ──
  if (phase === "chat") {
    return <ChatStepJoyride onFinish={finishTour} />;
  }

  return null;
}

// ── Shared components ───────────────────────────────────────────

function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="absolute top-4 right-4 z-10 flex items-center gap-1 text-white/60 text-sm hover:text-white transition-colors" style={{ pointerEvents: "auto" }}>
      Skip tour <X className="w-4 h-4" />
    </button>
  );
}

function GradientButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="w-full mt-5 py-3.5 rounded-xl text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}>
      {label}
    </button>
  );
}

function ChatStepJoyride({ onFinish }: { onFinish: () => void }) {
  const finishRef = useRef(false);

  const { controls, on, Tour } = useJoyride({
    steps: [
      {
        target: "[data-tour='chat-input']",
        placement: "top",
        disableBeacon: true,
        skipBeacon: true,
        title: "Chat with Elena here.",
        content: "Get started setting up your profile. Compare prices. Book appointments. Call your pharmacy or your insurance. Elena is here to help.",
        locale: { next: "Finish", last: "Finish" },
        hideCloseButton: true,
        tooltipComponent: TourTooltip,
      },
    ],
    continuous: true,
    styles: {
      options: { primaryColor: "#0F1B3D", zIndex: 99999, overlayColor: "rgba(0,0,0,0.45)" },
      spotlight: { borderRadius: 14 },
      beacon: { display: "none" },
    },
  } as any);

  useEffect(() => {
    controls.start();
  }, [controls]);

  useEffect(() => {
    return on(EVENTS.STEP_AFTER, () => {
      if (!finishRef.current) {
        finishRef.current = true;
        onFinish();
      }
    });
  }, [on, onFinish]);

  return Tour;
}
