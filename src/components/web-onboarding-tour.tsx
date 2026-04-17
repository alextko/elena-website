"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Heart, Users, User, Baby, HelpCircle, DollarSign, Clock, HeartPulse, Phone } from "lucide-react";
import { useJoyride, EVENTS, STATUS } from "react-joyride";
import * as analytics from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { StreamingText } from "@/components/streaming-text";

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
        <button onClick={primaryProps.onClick} className="w-full mt-4 py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
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

const GOAL_OPTIONS = [
  { id: "save_money", label: "Save money on care", icon: DollarSign },
  { id: "save_time", label: "Save time managing appointments", icon: Clock },
  { id: "preventative", label: "Stay on top of preventative care", icon: HeartPulse },
  { id: "family", label: "Keep my family's health organized", icon: Users },
];

// Pain step: quantifies the cost of the user's current healthcare pain so the
// value step's relief feels earned. Time variant extrapolates weekly hours to
// a yearly total; money variant extrapolates annual spend to a decade total.
const TIME_PAIN_OPTIONS = [
  { id: "lt1", label: "Less than 1 hour", hoursPerYear: 26, punchline: "Time you could spend anywhere else." },
  { id: "1to3", label: "1 to 3 hours", hoursPerYear: 104, punchline: "Over two and a half full work weeks." },
  { id: "3to6", label: "3 to 6 hours", hoursPerYear: 234, punchline: "Almost six full work weeks of your life." },
  { id: "6plus", label: "6 or more hours", hoursPerYear: 416, punchline: "More than ten full work weeks every year." },
];

const MONEY_PAIN_OPTIONS = [
  { id: "lt500", label: "Less than $500", dollarsOverDecade: 2500, punchline: "A year's worth of groceries." },
  { id: "500to2k", label: "$500 to $2,000", dollarsOverDecade: 12500, punchline: "A used car." },
  { id: "2kto5k", label: "$2,000 to $5,000", dollarsOverDecade: 35000, punchline: "A down payment on a house." },
  { id: "5kplus", label: "$5,000 or more", dollarsOverDecade: 75000, punchline: "Enough to retire a few years earlier." },
];

// Only the profile button step uses Joyride (targets main DOM)
const JOYRIDE_STEPS: any[] = [
  {
    target: "[data-tour='profile-button']",
    placement: "top",
    disableBeacon: true,
    skipBeacon: true,
    title: "This is your profile",
    content: "All your health data, doctors, insurance, and appointments live here. Let's take a look inside.",
    locale: { next: "Show me", last: "Show me" },
    hideCloseButton: true,
    primaryColor: "#0F1B3D",
    tooltipComponent: TourTooltip,
  },
];

// Profile popover steps use custom overlay cards (can't target portal DOM)
const PROFILE_STEPS = [
  { id: "health", title: "Your Health tab", body: "Your to-dos, providers, and medications. Elena fills them in as you chat.", tab: "health" as const },
  { id: "visits", title: "Your Visits tab", body: "Every appointment Elena books lives here, plus your notes and history.", tab: "visits" as const },
  { id: "insurance", title: "Your Insurance tab", body: "Elena checks what's covered and estimates costs before you go.", tab: "insurance" as const },
  { id: "family", title: "Manage your whole family", body: "Add parents, partners, or kids. Each gets their own profile with separate records.", tab: "health" as const, showSwitcher: true },
];

