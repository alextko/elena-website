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
  },
];

// Profile popover steps use custom overlay cards (can't target portal DOM)
const PROFILE_STEPS = [
  { id: "health", title: "This is your Health tab.", body: "Here you'll find your to-dos, your doctors, your medications, your providers, and other health details. As you chat with Elena, she fills this in automatically.", tab: "health" as const },
  { id: "visits", title: "This is your Visits tab.", body: "Every appointment Elena books shows up here. You can also add visits yourself, review past appointments, read notes, and keep track of what's coming up.", tab: "visits" as const },
  { id: "insurance", title: "This is your Insurance tab.", body: "When you've shared your insurance, Elena will use it to check what's covered, find in-network providers, and estimate your costs before you go.", tab: "insurance" as const },
  { id: "family", title: "You can also manage family members.", body: "If you're helping a parent, partner, or child with their care, add them here. Each person gets their own profile with separate health data, doctors, and insurance.", tab: "health" as const, showSwitcher: true },
];

type Phase = "care" | "joyride" | "profile" | "chat" | "done";

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover }: WebOnboardingTourProps) {
  const [phase, setPhase] = useState<Phase>("care");
  const [profileStep, setProfileStep] = useState(0);
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const finishedRef = useRef(false);
  const guardRef = useRef(false);

  const { controls, on, Tour } = useJoyride({
    steps: JOYRIDE_STEPS,
    continuous: true,
    styles: {
      options: { primaryColor: "#0F1B3D", zIndex: 99999, overlayColor: "rgba(0,0,0,0.45)" },
      tooltip: { borderRadius: 20, padding: "28px 32px", boxShadow: "0 8px 30px rgba(15,27,61,0.15)", maxWidth: 360, fontFamily: "Inter, -apple-system, sans-serif" },
      tooltipTitle: { fontSize: 20, fontWeight: 800, color: "#0F1B3D", marginBottom: 6, textAlign: "center" },
      tooltipContent: { fontSize: 15, fontWeight: 300, color: "#5a6a82", lineHeight: 1.65, padding: "6px 0 0", textAlign: "center" },
      tooltipFooter: { marginTop: 20, justifyContent: "center" },
      buttonNext: { background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)", borderRadius: 14, fontSize: 15, fontWeight: 600, padding: "12px 32px", border: "none" },
      buttonClose: { display: "none" },
      spotlight: { borderRadius: 14 },
      beacon: { display: "none" },
    },
  } as any);

  useEffect(() => { setMounted(true); analytics.track("Web Tour Started" as any); }, []);

  // Joyride event: after profile button step, open popover
  useEffect(() => {
    const unsub = on(EVENTS.STEP_AFTER, () => {
      onProfilePopover(true, "health", false);
      setPhase("profile");
      setProfileStep(0);
    });
    return unsub;
  }, [on, onProfilePopover]);

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
    setPhase("done");
    onShowPaywall();
    onComplete();
  }, [onComplete, onShowPaywall, onProfilePopover]);

  const skipTour = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    analytics.track("Web Tour Skipped" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    onProfilePopover(false, undefined, false);
    controls.stop();
    setPhase("done");
    onComplete();
  }, [onComplete, onProfilePopover, controls]);

  const startJoyride = useCallback(() => {
    if (careSelections.length > 0) analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    setPhase("joyride");
    setTimeout(() => controls.start(), 300);
  }, [careSelections, controls]);

  if (!mounted || phase === "done") return null;

  // ── Phase: Care context ──
  if (phase === "care") {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center font-[family-name:var(--font-inter)]">
        <div className="absolute inset-0 bg-black/45" />
        <SkipButton onClick={skipTour} />
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
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[99999] font-[family-name:var(--font-inter)]" style={{ pointerEvents: "auto" }}>
        <div className="max-w-sm w-full mx-auto">
          <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(15,27,61,0.2)] border border-[#E5E5EA]">
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

  // ── Phase: Chat explanation ──
  if (phase === "chat") {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center font-[family-name:var(--font-inter)]">
        <div className="absolute inset-0 bg-black/40" />
        <SkipButton onClick={skipTour} />
        <div className="relative z-10 max-w-sm w-full mx-6">
          <div className="rounded-2xl bg-white p-7 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
            <div className="text-center">
              <div className="text-[32px] mb-3">💬</div>
              <h2 className="text-[20px] font-extrabold text-[#0F1B3D] mb-2">Chat with Elena</h2>
              <p className="text-[15px] text-[#5a6a82] font-light leading-relaxed">
                Ask Elena anything about your health, insurance, or appointments. She can make calls, compare prices, and manage your care.
              </p>
            </div>
            <GradientButton onClick={finishTour} label="Finish" />
          </div>
        </div>
      </div>,
      document.body
    );
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