type Phase = "care" | "goals" | "pain" | "value" | "profile-form" | "joyride" | "profile" | "chat" | "done";

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover, onSidebar }: WebOnboardingTourProps) {
  // Auth hooks for the profile-form phase (migrated from the old OnboardingModal)
  const { needsOnboarding, completeOnboarding, profileData } = useAuth();

  const [phase, setPhase] = useState<Phase>("care");
  const [profileStep, setProfileStep] = useState(0);
  const [careSelections, setCareSelections] = useState<string[]>([]);
  const [goalSelections, setGoalSelections] = useState<string[]>([]);
  const [painSelection, setPainSelection] = useState<string | null>(null);
  const [lpVariant, setLpVariant] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Profile-form phase state (migrated from OnboardingModal)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync form fields from profileData when it arrives (OAuth name, quiz-funnel DOB/zip).
  useEffect(() => {
    if (profileData?.firstName && !firstName) setFirstName(profileData.firstName);
    if (profileData?.lastName && !lastName) setLastName(profileData.lastName);
    if (profileData?.dob && !dob) setDob(profileData.dob);
    if (profileData?.zipCode && !zipCode) setZipCode(profileData.zipCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.firstName, profileData?.lastName, profileData?.dob, profileData?.zipCode]);

  const hasOAuthName = !!(profileData?.firstName);
  const canSubmitProfile =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    zipCode.trim().length === 5;
  // Headline + subtitle stream with a typewriter effect; these gate the
  // reveal of the rest of the card's content. Reset whenever phase changes
  // so each step starts fresh.
  const [headlineDone, setHeadlineDone] = useState(false);
  const [subtitleDone, setSubtitleDone] = useState(false);
  useEffect(() => {
    setHeadlineDone(false);
    setSubtitleDone(false);
    // Only reset the pain bucket when leaving the pain phase, so if the user
    // clicks Back (hypothetically) their choice isn't lost. For our linear
    // flow this is equivalent to resetting on every phase change.
    if (phase !== "pain") setPainSelection(null);
  }, [phase]);

  // Value phase chains headline → subtitle → body. Once headline finishes,
  // let the subtitle fade land (~450ms: 100ms delay + 350ms duration) then
  // flip subtitleDone so the tiles + Continue reveal.
  useEffect(() => {
    if (phase !== "value" || !headlineDone) return;
    const t = setTimeout(() => setSubtitleDone(true), 480);
    return () => clearTimeout(t);
  }, [phase, headlineDone]);
  const finishedRef = useRef(false);
  const guardRef = useRef(false);
  const isMobile = useRef(false);

  const { controls, on, Tour } = useJoyride({
    steps: JOYRIDE_STEPS,
    continuous: true,
    styles: {
      options: { primaryColor: "#0F1B3D", zIndex: 99999, overlayColor: "rgba(0,0,0,0.45)" },
      beacon: { display: "none" },
    },
  } as any);

  useEffect(() => {
    setMounted(true);
    isMobile.current = window.innerWidth < 768;
    setLpVariant(localStorage.getItem("elena_lp_variant"));
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
    setTimeout(() => { guardRef.current = false; }, 600);

    analytics.track("Web Tour Step Viewed" as any, { step: profileStep + 2, step_name: PROFILE_STEPS[profileStep]?.title });

    if (profileStep >= PROFILE_STEPS.length - 1) {
      onProfilePopover(false, undefined, false);
      setPhase("chat");
      return;
    }
    // Card stays mounted in place — only tab + text content swap
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

  // `shellFading` is set when we're leaving the care/value shell entirely
  // (e.g. into the joyride spotlight). Framer-motion's AnimatePresence
  // handles the in-shell care↔value crossfade without any manual timers.
  const [shellFading, setShellFading] = useState(false);

  const beginJoyride = useCallback(() => {
    if (isMobile.current) onSidebar(true);
    setPhase("joyride");
    // Extra delay on mobile to let sidebar slide animation complete
    setTimeout(() => controls.start(), isMobile.current ? 600 : 300);
  }, [controls, onSidebar]);

  const leaveShellThen = useCallback((cb: () => void) => {
    setShellFading(true);
    setTimeout(cb, 280);
  }, []);

  const advanceFromCare = useCallback(() => {
    if (careSelections.length > 0) analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    // Always collect goals next — the question itself informs personalization,
    // regardless of which LP the user came from.
    setPhase("goals");
  }, [careSelections]);

  const advanceFromGoals = useCallback(() => {
    if (goalSelections.length > 0) analytics.track("Web Tour Goals" as any, { goals: goalSelections });
    setPhase("pain");
  }, [goalSelections]);

  const advanceFromPain = useCallback(() => {
    analytics.track("Web Tour Pain Step" as any, { bucket: painSelection });
    analytics.track("Web Tour Value Step Shown" as any, { lp_variant: lpVariant || "homepage" });
    setPhase("value");
  }, [painSelection, lpVariant]);

  const advanceFromValue = useCallback(() => {
    analytics.track("Web Tour Value Step Continued" as any, { lp_variant: lpVariant || "homepage" });
    // If the user still needs a profile (fresh signup), collect name/DOB/zip
    // in-tour. Existing users (forceTour, or already onboarded) skip to joyride.
    if (needsOnboarding) {
      setPhase("profile-form");
    } else {
      leaveShellThen(beginJoyride);
    }
  }, [lpVariant, beginJoyride, leaveShellThen, needsOnboarding]);

  // Profile-form submit — migrates the OnboardingModal's handleSubmit.
  // completeOnboarding() handles: POST /profile, setProfileId, setProfileData,
  // setNeedsOnboarding(false), setOnboardingJustCompleted(true), and fire-and-forget
  // side effects (/todos/generate, invite accept, ad pixel). All preserved.
  const handleProfileSubmit = useCallback(async () => {
    if (!canSubmitProfile) return;
    setSavingProfile(true);
    analytics.track("Onboarding Completed" as any, {
      fields_filled: [
        firstName.trim() && "first_name",
        lastName.trim() && "last_name",
        dob && "dob",
        zipCode.trim() && "zip_code",
      ].filter(Boolean),
      source: "tour",
    });
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    await completeOnboarding({
      first_name: cap(firstName.trim()),
      last_name: cap(lastName.trim()),
      date_of_birth: dob,
      home_address: zipCode.trim(),
    });
    setSavingProfile(false);
    leaveShellThen(beginJoyride);
  }, [canSubmitProfile, firstName, lastName, dob, zipCode, completeOnboarding, beginJoyride, leaveShellThen]);

  // Fire "Onboarding Modal Shown" analytics when the profile-form phase opens,
  // preserving data continuity with the prior OnboardingModal. (Event name kept
  // the same on purpose — so dashboards keep working.)
  useEffect(() => {
    if (phase === "profile-form") analytics.track("Onboarding Modal Shown" as any, { source: "tour" });
  }, [phase]);

  if (!mounted || phase === "done") return null;

  // ── Phases care + goals + pain + value share one backdrop + card shell.
  //    The shell itself fades in on mount and fades out when we head to the
  //    joyride spotlight. Inside, AnimatePresence crossfades the content
  //    between phases, and the card's max-width animates so the transition
  //    feels like one continuous container morphing rather than separate
  //    modals. ──
  if (phase === "care" || phase === "goals" || phase === "pain" || phase === "value" || phase === "profile-form") {
    const motionEase = [0.4, 0, 0.2, 1] as const;
    const cardMaxWidth = phase === "value" ? 512 : 448;
    return createPortal(
      <motion.div
        className="fixed inset-0 z-[99999] flex items-center justify-center font-[family-name:var(--font-inter)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: shellFading ? 0 : 1 }}
        transition={{ duration: 0.25, ease: motionEase }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <SkipButton onClick={skipTour} />
        <motion.div
          layout
          transition={{ layout: { duration: 0.35, ease: motionEase } }}
          className="relative z-10 w-[calc(100%-3rem)] rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,27,61,0.15)] overflow-hidden"
          style={{ maxWidth: cardMaxWidth }}
        >
          {/* No `initial={false}` — that would suppress the first slide's
              StreamingText "hidden" variant on mount, making the care
              headline render fully visible instead of streaming in. */}
          <AnimatePresence mode="wait">
            {phase === "care" && (
              <motion.div
                key="care"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-7 flex flex-col"
                style={{ minHeight: 440 }}
              >
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.45, ease: motionEase } }}
                  className={`text-center ${headlineDone ? "mb-5" : "my-auto"}`}
                >
                  <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                    {/* startDelay 0.6s — gives the shell's 250ms fade-in time
                        to land AND the user's attention ~350ms to settle after
                        the previous modal dismisses. Without this, streaming
                        starts before the user's eyes find the card. */}
                    <StreamingText
                      text="Who are you managing care for?"
                      startDelay={0.6}
                      onDone={() => setHeadlineDone(true)}
                    />
                  </h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: headlineDone ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: motionEase }}
                    className="text-[14px] text-[#8E8E93] font-light"
                  >
                    Select all that apply.
                  </motion.p>
                </motion.div>
                {headlineDone && (
                  <>
                    <RevealStack visible className="flex flex-col gap-2.5">
                      {CARE_OPTIONS.map((opt) => {
                        const selected = careSelections.includes(opt.id);
                        return (
                          <SelectablePill
                            key={opt.id}
                            icon={opt.icon}
                            label={opt.label}
                            selected={selected}
                            onClick={() => setCareSelections((p) => p.includes(opt.id) ? p.filter((s) => s !== opt.id) : [...p, opt.id])}
                          />
                        );
                      })}
                    </RevealStack>
                    <RevealButton visible delay={0.1 + CARE_OPTIONS.length * 0.07}>
                      <GradientButton onClick={advanceFromCare} label="Continue" />
                    </RevealButton>
                  </>
                )}
              </motion.div>
            )}

            {phase === "goals" && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-7 flex flex-col"
                style={{ minHeight: 440 }}
              >
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.45, ease: motionEase } }}
                  className={`text-center ${headlineDone ? "mb-5" : "my-auto"}`}
                >
                  <h2 className="text-[22px] font-extrabold text-[#0F1B3D] text-balance leading-tight">
                    <StreamingText text="What are your healthcare goals for this year?" onDone={() => setHeadlineDone(true)} />
                  </h2>
                </motion.div>
                {headlineDone && (
                  <>
                    <RevealStack visible className="flex flex-col gap-2.5">
                      {GOAL_OPTIONS.map((opt) => {
                        const selected = goalSelections.includes(opt.id);
                        return (
                          <SelectablePill
                            key={opt.id}
                            icon={opt.icon}
                            label={opt.label}
                            selected={selected}
                            onClick={() => setGoalSelections((p) => p.includes(opt.id) ? p.filter((s) => s !== opt.id) : [...p, opt.id])}
                          />
                        );
                      })}
                    </RevealStack>
                    <RevealButton visible delay={0.1 + GOAL_OPTIONS.length * 0.07}>
                      <GradientButton onClick={advanceFromGoals} label="Continue" />
                    </RevealButton>
                  </>
                )}
              </motion.div>
            )}

            {phase === "pain" && (() => {
              // Variant: if the user picked save_time, show the time pain step.
              // Otherwise (they picked save_money), show the money pain step.
              const isMoney = !goalSelections.includes("save_time") && goalSelections.includes("save_money");
              const options = isMoney ? MONEY_PAIN_OPTIONS : TIME_PAIN_OPTIONS;
              const headline = isMoney
                ? "How much do you spend on healthcare out-of-pocket each year?"
                : "How much time do you spend on healthcare each week?";
              const bucketIcon = isMoney ? DollarSign : Clock;
              const selected = options.find((o) => o.id === painSelection) || null;
              return (
                <motion.div
                  key="pain"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-7 flex flex-col"
                  style={{ minHeight: 440 }}
                >
                  <motion.div
                    layout
                    transition={{ layout: { duration: 0.45, ease: motionEase } }}
                    className={`text-center ${headlineDone ? "mb-5" : "my-auto"}`}
                  >
                    <h2 className="text-[22px] font-extrabold text-[#0F1B3D] text-balance leading-tight">
                      <StreamingText text={headline} onDone={() => setHeadlineDone(true)} />
                    </h2>
                  </motion.div>
                  {headlineDone && (
                    <>
                      <RevealStack visible className="flex flex-col gap-2.5">
                        {options.map((opt) => (
                          <SelectablePill
                            key={opt.id}
                            icon={bucketIcon}
                            label={opt.label}
                            selected={painSelection === opt.id}
                            onClick={() => setPainSelection(opt.id)}
                          />
                        ))}
                      </RevealStack>
                      <AnimatePresence>
                        {selected && (
                          <PainResult
                            variant={isMoney ? "money" : "time"}
                            target={isMoney ? (selected as typeof MONEY_PAIN_OPTIONS[number]).dollarsOverDecade : (selected as typeof TIME_PAIN_OPTIONS[number]).hoursPerYear}
                            punchline={selected.punchline}
                          />
                        )}
                      </AnimatePresence>
                      <RevealButton visible={!!selected} delay={1.2}>
                        <GradientButton onClick={advanceFromPain} label="Continue" />
                      </RevealButton>
                    </>
                  )}
                </motion.div>
              );
            })()}

            {phase === "value" && (
              <motion.div
                key="value"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-6 flex flex-col"
                style={{ minHeight: 440 }}
              >
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.45, ease: motionEase } }}
                  className={`text-center ${subtitleDone ? "mb-5" : "my-auto"}`}
                >
                  <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2">
                    <StreamingText text="We've got your back" onDone={() => setHeadlineDone(true)} />
                  </h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: headlineDone ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: motionEase, delay: 0.1 }}
                    className="text-[14px] text-[#8E8E93] font-light"
                  >
                    From bookings to bills, Elena&apos;s on it.
                  </motion.p>
                </motion.div>
                {subtitleDone && (
                  <>
                    <BenefitTiles />
                    {/* Each tile reveals in three beats (container → label
                        stream → visual) and they start 700ms apart, so the
                        last tile's visual lands around ~3.4s. Continue waits
                        for that. */}
                    <RevealButton visible delay={3.6}>
                      <GradientButton onClick={advanceFromValue} label="Continue" />
                    </RevealButton>
                  </>
                )}
              </motion.div>
            )}

            {phase === "profile-form" && (
              <motion.div
                key="profile-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-7 flex flex-col"
                style={{ minHeight: 440 }}
              >
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.45, ease: motionEase } }}
                  className={`text-center ${subtitleDone ? "mb-5" : "my-auto"}`}
                >
                  {/* Wave pops in with a scale+fade, then shakes. The 150ms
                      scale-in delay lets the content's fade-in settle first. */}
                  <style>{`
                    @keyframes elena-wave {
                      0%   { transform: rotate(0deg); }
                      20%  { transform: rotate(20deg); }
                      40%  { transform: rotate(-18deg); }
                      60%  { transform: rotate(18deg); }
                      80%  { transform: rotate(-10deg); }
                      100% { transform: rotate(0deg); }
                    }
                  `}</style>
                  <motion.div
                    className="text-3xl mb-3 inline-block origin-[70%_70%]"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: motionEase, delay: 0.15 }}
                    style={{ animation: "elena-wave 900ms ease-in-out 550ms 1" }}
                    aria-hidden
                  >
                    👋
                  </motion.div>
                  <h2 className="text-[22px] font-extrabold text-[#0F1B3D] text-balance leading-tight mb-2">
                    <StreamingText text="Hey, I'm Elena" onDone={() => setHeadlineDone(true)} />
                  </h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: headlineDone ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: motionEase, delay: 0.1 }}
                    className="text-[14px] text-[#8E8E93] font-light"
                    onAnimationComplete={() => { if (headlineDone) setSubtitleDone(true); }}
                  >
                    Let&apos;s get you set up.
                  </motion.p>
                </motion.div>
                {subtitleDone && (
                  <>
                    <RevealStack visible className="space-y-3">
                      {!hasOAuthName && (
                        <motion.div variants={REVEAL_ITEM} className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                              First name<span className="text-[#FF3B30] ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="Alex"
                              autoCapitalize="words"
                              className="mt-1 w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors capitalize"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                              Last name<span className="text-[#FF3B30] ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Smith"
                              autoCapitalize="words"
                              className="mt-1 w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors capitalize"
                            />
                          </div>
                        </motion.div>
                      )}
                      <motion.div variants={REVEAL_ITEM}>
                        <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                          Date of birth
                        </label>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="mt-1 w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30 transition-colors"
                        />
                      </motion.div>
                      <motion.div variants={REVEAL_ITEM}>
                        <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                          Zip code<span className="text-[#FF3B30] ml-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          maxLength={5}
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                          placeholder="10001"
                          className="mt-1 w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                        />
                      </motion.div>
                    </RevealStack>
                    <RevealButton visible delay={(hasOAuthName ? 2 : 3) * 0.07 + 0.1}>
                      <button
                        onClick={handleProfileSubmit}
                        disabled={savingProfile || !canSubmitProfile}
                        className="w-full mt-5 py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                        style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                      >
                        {savingProfile ? "Setting up..." : "Get started"}
                      </button>
                    </RevealButton>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  // ── Phase: Joyride (profile button spotlight) ──
  if (phase === "joyride") {
    return Tour;
  }

  // ── Phase: Profile walkthrough (custom cards over popover) ──
  //    Same pattern as care/value shell: outer card morphs via `layout`,
  //    AnimatePresence crossfades title/body between steps.
  if (phase === "profile") {
    const currentStep = PROFILE_STEPS[profileStep];
    const isLast = profileStep >= PROFILE_STEPS.length - 1;
    const motionEase = [0.4, 0, 0.2, 1] as const;
    return createPortal(
      <motion.div
        className="fixed z-[99999] font-[family-name:var(--font-inter)] bottom-0 left-0 right-0"
        style={{ pointerEvents: "auto" }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: motionEase }}
      >
        <div className="mx-auto max-w-md px-4 pb-4">
          <motion.div
            layout
            transition={{ layout: { duration: 0.35, ease: motionEase } }}
            className="rounded-2xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_30px_rgba(15,27,61,0.15)] border border-[#E5E5EA]"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={profileStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: motionEase }}
                className="text-center"
              >
                <h3 className="text-[18px] font-extrabold text-[#0F1B3D] mb-1.5">{currentStep.title}</h3>
                <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed">{currentStep.body}</p>
              </motion.div>
            </AnimatePresence>
            <button onClick={nextProfile} className="w-full mt-4 py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
              style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}>
              {isLast ? "Got it" : "Next"}
            </button>
          </motion.div>
        </div>
      </motion.div>,
      document.body
    );
  }

  // ── Phase: Chat explanation (Joyride targeting input bar) ──
  if (phase === "chat") {
    return <ChatStepJoyride onFinish={finishTour} />;
  }

  return null;
}

// ── Animation helpers ───────────────────────────────────────────

// Stagger-in wrapper for list items. Children must use REVEAL_ITEM variants.
const REVEAL_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const REVEAL_ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const } },
};

function RevealStack({ visible, className, children }: { visible: boolean; className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      variants={REVEAL_CONTAINER}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function RevealButton({ visible, delay = 0, children }: { visible: boolean; delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Counter that ticks from its current value → target over a fixed duration
// with an ease-out cubic curve, via requestAnimationFrame. Starting from the
// current value (not 0) means switching buckets animates naturally between
// the two numbers instead of snapping back to 0 first.
function AnimatedCounter({ target, duration = 1200, className }: {
  target: number;
  duration?: number;
  className?: string;
}) {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);
  valueRef.current = value;
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const from = valueRef.current;
    const delta = target - from;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      // easeOutCubic — quick ramp that settles rather than overshoots
      const eased = 1 - Math.pow(1 - pct, 3);
      setValue(Math.round(from + delta * eased));
      if (pct < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <span className={className}>{value.toLocaleString("en-US")}</span>;
}

// Pain-step result card — renders when the user picks a bucket and updates
// its props (not remounts) when they switch, so AnimatedCounter smoothly
// animates between values instead of the card stretching/reflowing.
function PainResult({ variant, target, punchline }: {
  variant: "time" | "money";
  target: number;
  punchline: string;
}) {
  const unitLabel = variant === "time" ? "hours a year" : "over 10 years";
  const bodyLine = variant === "time"
    ? "Better care navigation can save individuals hundreds of hours a year."
    : "Better care navigation can save individuals thousands on healthcare costs.";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
      className="mt-4 rounded-2xl border border-[#E5E5EA] p-5 text-center"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #fff5f4 100%)" }}
    >
      <div className="flex items-baseline justify-center gap-0.5">
        {variant === "money" && (
          <span className="text-[40px] font-extrabold text-[#FF3B30] tracking-tight leading-none">$</span>
        )}
        <AnimatedCounter target={target} className="text-[56px] font-extrabold text-[#FF3B30] tracking-tight leading-none" />
      </div>
      <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mt-2">
        {unitLabel}
      </p>
      <p className="text-[18px] font-bold text-[#0F1B3D] mt-4 text-balance leading-tight">{punchline}</p>
      <p className="text-[13px] text-[#5a6a82] font-light mt-2 leading-snug">{bodyLine}</p>
    </motion.div>
  );
}

// Multi-select pill with a subtle press-down (scale 0.98) and a "pop" animation
// on the icon circle when the pill becomes selected. Colors cross-fade via CSS
// transitions so deselect feels smooth without re-triggering the scale keyframes.
function SelectablePill({ icon: Icon, label, selected, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={REVEAL_ITEM}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-full border text-left transition-all duration-200 ${
        selected
          ? "border-[#0F1B3D] shadow-[0_0_0_1px_#0F1B3D,0_4px_14px_rgba(15,27,61,0.14)]"
          : "border-[#E5E5EA] shadow-[0_1px_2px_rgba(15,27,61,0.04),0_1px_3px_rgba(15,27,61,0.04)] hover:shadow-[0_2px_8px_rgba(15,27,61,0.08)] hover:border-[#0F1B3D]/20"
      }`}
      style={{
        background: selected
          ? "linear-gradient(180deg, #ffffff 0%, #f3f5fa 100%)"
          : "linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)",
      }}
    >
      <motion.div
        animate={{ scale: selected ? [0.8, 1.15, 1] : 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${selected ? "bg-[#0F1B3D]" : "bg-[#F5F7FB]"}`}
      >
        <Icon className={`w-4 h-4 transition-colors duration-200 ${selected ? "text-white" : "text-[#8E8E93]"}`} />
      </motion.div>
      <span className={`text-[15px] font-medium transition-colors duration-200 ${selected ? "text-[#0F1B3D]" : "text-[#1C1C1E]"}`}>
        {label}
      </span>
    </motion.button>
  );
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
    <button onClick={onClick} className="w-full mt-5 py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}>
      {label}
    </button>
  );
}

function BenefitTiles() {
  // Four mini-spotlights in a 2×2 grid. Each tile reveals in three beats:
  //   1. Container fades + scales in
  //   2. Label streams word-by-word
  //   3. Visual fades in once the label finishes
  // Tiles start 700ms apart so the first lands before the next begins,
  // creating a clear top-left → top-right → bottom-left → bottom-right cascade.
  const tiles = [
    { label: "Save hours a week", visual: <BookingMiniCard /> },
    { label: "Manage your whole family from one app", visual: <FamilyMiniCard /> },
    { label: "Save money on health care", visual: <PricingMiniCard /> },
    { label: "Use your insurance like a pro", visual: <InsuranceMiniCard /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-1">
      {tiles.map((tile, i) => (
        <RevealingTile
          key={tile.label}
          label={tile.label}
          visual={tile.visual}
          startDelayMs={100 + i * 700}
        />
      ))}
    </div>
  );
}

function RevealingTile({ label, visual, startDelayMs }: {
  label: string;
  visual: React.ReactNode;
  startDelayMs: number;
}) {
  const [containerShown, setContainerShown] = useState(false);
  const [labelStart, setLabelStart] = useState(false);
  const [labelDone, setLabelDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setContainerShown(true), startDelayMs);
    // Label begins streaming ~200ms after the container lands, so the empty
    // square is briefly visible before text arrives.
    const t2 = setTimeout(() => setLabelStart(true), startDelayMs + 220);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [startDelayMs]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={containerShown ? { opacity: 1, scale: 1, y: 0 } : undefined}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-2xl bg-[#F5F7FB] border border-[#E5E5EA] p-3 flex flex-col"
    >
      {/* min-h reserves space for the streaming label so the container doesn't
          resize as words arrive. */}
      <div className="text-[12px] font-semibold text-[#0F1B3D] text-center leading-tight mb-2 text-balance min-h-[30px]">
        {labelStart && (
          <StreamingText
            text={label}
            wordStagger={0.06}
            onDone={() => setLabelDone(true)}
          />
        )}
      </div>
      <div className="flex-1 min-h-[88px] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={labelDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1], delay: 0.08 }}
          className="w-full"
        >
          {visual}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Mini-spotlights: compact echoes of landing-page spotlights ──

function BookingMiniCard() {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {/* On-hold call card — Elena is handling the 45-min hold so the user
          doesn't have to. Green dot pulses to signal a live call. */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(15,27,61,0.08)] border border-[#E5E5EA] px-2.5 py-1.5 flex items-center gap-2">
        <div className="relative w-4 h-4 flex-shrink-0">
          <span className="absolute inset-0 rounded-full bg-[#34C759]/40 animate-ping" />
          <span className="relative w-4 h-4 rounded-full bg-[#34C759] flex items-center justify-center">
            <Phone className="w-[9px] h-[9px] text-white" strokeWidth={3} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-semibold text-[#0F1B3D] truncate">Blue Cross · on hold</div>
        </div>
        <div className="text-[9px] font-bold text-[#34C759] tabular-nums whitespace-nowrap">45:23</div>
      </div>

      {/* Appointment booked — the result of Elena's call */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(15,27,61,0.08)] border border-[#E5E5EA] px-2.5 py-2 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-[#34C759] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-bold leading-none">✓</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-[#0F1B3D] truncate">Dr. Chen · Cardiology</div>
          <div className="text-[9px] font-semibold text-[#34C759] mt-0.5">Booked · Apr 15, 10am</div>
        </div>
      </div>
    </div>
  );
}

function FamilyMiniCard() {
  const members = [
    { initials: "Me", bg: "#0F1B3D", fg: "#fff", label: "Me", selected: true },
    { initials: "M", bg: "#F4B084", fg: "#0F1B3D", label: "Mom", selected: false },
    { initials: "K", bg: "#8A9B78", fg: "#fff", label: "Kai", selected: false },
  ];
  return (
    <div className="w-full flex flex-col gap-1">
      {members.map((m) => (
        <div
          key={m.label}
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${m.selected ? "bg-white border border-[#0F1B3D]/20" : ""}`}
        >
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-bold"
            style={{ background: m.bg, color: m.fg }}
          >
            {m.initials}
          </div>
          <div className="text-[10px] font-semibold text-[#0F1B3D] truncate">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

function PricingMiniCard() {
  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="bg-white rounded-lg border border-[#0F1B3D]/20 px-2 py-1.5 flex items-center justify-between">
        <div className="flex flex-col min-w-0 mr-1">
          <span className="text-[9px] font-bold text-[#0F1B3D] truncate">Dr. Chen</span>
          <span className="text-[8px] font-semibold text-[#34C759]">✓ In-network</span>
        </div>
        <div className="text-[11px] font-black text-[#0F1B3D] tracking-tight whitespace-nowrap">~$350</div>
      </div>
      <div className="bg-white/60 rounded-lg border border-[#E5E5EA] px-2 py-1.5 flex items-center justify-between opacity-60">
        <div className="flex flex-col min-w-0 mr-1">
          <span className="text-[9px] font-bold text-[#0F1B3D]/70 truncate">Manhattan Imaging</span>
          <span className="text-[8px] font-medium text-[#8E8E93]">In-network</span>
        </div>
        <div className="text-[11px] font-black text-[#0F1B3D]/60 line-through tracking-tight whitespace-nowrap">~$720</div>
      </div>
    </div>
  );
}

function InsuranceMiniCard() {
  return (
    <div
      className="w-full rounded-xl px-2.5 py-2 shadow-[0_2px_8px_rgba(15,27,61,0.12)] flex flex-col gap-1"
      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 50%, #2E6BB5 100%)" }}
    >
      <div className="flex justify-between items-center">
        <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider">Health</span>
        <span className="text-[8px] font-semibold text-[#F4B084]">Silver</span>
      </div>
      <div className="text-[10px] font-extrabold text-white leading-tight mt-0.5">Blue Cross PPO</div>
      <div className="flex justify-between items-center mt-0.5">
        <span className="text-[8px] text-white/60">Copay</span>
        <span className="text-[10px] font-bold text-white">$30</span>
      </div>
    </div>
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
        title: "Chat with Elena here",
        content: "Get started setting up your profile. Compare prices. Book appointments. Call your pharmacy or your insurance. Elena is here to help.",
        locale: { next: "Finish", last: "Finish" },
        hideCloseButton: true,
        tooltipComponent: TourTooltip,
      },
    ],
    continuous: true,
    styles: {
      options: { primaryColor: "#0F1B3D", zIndex: 99999, overlayColor: "rgba(0,0,0,0.45)" },
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
