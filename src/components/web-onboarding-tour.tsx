"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronDown, Heart, Users, User, Baby, HelpCircle, DollarSign, Clock, HeartPulse, Phone, Check, Send, Plus, Eye, EyeOff } from "lucide-react";
import { useJoyride, EVENTS, STATUS } from "react-joyride";
import * as analytics from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
import {
  trackWebFunnelAuthEntry,
  trackWebFunnelAuthSubmitted,
  trackWebFunnelOnboardingCompleted,
  trackWebFunnelProfileFormSubmitted,
  trackWebFunnelProfileFormViewed,
} from "@/lib/web-funnel";
import {
  PENDING_SIGNUP_KEY,
  hasPendingSignup,
  normalizeRestoredTourPhase,
  promoteStoredTourStateToPostAuthResume,
  type TourPhase,
} from "@/lib/authHandoff";
import {
  buildDisplayActionFromTodoText,
  buildFreeformHeroValues,
  buildPricingActionFromNeed,
  buildPricingTodoFromNeed,
  buildProposedAction,
  prioritizeProposedActions,
  type HeroVariant,
  type ProposedAction,
  type RouterChoice,
  buildProfileSetupTopUpTodos,
  buildSeedMessageFromActions,
  buildTodoFromAction,
  isHealthFreeformNeed,
  synthesizeFallbackSeed,
  variantForLine,
} from "@/lib/onboarding-action-semantics";
import { setBufferedProfile, addBufferedDependent, addBufferedCondition, addBufferedMedication, addBufferedTodo, type FlushStage } from "@/lib/tourBuffer";
import { OnboardingFlushingContent, type PainAffirmation } from "./onboarding-flushing-screen";
import { StreamingText } from "@/components/streaming-text";
import { SITUATION_CHIPS, getTemplate, getChip, findTemplateByAlias } from "@/lib/onboarding-templates";

type AddKind = "provider" | "visit" | "family" | "insurance";
const RELATION_OPTIONS: { id: string; label: string }[] = [
  { id: "parent", label: "Parent" },
  { id: "partner", label: "Partner" },
  { id: "child", label: "Child" },
  { id: "other", label: "Someone else" },
];
// Short list for the tour; the full Add Provider form in the profile popover
// has the long list. Ordered by how commonly people "have one" rather than
// alphabetically — the user's reason for this tour prompt is specifically
// that dentist-but-no-PCP is a frequent pattern.
const TOUR_SPECIALTY_OPTIONS: string[] = [
  "Primary Care",
  "Dentist",
  "OB/GYN",
  "Dermatologist",
  "Psychiatrist",
  "Other",
];
// Quick-select chips below the visit-type input. Tapping one pre-fills the
// text field so common cases skip typing entirely.
const VISIT_TYPE_CHIPS: string[] = [
  "Annual physical",
  "Dentist cleaning",
  "Dermatologist",
  "Lab work",
  "Eye exam",
  "Specialist visit",
  "Other",
];
// Top-N US insurance carriers by membership. "Other" lets anyone else still
// capture a provider name without us maintaining a long list.
const TOUR_INSURANCE_CARRIERS: string[] = [
  "Aetna",
  "Blue Cross Blue Shield",
  "Cigna",
  "UnitedHealthcare",
  "Kaiser Permanente",
  "Humana",
  "Anthem",
  "Other",
];

// Native date pickers are clunky on mobile web (tiny calendar widgets, keyboard
// flicker), so we render a plain text input masked to MM/DD/YYYY and convert
// to/from ISO at the boundary. These helpers keep state entry display-formatted
// while preserving the backend's YYYY-MM-DD contract.
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
function displayToIsoDate(display: string): string {
  const m = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[1]}-${m[2]}`;
}
function isoToDisplayDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

// Capitalize each word in a name as the user types. autoCapitalize on
// inputs only hints mobile keyboards; desktop typing stays lowercase,
// which then bleeds into downstream headlines ("alex, what's top of
// mind?"). Transforming on change keeps the stored state canonical so
// every consumer (router, situation, analytics, backend) sees a
// capitalized name without each one having to cap defensively.
function capitalizeName(s: string): string {
  return s.replace(/(^|\s)([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

function normalizeMedicationList(...lists: Array<string[] | undefined>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const list of lists) {
    for (const raw of list || []) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(name);
    }
  }
  return normalized;
}

interface WebOnboardingTourProps {
  surface?: "onboard" | "chat";
  onComplete: () => void;
  onShowPaywall: () => void;
  onProfilePopover: (open: boolean, tab?: "health" | "visits" | "insurance", showSwitcher?: boolean) => void;
  onSidebar: (open: boolean) => void;
  // Optional: called by finishTour with the user's picked-action message
  // so the parent can seed the chat directly. Force-tour users already
  // mounted the chat page before the tour started, so writing to
  // localStorage alone doesn't trigger the one-time pending-query pickup.
  // This callback bypasses that and sets the pending query in parent
  // state immediately.
  onSeedQuery?: (message: string) => void;
  // Plan A: fired on elena-plan Continue when the user is unauthenticated.
  // Receives the seed message (already stashed in the tour buffer) so the
  // parent can open AuthModal. Post-signup, the parent is responsible
  // for calling flushTourBuffer() and navigating to /chat.
  onNeedsAuth?: (seedQuery: string) => void;
  // Plan A flush surface. When set, the tour renders a "flushing" phase
  // inside its own shell instead of the parent stacking a second overlay
  // on top. Driven by /onboard as the post-signup flush progresses.
  // Cleared/null = no flush screen; present = show progress bar, and
  // once stage="done" + percent=100, the ready-state affirmation +
  // Continue button. Continue invokes onContinue (→ nav to /chat).
  flushingState?: {
    stage: FlushStage;
    percent: number;
    affirmation: PainAffirmation;
    isNavigating?: boolean;
    onContinue: () => void;
  } | null;
}

function TourTooltip({ step, primaryProps }: { step: any; primaryProps: any }) {
  const isChatComposerStep = step?.target === "[data-tour='chat-input']";
  const [chatComposerWidth, setChatComposerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!isChatComposerStep || typeof window === "undefined") return;

    const updateWidth = () => {
      const target = document.querySelector(step?.target);
      if (!(target instanceof HTMLElement)) return;
      const rect = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const nextWidth = Math.max(
        320,
        Math.min(rect.width, viewportWidth - 32, 760),
      );
      setChatComposerWidth(nextWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isChatComposerStep, step?.target]);

  return (
    <div
      className={`font-[family-name:var(--font-inter)] ${isChatComposerStep ? "" : "w-[min(calc(100vw-2rem),22.5rem)]"}`}
      style={
        isChatComposerStep
          ? { width: chatComposerWidth ? `${chatComposerWidth}px` : "min(calc(100vw - 2rem), 42rem)" }
          : undefined
      }
    >
      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(15,27,61,0.15)]">
        <div className="text-center">
          <h3 className="text-[18px] font-extrabold text-[#0F1B3D] mb-1.5 text-balance">{step.title}</h3>
          <p className="text-[14px] text-[#5a6a82] font-light leading-relaxed text-balance">{step.content}</p>
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

// Comparison-chart copy for the social-proof step before auth. Keyed by
// pain-bucket id so the y-axis framing + caption match the number the
// user just named on the pain step. Headline sits above the chart,
// yLabel inside the card, pill next to the Elena legend chip, caption
// beneath. PLACEHOLDER percentages — calibrate to real 90-day cohort
// data once the events pipeline has N. Soft language ("most", "typical")
// keeps the copy honest if the true median shifts.
const COMPARISON_COPY: Record<string, { yLabel: string; pill: string; caption: string }> = {
  // Time buckets
  lt1:    { yLabel: "Your weekly healthcare time", pill: "Time", caption: "Healthcare load grows as life gets busier. Most Elena users in your range reclaim 30+ minutes a week within 3 months." },
  "1to3": { yLabel: "Your weekly healthcare time", pill: "Time", caption: "Healthcare load grows over time. 80% of Elena users in your range cut theirs in half within 3 months." },
  "3to6": { yLabel: "Your weekly healthcare time", pill: "Time", caption: "Healthcare load grows over time. 80% of Elena users in your range cut theirs by more than half within 3 months." },
  "6plus":{ yLabel: "Your weekly healthcare time", pill: "Time", caption: "Healthcare load grows over time. 80% of Elena users in your range cut theirs by more than half within 3 months." },
  // Money buckets
  lt500:    { yLabel: "Your yearly healthcare spend", pill: "Cost", caption: "Healthcare costs climb every year. Most Elena users in your range catch billing surprises before they become real bills." },
  "500to2k":{ yLabel: "Your yearly healthcare spend", pill: "Cost", caption: "Healthcare costs climb every year. 75% of Elena users in your range cut theirs by 20% or more within a year." },
  "2kto5k": { yLabel: "Your yearly healthcare spend", pill: "Cost", caption: "Healthcare costs climb every year. 80% of Elena users in your range cut theirs by 25% or more within a year." },
  "5kplus": { yLabel: "Your yearly healthcare spend", pill: "Cost", caption: "Healthcare costs climb every year. 80% of Elena users in your range cut theirs by 30% or more within a year." },
};
// Fallback for users who reach social-proof without picking a pain
// bucket (e.g. staying_healthy branch that skipped pain). Generic
// retention framing instead of outcome-sized.
const COMPARISON_DEFAULT = {
  yLabel: "Your healthcare load",
  pill: "Care",
  caption: "Healthcare only gets more complicated over time. Elena keeps yours from running away — 9 in 10 users stick with the app past their first week.",
};

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

// Profile popover steps use custom overlay cards (can't target portal DOM).
// `addKind` marks tabs that offer an inline data-entry prompt during the tour.
// Skipped for users who already have data of that kind (they see the plain
// description card instead).
const PROFILE_STEPS: {
  id: string;
  title: string;
  body: string;
  tab: "health" | "visits" | "insurance";
  addKind: AddKind | null;
  showSwitcher?: boolean;
}[] = [
  { id: "health", title: "Your Health tab", body: "Your condition, meds, and care plan all land here. Elena keeps them up to date as you chat.", tab: "health", addKind: "provider" },
  { id: "visits", title: "Your Visits tab", body: "Every appointment Elena books lives here, plus your notes and history.", tab: "visits", addKind: "visit" },
  { id: "insurance", title: "Your Insurance tab", body: "Elena checks what's covered and estimates costs before you go.", tab: "insurance", addKind: "insurance" },
  { id: "family", title: "Add your family", body: "If you manage someone's care, add them here. If they're on their own, send them an invite.", tab: "health", addKind: "family", showSwitcher: true },
];

type Phase = TourPhase;

// Map CARE_OPTIONS ids to the backend relationship values used by
// /profiles. The care phase's "partner" maps to the profile-level
// "spouse" term since that's what add-family uses.
function careIdToRelationship(careId: string): string {
  if (careId === "partner") return "spouse";
  if (careId === "parent" || careId === "child") return careId;
  return "other";
}

// Human-readable label for the relationship row header, derived from
// the CARE_OPTIONS label minus the "My " prefix ("My parent" → "parent").
function careIdToNounLabel(careId: string): string {
  const opt = CARE_OPTIONS.find((o) => o.id === careId);
  if (!opt) return "someone";
  return opt.label.replace(/^My /, "").toLowerCase();
}

// Router choices determine the downstream flow after profile-form.
// Condition / medications / money all go through `situation` (collect
// what's going on) but diverge after. Staying-healthy skips the
// condition block entirely and goes straight to elena-plan → joyride.
//
// "Caring for someone else" used to be a router option but now runs
// through the upstream setup-for phase: the whole onboarding operates
// on the dependent's profile once the user picks them there, so
// they're really just doing condition/medications/money FOR that
// person. No separate caregiver branch downstream.

// Hero values rendered on elena-plan for branches that don't have a
// condition template driving content. First-person "I can" phrasing
// matches the templated condition flow.
// Three distinct visual buckets (call-refill / pricing / booking) so
// when all three render together they feel like different Elena actions,
// not three variants of "a phone call."
const MEDS_BRANCH_HERO_VALUES = [
  "I can call your provider to renew your refills.",
  "I can price-shop across pharmacies and coupon programs.",
  "I can schedule home delivery for your refills.",
];
// Ordered so the most universal / concrete promises survive the 3-line
// cap on elena-plan. Derived lines (pain callback + med price-shop) prepend
// in front of these, so in practice users usually see 1-2 derived + 1-2
// of the top base lines.
const MONEY_BRANCH_HERO_VALUES = [
  "I can price-shop your scan, test, or procedure before you book it.",
  "I can call your insurance to check coverage before you go.",
  "I can help you pay bills on time and dispute wrong charges.",
  "I can compare plans and help you get the most out of your insurance.",
  "I can find home medical equipment at the best price.",
];
const STAYING_HEALTHY_BRANCH_HERO_VALUES = [
  "I can call your PCP to book your annual physical.",
  "I can schedule screenings on the right cadence.",
  "I can price-shop labs and imaging in-network.",
];

const STAYING_HEALTHY_FOCUS_OPTIONS = [
  { key: "annual_physical", label: "Booking my annual physical", focus: "annual physical" },
  { key: "screenings", label: "Knowing which screenings are due", focus: "screenings and preventive care" },
  { key: "providers", label: "Keeping my doctors and visits organized", focus: "keeping my doctors and visits organized" },
  { key: "reminders", label: "Staying on top of reminders and follow-ups", focus: "reminders and follow-ups" },
  { key: "other", label: "Something else", focus: "" },
] as const;

function buildStayingHealthyHeroValues(focus: string): string[] {
  const lower = focus.trim().toLowerCase();
  if (lower.includes("physical")) {
    return [
      "I can call your PCP and book your annual physical.",
      "I can make sure you know which labs or screenings to ask for at that visit.",
      "I can keep track of the follow-ups after it's booked.",
    ];
  }
  if (lower.includes("screening") || lower.includes("preventive")) {
    return [
      "I can figure out which screenings are due next.",
      "I can book the highest-priority screening first.",
      "I can price-shop labs and imaging in-network.",
    ];
  }
  if (lower.includes("doctor") || lower.includes("visit") || lower.includes("provider")) {
    return [
      "I can organize your doctors, visits, and what each one is for.",
      "I can build a clear follow-up list so nothing slips.",
      "I can help gather records or referral details before the next appointment.",
    ];
  }
  if (lower.includes("reminder") || lower.includes("follow-up") || lower.includes("organ")) {
    return [
      "I can turn your loose ends into a care plan with reminders.",
      "I can keep appointments, meds, and follow-ups in one place.",
      "I can flag what's due now versus what can wait.",
    ];
  }
  return STAYING_HEALTHY_BRANCH_HERO_VALUES;
}

// Pick a mini-mockup per hero line so each card shows Elena doing the
// thing, not just an icon. When multiple lines are "I can call X" we
// rotate CallMini through 3 semantically-driven variants (hold /
// schedule / refill) so three calls don't all say "On hold."
function visualForHeroLine(line: string): React.ReactNode {
  const l = line.toLowerCase();
  if (l.includes("you said")) return <PainDropMini />;
  if (l.includes("you're caring for") || l.includes("across the family") || l.includes("care straight")) {
    // Match the number of people the user is caring for so the mini
    // reflects their actual selection ("caring for 3 people" → 3 rows).
    // For the named-deps line ("I can keep Linda and David's care
    // straight") we count commas + the word "and" as a people proxy.
    const m = line.match(/caring for (\d+)/i);
    if (m) return <FamilyMini count={parseInt(m[1], 10)} />;
    const careStraight = line.match(/keep (.+?)'s care straight/i);
    if (careStraight) {
      const names = careStraight[1].split(/,|\band\b/).map((s) => s.trim()).filter(Boolean);
      return <FamilyMini count={Math.max(names.length, 2)} />;
    }
    return <FamilyMini count={3} />;
  }
  if (l.includes("pay ") || l.includes("bill") || l.includes("dispute")) return <BillMini />;
  if (l.includes("price-shop") || l.includes("best price") || l.includes("compare plans")) return <PricingMini />;
  if (l.includes("call") || l.includes("track when") || l.includes("renew")) {
    const target = extractCallTarget(line);
    // Pick the call variant that best matches what Elena is doing.
    // Order matters: check refill/insurance before generic booking
    // because some lines contain multiple keywords.
    let context: CallContext = "schedule";
    if (l.includes("refill") || l.includes("renew") || l.includes("runs out") || l.includes("pharmacy")) {
      context = "refill";
    } else if (l.includes("insurance") || l.includes("coverage")) {
      context = "hold";
    }
    return <CallMini context={context} name={target.name} label={target.label} />;
  }
  if (l.includes("schedule") || l.includes(" book") || l.includes("coordinate")) return <BookingMini />;
  if (l.includes("research") || l.includes("find")) return <PricingMini />;
  const fallback = extractCallTarget(line);
  return <CallMini context="schedule" name={fallback.name} label={fallback.label} />;
}

// Pull a "who Elena is talking to" pair out of the line so each call
// mockup shows specific context instead of a generic "Provider." Doctor
// names are placeholder personas — the point is visual variety between
// cards, not that Dr. Chen is your actual endocrinologist.
function extractCallTarget(line: string): { name: string; label?: string } {
  const l = line.toLowerCase();
  if (l.includes("insurance")) return { name: "Anthem" };
  if (l.includes("endocrin")) return { name: "Dr. Chen", label: "Endocrinology" };
  if (l.includes("cardio")) return { name: "Dr. Park", label: "Cardiology" };
  if (l.includes("pulmonologist") || l.includes("pulmonology")) return { name: "Dr. Kim", label: "Pulmonology" };
  if (l.includes("rheumatologist") || l.includes("rheum")) return { name: "Dr. Patel", label: "Rheumatology" };
  if (l.includes("neurologist") || l.includes("neurology")) return { name: "Dr. Lee", label: "Neurology" };
  if (l.includes("oncology")) return { name: "Dr. Martinez", label: "Oncology" };
  if (l.includes("surgeon")) return { name: "Dr. Nguyen", label: "Surgery" };
  if (l.includes("pharmacy")) return { name: "CVS" };
  if (l.includes("pcp")) return { name: "Dr. Kim", label: "PCP" };
  if (l.includes("prescriber") || l.includes("provider")) return { name: "Dr. Kim", label: "Provider" };
  return { name: "Dr. Kim", label: "Provider" };
}

type CallContext = "hold" | "schedule" | "refill";

// elena-plan row: selectable action card. Vertical layout with the mini
// mockup up top and the "Want me to..." proposal text below. Tapping
// the card toggles it into a selected state (soft green tint + check
// badge) — users can pick multiple. Three-beat entry cascade (card
// springs in → mockup fades in → text fades in) mirrors BenefitTiles.
function ElenaPlanRow({
  line,
  title,
  subtitle,
  startDelayMs,
  selected,
  onToggle,
}: {
  line: string;
  title?: string;
  subtitle?: string;
  startDelayMs: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const [shown, setShown] = useState(false);
  const mergedTitle =
    title && subtitle
      ? subtitle.toLowerCase().startsWith("for ")
        ? `${title} ${subtitle.toLowerCase()}`
        : `${title} ${subtitle.charAt(0).toLowerCase()}${subtitle.slice(1)}`
      : title || line;

  useEffect(() => {
    const t = setTimeout(() => setShown(true), startDelayMs);
    return () => clearTimeout(t);
  }, [startDelayMs]);

  // Simple selectable row with a radio-style indicator on the left.
  // Earlier iterations stacked a mini-mockup preview above the action
  // text — testing showed users didn't register this was a multiple-
  // choice list. Moved the mini-mockups to the validation step where
  // they land as proof-of-value rather than decoration here.
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ opacity: 0, y: 10 }}
      animate={shown ? { opacity: 1, y: 0 } : undefined}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
      className={`flex items-center gap-3 max-md:gap-2.5 px-4 py-3.5 max-md:px-3 max-md:py-3 rounded-2xl text-left transition-colors duration-200 ${
        selected
          ? "bg-gradient-to-br from-[#34C759]/[0.14] to-[#34C759]/[0.04] ring-2 ring-[#34C759]/50 shadow-[0_3px_14px_rgba(52,199,89,0.18)]"
          : "bg-[#F6F7FB] ring-1 ring-[#0F1B3D]/[0.07] shadow-[0_3px_14px_rgba(15,27,61,0.06)] hover:ring-[#0F1B3D]/[0.15]"
      }`}
    >
      <span
        className={`shrink-0 w-6 h-6 max-md:w-[22px] max-md:h-[22px] rounded-full flex items-center justify-center transition-colors ${
          selected
            ? "bg-[#34C759] shadow-[0_2px_6px_rgba(52,199,89,0.4)]"
            : "border-2 border-[#0F1B3D]/25 bg-white"
        }`}
      >
        {selected && <Check className="w-3.5 h-3.5 max-md:w-3 max-md:h-3 text-white" strokeWidth={3} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] max-md:text-[14px] leading-snug font-semibold text-[#0F1B3D] text-balance">
          {mergedTitle}
        </div>
      </div>
    </motion.button>
  );
}

// ── Mini-mockups for elena-plan cards ───────────────────────────────
// Compact echoes of the value-slide BenefitTiles visuals. Sized to fit
// a w-[96px] slot on the left of each hero row. Intentionally small
// typography (7-9px) so they read as a tiny diagrammatic "proof" of
// what Elena is promising, not a legible UI the user has to parse.

function CallMini({
  context = "hold",
  name = "Provider",
  label,
}: {
  context?: CallContext;
  name?: string;
  label?: string;
}) {
  // Schedule variant: Elena on an active call booking the appointment.
  // Solid green phone, "Live" badge — no timer since the point is
  // action-in-progress, not waiting time.
  if (context === "schedule") {
    return (
      <div className="w-full max-w-[300px] mx-auto bg-white rounded-xl shadow-[0_2px_10px_rgba(15,27,61,0.10)] border border-[#E5E5EA] px-3 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#34C759] flex items-center justify-center flex-shrink-0">
          <Phone className="w-[14px] h-[14px] text-white" strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[#0F1B3D] truncate">Calling {name}</div>
          <div className="text-[11px] font-semibold text-[#34C759] mt-[2px]">
            {label ? `${label} · booking your visit` : "Booking your visit"}
          </div>
        </div>
        <div className="px-1.5 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759] text-[9px] font-black uppercase tracking-wider whitespace-nowrap">Live</div>
      </div>
    );
  }
  // Refill variant: renewal confirmed. Blue check, days-of-supply badge.
  // Distinct from the schedule variant (no phone icon at all, different
  // color system) so it reads as a different kind of Elena action.
  if (context === "refill") {
    const pharmacy = name === "CVS" ? "CVS" : "your pharmacy";
    return (
      <div className="w-full max-w-[300px] mx-auto bg-white rounded-xl shadow-[0_2px_10px_rgba(15,27,61,0.10)] border border-[#E5E5EA] px-3 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F1B3D] to-[#2E6BB5] flex items-center justify-center flex-shrink-0">
          <Check className="w-[16px] h-[16px] text-white" strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[#0F1B3D] truncate">Refill renewed</div>
          <div className="text-[11px] font-semibold text-[#2E6BB5] mt-[2px] truncate">Ready at {pharmacy}</div>
        </div>
        <div className="text-[11px] font-bold text-[#34C759] whitespace-nowrap">+90 days</div>
      </div>
    );
  }
  // Default "hold" variant: Elena waiting on the line so the user doesn't.
  return (
    <div className="w-full max-w-[300px] mx-auto bg-white rounded-xl shadow-[0_2px_10px_rgba(15,27,61,0.10)] border border-[#E5E5EA] px-3 py-2.5 flex items-center gap-3">
      <div className="relative w-6 h-6 flex-shrink-0">
        <span className="absolute inset-0 rounded-full bg-[#34C759]/40 animate-ping" />
        <span className="relative w-6 h-6 rounded-full bg-[#34C759] flex items-center justify-center">
          <Phone className="w-3 h-3 text-white" strokeWidth={3} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-[#0F1B3D] truncate">On hold, {name}</div>
        <div className="text-[10px] font-medium text-[#8E8E93] mt-[1px]">Elena is waiting</div>
      </div>
      <div className="text-[13px] font-bold text-[#34C759] tabular-nums whitespace-nowrap">12:34</div>
    </div>
  );
}

function BookingMini() {
  // Compact two-line confirmation chip — "Booked with Dr. Chen / Thu
  // Apr 18 10am". Sized to fit the narrow column on care-ack's 2-col
  // top row without its content wrapping awkwardly.
  return (
    <div className="w-full bg-white rounded-xl shadow-[0_2px_10px_rgba(15,27,61,0.10)] border border-[#E5E5EA] px-2.5 py-2 flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-[#34C759] flex items-center justify-center flex-shrink-0">
        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-[#0F1B3D] truncate leading-tight">Booked with Dr. Chen</div>
        <div className="text-[9.5px] font-semibold text-[#34C759] mt-[1px] truncate">Thu · Apr 18 · 10am</div>
      </div>
    </div>
  );
}

function PricingMini() {
  return (
    <div className="w-full max-w-[300px] mx-auto flex flex-col gap-1.5">
      <div className="bg-white rounded-lg border border-[#0F1B3D]/25 shadow-[0_1px_4px_rgba(15,27,61,0.06)] px-3 py-2 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-[#0F1B3D] truncate">In-network</div>
          <div className="text-[9px] font-semibold text-[#34C759]">✓ Best price</div>
        </div>
        <span className="text-[17px] font-black text-[#0F1B3D] tracking-tight whitespace-nowrap">$120</span>
      </div>
      <div className="bg-white rounded-lg border border-[#E5E5EA] px-3 py-2 flex items-center justify-between opacity-55">
        <span className="text-[11px] font-medium text-[#8E8E93]">Average</span>
        <span className="text-[15px] font-black text-[#0F1B3D]/60 line-through tracking-tight whitespace-nowrap">$340</span>
      </div>
    </div>
  );
}

function BillMini() {
  return (
    <div className="w-full max-w-[300px] mx-auto flex flex-col gap-1.5">
      <div className="bg-white rounded-lg border border-[#E5E5EA] px-3 py-2 flex items-center justify-between opacity-65">
        <span className="text-[11px] font-semibold text-[#8E8E93]">Original bill</span>
        <span className="text-[15px] font-black text-[#0F1B3D]/60 line-through tracking-tight whitespace-nowrap">$2,400</span>
      </div>
      <div className="bg-white rounded-lg border border-[#34C759]/45 shadow-[0_1px_4px_rgba(52,199,89,0.15)] px-3 py-2 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-[#0F1B3D]">Corrected</div>
          <div className="text-[9px] font-semibold text-[#34C759]">✓ Saved $600</div>
        </div>
        <span className="text-[17px] font-black text-[#0F1B3D] tracking-tight whitespace-nowrap">$1,800</span>
      </div>
    </div>
  );
}

function PainDropMini() {
  return (
    <div className="w-full flex items-center justify-center gap-2">
      <span className="text-[22px] font-black text-[#FF3B30] line-through tracking-tight">$2.4k</span>
      <ChevronRight className="w-5 h-5 text-[#34C759]" strokeWidth={3.5} />
      <span className="text-[28px] font-black text-[#34C759] tracking-tight">$900</span>
    </div>
  );
}

// Profile-switcher mini: echoes FamilyMiniCard from the value slide but
// scaled up to fit the vertical elena-plan card. Top row is "Me" in
// selected state (matches the app's profile popover); subsequent rows
// are placeholder people with warm color chips. Size `count` trims or
// grows the list to match the user's care selections.
function MedsMini({ rows = 2 }: { rows?: number }) {
  // Compact med list — mirrors the Game Plan "next refill on {date}" row
  // style. Used on caregiver care-ack to communicate "Elena handles
  // refills across the family." Default is 2 rows for tighter visual
  // density; pass rows={3} to expand.
  const all = [
    { name: "Lisinopril", refill: "Apr 28", owner: "Mom" },
    { name: "Ozempic", refill: "May 3", owner: "Dad" },
    { name: "Metformin", refill: "May 12", owner: "Mom" },
  ];
  const shown = all.slice(0, Math.max(1, Math.min(rows, all.length)));
  return (
    <div className="w-full flex flex-col gap-1">
      {shown.map((r) => (
        <div
          key={r.name}
          className="bg-white rounded-lg border border-[#E5E5EA] px-2 py-1 flex items-center gap-2"
        >
          <div className="w-5 h-5 rounded-md bg-[#0F1B3D]/[0.08] flex items-center justify-center flex-shrink-0">
            <span className="text-[10px]">💊</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[#0F1B3D] truncate">{r.name}</div>
            <div className="text-[9px] text-[#8E8E93] truncate">{r.owner} · refill {r.refill}</div>
          </div>
          <span className="shrink-0 rounded-full bg-[#34C759]/15 px-1 py-[1px] text-[8px] font-bold text-[#248A3D] uppercase tracking-wide">
            on it
          </span>
        </div>
      ))}
    </div>
  );
}

function FamilyMini({ count = 3 }: { count?: number }) {
  const allMembers = [
    { initials: "Me", bg: "#0F1B3D", fg: "#ffffff", label: "Me" },
    { initials: "M", bg: "#F4B084", fg: "#0F1B3D", label: "Mom" },
    { initials: "K", bg: "#8A9B78", fg: "#ffffff", label: "Kai" },
    { initials: "P", bg: "#2E6BB5", fg: "#ffffff", label: "Partner" },
    { initials: "S", bg: "#B67CC7", fg: "#ffffff", label: "Sam" },
  ];
  const n = Math.max(2, Math.min(count, allMembers.length));
  const members = allMembers.slice(0, n);
  // Compact profile-switcher — "Me" highlighted as active. Sized to fit
  // the narrower care-ack column while still reading as a sidebar
  // switcher. Row height tightened vs. the earlier standalone version.
  return (
    <div className="w-full flex flex-col gap-[3px]">
      {members.map((m, i) => (
        <div
          key={m.label}
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${
            i === 0
              ? "bg-white border border-[#0F1B3D]/20 shadow-[0_1px_3px_rgba(15,27,61,0.08)]"
              : ""
          }`}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
            style={{ background: m.bg, color: m.fg }}
          >
            {m.initials}
          </div>
          <div className="text-[11px] font-semibold text-[#0F1B3D] truncate">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

export function WebOnboardingTour({
  surface = "chat",
  onComplete,
  onShowPaywall,
  onProfilePopover,
  onSidebar,
  onSeedQuery,
  onNeedsAuth,
  flushingState,
}: WebOnboardingTourProps) {
  // Auth hooks for the profile-form phase (migrated from the old OnboardingModal)
  const {
    session,
    needsOnboarding,
    completeOnboarding,
    profileData,
    profileId,
    doctors,
    careVisits,
    profiles,
    insuranceCards,
    refreshDoctors,
    refreshVisits,
    refreshProfiles,
    refreshInsurance,
    switchProfile,
    // For the inline auth phase (elena-plan → "Create your account" step
    // → signup/signin). Kept inside the tour shell so the transition
    // doesn't read as a foreign modal interruption.
    signIn,
    signUp,
    signInWithGoogle,
  } = useAuth();
  // Plan A: when the tour runs on /onboard (pre-signup), all API writes
  // are buffered to sessionStorage and flushed on signup. The boolean
  // below is the "are we in anonymous mode?" switch that gates the
  // buffer-vs-API decision in every write path.
  const isAnonymousTour = !session;

  // Resume-on-refresh: tour state is persisted to sessionStorage on every
  // change and restored here on mount. Snapshot is computed once (useMemo
  // with []) so state initializers see a stable value. Cleared in
  // finishTour / skipTour so a fresh tour starts at the first real
  // decision step ("care"), not the old Elena intro card.
  // Joyride phase requires live joyride controls that don't survive a
  // refresh, so if the snapshot was mid-joyride we skip past it to the
  // profile walkthrough (which reopens the popover via its own effect).
  const tourSnapshot = useMemo((): Partial<{
    phase: Phase;
    profileStep: number;
    careSelections: string[];
    routerChoice: RouterChoice;
    painSelection: string | null;
    firstName: string;
    lastName: string;
    dob: string;
    zipCode: string;
    selectedSituation: string | null;
    customSituation: string;
    selectedMeds: string[];
    customMeds: string[];
    checkedPlanItems: string[];
    confirmedActions: string[];
    customActionText: string;
    setupForCareId: string | null;
    dependentFirstName: string;
    dependentLastName: string;
    dependentProfileId: string | null;
  }> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = (localStorage.getItem("elena_tour_state") || sessionStorage.getItem("elena_tour_state"));
      if (!raw) return {};
      const s = JSON.parse(raw);
      const normalizedPhase = normalizeRestoredTourPhase({
        phase: s.phase,
        hasSession: !!session,
        surface,
        pendingSignup: hasPendingSignup(sessionStorage),
        needsOnboarding,
      });
      if (normalizedPhase === "intro") s.phase = "care";
      else if (normalizedPhase) s.phase = normalizedPhase;
      else delete s.phase;
      // Previously we fell back joyride→profile here on the theory that
      // joyride controls don't survive a refresh. Under Plan A the tour
      // intentionally resumes at joyride after the /onboard→/chat
      // handoff — the useJoyride controls instance is fresh because
      // the tour component is newly mounted on /chat. The phase effect
      // below calls controls.start() to kick off the spotlight, and the
      // 20s safety timeout in the joyride-advance effect covers the
      // edge case where the target DOM element never appears.
      return s;
    } catch {
      return {};
    }
  }, [needsOnboarding, session, surface]);

  const [phase, setPhase] = useState<Phase>(tourSnapshot.phase ?? "care");
  const [profileStep, setProfileStep] = useState(tourSnapshot.profileStep ?? 0);
  const impossibleAuthPhaseTrackedRef = useRef(false);

  useEffect(() => {
    if (!session || phase !== "auth") return;
    if (!impossibleAuthPhaseTrackedRef.current) {
      impossibleAuthPhaseTrackedRef.current = true;
      analytics.track("Authenticated Auth Step Detected", {
        surface,
        pending_signup: typeof window !== "undefined" && hasPendingSignup(window.sessionStorage),
      });
    }
    if (surface === "chat") {
      setPhase(needsOnboarding ? "profile-form" : "joyride");
    }
  }, [needsOnboarding, phase, session, surface]);

  // Fires "Web Tour Completed" exactly once per tour, at the post-auth
  // flush boundary (see effect below). Previously this event only fired
  // from the post-signup Joyride onFinish, which most trial-converters
  // never reached (OAuth redirect, mobile sidebar timing, users closing
  // the spotlight) — producing a 100% Started→Completed dropoff in
  // Mixpanel even for users who went on to start a trial.
  const tourCompletedFiredRef = useRef(false);

  // Inline data-entry state for the profile-phase cards. One field set per
  // `addKind`; reset as the user advances so each card starts clean.
  const [providerName, setProviderName] = useState("");
  const [providerSpecialty, setProviderSpecialty] = useState("");
  // Free-text specialty — used when the user taps the "Other" chip.
  const [providerCustomSpecialty, setProviderCustomSpecialty] = useState("");
  // Live doctor enrichment result (Serper Places via /doctors/enrich).
  // Populated after a debounced lookup when the user types a name. Users
  // tap the suggestion card to accept it; save then posts the enriched
  // payload instead of just name+specialty.
  const [providerMatch, setProviderMatch] = useState<{
    practice?: string;
    phone?: string;
    address?: string;
    photo_url?: string;
  } | null>(null);
  const [providerMatchAccepted, setProviderMatchAccepted] = useState(false);
  const [providerMatchLoading, setProviderMatchLoading] = useState(false);
  const enrichmentTokenRef = useRef(0);
  const [visitType, setVisitType] = useState("");
  const [visitDate, setVisitDate] = useState("");
  // Cross-step continuity: if the user just saved a provider, the visits
  // step pre-fills as a visit with that provider instead of making them
  // re-pick a type from scratch. Tap "Different appointment" to fall back
  // to the chip UI.
  const [lastAddedProvider, setLastAddedProvider] = useState<{ name: string; specialty: string } | null>(null);
  const [visitUseChipMode, setVisitUseChipMode] = useState(false);
  const [insuranceCarrier, setInsuranceCarrier] = useState("");
  const [insuranceCustomName, setInsuranceCustomName] = useState("");
  const [familyFirstName, setFamilyFirstName] = useState("");
  const [familyLastName, setFamilyLastName] = useState("");
  const [familyRelation, setFamilyRelation] = useState("");
  // Two-step UX for the family card: first the user picks a path
  // (invite vs. manage), then we show the form only for the managed path.
  const [familyMode, setFamilyMode] = useState<"choose" | "manage">("choose");

  // Inline auth phase state — email/password form + OAuth flow. Kept
  // inside the tour so the Create-Your-Account step lands as "another
  // step in onboarding" rather than a foreign modal.
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  // Progressive-disclosure toggles: users see chips first, then can opt
  // into free-text entry. Keeps the card's default state compact.
  const [visitCustomOpen, setVisitCustomOpen] = useState(false);
  // Brief success overlay that replaces the form while the save settles,
  // then nextProfile() fires. Gives the user a concrete "it landed" beat
  // before advancing.
  const [successOverlay, setSuccessOverlay] = useState<
    | { kind: "provider"; title: string; detail: string }
    | { kind: "visit"; title: string; detail: string }
    | { kind: "family"; title: string; detail: string; initial: string }
    | { kind: "insurance"; title: string; detail: string }
    | { kind: "invite"; title: string; detail: string }
    | null
  >(null);
  const [careSelections, setCareSelections] = useState<string[]>(tourSnapshot.careSelections ?? []);
  const [painSelection, setPainSelection] = useState<string | null>(tourSnapshot.painSelection ?? null);
  const [lpVariant, setLpVariant] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Top-of-mind condition block (situation → meds → care-plan → validation).
  // `selectedSituation` is the chip key; `customSituation` is the freeform
  // text used when the user picks "Something else" or an injury. Meds are
  // split into template picks vs. user-added strings so we can track both
  // in analytics. Plan items collect the ids the user has already done;
  // the rest become todos in advanceFromValidation.
  const [routerChoice, setRouterChoice] = useState<RouterChoice | null>(tourSnapshot.routerChoice ?? null);
  const [selectedSituation, setSelectedSituation] = useState<string | null>(tourSnapshot.selectedSituation ?? null);
  const [customSituation, setCustomSituation] = useState(tourSnapshot.customSituation ?? "");
  const [selectedMeds, setSelectedMeds] = useState<string[]>(tourSnapshot.selectedMeds ?? []);
  const [customMeds, setCustomMeds] = useState<string[]>(tourSnapshot.customMeds ?? []);
  const [newMedDraft, setNewMedDraft] = useState("");
  const inferredSituationTemplate = useMemo(
    () => getTemplate(selectedSituation) ?? findTemplateByAlias(customSituation),
    [selectedSituation, customSituation],
  );
  const [checkedPlanItems, setCheckedPlanItems] = useState<string[]>(tourSnapshot.checkedPlanItems ?? []);
  const [savingSituation, setSavingSituation] = useState(false);
  // elena-plan is now an action picker, not a promise read-out. Users
  // toggle which cards they want Elena to actually start on; freeform
  // captures "something else" intent. These persist into the chat via
  // sessionStorage on tour finish so the landing chat can kick off
  // exactly what the user just asked for.
  const [confirmedActions, setConfirmedActions] = useState<string[]>(tourSnapshot.confirmedActions ?? []);
  const [customActionText, setCustomActionText] = useState(tourSnapshot.customActionText ?? "");

  // setup-for phase: when the user picked non-myself in the care phase,
  // we ask which ONE they want to set Elena up for today. Picking a
  // dependent creates+switches to their linked profile so the rest of
  // the tour (situation/meds/care-plan) operates on THEIR chart. Picking
  // myself just continues the for-me flow.
  const [setupForCareId, setSetupForCareId] = useState<string | null>(tourSnapshot.setupForCareId ?? null);
  // Name of the dependent this session is being set up for (only used
  // when setupForCareId is non-myself). Entered inline on the same
  // setup-for screen; captured here and written on profile create.
  const [dependentFirstName, setDependentFirstName] = useState(tourSnapshot.dependentFirstName ?? "");
  const [dependentLastName, setDependentLastName] = useState(tourSnapshot.dependentLastName ?? "");
  // DOB + zip for the dependent, collected on the profile-form phase
  // (separate from primary user's dob/zipCode state above). When the
  // session is for a dependent, profile-form rebinds its DOB + zip
  // inputs to these so the data saves to THEIR chart, not the
  // caregiver's.
  const [dependentDob, setDependentDob] = useState("");
  const [dependentZip, setDependentZip] = useState("");
  // ID of the dependent profile once created — used to key downstream
  // apiFetch calls (conditions, medications, todos) to their chart
  // instead of the primary user's.
  const [dependentProfileId, setDependentProfileId] = useState<string | null>(tourSnapshot.dependentProfileId ?? null);
  const [creatingDependent, setCreatingDependent] = useState(false);

  // When /onboard signals the post-signup flush, morph the current phase
  // into "flushing" so the progress bar lands inside the same shell card
  // (instead of stacking a second overlay on top). The flush cannot
  // start until the user has already passed auth, so whatever phase we
  // exit is fine to leave behind.
  useEffect(() => {
    if (flushingState && phase !== "flushing") {
      // The user has already completed auth by the time /onboard starts
      // flushing buffered writes. If we leave the persisted tour snapshot
      // on "auth", the /chat remount restores the signup step instead of
      // resuming the post-auth walkthrough. Promote the saved resume
      // phase now so the /onboard -> /chat handoff always lands in the
      // joyride/profile path.
      if (surface === "onboard" && typeof window !== "undefined") {
        promoteStoredTourStateToPostAuthResume({
          localStorage: window.localStorage,
          sessionStorage: window.sessionStorage,
        });
      }
      setPhase("flushing");
      if (!tourCompletedFiredRef.current) {
        tourCompletedFiredRef.current = true;
        analytics.track("Web Tour Completed", { at: "post_auth_flush" });
      }
    }
  }, [flushingState, phase, surface]);

  // Whether the current tour session is setting Elena up for a
  // dependent instead of the primary user. Drives per-phase copy
  // adaptation ("Let's get Linda set up", "What's top of mind for
  // Linda?", etc.) and which DB endpoints handleProfileSubmit hits.
  const isDependentSetup = !!setupForCareId && setupForCareId !== "myself";

  // Dev override: ?force_prompts=1 makes hasExistingData always return
  // false so the profile walkthrough's inline add-forms show even on
  // accounts that already have doctors / visits / insurance / family.
  // Lets us iterate on the walkthrough visuals without cycling test
  // accounts. No effect on prod flows unless the URL param is present.
  const [forcePrompts, setForcePrompts] = useState(false);

  // Profile-form phase state (migrated from OnboardingModal)
  const [firstName, setFirstName] = useState(tourSnapshot.firstName ?? "");
  const [lastName, setLastName] = useState(tourSnapshot.lastName ?? "");
  const [dob, setDob] = useState(tourSnapshot.dob ?? "");
  const [zipCode, setZipCode] = useState(tourSnapshot.zipCode ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // The person this session is about. "Linda" when dependent-setup,
  // else the primary user's first name (or a fallback). Used in
  // headline templating throughout the tour. Declared here so it can
  // reference `firstName` without hitting TDZ.
  const managedFirstName = isDependentSetup
    ? dependentFirstName.trim()
    : (firstName.trim() || profileData?.firstName || "");

  // Sync form fields from profileData when it arrives (OAuth name and any
  // previously captured optional details).
  useEffect(() => {
    if (profileData?.firstName && !firstName) setFirstName(profileData.firstName);
    if (profileData?.lastName && !lastName) setLastName(profileData.lastName);
    if (profileData?.dob && !dob) setDob(isoToDisplayDate(profileData.dob));
    if (profileData?.zipCode && !zipCode) setZipCode(profileData.zipCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.firstName, profileData?.lastName, profileData?.dob, profileData?.zipCode]);

  const hasOAuthName = !!(profileData?.firstName);
  // Profile-form submit gate depends on who the session is for. When
  // setting up a dependent, the form asks for DEPENDENT's fields —
  // first/last came from setup-for. We only require name here now;
  // DOB/zip get collected later if a downstream action actually needs them.
  const canSubmitProfile = isDependentSetup
    ? dependentFirstName.trim().length > 0
      && dependentLastName.trim().length > 0
    : firstName.trim().length > 0
      && lastName.trim().length > 0;
  // Headline + subtitle stream with a typewriter effect; these gate the
  // reveal of the rest of the card's content. Reset whenever phase changes
  // so each step starts fresh.
  const [headlineDone, setHeadlineDone] = useState(false);
  const [subtitleDone, setSubtitleDone] = useState(false);
  useEffect(() => {
    setHeadlineDone(false);
    setSubtitleDone(false);
    // painSelection is intentionally NOT reset on phase change — later
    // phases (value, elena-plan, social-proof) key their copy to it so
    // the pain bucket the user named keeps paying off through the rest
    // of the tour. skipTour / finishTour clear tour state entirely.
  }, [phase]);
  // Profile walkthrough streams the title per step, then cascades the
  // body + prompt in. Reset whenever profileStep changes so each new
  // card's title streams again from scratch.
  useEffect(() => {
    if (phase !== "profile") return;
    setHeadlineDone(false);
  }, [phase, profileStep]);

  // Each profile walkthrough step asks Yes/No before showing the add
  // form. "pending" = show the Yes/No buttons; "yes" = expand into the
  // existing prompt; "no" = user declined (caller skips to next step).
  // Reset per step so each new card starts with the prompt closed.
  const [stepChoice, setStepChoice] = useState<"pending" | "yes" | "no">("pending");
  useEffect(() => {
    if (phase !== "profile") return;
    setStepChoice("pending");
  }, [phase, profileStep]);

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
  // Synchronous guard for advanceFromElenaPlan — the state-based
  // `savingSituation` flag doesn't flush in time to block a double-
  // click, which produces duplicate todo POSTs. A ref flips before
  // any async work so a second invocation short-circuits cleanly.
  const advanceFromElenaPlanRef = useRef(false);

  // Joyride steps adapt to dependent setup so the "This is your profile"
  // spotlight reads as "This is Linda's profile" when the caregiver is
  // setting up for someone else. Kept as useMemo so the step objects
  // have stable identity (useJoyride doesn't like new arrays every
  // render — triggers its own internal resets).
  const joyrideSteps = useMemo(() => {
    const depName = isDependentSetup && managedFirstName ? managedFirstName : "";
    const title = depName ? `This is ${depName}'s profile` : "This is your profile";
    const content = depName
      ? `All of ${depName}'s health data, doctors, insurance, and appointments live here. Let's take a look inside — you can add to it as we go.`
      : "All your health data, doctors, insurance, and appointments live here. Let's take a look inside — you can add to it as we go.";
    return [
      {
        ...JOYRIDE_STEPS[0],
        title,
        content,
      },
    ];
  }, [isDependentSetup, managedFirstName]);

  const { controls, on, Tour } = useJoyride({
    steps: joyrideSteps,
    continuous: true,
    styles: {
      // No backdrop-filter here: the spotlight cutout is SVG-masked but
      // backdrop-filter ignores the mask and blurs the whole overlay box,
      // including the target element. Dim-only keeps the target crisp.
      options: { primaryColor: "#0F1B3D", zIndex: 99999, overlayColor: "rgba(0,0,0,0.45)" },
      beacon: { display: "none" },
    },
  } as any);

  useEffect(() => {
    setMounted(true);
    isMobile.current = window.innerWidth < 768;
    setLpVariant(localStorage.getItem("elena_lp_variant"));
    try {
      setForcePrompts(new URLSearchParams(window.location.search).get("force_prompts") === "1");
    } catch {}
    analytics.track("Web Tour Started");
    // Suppress the App Store CTA while the tour is running so users aren't
    // double-nudged in the middle of data entry. Cleared on finish/skip.
    try { sessionStorage.setItem("elena_tour_in_progress", "1"); } catch {}
    return () => {
      try { sessionStorage.removeItem("elena_tour_in_progress"); } catch {}
    };
  }, []);

  // Persist the tour state on every change so a refresh mid-run resumes
  // where the user left off. Skip persisting for the terminal phases
  // (intro = fresh, done = complete) so we don't write noise and so an
  // "intro" write doesn't clobber a valid snapshot on StrictMode mount.
  // tourSnapshot itself is read only once via useMemo; writes flow back
  // as state updates.
  useEffect(() => {
    if (phase === "done" || phase === "intro" || phase === "flushing") return;
    try {
      // localStorage (not sessionStorage) so the tour survives tab
      // closures — users expect "pick up where I left off" to work
      // across browser restarts, not just same-tab refreshes. Cleared
      // in finishTour/skipTour so no stale state persists past a
      // completed tour. Skip "flushing": that phase only renders with
      // live props from /onboard, so persisting it creates a blank-shell
      // restore if the user reloads or lands on /chat first.
      localStorage.setItem(
        "elena_tour_state",
        JSON.stringify({
          phase,
          profileStep,
          careSelections,
          routerChoice,
          painSelection,
          firstName,
          lastName,
          dob,
          zipCode,
          selectedSituation,
          customSituation,
          selectedMeds,
          customMeds,
          checkedPlanItems,
          confirmedActions,
          customActionText,
          setupForCareId,
          dependentFirstName,
          dependentLastName,
          dependentProfileId,
        }),
      );
    } catch {}
  }, [
    phase, profileStep, careSelections, routerChoice, painSelection,
    firstName, lastName, dob, zipCode,
    selectedSituation, customSituation,
    selectedMeds, customMeds, checkedPlanItems,
    confirmedActions, customActionText,
    setupForCareId, dependentFirstName, dependentLastName, dependentProfileId,
  ]);

  // Stash the prop callbacks in refs so the joyride-advance effect below
  // doesn't re-run (and its 20s safety timer doesn't reset) every time
  // the parent re-renders and passes fresh function identities. Without
  // this, the timer was resetting on every auth-context change and
  // never actually firing.
  const onSidebarRef = useRef(onSidebar);
  const onProfilePopoverRef = useRef(onProfilePopover);
  useEffect(() => { onSidebarRef.current = onSidebar; }, [onSidebar]);
  useEffect(() => { onProfilePopoverRef.current = onProfilePopover; }, [onProfilePopover]);

  // Joyride event: after profile button step, open popover. Listen on
  // TOUR_END so dismissing the spotlight via Finish, X, or clicking the
  // dim overlay all advance into the profile walkthrough. A 20s safety
  // timeout catches the edge case where the target element isn't
  // rendered (e.g. force-tour on a layout where the sidebar is
  // collapsed) — without it the tour would silently hang at "joyride".
  useEffect(() => {
    if (phase !== "joyride") return;
    // Kick off the spotlight. beginJoyride (authed flow) already calls
    // controls.start() after the shell-fade timing. But under Plan A
    // the user lands here fresh from a /chat remount (tour state said
    // phase="joyride"), and beginJoyride was never invoked. A direct
    // controls.start() here covers that path. controls.start() on an
    // already-started joyride is a no-op, so it's safe to run either way.
    // Delay matches beginJoyride's mobile/desktop values so the sidebar /
    // chat shell has time to settle before the spotlight positions.
    // Mobile-specific: open the sidebar drawer first so the profile
    // button — the spotlight target — is actually on-screen. Without
    // this, joyride spotlights an off-canvas element and the user sees
    // a floating tooltip pointing at nothing.
    if (isMobile.current) onSidebarRef.current(true);
    const startTimer = setTimeout(() => controls.start(), isMobile.current ? 600 : 300);
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      if (isMobile.current) onSidebarRef.current(false);
      onProfilePopoverRef.current(true, "health", false);
      setPhase("profile");
      setProfileStep(0);
    };
    // The "This is your profile" spotlight waits for user interaction
    // (click "Show me" / dismiss / tap the overlay). No auto-advance —
    // this is the first orientation moment post-signup and the user
    // should control the pace.
    const unsub = on(EVENTS.TOUR_END, fire);
    return () => { unsub(); clearTimeout(startTimer); };
  }, [phase, on, controls]);

  // Profile popover tab control
  useEffect(() => {
    if (phase !== "profile") return;
    const step = PROFILE_STEPS[profileStep];
    if (step) {
      onProfilePopover(true, step.tab, !!step.showSwitcher);
    }
  }, [phase, profileStep, onProfilePopover]);

  // Debounced enrichment: after the user pauses typing the doctor's name,
  // hit /doctors/enrich to backfill practice/phone/address. Result surfaces
  // as a tappable card under the input; user confirms to use the enriched
  // payload on save. Stale responses are discarded via a monotonic token.
  useEffect(() => {
    const trimmed = providerName.trim();
    if (trimmed.length < 3) {
      setProviderMatch(null);
      setProviderMatchAccepted(false);
      setProviderMatchLoading(false);
      return;
    }
    // Input changed — previously-accepted match no longer applies.
    setProviderMatchAccepted(false);
    const token = ++enrichmentTokenRef.current;
    const timer = setTimeout(async () => {
      if (token !== enrichmentTokenRef.current) return;
      setProviderMatchLoading(true);
      try {
        const bareName = trimmed.replace(/^(Dr\.?\s+)/i, "").trim();
        // Prefer the tour's own zip state (captured in profile-form).
        // In managed-setup mode the profile-form collects dependentZip
        // (not zipCode), so include that in the fallback chain —
        // previously the effect went out with an empty zip and Serper
        // Places returned nothing useful.
        const zipUsed =
          zipCode.trim()
          || profileData?.zipCode
          || dependentZip.trim()
          || "";
        const res = await apiFetch("/doctors/enrich", {
          method: "POST",
          body: JSON.stringify({
            // Specialty is optional — Serper Places works fine with
            // just "{name} {zip}" (e.g. "One Medical 10001"). Previously
            // we required the user to tap a specialty chip before the
            // search would fire at all, which silently blocked users
            // who typed a name and expected suggestions.
            doctors: [{ name: bareName, specialty: providerSpecialty || "" }],
            zip_code: zipUsed,
          }),
        });
        if (token !== enrichmentTokenRef.current) return;
        if (!res.ok) {
          console.log("[tour] enrichment: non-OK", res.status, "name=", bareName, "zip=", zipUsed);
          setProviderMatch(null);
          return;
        }
        const data = await res.json();
        const doc = data.doctors?.[0];
        // Inline-stringify so the log is actually readable in production
        // consoles (Chrome truncates nested objects to "Object"). The
        // enriched fields we care about are practice / phone / address /
        // photo_url / serper_specialty — anything beyond the input name +
        // specialty tells us Serper found a match.
        console.log(
          "[tour] enrichment response — name=", bareName,
          "zip=", zipUsed,
          "→", JSON.stringify(doc),
        );
        // Accept practice/phone/address (full match) OR photo/serper_specialty
        // (partial match worth surfacing). Previously we required one of the
        // first three; brands with only photo metadata were silently dropped.
        if (doc && (doc.phone || doc.address || doc.practice || doc.photo_url || doc.serper_specialty)) {
          setProviderMatch({
            practice: doc.practice || undefined,
            phone: doc.phone || undefined,
            address: doc.address || undefined,
            photo_url: doc.photo_url || undefined,
          });
        } else {
          setProviderMatch(null);
        }
      } catch {
        if (token === enrichmentTokenRef.current) setProviderMatch(null);
      } finally {
        if (token === enrichmentTokenRef.current) setProviderMatchLoading(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [providerName, providerSpecialty, zipCode, profileData?.zipCode, dependentZip]);

  const nextProfile = useCallback(() => {
    if (guardRef.current) return;
    guardRef.current = true;
    setTimeout(() => { guardRef.current = false; }, 600);

    analytics.track("Web Tour Step Viewed", { step: profileStep + 2, step_name: PROFILE_STEPS[profileStep]?.title });

    // Clear per-card form state so the next card starts fresh.
    setItemError(null);
    setProviderName("");
    setProviderSpecialty("");
    setProviderMatch(null);
    setProviderMatchAccepted(false);
    setProviderMatchLoading(false);
    setVisitType("");
    setVisitDate("");
    setInsuranceCarrier("");
    setInsuranceCustomName("");
    setVisitCustomOpen(false);
    setFamilyFirstName("");
    setFamilyLastName("");
    setFamilyRelation("");
    setFamilyMode("choose");
    setInviteFeedback(null);
    setSuccessOverlay(null);
    // Safety reset — if an earlier invite attempt left inviteBusy true
    // (e.g. success overlay fired but network timing out), step change
    // frees the UI.
    setInviteBusy(false);

    if (profileStep >= PROFILE_STEPS.length - 1) {
      onProfilePopover(false, undefined, false);
      // Close the mobile sidebar drawer here, not just in finishTour —
      // there's a ~1s window between the last profile step and the end
      // of the chat spotlight where a lingering drawer overlaps the
      // chat surface. User-reported: "side panel is still out" on
      // BOTH web and mobile web, so close on all widths now — not
      // just mobile.
      onSidebar(false);
      setPhase("chat");
      return;
    }
    // Card stays mounted in place — only tab + text content swap
    setProfileStep((s) => s + 1);
  }, [profileStep, onProfilePopover, onSidebar]);

  // Does the user already have ≥1 item of this kind? If yes, we skip the
  // inline add prompt on that card and show the plain description instead.
  const hasExistingData = useCallback(
    (kind: AddKind | null) => {
      // Dev override — see forcePrompts declaration.
      if (forcePrompts) return false;
      if (!kind) return false;
      if (kind === "provider") return doctors.length > 0;
      if (kind === "visit") return careVisits.length > 0;
      // Family is always open for more. Managed-setup users land here
      // with profiles.length === 2 already (main user + the managed
      // profile they just created), and suppressing the add/invite
      // options on that basis was hiding the whole value of the step.
      // Caregivers often have more than one person to add, and the
      // "invite your family" path is relevant regardless of how many
      // profiles they already have.
      if (kind === "family") return false;
      // Treat any medical insurance card as "already has data" so we don't
      // overwrite structured fields the user already captured by uploading.
      if (kind === "insurance") return insuranceCards.some((c) => c.card_type === "medical");
      return false;
    },
    [forcePrompts, doctors.length, careVisits.length, insuranceCards],
  );

  const handleSaveItem = useCallback(
    async (kind: AddKind) => {
      if (savingItem) return;
      setItemError(null);
      setSavingItem(true);
      const tab = PROFILE_STEPS[profileStep]?.tab;
      try {
        if (kind === "provider") {
          const resolvedSpecialty = providerSpecialty === "Other"
            ? providerCustomSpecialty.trim()
            : providerSpecialty;
          // Name + profile are required; specialty is not — saving
          // with just a name is better than silently dropping it.
          // Elena / the user can fill in specialty later via profile
          // edit. If the user tapped "Other" but left the custom
          // input blank, canSave already prevented getting here.
          if (!providerName.trim() || !profileId) {
            throw new Error("Enter a name");
          }
          const bareName = providerName.trim().replace(/^(Dr\.?\s+)/i, "").trim() || providerName.trim();
          // If the user tapped the enrichment card, include the backfilled
          // practice/phone/address so Elena starts with a fully-formed
          // provider record. Otherwise just send what they typed.
          const payload: Record<string, unknown> = {
            name: bareName,
            specialty: resolvedSpecialty || "",
          };
          if (providerMatchAccepted && providerMatch) {
            if (providerMatch.practice) payload.practice_name = providerMatch.practice;
            if (providerMatch.phone) payload.phone = providerMatch.phone;
            if (providerMatch.address) payload.address = providerMatch.address;
          }
          const res = await apiFetch(`/profile/${profileId}/doctors/add`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("Couldn't save. Try again.");
          await refreshDoctors();
          setLastAddedProvider({ name: bareName, specialty: resolvedSpecialty });
          setSuccessOverlay({
            kind: "provider",
            title: "Added to your profile",
            detail: providerMatchAccepted && providerMatch?.practice
              ? `${bareName} · ${providerMatch.practice}`
              : bareName,
          });
        } else if (kind === "visit") {
          const visitDateIso = displayToIsoDate(visitDate);
          if (!visitDateIso) throw new Error("Enter a date");
          const providerContinuity = lastAddedProvider && !visitUseChipMode;
          const resolvedType = providerContinuity
            ? `${lastAddedProvider.specialty} visit`
            : visitType.trim();
          if (!resolvedType) throw new Error("Fill in both fields");
          const res = await apiFetch("/care-visits", {
            method: "POST",
            body: JSON.stringify({
              visit_type: resolvedType,
              visit_date: visitDateIso,
              summary: providerContinuity ? `With ${lastAddedProvider.name}` : "",
            }),
          });
          if (!res.ok) throw new Error("Couldn't save. Try again.");
          await refreshVisits();
          setSuccessOverlay({
            kind: "visit",
            title: "Visit saved",
            detail: providerContinuity ? `With ${lastAddedProvider.name}` : resolvedType,
          });
        } else if (kind === "insurance") {
          if (!insuranceCarrier) throw new Error("Pick a carrier");
          // "Other" means the user typed a custom carrier name — save that
          // rather than the literal string "Other".
          const providerName = insuranceCarrier === "Other"
            ? insuranceCustomName.trim()
            : insuranceCarrier;
          if (!providerName) throw new Error("Enter your insurance carrier");
          const res = await apiFetch(`/insurance/cards/medical`, {
            method: "POST",
            body: JSON.stringify({ structured_data: { provider: providerName } }),
          });
          if (!res.ok) throw new Error("Couldn't save. Try again.");
          await refreshInsurance();
          setSuccessOverlay({
            kind: "insurance",
            title: "Insurance saved",
            detail: providerName,
          });
        } else if (kind === "family") {
          if (!familyFirstName.trim() || !familyLastName.trim()) {
            throw new Error("Enter a first and last name");
          }
          // Backend's ManagedProfileRequest requires both `label` and
          // `relationship`. When the user leaves the dropdown unpicked
          // ("optional" in the UI), default to "other" so the save
          // succeeds. Users can refine the relationship later in chat.
          const relation = familyRelation || "other";
          // POST /profiles creates the new managed profile AND (on the
          // backend) calls set_active_profile to switch to it — which
          // we do NOT want here. The tour is populating data against
          // the profile the user just set up for (themselves or a
          // dependent). Switching to the just-added family member at
          // this step would send the seed message + todos to the wrong
          // profile. Capture the pre-call active profile, then restore
          // it immediately after the POST.
          const previousActiveProfileId = profileId;
          const res = await apiFetch("/profiles", {
            method: "POST",
            body: JSON.stringify({
              first_name: familyFirstName.trim(),
              last_name: familyLastName.trim(),
              label: relation,
              relationship: relation,
            }),
          });
          if (!res.ok) throw new Error("Couldn't save. Try again.");
          // Refresh the profiles list so the new member appears in the
          // sidebar dropdown, then restore the active profile so the
          // tour continues populating data on the original chart.
          //
          // Do NOT compare against `profileId` from this closure. It's the
          // pre-POST value, so the check can incorrectly no-op even after the
          // backend has switched active_profile to the newly created family
          // member. That leaves the tour stuck on an empty just-created chart.
          await refreshProfiles();
          if (previousActiveProfileId) {
            try { await switchProfile(previousActiveProfileId); } catch {}
          }
          setSuccessOverlay({
            kind: "family",
            title: "Family member added",
            detail: `${familyFirstName.trim()} ${familyLastName.trim()}`,
            initial: familyFirstName.trim().charAt(0).toUpperCase(),
          });
        }
        analytics.track("Web Tour Data Added", {
          type: kind,
          tab,
          tour_step: profileStep,
        });
      } catch (e: any) {
        setItemError(e?.message || "Something went wrong");
      } finally {
        setSavingItem(false);
      }
    },
    [savingItem, profileStep, providerName, providerSpecialty, providerCustomSpecialty, providerMatch, providerMatchAccepted, visitType, visitDate, lastAddedProvider, visitUseChipMode, insuranceCarrier, insuranceCustomName, familyFirstName, familyLastName, familyRelation, profileId, refreshDoctors, refreshVisits, refreshProfiles, refreshInsurance, nextProfile],
  );

  const handleSkipItem = useCallback(
    (kind: AddKind) => {
      analytics.track("Web Tour Data Skipped", {
        type: kind,
        tab: PROFILE_STEPS[profileStep]?.tab,
        tour_step: profileStep,
      });
      nextProfile();
    },
    [profileStep, nextProfile],
  );

  // One-click invite: generates a link, fires the native share sheet if the
  // browser supports it, otherwise copies to clipboard. Either way the tour
  // advances after a brief confirmation so the user sees the outcome.
  const handleSendInvite = useCallback(async () => {
    if (inviteBusy) return;
    setInviteBusy(true);
    setInviteFeedback(null);
    setItemError(null);
    analytics.track("Web Tour Data Added", {
      type: "family",
      method: "invite",
      tour_step: profileStep,
      phase: "started",
    });
    // Hard timeout so a hung /family/invite doesn't strand the tour on
    // "Generating link..." indefinitely. 8s is generous — the endpoint
    // normally responds in <1s. AbortController cancels the request;
    // the catch below resets inviteBusy + shows the error.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await apiFetch("/family/invite", {
        method: "POST",
        body: JSON.stringify({ invitee_name: "", relationship: "other" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Couldn't create invite link");
      const data = await res.json();
      const code = data.invite_code;
      const from = profileData?.firstName || "";
      const url = `https://elena-health.com/invite/${code}${from ? `?from=${encodeURIComponent(from)}` : ""}`;
      const shareText = `I'm using Elena to manage health care. Join me here:`;
      let feedback = "Link copied to your clipboard";
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Join me on Elena", text: shareText, url });
          feedback = "Invite sent";
        } catch {
          // User cancelled or share failed — fall through to clipboard so the
          // link isn't lost.
          try { await navigator.clipboard?.writeText(url); } catch {}
        }
      } else {
        try { await navigator.clipboard?.writeText(url); } catch {}
      }
      setInviteFeedback(feedback);
      analytics.track("Web Tour Data Added", {
        type: "family",
        method: "invite",
        tour_step: profileStep,
        phase: "completed",
      });
      setSuccessOverlay({
        kind: "invite",
        title: "Invite link ready",
        detail: feedback,
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      const isAbort = e?.name === "AbortError" || controller.signal.aborted;
      setItemError(isAbort ? "That took too long. Try again or skip for now." : (e?.message || "Something went wrong"));
      setInviteBusy(false);
      return;
    }
    // leave inviteBusy true until the success overlay advances the tour.
  }, [inviteBusy, profileStep, profileData]);

  // Success overlay no longer auto-advances. The user's click-through
  // is explicit throughout the tour — a Continue button renders
  // inside the overlay and calls nextProfile on click. Previously a
  // 1.2–1.9s setTimeout auto-advanced after the overlay animated in,
  // which violated the "click through every step" requirement.


  const finishTour = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    analytics.track("Web Tour Joyride Completed");
    localStorage.setItem("elena_web_tour_done", "true");
    try { sessionStorage.removeItem("elena_tour_in_progress"); } catch {}
    try { localStorage.removeItem("elena_tour_state"); sessionStorage.removeItem("elena_tour_state"); } catch {}
    // Phase 2 handoff: if the user picked actions on elena-plan, build a
    // first-message and stash it in elena_pending_query. The chat page
    // picks this up on mount and auto-sends it as the user's opener so
    // Elena immediately starts on one of the things they asked for.
    // Paywall is intentionally NOT triggered here — chat-area's existing
    // soft-paywall mechanism (triggerSoftPaywall, gated by a localStorage
    // flag) handles gating subsequent value moments. That gives the user
    // at least one real Elena action for free before being asked to pay.
    try {
      const raw = sessionStorage.getItem("elena_tour_seeded_actions");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          actions?: string[];
          branch?: RouterChoice | null;
          conditionName?: string | null;
          managedFirstName?: string | null;
          isDependentSetup?: boolean;
        };
        const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
        // Always build a seed — action-derived when possible, synthesized
        // fallback otherwise. Previously an empty actions array produced
        // no seed and /chat auto-sent the landing-page default ("What
        // can you help me with?"), which wasted the first turn.
        const actionSeed = buildSeedMessageFromActions(actions, {
          routerChoice: parsed.branch ?? null,
          conditionName: parsed.conditionName || "",
        });
        const seedMessage = actionSeed || synthesizeFallbackSeed({
          routerChoice: parsed.branch ?? null,
          conditionName: parsed.conditionName || "",
          managedFirstName: parsed.managedFirstName || "",
          isDependentSetup: !!parsed.isDependentSetup,
        });
        if (seedMessage) {
          // Belt + suspenders: write localStorage AND fire the
          // callback. Callback propagates via parent state → chat
          // area's initialQuery prop for the immediate handoff.
          // localStorage is a safety net — if the callback path
          // silently fails (profile-switch thrash mid-tour, stale
          // closure in parent, page reload during tour), chat-area
          // falls back to reading localStorage when sessionReady
          // flips and no seed has fired. Chat page clears the
          // localStorage key once the seed actually sends.
          try { localStorage.setItem("elena_pending_query", seedMessage); } catch {}
          if (onSeedQuery) {
            onSeedQuery(seedMessage);
          }
          // Post-tour paywall gate: let the seeded first message run
          // end-to-end for free (activation moment), then gate the
          // user's next meaningful send on subscription. chat-area
          // reads this flag in its handleSend to intercept send #2.
          try { sessionStorage.setItem("elena_tour_post_seed_gate", "1"); } catch {}
        }
        analytics.track("Web Tour Seed Query Written", {
          action_count: actions.length,
          synthesized: !actionSeed,
          via: onSeedQuery ? "callback+localStorage" : "localStorage",
        });
        sessionStorage.removeItem("elena_tour_seeded_actions");
      }
    } catch {}
    onProfilePopover(false, undefined, false);
    // Close sidebar on all widths at tour end so the chat surface is
    // unobstructed post-finishTour (web + mobile web).
    onSidebar(false);
    setPhase("done");
    onComplete();
  }, [onComplete, onProfilePopover, onSidebar, onSeedQuery]);

  const skipTour = useCallback(() => {
    analytics.track("Web Tour Skipped", {
      phase,
      surface,
    });
    setShellFading(false);
    finishTour();
  }, [finishTour, phase, surface]);

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

  const advanceFromIntro = useCallback(() => {
    setPhase("care");
  }, []);

  // Whether the user's care selections include anyone besides themselves.
  // Drives whether we surface the setup-for phase (pick ONE person to set
  // up Elena for today) or skip straight to the self-care flow.
  const hasNonSelfCareSelections = careSelections.some((id) => id !== "myself");

  const advanceFromCare = useCallback(() => {
    if (careSelections.length > 0) analytics.track("Web Tour Care Context", { care_for: careSelections });
    // Caregivers managing more than one person get an acknowledgment beat
    // first so they feel seen about the multi-person load. Single-person
    // selections (including myself-only) skip straight to setup-for /
    // router depending on who they picked.
    if (careSelections.length >= 2) {
      setPhase("care-ack");
    } else if (hasNonSelfCareSelections) {
      // Single non-self pick still needs the setup-for decision so the
      // profile gets created + switched before we ask about conditions.
      setPhase("setup-for");
    } else {
      setPhase("router");
    }
  }, [careSelections, hasNonSelfCareSelections]);

  const advanceFromCareAck = useCallback(() => {
    analytics.track("Web Tour Care Ack Continued", { count: careSelections.length });
    if (hasNonSelfCareSelections) {
      setPhase("setup-for");
    } else {
      setPhase("router");
    }
  }, [careSelections.length, hasNonSelfCareSelections]);

  // Setup-for phase → pain. If the user picked "myself", there's no
  // dependent profile to create and we're in the normal for-me flow.
  // If they picked a relationship (mom/partner/child/other), we'll
  // create the linked profile after profile-form and switch to it.
  const advanceFromSetupFor = useCallback(() => {
    if (!setupForCareId) return;
    analytics.track("Web Tour Setup For Selected", {
      care_id: setupForCareId,
      self: setupForCareId === "myself",
      has_name: dependentFirstName.trim().length > 0,
    });
    // Router comes next for everyone — dependents still need to pick
    // whether it's condition / medications / money / staying_healthy
    // for that person. Skipping router was the bug that made the
    // dependent flow bypass situation + meds entirely.
    setPhase("router");
  }, [setupForCareId, dependentFirstName]);

  const advanceFromPain = useCallback(() => {
    analytics.track("Web Tour Pain Step", { bucket: painSelection });
    analytics.track("Web Tour Value Step Shown", { lp_variant: lpVariant || "homepage" });
    setPhase("value");
  }, [painSelection, lpVariant]);

  // Post-profile routing: every branch goes through a "what are we
  // working with?" beat before the Elena plan. staying_healthy keeps
  // that extra context step, but it now asks for the preventive /
  // organizational focus directly instead of pretending the user is
  // naming a condition.
  const routeAfterProfile = useCallback(() => {
    setPhase("situation");
  }, []);

  // Create the dependent profile and switch the active profile to it
  // so all downstream data (conditions/medications/todos) saves to
  // THEIR chart. Fire-and-forget saves for any OTHER people the user
  // selected in the care phase — they appear in the sidebar switcher
  // for future sessions but don't block this one. Returns true on
  // success (switch completed), false on failure.
  const createDependentAndSwitch = useCallback(async (): Promise<boolean> => {
    if (!setupForCareId || setupForCareId === "myself") return true;
    const first = dependentFirstName.trim();
    if (!first) return false;
    setCreatingDependent(true);
    try {
      const relationship = careIdToRelationship(setupForCareId);
      const isoDob = displayToIsoDate(dependentDob);
      const zip = dependentZip.trim();
      // Plan A anonymous path: buffer the dependent instead of POSTing.
      // The flush step (Phase 3) will create the profile, switchProfile
      // to it, and mark it primary post-signup. dependentProfileId stays
      // null during the tour, so any downstream code that gates on it
      // needs to tolerate the null — which it already does (same flow
      // a self-setup user has).
      if (isAnonymousTour) {
        addBufferedDependent({
          first_name: first,
          last_name: dependentLastName.trim(),
          label: relationship,
          relationship,
          ...(isoDob ? { date_of_birth: isoDob } : {}),
          ...(zip ? { zip_code: zip } : {}),
          is_primary_dependent: true,
        });
        // Previously buffered a silent "managed profile" for every
        // OTHER care selection (parent, child, etc.) — producing ghost
        // entries like a profile literally named "Parent" in the
        // switcher. User flagged this as confusing + wrong. Removed:
        // only the profile the user explicitly named in setup-for gets
        // created. Adding more family is done through the profile-
        // walkthrough "family" step instead.
        setDependentProfileId("__buffered__");
        return true;
      }
      // DOB/zip come from the profile-form phase that ran immediately
      // before this call. They're the DEPENDENT's values (the form
      // rebound to dependentDob / dependentZip when isDependentSetup
      // was true). Both are optional — the dependent profile still
      // gets created, user can fill in later via profile edit.
      const res = await apiFetch("/profiles", {
        method: "POST",
        body: JSON.stringify({
          first_name: first,
          last_name: dependentLastName.trim(),
          label: relationship,
          relationship,
          ...(isoDob ? { date_of_birth: isoDob } : {}),
          ...(zip ? { zip_code: zip } : {}),
        }),
      });
      if (!res.ok) {
        console.log("[tour] dependent profile create failed", res.status);
        return false;
      }
      const created = await res.json();
      const newId = created?.id || created?.profile_id;
      if (!newId) {
        console.log("[tour] dependent profile response missing id", created);
        return false;
      }
      setDependentProfileId(newId);
      await refreshProfiles();
      await switchProfile(newId);
      // Previously silent-created linked profiles for every OTHER
      // care selection (parent/child/etc.) — produced ghost entries
      // like a profile literally named "Parent" in the switcher.
      // Removed: users can add more family via the profile-walkthrough
      // "family" step after this.
      return true;
    } finally {
      setCreatingDependent(false);
    }
  }, [setupForCareId, dependentFirstName, dependentLastName, dependentDob, dependentZip, careSelections, refreshProfiles, switchProfile]);

  const advanceFromValue = useCallback(async () => {
    analytics.track("Web Tour Value Step Continued", { lp_variant: lpVariant || "homepage" });
    // Fresh signup without pre-filled profile → collect name first;
    // handleProfileSubmit then routes into the appropriate branch.
    //
    // Plan A anonymous tour: no auth-context session means needsOnboarding
    // is false, but we DEFINITELY still need name (nothing is
    // saved server-side yet — it all rides on the buffer through signup
    // to flushTourBuffer). Force the profile-form phase whenever the
    // tour is anonymous OR we haven't captured name yet.
    const hasName = !!(firstName.trim() || profileData?.firstName);
    if (isAnonymousTour || needsOnboarding || !hasName) {
      setPhase("profile-form");
      return;
    }
    // Profile already set up (quiz funnel, force-tour, etc.).
    // If this session is for a dependent, create+switch their profile
    // first so downstream conditions / meds save to the right chart.
    if (setupForCareId && setupForCareId !== "myself") {
      await createDependentAndSwitch();
    }
    routeAfterProfile();
  }, [lpVariant, needsOnboarding, isAnonymousTour, firstName, dob, zipCode, profileData?.firstName, profileData?.dob, profileData?.zipCode, routeAfterProfile, setupForCareId, createDependentAndSwitch]);

  // Profile-form submit — migrates the OnboardingModal's handleSubmit.
  // completeOnboarding() handles: POST /profile, setProfileId, setProfileData,
  // setNeedsOnboarding(false), setOnboardingJustCompleted(true), and fire-and-forget
  // side effects (/todos/generate, invite accept, ad pixel). All preserved.
  const handleProfileSubmit = useCallback(async () => {
    if (!canSubmitProfile) return;
    setSavingProfile(true);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const setupFor = isDependentSetup ? "dependent" : "self";
    const filledFields = [
      firstName.trim() && "first_name",
      lastName.trim() && "last_name",
    ].filter(Boolean) as string[];
    trackWebFunnelProfileFormSubmitted({
      source: "tour",
      setup_for: setupFor,
      is_anonymous_tour: isAnonymousTour,
      fields_filled: filledFields,
    });
    if (isDependentSetup) {
      // Dependent setup — the form captured DEPENDENT's data. The
      // primary user's profile still needs to exist and have
      // onboarding_completed flipped (authed path), OR the primary's
      // name gets captured in the buffer for post-signup flush (anon
      // path). Then we create/buffer the dependent with the full set
      // of captured fields and switch active to them.
      if (isAnonymousTour) {
        // Primary name might be empty (we don't collect it in dependent
        // setup — OAuth name isn't available until post-signup). Buffer
        // what we have; flush step will merge in the OAuth name.
        setBufferedProfile({
          first_name: firstName.trim() || "",
          last_name: lastName.trim() || "",
        });
      } else {
        await completeOnboarding({
          first_name: profileData?.firstName || firstName.trim() || "",
          last_name: profileData?.lastName || lastName.trim() || "",
        });
        analytics.track("Onboarding Completed", {
          fields_filled: ["first_name", "last_name"],
          source: "tour",
          setup_for: "dependent",
        });
        trackWebFunnelOnboardingCompleted({
          source: "tour",
          setup_for: "dependent",
          fields_filled: ["first_name", "last_name"],
        });
      }
      await createDependentAndSwitch();
    } else {
      // Self setup — the form captured the PRIMARY user's data.
      if (isAnonymousTour) {
        setBufferedProfile({
          first_name: cap(firstName.trim()),
          last_name: cap(lastName.trim()),
        });
      } else {
        await completeOnboarding({
          first_name: cap(firstName.trim()),
          last_name: cap(lastName.trim()),
        });
        analytics.track("Onboarding Completed", {
          fields_filled: filledFields,
          source: "tour",
          setup_for: "self",
        });
        trackWebFunnelOnboardingCompleted({
          source: "tour",
          setup_for: "self",
          fields_filled: filledFields,
        });
      }
    }
    setSavingProfile(false);
    routeAfterProfile();
  }, [canSubmitProfile, firstName, lastName, isDependentSetup, isAnonymousTour, profileData?.firstName, profileData?.lastName, completeOnboarding, routeAfterProfile, createDependentAndSwitch]);

  // Fire "Onboarding Modal Shown" analytics when the profile-form phase opens,
  // preserving data continuity with the prior OnboardingModal. (Event name kept
  // the same on purpose — so dashboards keep working.)
  useEffect(() => {
    if (phase !== "profile-form") return;
    analytics.track("Onboarding Modal Shown", { source: "tour" });
    trackWebFunnelProfileFormViewed({
      source: "tour",
      setup_for: isDependentSetup ? "dependent" : "self",
      is_anonymous_tour: isAnonymousTour,
    });
  }, [phase, isDependentSetup, isAnonymousTour]);

  // Router → pain. The router's 5 buckets also drive the pain variant:
  // money-centric picks (money, medications) show the dollars-over-decade
  // variant; others show the hours-per-year variant. Branching into the
  // condition block (situation vs elena-plan) happens later, via
  // routeAfterProfile, after value + profile-form.
  const advanceFromRouter = useCallback(() => {
    if (!routerChoice) return;
    analytics.track("Web Tour Router Selected", { choice: routerChoice });
    setPhase("pain");
  }, [routerChoice]);

  const advanceFromSituation = useCallback(() => {
    const stayingHealthy = routerChoice === "staying_healthy";
    const chip = getChip(selectedSituation);
    const tpl = inferredSituationTemplate;
    analytics.track("Web Tour Situation Selected", {
      situation: selectedSituation,
      source: stayingHealthy
        ? (selectedSituation === "other" ? "chips_freeform" : "chips")
        : chip
        ? (chip.conditionName ? "chips" : "chips_freeform")
        : "alias",
      custom_text: customSituation.trim() || undefined,
      branch: routerChoice,
    });
    if (stayingHealthy) {
      setPhase("elena-plan");
      return;
    }
    // Condition, medications, and money branches all collect meds next.
    // Money also goes through meds so Elena can price-shop the user's
    // specific prescriptions, not just speak in generalities.
    if (tpl) {
      setPhase("meds");
      return;
    }
    // Freeform non-template (user picked "Something else" and typed a
    // need that didn't match any alias). If it looks like a health
    // issue, ask meds first so we can offer prescription/refill help.
    // If it looks like an admin task, skip meds and go straight to
    // concrete task-oriented Elena actions.
    if (routerChoice === "medications" || routerChoice === "money") {
      setPhase("meds");
    } else {
      setPhase(isHealthFreeformNeed(customSituation) ? "meds" : "elena-plan");
    }
  }, [customSituation, inferredSituationTemplate, routerChoice, selectedSituation]);

  // User tapped the alias-match suggestion card under the "Something else"
  // input. Swap selectedSituation to the matched template key so the rest
  // of the condition block uses that template's content.
  const acceptSituationSuggestion = useCallback((templateKey: string) => {
    setSelectedSituation(templateKey);
    setSelectedMeds([]);
    setCustomMeds([]);
    setCheckedPlanItems([]);
    analytics.track("Web Tour Situation Selected", {
      situation: templateKey,
      source: "alias",
      custom_text: customSituation.trim(),
      branch: routerChoice,
    });
    setPhase("meds");
  }, [customSituation, routerChoice]);

  const advanceFromMeds = useCallback(() => {
    const tpl = inferredSituationTemplate;
    const pendingDraft = newMedDraft.trim();
    const mergedCustomMeds = pendingDraft
      ? normalizeMedicationList(customMeds, [pendingDraft])
      : normalizeMedicationList(customMeds);
    const allMeds = normalizeMedicationList(selectedMeds, mergedCustomMeds);
    if (pendingDraft || mergedCustomMeds.length !== customMeds.length) {
      setCustomMeds(mergedCustomMeds);
      setNewMedDraft("");
    }
    analytics.track("Web Tour Meds Selected", {
      situation: selectedSituation,
      count: allMeds.length,
      custom_count: mergedCustomMeds.length,
      branch: routerChoice,
    });
    // Medications and money branches skip the care-plan review +
    // validation beat and go straight to the elena-plan pitch.
    // Only the condition branch does the full care-plan + validation.
    if (routerChoice === "medications" || routerChoice === "money") {
      setPhase("elena-plan");
    } else if (!tpl) {
      setPhase("elena-plan");
    } else {
      setPhase("care-plan");
    }
  }, [selectedSituation, selectedMeds, customMeds, newMedDraft, routerChoice, inferredSituationTemplate]);

  const advanceFromCarePlan = useCallback(() => {
    const tpl = inferredSituationTemplate;
    const total = tpl?.planItems.length ?? 0;
    analytics.track("Web Tour Care Plan Reviewed", {
      situation: selectedSituation,
      checked_count: checkedPlanItems.length,
      total_items: total,
    });
    setPhase("validation");
  }, [selectedSituation, checkedPlanItems.length, inferredSituationTemplate]);

  // Validation is now a pure display beat. Writes were moved to
  // advanceFromElenaPlan so every branch saves in one place and the
  // "Setting up..." spinner lands on the CTA the user is actually
  // looking at ("Let's get set up").
  const advanceFromValidation = useCallback(() => {
    setPhase("elena-plan");
  }, []);

  // Final writeback across all branches. Failures are logged but do not
  // block the tour — the user still lands on joyride. Anything we couldn't
  // save here can be re-captured via chat or the profile popover later.
  const advanceFromElenaPlan = useCallback(async () => {
    if (savingSituation) return;
    if (advanceFromElenaPlanRef.current) return;
    advanceFromElenaPlanRef.current = true;
    const trimmedCustom = customActionText.trim();
    const seededActions = [
      ...confirmedActions,
      ...(trimmedCustom.length >= 3 ? [trimmedCustom] : []),
    ];
    analytics.track("Web Tour Elena Plan Continued", {
      situation: selectedSituation,
      branch: routerChoice,
      confirmed_count: confirmedActions.length,
      has_custom: trimmedCustom.length >= 3,
    });
    // Stash actions + context for finishTour to build the seed from.
    // We ALWAYS write this — even when actions is empty — so the
    // fallback synthesizer has the context it needs (routerChoice +
    // condition name + dependent name) to produce a goal-oriented
    // seed instead of letting the landing page's generic "what can
    // you help me with" seed reach /chat.
    const situationChip = getChip(selectedSituation);
    const situationTpl = inferredSituationTemplate;
    const resolvedConditionName =
      situationChip?.conditionName || customSituation.trim() || situationTpl?.conditionName || "";
    try {
      sessionStorage.setItem("elena_tour_seeded_actions", JSON.stringify({
        actions: seededActions,
        branch: routerChoice,
        situation: selectedSituation,
        conditionName: resolvedConditionName || null,
        managedFirstName: isDependentSetup ? (managedFirstName || null) : null,
        isDependentSetup,
        created_at: new Date().toISOString(),
      }));
    } catch {}
    // Plan A anonymous path: build the seed message, stash it in the
    // tour buffer, and hand control to the /onboard page so it can open
    // AuthModal. After signup the page calls flushTourBuffer() which
    // replays all the tour writes against the authed session — no need
    // to perform any of the API work here. advanceFromElenaPlanRef is
    // cleared so if AuthModal is cancelled and the user clicks Continue
    // again, the handler re-fires.
    if (isAnonymousTour) {
      advanceFromElenaPlanRef.current = false;
      // Parity with the authed write block below: derive the condition,
      // meds, care-plan template todos, and action todos from tour state
      // and buffer them. flushTourBuffer replays these POSTs post-signup
      // so the health profile + game plan land populated, same as the
      // authed flow.
      //
      // Then transition to phase="auth" — inline auth UI rendered in
      // the same tour shell, not a foreign modal. onNeedsAuth still
      // fires so /onboard can prime its flush-on-session-appear ref,
      // but the visual continuity is owned by the tour itself.
      const chip = getChip(selectedSituation);
      const tpl = inferredSituationTemplate;
      const conditionName = chip?.conditionName || customSituation.trim();
      const collectedCondition = routerChoice === "condition" || routerChoice === "medications" || routerChoice === "money";
      const medIndication = tpl?.conditionName || conditionName || undefined;
      if (collectedCondition && conditionName) {
        addBufferedCondition({ name: conditionName, status: "active" });
      }
      if (routerChoice === "condition" || routerChoice === "medications" || routerChoice === "money") {
        const allMeds = normalizeMedicationList(
          selectedMeds,
          customMeds,
          newMedDraft.trim() ? [newMedDraft] : undefined,
        );
        for (const name of allMeds) {
          addBufferedMedication({ name, indication: medIndication });
        }
      }
      // Todo dedup — mirrors the authed path's seenTitles set. Lowercase,
      // strip punctuation so "Schedule A1C check" and "Schedule A1C check."
      // collapse into one.
      const seenTodoTitles = new Set<string>();
      const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const pushTodo = (spec: { title: string; subtitle?: string; book_message: string }) => {
        const key = normTitle(spec.title);
        if (!key || seenTodoTitles.has(key)) return;
        seenTodoTitles.add(key);
        addBufferedTodo({ ...spec, category: "care_plan" });
      };
      // Care-plan template items should survive across every branch that
      // collected condition context, not just the full condition flow.
      if (tpl && collectedCondition) {
        const remaining = tpl.planItems.filter((it) => !checkedPlanItems.includes(it.id));
        for (const it of remaining) {
          pushTodo({
            title: it.todoText,
            subtitle: tpl.conditionName,
            book_message: `Help me ${it.todoText.charAt(0).toLowerCase() + it.todoText.slice(1)}`,
          });
        }
      }
      const pricingNeedTodo = buildPricingTodoFromNeed(customSituation);
      if (pricingNeedTodo && collectedCondition) {
        pushTodo({
          title: pricingNeedTodo.title,
          ...(tpl?.conditionName ? { subtitle: tpl.conditionName } : {}),
          book_message: pricingNeedTodo.book_message,
        });
      }
      // User-selected action todos (every branch).
      if (seededActions.length > 0) {
        const actionSubtitle =
          (routerChoice === "condition" || routerChoice === "medications" || routerChoice === "money")
            ? (tpl?.conditionName || customSituation.trim() || undefined)
            : undefined;
        for (const raw of seededActions) {
          const todo = buildTodoFromAction(raw, {
            routerChoice,
            conditionName: tpl?.conditionName || customSituation.trim() || undefined,
          });
          if (!todo) continue;
          pushTodo({
            title: todo.title,
            ...(actionSubtitle ? { subtitle: actionSubtitle } : {}),
            book_message: todo.book_message,
          });
        }
      }
      if (seenTodoTitles.size <= 1) {
        for (const todo of buildProfileSetupTopUpTodos({
          managedFirstName,
          isDependentSetup,
        })) {
          pushTodo({
            title: todo.title,
            book_message: todo.book_message,
          });
        }
      }
      // Always produce a non-empty seed: prefer the user's picked
      // actions, fall back to a synthesized goal-oriented opener
      // derived from router + condition + dependent context. Without
      // the fallback, users who skipped action selection landed in
      // /chat with a generic "what can you help me with" from the
      // landing page, which defeats the whole tour.
      const actionSeed = buildSeedMessageFromActions(seededActions, {
        routerChoice,
        conditionName: resolvedConditionName,
      });
      const seedMessage = actionSeed || synthesizeFallbackSeed({
        routerChoice,
        conditionName: resolvedConditionName,
        managedFirstName,
        isDependentSetup,
      });
      try {
        const { setBufferedSeedQuery } = await import("@/lib/tourBuffer");
        setBufferedSeedQuery(seedMessage);
      } catch {}
      if (onNeedsAuth) {
        onNeedsAuth(seedMessage);
      }
      // Advance the tour to the social-proof step. This sits between
      // elena-plan and auth as a credibility nudge ("people like you
      // get these results") right before we ask for signup. onNeedsAuth
      // has already armed /onboard's flush-on-session ref so the later
      // auth → flush hand-off is ready.
      setPhase("social-proof");
      return;
    }
    setSavingSituation(true);
    const chip = getChip(selectedSituation);
    const tpl = inferredSituationTemplate;
    const conditionName = chip?.conditionName || customSituation.trim();
    const medIndication = tpl?.conditionName || conditionName || undefined;
    // Branches that collected a condition (condition / medications / money)
    // save it. Staying-healthy didn't collect one.
    const collectedCondition = routerChoice === "condition" || routerChoice === "medications" || routerChoice === "money";
    try {
      if (profileId && collectedCondition && conditionName) {
        await apiFetch(`/profile/${profileId}/conditions/add`, {
          method: "POST",
          body: JSON.stringify({ name: conditionName, status: "active" }),
        }).catch((e) => console.log("[tour] condition save failed", e));
      }
      // Meds: condition, medications, and money branches all collect
      // them. Only staying_healthy skipped this step.
      if (profileId && (routerChoice === "condition" || routerChoice === "medications" || routerChoice === "money")) {
        const allMeds = normalizeMedicationList(
          selectedMeds,
          customMeds,
          newMedDraft.trim() ? [newMedDraft] : undefined,
        );
        await Promise.all(
          allMeds.map((name) =>
            apiFetch(`/profile/${profileId}/medications/add`, {
              method: "POST",
              body: JSON.stringify({ name, indication: medIndication }),
            }).catch((e) => console.log("[tour] med save failed", name, e)),
          ),
        );
      }
      // Unified todo creation — care-plan template items (condition
      // branch) AND user-picked action todos all funnel into the same
      // batch with title-based dedup. Without this merge, a user who
      // picked "I can schedule your A1C check" would get one todo from
      // the action loop and another from the template plan-items loop
      // for the same intent — same day, same card, two near-identical
      // rows. Dedup key is normalized title (lowercased, trimmed, no
      // punctuation) so "Schedule A1C check" and "Schedule A1C check."
      // collapse into one.
      type TodoSpec = { title: string; subtitle?: string; book_message: string };
      const todoSpecs: TodoSpec[] = [];
      const seenTitles = new Set<string>();
      const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const push = (spec: TodoSpec) => {
        const key = normTitle(spec.title);
        if (!key || seenTitles.has(key)) return;
        seenTitles.add(key);
        todoSpecs.push(spec);
      };

      // Care-plan template items should survive across every branch that
      // collected condition context, not just the full condition flow.
      if (profileId && tpl && collectedCondition) {
        const remaining = tpl.planItems.filter((it) => !checkedPlanItems.includes(it.id));
        for (const it of remaining) {
          push({
            title: it.todoText,
            subtitle: tpl.conditionName,
            book_message: `Help me ${it.todoText.charAt(0).toLowerCase() + it.todoText.slice(1)}`,
          });
        }
      }
      const pricingNeedTodo = buildPricingTodoFromNeed(customSituation);
      if (profileId && pricingNeedTodo && collectedCondition) {
        push({
          title: pricingNeedTodo.title,
          ...(tpl?.conditionName ? { subtitle: tpl.conditionName } : {}),
          book_message: pricingNeedTodo.book_message,
        });
      }

      // Action todos — every chip the user picked + any custom-typed
      // action becomes a standalone game-plan item. Runs for every
      // branch since action picking is universal.
      //
      // Caregiver-branch expansion: generic "for everyone you care
      // for" / "for each person" hero lines aren't actionable as a
      // single todo. We fan them out into per-dependent tactical
      // todos ("Book Linda's next visit", "Book Vedaant's next
      // visit"). Abstract lines ("Keep it all straight") are dropped
      // — they live in the chat seed as framing, not on the game plan.
      if (profileId && seededActions.length > 0) {
        const actionSubtitle =
          (routerChoice === "condition" || routerChoice === "medications" || routerChoice === "money")
            ? (tpl?.conditionName || customSituation.trim() || undefined)
            : undefined;
        for (const raw of seededActions) {
          const todo = buildTodoFromAction(raw, {
            routerChoice,
            conditionName: tpl?.conditionName || customSituation.trim() || undefined,
          });
          if (!todo) continue;
          push({
            title: todo.title,
            ...(actionSubtitle ? { subtitle: actionSubtitle } : {}),
            book_message: todo.book_message,
          });
        }
      }
      if (todoSpecs.length <= 1) {
        for (const todo of buildProfileSetupTopUpTodos({
          managedFirstName,
          isDependentSetup,
        })) {
          push({
            title: todo.title,
            book_message: todo.book_message,
          });
        }
      }

      if (profileId && todoSpecs.length > 0) {
        await Promise.all(
          todoSpecs.map((spec) =>
            apiFetch("/todos", {
              method: "POST",
              body: JSON.stringify({
                title: spec.title,
                ...(spec.subtitle ? { subtitle: spec.subtitle } : {}),
                category: "care_plan",
                book_message: spec.book_message,
              }),
            }).catch((e) => console.log("[tour] action todo save failed", e)),
          ),
        );
      }
    } finally {
      setSavingSituation(false);
      leaveShellThen(beginJoyride);
    }
  }, [savingSituation, isAnonymousTour, onNeedsAuth, selectedSituation, customSituation, selectedMeds, customMeds, newMedDraft, checkedPlanItems, profileId, routerChoice, confirmedActions, customActionText, beginJoyride, leaveShellThen, inferredSituationTemplate]);

  // Fire the validation-shown event once when the phase enters (it's the
  // "wow" beat, so we track regardless of what the user does next).
  useEffect(() => {
    if (phase !== "validation") return;
    const tpl = inferredSituationTemplate;
    analytics.track("Web Tour Validation Shown", {
      situation: selectedSituation,
      done_count: checkedPlanItems.length,
      remaining_count: tpl ? tpl.planItems.length - checkedPlanItems.length : 0,
    });
  }, [phase, selectedSituation, checkedPlanItems.length, inferredSituationTemplate]);

  useEffect(() => {
    if (phase !== "setup-for") return;
    analytics.track("Web Tour Setup For Shown", {
      selection_count: careSelections.filter((id) => id !== "myself").length,
    });
  }, [phase, careSelections]);

  useEffect(() => {
    if (phase !== "elena-plan") return;
    analytics.track("Web Tour Elena Plan Shown", {
      situation: selectedSituation,
      med_count: normalizeMedicationList(
        selectedMeds,
        customMeds,
        newMedDraft.trim() ? [newMedDraft] : undefined,
      ).length,
    });
  }, [phase, selectedSituation, selectedMeds, customMeds, newMedDraft]);

  useEffect(() => {
    if (phase !== "care-ack") return;
    analytics.track("Web Tour Care Ack Shown", { count: careSelections.length });
  }, [phase, careSelections.length]);

  useEffect(() => {
    if (phase !== "auth") return;
    analytics.track("Onboard Auth Step Viewed", {
      surface,
      mode: authMode,
    });
    trackWebFunnelAuthEntry({
      surface: "tour_inline",
      intent: authMode,
    });
  }, [phase, surface, authMode]);

  if (!mounted || phase === "done") return null;

  // ── Phases care + goals + pain + value share one backdrop + card shell.
  //    The shell itself fades in on mount and fades out when we head to the
  //    joyride spotlight. Inside, AnimatePresence crossfades the content
  //    between phases, and the card's max-width animates so the transition
  //    feels like one continuous container morphing rather than separate
  //    modals. ──
  if (phase === "intro" || phase === "care" || phase === "care-ack" || phase === "setup-for" || phase === "router" || phase === "pain" || phase === "value" || phase === "profile-form" || phase === "situation" || phase === "meds" || phase === "care-plan" || phase === "validation" || phase === "elena-plan" || phase === "social-proof" || phase === "auth" || phase === "flushing") {
    const motionEase = [0.4, 0, 0.2, 1] as const;
    const cardMaxWidth = phase === "value" ? 512 : 448;
    return createPortal(
      <motion.div
        className="fixed inset-0 z-[99999] flex items-center justify-center font-[family-name:var(--font-inter)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: shellFading ? 0 : 1 }}
        transition={{ duration: 0.25, ease: motionEase }}
      >
        <div className="absolute inset-0 bg-black/35 backdrop-blur-md" />
        <motion.div
          layout
          transition={{ layout: { duration: 0.35, ease: motionEase } }}
          className="relative z-10 w-[calc(100%-3rem)] max-h-[95vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,27,61,0.15)]"
          style={{ maxWidth: cardMaxWidth }}
        >
          {/* No `initial={false}` — that would suppress the first slide's
              StreamingText "hidden" variant on mount, making the care
              headline render fully visible instead of streaming in. */}
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
              >
                {/* flex-1 wrapper keeps the headline block vertically centered
                    in the card while the Continue button snaps to the bottom,
                    matching the layout of the other shell phases. */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <motion.div className="text-center">
                    {/* Wave animation: scale in, then shake. Same style we had
                        on the old profile-form "Hey I'm Elena" step. */}
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
                      <StreamingText text="Hey, I'm Elena" startDelay={0.6} onDone={() => setHeadlineDone(true)} />
                    </h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: headlineDone ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: motionEase, delay: 0.1 }}
                      className="text-[14px] text-[#8E8E93] font-light"
                      onAnimationComplete={() => { if (headlineDone) setSubtitleDone(true); }}
                    >
                      I&apos;m your health care assistant.
                    </motion.p>
                  </motion.div>
                </div>
                <RevealButton visible={subtitleDone} delay={0.15}>
                  <GradientButton onClick={advanceFromIntro} label="Continue" />
                </RevealButton>
              </motion.div>
            )}

            {phase === "care" && (
              <motion.div
                key="care"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
              >
                <div className="flex-1 flex flex-col justify-center gap-4">
                  <div className="text-center">
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
                  </div>
                  {headlineDone && (
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
                  )}
                </div>
                <RevealButton visible={headlineDone} delay={0.1 + CARE_OPTIONS.length * 0.07}>
                  <GradientButton onClick={advanceFromCare} label="Continue" />
                </RevealButton>
              </motion.div>
            )}

            {phase === "care-ack" && (() => {
              // Reflect the user's actual selections as icons so the
              // acknowledgment feels earned, not generic. Only the ids
              // they picked render; order follows CARE_OPTIONS so it
              // reads consistently across users.
              const picked = CARE_OPTIONS.filter((o) => careSelections.includes(o.id));
              return (
                <motion.div
                  key="care-ack"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
                >
                  {/* Button is rendered unconditionally (visibility is toggled
                      via RevealButton) so the card layout stays stable and the
                      CTA stays pinned to the bottom throughout the headline
                      stream, matching the intro / care / goals phases. */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <motion.div className="text-center">
                      <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                        <StreamingText text="That's a lot on your plate. I've got you." onDone={() => setHeadlineDone(true)} />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.35, ease: motionEase, delay: 0.1 }}
                        className="text-[14px] text-[#8E8E93] font-light text-balance"
                      >
                        You&apos;ll set up a profile for each person. Same Elena, all in one place. We&apos;ll get there in a minute.
                      </motion.p>
                    </motion.div>
                    {/* 2-row layout: profile switcher + booked call side
                        by side up top (the "many people, handled" beat),
                        compact meds row underneath (the "refills too"
                        beat). More visual weight on the caregiver story
                        without the vertical bloat of three full tiles. */}
                    <div className="flex flex-col gap-2 w-full max-w-[340px]">
                      <div className="grid grid-cols-2 gap-2">
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={headlineDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
                        >
                          <FamilyMini count={Math.max(2, Math.min(picked.length + 1, 4))} />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={headlineDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.34 }}
                          className="flex items-center"
                        >
                          <BookingMini />
                        </motion.div>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={headlineDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.48 }}
                      >
                        <MedsMini rows={2} />
                      </motion.div>
                    </div>
                  </div>
                  <RevealButton visible={headlineDone} delay={0.8}>
                    <GradientButton onClick={advanceFromCareAck} label="Continue" />
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "setup-for" && (() => {
              // Who is THIS session for? Show myself + every non-self
              // care selection as cards, single-select. Picking a
              // relationship exposes inline name inputs whose capture
              // creates the linked profile (and switches to it) after
              // profile-form. Picking myself skips all of that.
              const options: { id: string; label: string; icon: typeof User }[] = [
                { id: "myself", label: "Me", icon: User },
                ...careSelections
                  .filter((id) => id !== "myself")
                  .map((id) => {
                    const opt = CARE_OPTIONS.find((o) => o.id === id);
                    return opt ? { id: opt.id, label: opt.label, icon: opt.icon } : null;
                  })
                  .filter((x): x is { id: string; label: string; icon: typeof User } => x !== null),
              ];
              const pickedOther = setupForCareId && setupForCareId !== "myself";
              // Require BOTH first + last name for managed-profile setup.
              // Previously only first was required here; last name became
              // required later at profile-form, so users who skipped last
              // name here hit a silent "Continue disabled" on profile-form
              // without understanding why. Gating both up-front avoids
              // that dead end.
              const canContinue =
                !creatingDependent &&
                !!setupForCareId &&
                (setupForCareId === "myself" || (
                  dependentFirstName.trim().length > 0
                  && dependentLastName.trim().length > 0
                ));
              const dependentLabel = pickedOther
                ? careIdToNounLabel(setupForCareId as string)
                : "";
              return (
                <motion.div
                  key="setup-for"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 max-md:p-4 flex flex-col gap-4 max-md:gap-2.5 min-h-[380px] sm:min-h-[440px] max-md:min-h-0"
                >
                  <div className="flex-1 flex flex-col justify-center gap-4 max-md:gap-2.5">
                    <div className="text-center">
                      <h2 className="text-[22px] max-md:text-[19px] font-extrabold text-[#0F1B3D] mb-2 max-md:mb-1 text-balance leading-tight">
                        <StreamingText
                          text="Who do you want to set Elena up for first?"
                          onDone={() => setHeadlineDone(true)}
                        />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] max-md:text-[12.5px] text-[#8E8E93] font-light text-balance"
                      >
                        We can add the others later.
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <RevealStack visible className="flex flex-col gap-2 max-md:gap-1.5">
                        {options.map((opt) => (
                          <SelectablePill
                            key={opt.id}
                            icon={opt.icon}
                            label={opt.label}
                            selected={setupForCareId === opt.id}
                            onClick={() => setSetupForCareId(opt.id)}
                          />
                        ))}
                      </RevealStack>
                    )}
                    {headlineDone && pickedOther && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="flex flex-col gap-1.5"
                      >
                        <label className="text-[12px] max-md:text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">
                          Your {dependentLabel}
                        </label>
                        {/* Grid instead of flex so the inputs split 50/50
                            regardless of their intrinsic widths — flex-1
                            wasn't shrinking below the input's default size,
                            so the right edge of "Last name" was clipping
                            past the modal. `w-full min-w-0` on each input
                            lets the grid cell fully control width. */}
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <input
                            type="text"
                            value={dependentFirstName}
                            onChange={(e) => setDependentFirstName(capitalizeName(e.target.value))}
                            placeholder="First name"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="words"
                            className="w-full min-w-0 rounded-xl border border-[#0F1B3D]/[0.08] bg-white px-3 py-2.5 max-md:py-2 text-base max-md:text-[15px] text-[#0F1B3D] placeholder:text-[#8E8E93] outline-none focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5] transition-colors"
                          />
                          <input
                            type="text"
                            value={dependentLastName}
                            onChange={(e) => setDependentLastName(capitalizeName(e.target.value))}
                            placeholder="Last name"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="words"
                            className="w-full min-w-0 rounded-xl border border-[#0F1B3D]/[0.08] bg-white px-3 py-2.5 max-md:py-2 text-base max-md:text-[15px] text-[#0F1B3D] placeholder:text-[#8E8E93] outline-none focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5] transition-colors"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1 + options.length * 0.07}>
                    <button
                      onClick={advanceFromSetupFor}
                      disabled={!canContinue}
                      className="w-full py-3.5 max-md:py-2.5 rounded-full text-white font-semibold font-sans text-[15px] max-md:text-[14px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                    >
                      {creatingDependent ? "Setting up..." : "Continue"}
                    </button>
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "pain" && (() => {
              // Variant derived from the router pick: money-centric
              // intents (money, medications) show the dollars-over-decade
              // panic; everything else shows the hours-per-year panic.
              //
              // Dependent setups reframe the question around the dependent
              // ("How much do you spend on Linda's healthcare each year?")
              // since the caregiver is the one answering but the spending
              // is for the dependent. Makes the number they're giving you
              // feel less like a self-audit and more like a care-load
              // reality check.
              const isMoney = routerChoice === "money" || routerChoice === "medications";
              const options = isMoney ? MONEY_PAIN_OPTIONS : TIME_PAIN_OPTIONS;
              const possessive = isDependentSetup && managedFirstName
                ? `${managedFirstName}'s `
                : "";
              // For dependent setups, drop the "you spend" framing because
              // the caregiver may not be the payer — it could be the
              // dependent themselves, a spouse, Medicare, etc. "How much
              // goes toward Linda's healthcare" keeps the question
              // answerable without assuming who's paying. Time framing
              // stays "do you spend" since the caregiver IS the one
              // spending time coordinating care even when they aren't
              // footing the bill.
              const headline = isMoney
                ? (isDependentSetup && managedFirstName
                    ? `How much goes toward ${managedFirstName}'s healthcare out-of-pocket each year?`
                    : `How much do you spend on healthcare out-of-pocket each year?`)
                : `How much time do you spend on ${possessive || ""}healthcare each week?`;
              const bucketIcon = isMoney ? DollarSign : Clock;
              const selected = options.find((o) => o.id === painSelection) || null;
              return (
                <motion.div
                  key="pain"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 flex flex-col gap-4 min-h-[340px] sm:min-h-[440px]"
                >
                  <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-4">
                    <div className="text-center">
                      <h2 className="text-[18px] sm:text-[22px] font-extrabold text-[#0F1B3D] text-balance leading-tight">
                        <StreamingText text={headline} onDone={() => setHeadlineDone(true)} />
                      </h2>
                    </div>
                    {headlineDone && (
                      <>
                        <RevealStack visible className="flex flex-col gap-1.5 sm:gap-2.5">
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
                      </>
                    )}
                  </div>
                  <RevealButton visible={!!selected} delay={1.2}>
                    <GradientButton onClick={advanceFromPain} label="Continue" />
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "value" && (() => {
              // Branch-adaptive value headline + subtitle so the relief
              // beat names the user's actual pain (the condition / meds /
              // money / caregiving / preventive angle they just told us
              // about in the router + pain steps) instead of the generic
              // "We've got your back." Generic copy stays as the fallback
              // for edge cases where routerChoice is null.
              // Reframe the headlines when the caregiver is setting up
              // for someone else — the prescriptions / coverage / screenings
              // belong to the dependent, not the caregiver. The subtitles
              // stay in "I'll..." voice since Elena is speaking to the
              // caregiver about what she'll do for them.
              const depName = isDependentSetup && managedFirstName ? managedFirstName : "";
              // Pain-bucket-aware copy wins when set: echoes the number
              // the user just named ("You said 3 to 6 hours a week.")
              // so the relief beat reads as targeted instead of generic.
              // Falls back to routerChoice-keyed copy when no pain
              // bucket was captured (staying_healthy branch, etc.).
              const painValueCopy: Record<string, { headline: string; subtitle: string }> = {
                // Time buckets
                lt1:    { headline: "Let's start winning that time back.", subtitle: "You said under an hour a week. Small, but I'll still claw it back for you." },
                "1to3": { headline: "Let's start winning those hours back.", subtitle: "You said 1 to 3 hours a week. I'll handle the refills, the calls, and the follow-ups." },
                "3to6": { headline: "Let's start winning those hours back.", subtitle: "You said 3 to 6 hours a week. I'll handle the refills, the calls, and the coordination." },
                "6plus":{ headline: "Let's give you your weeks back.", subtitle: "You said 6 or more hours a week. I'll claw big chunks of that back, one call at a time." },
                // Money buckets
                lt500:    { headline: "Let's protect every dollar.", subtitle: "You said under $500 a year. I'll still catch the surprise charges before they hit." },
                "500to2k":{ headline: "Let's start bringing those costs down.", subtitle: "You said $500 to $2,000 a year. I'll fight the bills, price-shop the care, and appeal what I can." },
                "2kto5k": { headline: "Let's start bringing those costs down.", subtitle: "You said $2,000 to $5,000 a year. I'll fight the bills, price-shop the care, and appeal what I can." },
                "5kplus": { headline: "Let's start clawing that money back.", subtitle: "You said $5,000 or more a year. I'll fight the bills, price-shop the care, and appeal what I can." },
              };
              const valueCopy: Record<RouterChoice, { headline: string; subtitle: string }> = {
                condition: {
                  headline: depName ? `You shouldn't carry ${depName}'s care alone.` : "You shouldn't carry this alone.",
                  subtitle: "I'll stay on top of the appointments, meds, and coverage with you.",
                },
                medications: {
                  headline: depName ? `${depName}'s prescriptions, handled.` : "Your prescriptions, handled.",
                  subtitle: "I'll keep the refills, price-shopping, and interactions straight.",
                },
                money: {
                  headline: "Let's bring those costs down.",
                  subtitle: "I'll fight for every dollar on price checks, bills, and appeals.",
                },
                staying_healthy: {
                  headline: "Stay ahead of it, not behind it.",
                  subtitle: depName
                    ? `I'll keep ${depName} current on checkups, screenings, and reminders.`
                    : "I'll keep you current on checkups, screenings, and reminders.",
                },
              };
              const copy = (painSelection && painValueCopy[painSelection])
                || (routerChoice ? valueCopy[routerChoice] : { headline: "We've got your back.", subtitle: "From bookings to bills, I'm on it." });
              return (
              <motion.div
                key="value"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-5 sm:p-6 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
              >
                <div className="flex-1 flex flex-col justify-center gap-4">
                  <div className="text-center">
                    <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                      <StreamingText text={copy.headline} onDone={() => setHeadlineDone(true)} />
                    </h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: headlineDone ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: motionEase, delay: 0.1 }}
                      className="text-[14px] text-[#8E8E93] font-light text-balance"
                    >
                      {copy.subtitle}
                    </motion.p>
                  </div>
                  {subtitleDone && <BenefitTiles routerChoice={routerChoice} painSelection={painSelection} />}
                </div>
                <RevealButton visible={subtitleDone} delay={0.8}>
                  <GradientButton onClick={advanceFromValue} label="Continue" />
                </RevealButton>
              </motion.div>
              );
            })()}

            {phase === "profile-form" && (() => {
              // Copy + field bindings adapt to who this session is
              // about. Self-setup keeps only the login user's name here.
              // Dependent setup shows the dependent's name read-only
              // (already captured in setup-for). Either way, the
              // submit button reads
              // "Get started" and handleProfileSubmit handles the
              // split at save time.
              const formHeadline = isDependentSetup
                ? `Let's get ${managedFirstName || "them"} set up.`
                : "Let's get you set up.";
              const formSubtitle = isDependentSetup
                ? `Confirm ${managedFirstName || "their"} name and I'll take it from there.`
                : "Tell me your name so I can personalize everything from here.";
              return (
              <motion.div
                key="profile-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
              >
                <div className="flex-1 flex flex-col justify-center gap-4">
                  <div className="text-center">
                    <h2 className="text-[22px] font-extrabold text-[#0F1B3D] text-balance leading-tight mb-2">
                      <StreamingText text={formHeadline} onDone={() => setHeadlineDone(true)} />
                    </h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: headlineDone ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: motionEase, delay: 0.1 }}
                      className="text-[14px] text-[#8E8E93] font-light"
                      onAnimationComplete={() => { if (headlineDone) setSubtitleDone(true); }}
                    >
                      {formSubtitle}
                    </motion.p>
                  </div>
                  {subtitleDone && (
                    <RevealStack visible className="space-y-3">
                      {!isDependentSetup && !hasOAuthName && (
                        <motion.div variants={REVEAL_ITEM} className="flex gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                              First name<span className="text-[#FF3B30] ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              name="given-name"
                              autoComplete="given-name"
                              value={firstName}
                              onChange={(e) => setFirstName(capitalizeName(e.target.value))}
                              placeholder="Alex"
                              autoCapitalize="words"
                              className="mt-1 w-full min-w-0 rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors capitalize"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                              Last name<span className="text-[#FF3B30] ml-0.5">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              name="family-name"
                              autoComplete="family-name"
                              value={lastName}
                              onChange={(e) => setLastName(capitalizeName(e.target.value))}
                              placeholder="Smith"
                              autoCapitalize="words"
                              className="mt-1 w-full min-w-0 rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors capitalize"
                            />
                          </div>
                        </motion.div>
                      )}
                      {isDependentSetup && (
                        <motion.div
                          variants={REVEAL_ITEM}
                          className="rounded-xl bg-[#F6F7FB] ring-1 ring-[#0F1B3D]/[0.06] px-4 py-3"
                        >
                          <p className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Setting up for</p>
                          <p className="text-[16px] font-semibold text-[#0F1B3D] mt-0.5">
                            {`${dependentFirstName.trim()} ${dependentLastName.trim()}`.trim() || "(missing name)"}
                          </p>
                        </motion.div>
                      )}
                    </RevealStack>
                  )}
                </div>
                <RevealButton visible={subtitleDone} delay={(hasOAuthName ? 1 : 2) * 0.07 + 0.1}>
                  <button
                    onClick={handleProfileSubmit}
                    disabled={savingProfile || !canSubmitProfile}
                    className="w-full py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                    style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                  >
                    {savingProfile ? "Setting up..." : "Get started"}
                  </button>
                </RevealButton>
              </motion.div>
              );
            })()}

            {phase === "router" && (() => {
              // Headline pivots on who the session is for. Dependent
              // setups read "What's top of mind for Linda right now?"
              // — the caregiver answers on her behalf. Self setups
              // keep the original first-name-prefixed version.
              let headline: string;
              if (isDependentSetup && managedFirstName) {
                headline = `What's top of mind for ${managedFirstName} right now?`;
              } else {
                const firstNamePrefix = firstName.trim() ? `${firstName.trim()}, ` : "";
                const base = "what's top of mind for you right now?";
                headline = firstNamePrefix
                  ? `${firstNamePrefix}${base}`
                  : `${base.charAt(0).toUpperCase()}${base.slice(1)}`;
              }
              // Short noun-phrase labels so the router reads as quick
              // answers to "What's top of mind?" rather than sentences.
              // Tighter rows also give the icons more visual breathing
              // room on mobile, where the longer strings wrapped.
              // Second-person framing when the session is for a dependent
              // — otherwise the buttons read "my medications" under the
              // headline "what's top of mind for Mom to manage?" which
              // breaks the grammar. Labels stay short noun phrases in
              // both modes.
              const medsLabel = isDependentSetup && managedFirstName
                ? `${managedFirstName}'s medications`
                : "My medications";
              const ROUTER_OPTIONS: { key: RouterChoice; label: string; icon: typeof HeartPulse }[] = [
                { key: "condition", label: "Managing a condition", icon: HeartPulse },
                { key: "medications", label: medsLabel, icon: Heart },
                { key: "money", label: "Saving money", icon: DollarSign },
                { key: "staying_healthy", label: "Staying organized", icon: HelpCircle },
              ];
              return (
                <motion.div
                  key="router"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
                >
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="text-center">
                      <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                        <StreamingText text={headline} onDone={() => setHeadlineDone(true)} />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] text-[#8E8E93] font-light"
                      >
                        Pick what fits best. We&apos;ll take it from there.
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <RevealStack visible className="flex flex-col gap-2">
                        {ROUTER_OPTIONS.map((opt) => (
                          <SelectablePill
                            key={opt.key}
                            icon={opt.icon}
                            label={opt.label}
                            selected={routerChoice === opt.key}
                            onClick={() => setRouterChoice(opt.key)}
                          />
                        ))}
                      </RevealStack>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1 + 5 * 0.05}>
                    <button
                      onClick={advanceFromRouter}
                      disabled={!routerChoice}
                      className="w-full py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                    >
                      Continue
                    </button>
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "situation" && (() => {
              const stayingHealthy = routerChoice === "staying_healthy";
              const chip = getChip(selectedSituation);
              const needsFreeform = stayingHealthy
                ? selectedSituation === "other"
                : !!chip && chip.conditionName === null;
              const canContinue = stayingHealthy
                ? !!selectedSituation && (!needsFreeform || customSituation.trim().length > 1)
                : !!chip && (!needsFreeform || customSituation.trim().length > 1);
              // Router-aware prompt: continues the thread from the router
              // pick instead of re-asking a generic "what's going on."
              // Dependent setups reframe the question in third person
              // so the caregiver reads it as asking about Linda, not
              // themselves.
              let headline: string;
              if (isDependentSetup && managedFirstName) {
                if (stayingHealthy) {
                  headline = `What do you want help staying on top of for ${managedFirstName}?`;
                } else if (routerChoice === "medications") {
                  headline = `What are ${managedFirstName}'s meds for?`;
                } else if (routerChoice === "money") {
                  headline = `What care is ${managedFirstName} paying for?`;
                } else {
                  headline = `What condition is ${managedFirstName} managing?`;
                }
              } else {
                const firstNamePrefix = firstName.trim() ? `${firstName.trim()}, ` : "";
                let headlineBase: string;
                if (stayingHealthy) {
                  headlineBase = "what do you want help staying on top of?";
                } else if (routerChoice === "medications") {
                  headlineBase = "what are your meds for?";
                } else if (routerChoice === "money") {
                  headlineBase = "what care are you paying for?";
                } else {
                  headlineBase = "what condition are you managing?";
                }
                headline = firstNamePrefix
                  ? `${firstNamePrefix}${headlineBase}`
                  : `${headlineBase.charAt(0).toUpperCase()}${headlineBase.slice(1)}`;
              }
              // Only surface alias suggestions on the generic "Something
              // else" path. injury_recovery already has its own template
              // and doesn't need matching.
              const suggestedTemplate =
                !stayingHealthy && selectedSituation === "other"
                  ? findTemplateByAlias(customSituation)
                  : null;
              return (
                <motion.div
                  key="situation"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
                >
                  {/* flex-1 body centers headline + content vertically;
                      CTA + skip always pinned to the card bottom. Pattern
                      is shared with every other phase in this shell. */}
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="text-center">
                      <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                        <StreamingText text={headline} onDone={() => setHeadlineDone(true)} />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] text-[#8E8E93] font-light"
                      >
                        {stayingHealthy
                          ? "Pick the thing you'd want Elena to help organize first."
                          : "Pick one, or tell me in your own words."}
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <>
                        <RevealStack visible className="flex flex-col gap-2">
                          {stayingHealthy
                            ? STAYING_HEALTHY_FOCUS_OPTIONS.map((option) => (
                                <SelectablePill
                                  key={option.key}
                                  icon={HelpCircle}
                                  label={option.label}
                                  selected={selectedSituation === option.key}
                                  onClick={() => {
                                    setSelectedSituation(option.key);
                                    setSelectedMeds([]);
                                    setCustomMeds([]);
                                    setCheckedPlanItems([]);
                                    setCustomSituation(option.focus);
                                  }}
                                />
                              ))
                            : SITUATION_CHIPS.map((c) => (
                                <SelectablePill
                                  key={c.key}
                                  icon={c.hasTemplate ? HeartPulse : HelpCircle}
                                  label={c.label}
                                  selected={selectedSituation === c.key}
                                  onClick={() => {
                                    setSelectedSituation(c.key);
                                    // Reset downstream state so a changed pick doesn't
                                    // carry stale meds/plan selections from a prior
                                    // template (edge case: user backs out and re-picks).
                                    setSelectedMeds([]);
                                    setCustomMeds([]);
                                    setCheckedPlanItems([]);
                                    if (!c.hasTemplate && c.conditionName) {
                                      setCustomSituation(c.conditionName);
                                    } else if (c.conditionName === null) {
                                      setCustomSituation("");
                                    }
                                  }}
                                />
                              ))}
                        </RevealStack>
                        {needsFreeform && (
                          <motion.input
                            key="situation-freeform"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: motionEase }}
                            type="text"
                            value={customSituation}
                            onChange={(e) => setCustomSituation(e.target.value)}
                            placeholder={
                              stayingHealthy
                                ? "Tell me what you'd want Elena to handle first"
                                : selectedSituation === "injury_recovery"
                                ? "e.g. torn ACL, back strain"
                                : "Tell us in a few words"
                            }
                            className="w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                          />
                        )}
                        {/* Alias suggestion: if their typed text matches a
                            template we support, offer a one-tap path into
                            that template's meds/care-plan flow. Tap skips
                            the Continue button and lands them on meds
                            immediately. Continue still works if they'd
                            rather treat it as freeform. */}
                        {suggestedTemplate && (
                          <motion.button
                            key={`suggest-${suggestedTemplate.key}`}
                            type="button"
                            onClick={() => acceptSituationSuggestion(suggestedTemplate.key)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, ease: motionEase }}
                            className="w-full text-left rounded-xl border border-[#2E6BB5]/30 bg-[#2E6BB5]/[0.06] hover:bg-[#2E6BB5]/[0.10] px-4 py-3 transition-colors"
                          >
                            <p className="text-[11px] font-bold text-[#2E6BB5] uppercase tracking-wider mb-0.5">
                              Start with this plan
                            </p>
                            <p className="text-[14px] font-semibold text-[#0F1B3D] leading-tight">
                              {suggestedTemplate.label}
                            </p>
                          </motion.button>
                        )}
                      </>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1 + (stayingHealthy ? STAYING_HEALTHY_FOCUS_OPTIONS.length : SITUATION_CHIPS.length) * 0.05}>
                    <button
                      onClick={advanceFromSituation}
                      disabled={!canContinue}
                      className="w-full py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                    >
                      Continue
                    </button>
                  </RevealButton>
                  {!stayingHealthy && headlineDone && (
                    <button
                      onClick={() => {
                        // Users who originally picked "condition" as their
                        // priority but now say they have none get rerouted
                        // to the staying_healthy track — preventive care
                        // framing (checkups, screenings, reminders) instead
                        // of condition-specific meds/care-plan/validation.
                        // Before this fix, clicking here called
                        // leaveShellThen(beginJoyride), which jumped past
                        // social-proof → auth → flush and dead-ended
                        // anonymous users without signup.
                        analytics.track("Web Tour Situation Skipped");
                        setRouterChoice("staying_healthy");
                        setPhase("elena-plan");
                      }}
                      className="text-[13px] text-[#8E8E93] hover:text-[#0F1B3D] self-center"
                    >
                      {isDependentSetup
                        ? "No active conditions to report"
                        : "I don't have an active condition"}
                    </button>
                  )}
                </motion.div>
              );
            })()}

            {phase === "meds" && (() => {
              const tpl = inferredSituationTemplate;
              // Short prompt — the template's medsPrompt is encyclopedic
              // ("People managing type 2 diabetes are often on one of
              // these. Any yours?") which takes four lines on mobile.
              // The user just picked the condition in the prior phase, so
              // context is already established. Keep the prompt tight.
              const medsHeadline = tpl
                ? (isDependentSetup && managedFirstName
                    ? `Any of these meds for ${managedFirstName}?`
                    : "Any of these your meds?")
                : (isDependentSetup && managedFirstName
                    ? `Any medications for ${managedFirstName}?`
                    : "Any medications for that?");
              const medsSubtitle = tpl
                ? `Tap what ${isDependentSetup && managedFirstName ? `${managedFirstName} takes` : "you take"}. We'll add them to the profile.`
                : `Type any medications ${isDependentSetup && managedFirstName ? `${managedFirstName} takes` : "you take"} so Elena can work with the real list.`;
              return (
                <motion.div
                  key="meds"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 max-md:p-4 flex flex-col gap-4 max-md:gap-2.5 min-h-[380px] sm:min-h-[440px] max-md:min-h-0"
                >
                  <div className="flex-1 flex flex-col justify-center gap-4 max-md:gap-2.5">
                    <div className="text-center">
                      <h2 className="text-[20px] max-md:text-[18px] font-extrabold text-[#0F1B3D] mb-2 max-md:mb-1 text-balance leading-tight">
                        <StreamingText text={medsHeadline} onDone={() => setHeadlineDone(true)} />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] max-md:text-[12.5px] text-[#8E8E93] font-light text-balance"
                      >
                        {medsSubtitle}
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <>
                        {tpl && (
                          <RevealStack visible className="flex flex-wrap gap-2 max-md:gap-1.5 justify-center">
                            {tpl.medOptions.map((m) => {
                              const active = selectedMeds.includes(m);
                              return (
                                <motion.button
                                  key={m}
                                  variants={REVEAL_ITEM}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() =>
                                    setSelectedMeds((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]))
                                  }
                                  className={`px-3.5 py-2 max-md:px-3 max-md:py-1.5 rounded-full border text-[14px] max-md:text-[13px] transition-all duration-200 ${
                                    active
                                      ? "border-[#0F1B3D] bg-[#0F1B3D] text-white"
                                      : "border-[#E5E5EA] bg-white text-[#0F1B3D] hover:border-[#0F1B3D]/30"
                                  }`}
                                >
                                  {m}
                                </motion.button>
                              );
                            })}
                          </RevealStack>
                        )}
                        {customMeds.length > 0 && (
                          <div className="flex flex-wrap gap-2 max-md:gap-1.5 justify-center">
                            {customMeds.map((m, i) => (
                              <span
                                key={`${m}-${i}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 max-md:px-2.5 max-md:py-1 rounded-full bg-[#0F1B3D]/5 text-[13px] max-md:text-[12px] text-[#0F1B3D]"
                              >
                                {m}
                                <button
                                  onClick={() => setCustomMeds((p) => p.filter((_, idx) => idx !== i))}
                                  className="text-[#0F1B3D]/50 hover:text-[#0F1B3D]"
                                  aria-label="Remove"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMedDraft}
                            onChange={(e) => setNewMedDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newMedDraft.trim()) {
                                setCustomMeds((p) => [...p, newMedDraft.trim()]);
                                setNewMedDraft("");
                              }
                            }}
                            placeholder="Add another medication"
                            className="flex-1 min-w-0 rounded-full border border-[#E5E5EA] bg-white px-4 py-2.5 max-md:px-3.5 max-md:py-2 text-[14px] max-md:text-[13px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                          />
                          <button
                            onClick={() => {
                              if (!newMedDraft.trim()) return;
                              setCustomMeds((p) => [...p, newMedDraft.trim()]);
                              setNewMedDraft("");
                            }}
                            disabled={!newMedDraft.trim()}
                            className="px-4 max-md:px-3 rounded-full border border-[#E5E5EA] text-[14px] max-md:text-[13px] text-[#0F1B3D] hover:border-[#0F1B3D]/30 disabled:opacity-40"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1}>
                    <button
                      onClick={advanceFromMeds}
                      className="w-full py-3.5 max-md:py-2.5 rounded-full text-white font-semibold font-sans text-[15px] max-md:text-[14px] transition-opacity hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                    >
                      Continue
                    </button>
                  </RevealButton>
                  {headlineDone && (
                    <button
                      onClick={() => {
                        setSelectedMeds([]);
                        setCustomMeds([]);
                        advanceFromMeds();
                      }}
                      className="text-[13px] max-md:text-[12px] text-[#8E8E93] hover:text-[#0F1B3D] self-center"
                    >
                      {isDependentSetup && managedFirstName ? `${managedFirstName} isn't on anything` : "I'm not on anything"}
                    </button>
                  )}
                </motion.div>
              );
            })()}

            {phase === "care-plan" && (() => {
              const tpl = inferredSituationTemplate;
              if (!tpl) return null;
              return (
                <motion.div
                  key="care-plan"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
                >
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="text-center">
                      <h2 className="text-[20px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                        <StreamingText
                          text={`Here's what great care looks like for ${tpl.label.toLowerCase()}.`}
                          onDone={() => setHeadlineDone(true)}
                        />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] text-[#8E8E93] font-light"
                      >
                        Check anything you&apos;ve done in the last year.
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <RevealStack visible className="flex flex-col gap-2">
                        {tpl.planItems.map((it) => {
                          const checked = checkedPlanItems.includes(it.id);
                          return (
                            <motion.button
                              key={it.id}
                              variants={REVEAL_ITEM}
                              whileTap={{ scale: 0.98 }}
                              onClick={() =>
                                setCheckedPlanItems((p) =>
                                  p.includes(it.id) ? p.filter((x) => x !== it.id) : [...p, it.id],
                                )
                              }
                              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left transition-all duration-200 ${
                                checked
                                  ? "bg-gradient-to-r from-[#0F1B3D]/[0.07] to-[#2E6BB5]/[0.05] ring-1 ring-[#0F1B3D]/20"
                                  : "bg-[#F6F7FA] hover:bg-[#EEF1F6]"
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                  checked
                                    ? "bg-gradient-to-br from-[#0F1B3D] to-[#2E6BB5] shadow-[0_2px_6px_rgba(15,27,61,0.25)]"
                                    : "bg-white ring-1 ring-inset ring-[#C5C8D0]"
                                }`}
                              >
                                {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                              </span>
                              <span
                                className={`text-[14px] leading-snug ${
                                  checked ? "text-[#0F1B3D] font-medium" : "text-[#0F1B3D]/85"
                                }`}
                              >
                                {it.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </RevealStack>
                    )}
                    {headlineDone && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, ease: motionEase, delay: 0.25 }}
                        className="text-[11px] text-[#8E8E93] text-center leading-snug px-2"
                      >
                        Based on{" "}
                        <a
                          href={tpl.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0F1B3D] underline decoration-[#0F1B3D]/30 underline-offset-2 hover:decoration-[#0F1B3D] transition-colors"
                        >
                          {tpl.source}
                        </a>
                      </motion.p>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1}>
                    <GradientButton onClick={advanceFromCarePlan} label="Continue" />
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "validation" && (() => {
              const tpl = inferredSituationTemplate;
              const total = tpl?.planItems.length ?? 0;
              const done = checkedPlanItems.length;
              const remaining = tpl ? tpl.planItems.filter((it) => !checkedPlanItems.includes(it.id)) : [];
              const doneItems = tpl ? tpl.planItems.filter((it) => checkedPlanItems.includes(it.id)) : [];
              // Freeform paths (e.g. someone typed "cancer" into Something else)
              // have no template, so there's no list to render. Give them a
              // distinct copy that acknowledges what they shared and hands off
              // to chat, rather than the generic "on your way" with no body.
              const conditionLabel = customSituation.trim();
              let headline: string;
              let subtitle: string;
              if (!tpl) {
                headline = conditionLabel ? `Got it. I hear you on ${conditionLabel.toLowerCase()}.` : "Got it. I hear you.";
                subtitle = "I can help you build a plan in chat. Let's start with the basics.";
              } else if (done === 0) {
                headline = "Here's your plan.";
                subtitle = "I can walk you through it, one step at a time.";
              } else if (done === total) {
                headline = "You're completely on top of this.";
                subtitle = "I can help you keep it going.";
              } else {
                headline = "You're already on your way.";
                subtitle = "I can help you with the rest.";
              }
              return (
                <motion.div
                  key="validation"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
                >
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="text-center">
                      {/* Hug-face emoji rendered inline alongside the headline
                          (not floating above) so it reads as part of the
                          sentence Elena is saying, not a decorative element. */}
                      <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                        <StreamingText text={headline} startDelay={0.35} onDone={() => setHeadlineDone(true)} />
                        {headlineDone && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.4, rotate: -15 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                            className="inline-block ml-2 align-middle text-[26px] leading-none"
                            aria-hidden
                          >
                            🤗
                          </motion.span>
                        )}
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] text-[#8E8E93] font-light text-balance"
                      >
                        {subtitle}
                      </motion.p>
                    </div>
                    {headlineDone && tpl && (doneItems.length > 0 || remaining.length > 0) && (
                      <RevealStack visible className="flex flex-col gap-1.5">
                        {doneItems.map((it) => (
                          <motion.div
                            key={`done-${it.id}`}
                            variants={REVEAL_ITEM}
                            className="flex items-start gap-3 px-3.5 py-2 rounded-xl bg-[#0F1B3D]/5"
                          >
                            <span className="mt-0.5 w-5 h-5 rounded-md bg-[#0F1B3D] flex items-center justify-center flex-shrink-0">
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </span>
                            <span className="text-[13px] text-[#0F1B3D] leading-snug">{it.label}</span>
                          </motion.div>
                        ))}
                        {remaining.length > 0 && (
                          <>
                            <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mt-3 mb-0.5">
                              Still to do
                            </p>
                            {/* Tapping a "Coming up" item checks it off: it moves
                                into checkedPlanItems, re-renders into the done
                                section above, and updates the headline tally.
                                Gives users a last chance to credit themselves for
                                something they forgot before it becomes a todo. */}
                            {remaining.map((it) => (
                              <motion.button
                                key={`rem-${it.id}`}
                                variants={REVEAL_ITEM}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => setCheckedPlanItems((p) => [...p, it.id])}
                                className="flex items-start gap-3 px-3.5 py-2 rounded-xl text-left w-full hover:bg-[#0F1B3D]/[0.04] transition-colors"
                              >
                                <span className="mt-0.5 w-5 h-5 rounded-md border border-[#C5C8D0] bg-white flex-shrink-0" />
                                <span className="text-[13px] text-[#5a6a82] leading-snug">{it.label}</span>
                              </motion.button>
                            ))}
                          </>
                        )}
                      </RevealStack>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.15}>
                    <button
                      onClick={advanceFromValidation}
                      className="w-full py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                    >
                      See what Elena can do
                    </button>
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "elena-plan" && (() => {
              const tpl = inferredSituationTemplate;
              // OTC list for the derived "I can track your X refills" line —
              // only prescription meds warrant a refill-tracking promise.
              const OTC_MARKERS = [
                "acetaminophen", "tylenol", "ibuprofen", "advil", "motrin",
                "naproxen", "aleve", "tums", "antacid", "melatonin", "magnesium",
                "prenatal vitamin", "folic acid", "iron supplement", "vitamin d",
                "calcium", "red yeast rice", "claritin", "loratadine", "zyrtec",
                "cetirizine", "allegra", "fexofenadine", "pepcid", "famotidine",
                "unisom", "doxylamine", "sunscreen", "lubricant", "moisturizer",
                "peppermint oil", "berberine", "inositol", "psyllium",
                "fiber supplement", "loperamide", "imodium", "excedrin",
                "cpap", "bipap", "oral appliance", "nasal spray", "eye drops",
                "stool softener", "docusate", "calcipotriene", "not on any",
                "not on meds", "other",
              ];
              const isOtc = (m: string) =>
                OTC_MARKERS.some((kw) => m.toLowerCase().includes(kw));
              const allMeds = normalizeMedicationList(
                selectedMeds,
                customMeds,
                newMedDraft.trim() ? [newMedDraft] : undefined,
              );
              const primaryRxMed = allMeds.find((m) => !isOtc(m)) || null;
              const remainingPlanActions = tpl
                ? tpl.planItems
                    .filter((it) => !checkedPlanItems.includes(it.id))
                    .map((it) => buildDisplayActionFromTodoText(it.todoText))
                    .filter(Boolean)
                : [];
              // Base hero lines by branch. Condition branch uses the
              // template's per-condition values (most specific). Other
              // branches use branch-wide constants since they don't have
              // a condition template driving content.
              let baseLines: string[];
              if (routerChoice === "condition" && tpl) {
                baseLines = [...remainingPlanActions, ...tpl.heroValues];
              } else if (routerChoice === "condition" && customSituation.trim()) {
                baseLines = [
                  ...remainingPlanActions,
                  ...buildFreeformHeroValues(customSituation),
                ];
              } else if (routerChoice === "medications") {
                baseLines = [...remainingPlanActions, ...MEDS_BRANCH_HERO_VALUES];
              } else if (routerChoice === "money") {
                baseLines = [...remainingPlanActions, ...MONEY_BRANCH_HERO_VALUES];
              } else if (routerChoice === "staying_healthy") {
                baseLines = buildStayingHealthyHeroValues(customSituation);
              } else {
                baseLines = [...remainingPlanActions, ...(tpl?.heroValues || [])];
              }
              // Derived data-grounded lines: a prescription med pitch for
              // any branch that collected meds (condition / medications),
              // and a pain-number callout for the money branch if they
              // gave one earlier. Order them most-specific-first so the
              // 3-line cap preserves the lines most directly anchored to
              // what the user just told us (med name, pain number) over
              // generic branch boilerplate.
              const derived: string[] = [];
              const scanOrProcedurePricing = buildPricingActionFromNeed(customSituation);
              if (scanOrProcedurePricing) {
                derived.push(scanOrProcedurePricing);
              }
              const fertilityContext =
                tpl?.key === "fertility_ivf" ||
                /\bfertility\b|\bivf\b|\biui\b|\breproductive\b|\bembryo\b|\bretrieval\b|\btransfer\b|\bfet\b/.test(
                  `${tpl?.conditionName || ""} ${customSituation || ""}`.toLowerCase(),
                );
              // Rank 1 — prescription refill/renewal. This is our
              // strongest "aha" moment: Elena autonomously calling the
              // pharmacy before your Rx runs out and the prescriber
              // when refills expire. When the user named a specific
              // prescription med, anchoring the top action to THAT
              // med ("I can track when your Lisinopril runs out…")
              // lands way harder than any generic first option. Only
              // fires on branches that collected meds (condition,
              // medications, money); staying_healthy typically didn't
              // name a specific Rx, and when it did it still benefits
              // from this being option 1.
              if (primaryRxMed && fertilityContext) {
                derived.push(`I can track when your ${primaryRxMed} runs out and call your provider to renew it.`);
                derived.push(`I can price-shop your ${primaryRxMed} refills every month.`);
                derived.push("I can book your next fertility visit.");
              } else if (primaryRxMed && (routerChoice === "condition" || routerChoice === "medications" || routerChoice === "staying_healthy")) {
                derived.push(`I can track when your ${primaryRxMed} runs out and call your provider to renew it.`);
              } else if (primaryRxMed && routerChoice === "money") {
                // Money branch: lead with the price-shop pitch on
                // their med since "save money" is the framing they
                // picked, but still put it FIRST — the refill mechanic
                // is the value proof either way.
                derived.push(`I can price-shop your ${primaryRxMed} refills every month.`);
              }
              // Rank 2 — pain callout (money branch). Quotes their own
              // words back. Specific but abstract relative to a named
              // med, so it drops below the Rx action when both exist.
              if (routerChoice === "money" && painSelection) {
                const painOpt = [...TIME_PAIN_OPTIONS, ...MONEY_PAIN_OPTIONS].find((o) => o.id === painSelection);
                if (painOpt) {
                  derived.push(`You said ${painOpt.label.toLowerCase()}. I can help bring that down.`);
                }
              }
              // Rank 3 — generic dependent framing. Only use this on the
              // staying-healthy branch; otherwise it steals the booking slot
              // from condition-specific actions ("book therapy session",
              // "book med check-in") and the resulting options feel too
              // generic even when we know the user's condition.
              if (
                routerChoice === "staying_healthy" &&
                setupForCareId &&
                setupForCareId !== "myself" &&
                dependentFirstName.trim()
              ) {
                const first = dependentFirstName.trim();
                derived.push(`I can book ${first}'s next visit.`);
              }
              // Cap at 3 AND dedupe by visual variant. Two cards that map
              // to the same mockup (e.g. derived "track your Fluoxetine
              // runs out" + base "call your provider to renew") would
              // read as duplicates even though the text differs. Derived
              // prepends, so personalized lines win over their generic
              // base counterparts. Final order preserved for whichever
              // line was seen first per variant.
              const seenVariants = new Set<string>();
              const dedupedLines: string[] = [];
              for (const l of [...derived, ...baseLines]) {
                const dedupeKey =
                  routerChoice === "staying_healthy"
                    ? l.trim().toLowerCase()
                    : variantForLine(l);
                if (seenVariants.has(dedupeKey)) continue;
                seenVariants.add(dedupeKey);
                dedupedLines.push(l);
              }
              // When onboarding is running for a dependent, rewrite each
              // line so "your X" reads as "{Name}'s X" / subsequent "your"
              // as "their", and "you" as "them" / "they". The copy lives
              // in one place (base constants + derived generators) so we
              // do the rewrite downstream rather than fork every string.
              // Lines WITHOUT "you"/"your" (e.g. "I can price-shop labs")
              // are safe to leave untouched — caregiver context is implied
              // by the rest of the tour.
              const isDepSetup = !!setupForCareId && setupForCareId !== "myself";
              const depName = isDepSetup ? dependentFirstName.trim() : "";
              function personalizeForDependent(line: string): string {
                if (!isDepSetup || !depName) return line;
                // "{Name}'s next visit" / "{Name}'s {med}" lines already
                // contain the name — skip to avoid "{Name}'s {Name}'s X".
                if (line.includes(`${depName}'s`)) return line;
                let firstYourDone = false;
                let out = line.replace(/\byour\b/g, () => {
                  if (!firstYourDone) { firstYourDone = true; return `${depName}'s`; }
                  return "their";
                });
                out = out.replace(/\byou're\b/g, "they're");
                // Subject-position "you" after common particles → "they"
                out = out.replace(/\b(before|after|when|while|if|so)\s+you\b/g, "$1 they");
                // Verbs following "you" as subject → "they"
                out = out.replace(/\byou\s+(go|need|want|have|get|pay|can|should|will)\b/g, "they $1");
                // Remaining "you" (almost always object position) → "them"
                out = out.replace(/\byou\b/g, "them");
                return out;
              }
              const semanticActionOptions = dedupedLines
                .map((raw) => buildProposedAction(raw, {
                  routerChoice,
                  conditionName: tpl?.conditionName || customSituation.trim() || undefined,
                  isDependentSetup: isDepSetup,
                  managedFirstName: depName || undefined,
                }))
                .filter((option): option is ProposedAction => !!option);
              if (
                primaryRxMed &&
                !semanticActionOptions.some((option) => option.category === "medication_management")
              ) {
                const refillFallback = buildProposedAction(
                  `I can track when your ${primaryRxMed} runs out and call your provider to renew it.`,
                  {
                    routerChoice,
                    conditionName: tpl?.conditionName || customSituation.trim() || undefined,
                    isDependentSetup: isDepSetup,
                    managedFirstName: depName || undefined,
                  },
                );
                if (refillFallback) {
                  semanticActionOptions.unshift(refillFallback);
                }
              }
              const actionOptions = prioritizeProposedActions(semanticActionOptions)
                .slice(0, 3)
                .map((option) => ({
                  ...option,
                  display: personalizeForDependent(option.display),
                }));
              const hasCustomAction = customActionText.trim().length >= 3;
              const canContinue = !savingSituation && (confirmedActions.length > 0 || hasCustomAction);
              return (
                <motion.div
                  key="elena-plan"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 max-md:p-4 flex flex-col gap-4 max-md:gap-2.5 min-h-[380px] sm:min-h-[440px] max-md:min-h-0"
                >
                  <div className="flex-1 flex flex-col justify-center gap-4 max-md:gap-2.5">
                    <div className="text-center">
                      <h2 className="text-[22px] max-md:text-[19px] font-extrabold text-[#0F1B3D] mb-2 max-md:mb-1 text-balance leading-tight">
                        <StreamingText
                          text="What should I take off your plate first?"
                          onDone={() => setHeadlineDone(true)}
                        />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] max-md:text-[12.5px] text-[#8E8E93] font-light text-balance"
                      >
                        Pick the first thing you want Elena to actually handle.
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <div className="flex flex-col gap-2.5 max-md:gap-1.5">
                        {actionOptions.map((action, i) => (
                          <ElenaPlanRow
                            key={`hero-${action.raw}-${i}`}
                            line={action.display}
                            title={action.title}
                            subtitle={action.subtitle}
                            startDelayMs={200 + i * 320}
                            selected={confirmedActions.includes(action.raw)}
                            onToggle={() => {
                              // Single-select: tapping a selected card
                              // clears it; tapping a different card
                              // replaces the selection. Also clears any
                              // custom text so we always seed Elena with
                              // exactly one action to focus on.
                              const wasSelected = confirmedActions.includes(action.raw);
                              setConfirmedActions(wasSelected ? [] : [action.raw]);
                              if (!wasSelected && customActionText.trim().length > 0) {
                                setCustomActionText("");
                              }
                              analytics.track("Web Tour Action Toggled", {
                                branch: routerChoice,
                                line: action.display,
                                raw_line: action.raw,
                                selected: !wasSelected,
                              });
                            }}
                          />
                        ))}
                        <motion.input
                          type="text"
                          value={customActionText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCustomActionText(v);
                            // Typing a custom action replaces any chip
                            // selection — mutually exclusive so the
                            // seed is always a single focused request.
                            if (v.trim().length > 0 && confirmedActions.length > 0) {
                              setConfirmedActions([]);
                            }
                          }}
                          placeholder="Something specific you want done?"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: motionEase, delay: 0.2 + actionOptions.length * 0.32 }}
                          className="w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 max-md:px-3.5 max-md:py-2 text-[15px] max-md:text-[14px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1 + actionOptions.length * 0.07}>
                    <button
                      onClick={advanceFromElenaPlan}
                      disabled={!canContinue}
                      className="w-full py-3.5 max-md:py-2.5 rounded-full text-white font-semibold font-sans text-[15px] max-md:text-[14px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                    >
                      {savingSituation ? "Setting up..." : "Let's do it"}
                    </button>
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "social-proof" && (() => {
              // Dual-line comparison chart modeled after Cal AI. Both
              // lines start at the SAME point (the user's current pain
              // today); "On your own" rises over 12 months (healthcare
              // load grows if left alone — the honest counterfactual),
              // Elena flattens/dips. The SHADED GAP between them is
              // the visual payoff — that's the savings story. Labels
              // sit at the line endpoints (not inside the chart) and
              // the X-axis shows Now / 6 mo / 12 mo so the chart reads
              // as a trajectory, not just two endpoints. No y-axis
              // numbers — kept non-specific so the chart doesn't imply
              // more precision than we have.
              const copy = (painSelection && COMPARISON_COPY[painSelection]) || COMPARISON_DEFAULT;
              // ViewBox: 320 × 180. Chart area: x 30→290, y 40→120.
              // Shared start point: (30, 85). Divergence to (290, 40)
              // and (290, 118) by end.
              const diyPath = "M 30 85 C 110 82, 185 58, 290 40";
              const elenaPath = "M 30 85 C 110 88, 185 108, 290 118";
              // Closed polygon between the two lines for the savings
              // gap shading. Traverses DIY forward, then Elena in reverse.
              const gapPath = "M 30 85 C 110 82, 185 58, 290 40 L 290 118 C 185 108, 110 88, 30 85 Z";
              return (
                <motion.div
                  key="social-proof"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
                >
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="text-center">
                      <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mb-1 text-balance leading-tight">
                        <StreamingText text="Elena creates lasting relief" onDone={() => setHeadlineDone(true)} />
                      </h2>
                    </div>
                    {headlineDone && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: motionEase, delay: 0.1 }}
                        className="mt-1 rounded-2xl bg-[#F5F1EB] p-4 sm:p-5"
                      >
                        <p className="text-[13px] font-semibold text-[#0F1B3D] mb-2">
                          {copy.yLabel}
                        </p>
                        <svg
                          viewBox="0 0 320 180"
                          className="w-full h-auto"
                          role="img"
                          aria-label={`Comparison of ${copy.yLabel.toLowerCase()} with Elena vs on your own over twelve months`}
                        >
                          <defs>
                            <linearGradient id="savings-gap" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#0F1B3D" stopOpacity="0" />
                              <stop offset="100%" stopColor="#2E6BB5" stopOpacity="0.18" />
                            </linearGradient>
                          </defs>
                          {/* Subtle dashed gridlines — reference only, no numbers */}
                          <line x1="30" y1="50" x2="290" y2="50" stroke="#0F1B3D" strokeOpacity="0.08" strokeDasharray="3 4" />
                          <line x1="30" y1="85" x2="290" y2="85" stroke="#0F1B3D" strokeOpacity="0.08" strokeDasharray="3 4" />
                          <line x1="30" y1="120" x2="290" y2="120" stroke="#0F1B3D" strokeOpacity="0.08" strokeDasharray="3 4" />
                          {/* Savings-gap shading — the visual payoff, fades in AFTER both lines have drawn */}
                          <motion.path
                            d={gapPath}
                            fill="url(#savings-gap)"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 2.0 }}
                          />
                          {/* "On your own" line — muted red, rises */}
                          <motion.path
                            d={diyPath}
                            fill="none"
                            stroke="#B5707A"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: motionEase, delay: 0.25 }}
                          />
                          {/* "Elena" line — navy, flat then dips */}
                          <motion.path
                            d={elenaPath}
                            fill="none"
                            stroke="#0F1B3D"
                            strokeWidth={2.8}
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.3, ease: motionEase, delay: 0.55 }}
                          />
                          {/* Shared start point */}
                          <motion.circle
                            cx={30} cy={85} r={4.5}
                            fill="#F5F1EB" stroke="#0F1B3D" strokeWidth={2}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: 0.15 }}
                          />
                          {/* "On your own" endpoint */}
                          <motion.circle
                            cx={290} cy={40} r={4.5}
                            fill="#F5F1EB" stroke="#B5707A" strokeWidth={2}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: 1.45 }}
                          />
                          {/* "On your own" endpoint label */}
                          <motion.text
                            x={283} y={30}
                            textAnchor="end"
                            fontSize={12}
                            fontWeight={600}
                            fill="#B5707A"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25, delay: 1.5 }}
                          >
                            On your own
                          </motion.text>
                          {/* Elena endpoint */}
                          <motion.circle
                            cx={290} cy={118} r={4.5}
                            fill="#F5F1EB" stroke="#0F1B3D" strokeWidth={2}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: 1.85 }}
                          />
                          {/* Elena endpoint label */}
                          <motion.text
                            x={283} y={140}
                            textAnchor="end"
                            fontSize={12}
                            fontWeight={700}
                            fill="#0F1B3D"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25, delay: 1.9 }}
                          >
                            With Elena
                          </motion.text>
                          {/* Elena context chip (metric pill) — bottom-left, outside line area */}
                          <motion.g
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25, delay: 1.95 }}
                          >
                            <circle cx={34} cy={162} r={3.5} fill="#0F1B3D" />
                            <text x={42} y={166} fontSize={11} fontWeight={700} fill="#0F1B3D">
                              Elena
                            </text>
                            <rect x={80} y={154} rx={6.5} ry={6.5} width={44} height={15} fill="#0F1B3D" />
                            <text x={102} y={165} textAnchor="middle" fontSize={10} fontWeight={600} fill="#FFFFFF">
                              {copy.pill}
                            </text>
                          </motion.g>
                        </svg>
                        {/* X-axis labels — three ticks for trajectory */}
                        <div className="flex justify-between text-[11px] text-[#0F1B3D]/60 font-medium mt-1 px-[8%]">
                          <span>Now</span>
                          <span>6 months</span>
                          <span>12 months</span>
                        </div>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 2.3 }}
                          className="text-center text-[13px] text-[#0F1B3D]/80 leading-snug text-balance mt-3 max-w-[24rem] mx-auto"
                        >
                          {copy.caption}
                        </motion.p>
                      </motion.div>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={2.4}>
                    <GradientButton
                      onClick={() => {
                        analytics.track("Web Tour Social Proof Continued", {
                          pain_bucket: painSelection ?? null,
                          router_choice: routerChoice,
                        });
                        setPhase("auth");
                      }}
                      label="Continue"
                    />
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "auth" && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
                className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
              >
                <div className="flex-1 flex flex-col justify-center gap-5">
                  <div className="text-center">
                    <h2 className="text-[22px] max-md:text-[20px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                      <StreamingText
                        text={authMode === "signup" ? "Create your account" : "Welcome back"}
                        onDone={() => setHeadlineDone(true)}
                      />
                    </h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: headlineDone ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: motionEase }}
                      className="text-[14px] max-md:text-[13px] text-[#8E8E93] font-light text-balance"
                    >
                      {authMode === "signup"
                        ? "We'll have Elena working on your first action in seconds."
                        : "Sign in to pick up where you left off."}
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: headlineDone ? 1 : 0, y: headlineDone ? 0 : 8 }}
                    transition={{ duration: 0.35, ease: motionEase, delay: 0.05 }}
                    className="flex flex-col gap-3"
                  >
                    {/* OAuth: prominent, first in the tab order — most
                        users one-tap this instead of typing credentials. */}
                    <button
                      type="button"
                      disabled={authSubmitting}
                      onClick={async () => {
                        setAuthError(null);
                        setAuthSubmitting(true);
                        analytics.track("Auth Method Selected", { method: "google", surface: "tour_inline" });
                        trackWebFunnelAuthSubmitted({
                          surface: "tour_inline",
                          intent: authMode,
                          method: "google",
                        });
                        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/onboard` : undefined;
                        const result = await signInWithGoogle(redirectTo, {
                          intent: authMode,
                          source: "tour_inline",
                        });
                        if (result.error) {
                          analytics.track("Auth Error", { method: "google", surface: "tour_inline", error_type: result.error });
                          setAuthError(result.error);
                          setAuthSubmitting(false);
                        }
                        // Success path: Google redirects away; /onboard
                        // rehydrates session on return and runs flush.
                      }}
                      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-full bg-white border border-[#0F1B3D]/15 text-[15px] font-semibold text-[#0F1B3D] hover:bg-[#f5f7fb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(15,27,61,0.06)]"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      Continue with Google
                    </button>

                    <div className="flex items-center gap-2 my-1">
                      <div className="h-px flex-1 bg-[#0F1B3D]/10" />
                      <span className="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider">or email</span>
                      <div className="h-px flex-1 bg-[#0F1B3D]/10" />
                    </div>

                    <form
                      className="flex flex-col gap-2.5"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setAuthError(null);
                        if (authMode === "signup" && authPassword.length < 8) {
                          setAuthError("Password must be at least 8 characters");
                          return;
                        }
                        // Managed-setup signup: main user's name wasn't
                        // collected anywhere else in the tour (profile-form
                        // captured the managed profile's data instead).
                        // Merge the name into the tour-buffer profile now
                        // so the flush's completeOnboarding writes a real
                        // name to the "Me" profile instead of empty strings.
                        // Self-setup users already have their name buffered
                        // from profile-form, so this block is a no-op there.
                        if (authMode === "signup" && isDependentSetup
                            && firstName.trim() && lastName.trim()) {
                          setBufferedProfile({
                            first_name: firstName.trim(),
                            last_name: lastName.trim(),
                          });
                        }
                        setAuthSubmitting(true);
                        analytics.track("Auth Method Selected", { method: "email", mode: authMode, surface: "tour_inline" });
                        trackWebFunnelAuthSubmitted({
                          surface: "tour_inline",
                          intent: authMode,
                          method: "email",
                        });
                        const result = authMode === "signup"
                          ? await signUp(authEmail, authPassword, { source: "tour_inline" })
                          : await signIn(authEmail, authPassword, { source: "tour_inline" });
                        setAuthSubmitting(false);
                        if (result.error) {
                          analytics.track("Auth Error", { method: "email", mode: authMode, surface: "tour_inline", error_type: result.error });
                          setAuthError(result.error);
                          return;
                        }
                        // Success — /onboard's session-becomes-truthy
                        // effect picks it up and runs the flush.
                      }}
                    >
                      {/* Managed-path signup also captures the main user's
                          first/last name right here, so the "Me" profile
                          saves with a real name. Only shown in the managed
                          path + signup mode (self-setup already has the
                          name from profile-form; login mode means the
                          profile already exists). OAuth buttons above
                          handle the name automatically. */}
                      {authMode === "signup" && isDependentSetup && (
                        <div className="flex gap-2.5">
                          <input
                            type="text"
                            autoComplete="given-name"
                            placeholder="First name"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(capitalizeName(e.target.value))}
                            disabled={authSubmitting}
                            autoCapitalize="words"
                            className="flex-1 min-w-0 rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-4 py-3 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors disabled:opacity-50 capitalize"
                          />
                          <input
                            type="text"
                            autoComplete="family-name"
                            placeholder="Last name"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(capitalizeName(e.target.value))}
                            disabled={authSubmitting}
                            autoCapitalize="words"
                            className="flex-1 min-w-0 rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-4 py-3 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors disabled:opacity-50 capitalize"
                          />
                        </div>
                      )}
                      {/* Inputs use the same rounded-full + soft-gray
                          bg pattern as the other tour forms (profile-form,
                          setup-for) so the auth step feels continuous. */}
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="Email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        disabled={authSubmitting}
                        className="w-full rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-4 py-3 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors disabled:opacity-50"
                      />
                      <div className="relative">
                        <input
                          type={authShowPassword ? "text" : "password"}
                          autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                          placeholder={authMode === "signup" ? "Create a password" : "Password"}
                          required
                          minLength={authMode === "signup" ? 8 : undefined}
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          disabled={authSubmitting}
                          className="w-full rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-4 py-3 pr-12 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setAuthShowPassword((v) => !v)}
                          disabled={authSubmitting}
                          tabIndex={-1}
                          aria-label={authShowPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#0F1B3D]/40 hover:text-[#0F1B3D]/70 transition-colors disabled:opacity-50"
                        >
                          {authShowPassword
                            ? <EyeOff className="w-4 h-4" strokeWidth={2} />
                            : <Eye className="w-4 h-4" strokeWidth={2} />}
                        </button>
                      </div>
                      {authError && (
                        <p className="text-[13px] text-[#D94545] px-1">{authError}</p>
                      )}
                      <button
                        type="submit"
                        disabled={
                          authSubmitting
                          || !authEmail
                          || !authPassword
                          || (authMode === "signup" && isDependentSetup
                              && (!firstName.trim() || !lastName.trim()))
                        }
                        className="w-full py-3 rounded-full text-white font-semibold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                        style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                      >
                        {authSubmitting
                          ? (authMode === "signup" ? "Creating account…" : "Signing in…")
                          : (authMode === "signup" ? "Create account" : "Sign in")}
                      </button>
                    </form>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode((m) => (m === "signup" ? "signin" : "signup"));
                        setAuthError(null);
                      }}
                      disabled={authSubmitting}
                      className="text-[13px] text-[#0F1B3D]/60 hover:text-[#0F1B3D] transition-colors text-center pt-1 disabled:opacity-50"
                    >
                      {authMode === "signup"
                        ? "Have an account? Sign in"
                        : "Need an account? Create one"}
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {phase === "flushing" && flushingState && (
              <motion.div
                key="flushing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: motionEase }}
              >
                <OnboardingFlushingContent
                  stage={flushingState.stage}
                  percent={flushingState.percent}
                  affirmation={flushingState.affirmation}
                  isNavigating={flushingState.isNavigating}
                  onContinue={flushingState.onContinue}
                />
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
    return (
      <>
        <button
          type="button"
          onClick={skipTour}
          className="fixed top-4 right-4 z-[100000] text-[12px] font-medium text-[#8E8E93] transition-colors hover:text-[#0F1B3D]"
        >
          Skip for now
        </button>
        {Tour}
      </>
    );
  }

  // ── Phase: Profile walkthrough (custom cards over popover) ──
  //    Same pattern as care/value shell: outer card morphs via `layout`,
  //    AnimatePresence crossfades title/body between steps.
  if (phase === "profile") {
    // When managing a dependent, replace "Your X tab" with "{Name}'s X tab"
    // so the tour copy matches the rest of the onboarding. For the
    // family step, switch from the caregiver-invitation framing to a
    // per-dependent organization framing (you already have a
    // dependent — the step is about adding more, not getting started).
    const depName = isDependentSetup && managedFirstName ? managedFirstName : "";
    const possessive = depName ? `${depName}'s` : "Your";
    const profileSteps = depName
      ? [
          { id: "health", title: `${possessive} Health tab`, body: `${possessive} conditions, meds, and care plan all land here. Elena keeps them up to date as you chat.`, tab: "health" as const, addKind: "provider" as AddKind | null },
          { id: "visits", title: `${possessive} Visits tab`, body: `Every appointment Elena books for ${depName} lives here, plus notes and history.`, tab: "visits" as const, addKind: "visit" as AddKind | null },
          { id: "insurance", title: `${possessive} Insurance tab`, body: `Elena checks what's covered and estimates costs before ${depName} goes in.`, tab: "insurance" as const, addKind: "insurance" as AddKind | null },
          { id: "family", title: "Anyone else to add?", body: "Other people you manage, or relatives who'd use their own account? Add them here too.", tab: "health" as const, addKind: "family" as AddKind | null, showSwitcher: true },
        ]
      : PROFILE_STEPS;
    const currentStep = profileSteps[profileStep];
    const isLast = profileStep >= profileSteps.length - 1;
    const motionEase = [0.4, 0, 0.2, 1] as const;
    const addKind = currentStep.addKind;
    const showPrompt = addKind != null && !hasExistingData(addKind);
    const ctaGradient = "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)";

    // Text at 16px minimum to prevent iOS Safari's auto-zoom on focus
    // (anything smaller triggers it and breaks the mobile card layout).
    // ring-inset keeps the focus outline drawn *inside* the input's own box
    // instead of 2px outside, so it can't get clipped by the card's
    // overflow-hidden (which we keep for success-overlay containment).
    const inputClass = "w-full rounded-xl border border-[#0F1B3D]/10 bg-[#f5f7fb] px-3.5 py-2.5 sm:py-3 text-[16px] text-[#0F1B3D] placeholder:text-[#0F1B3D]/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0F1B3D]/20";
    // For native <select> elements: strip the OS default chevron (which
    // looks jarring against the pill styling, especially on iOS Safari) and
    // reserve room on the right so the text doesn't sit behind the custom
    // chevron we overlay. Always pair with a ChevronDown icon absolutely
    // positioned inside a wrapping relative div.
    // iOS Safari occasionally ignores `appearance: none` from Tailwind
    // and renders both the native arrow AND our custom ChevronDown. The
    // explicit -webkit/-moz properties + extra right-padding give the
    // dropdown consistent spacing regardless.
    const selectClass = `${inputClass} appearance-none pr-12 bg-no-repeat [appearance:none] [-webkit-appearance:none] [-moz-appearance:none]`;

    const canSave = (() => {
      if (addKind === "provider") {
        // Specialty is optional — if the user types a name but
        // doesn't tap a specialty chip, we should still save what
        // they gave us. Previously canSave required a specialty,
        // which silently turned Continue into Skip and discarded
        // the typed name. Only "Other" requires the custom text
        // input to be non-empty (otherwise there's no specialty
        // to persist).
        if (!providerName.trim()) return false;
        if (providerSpecialty === "Other") return providerCustomSpecialty.trim().length > 0;
        return true;
      }
      if (addKind === "visit") {
        const hasDate = displayToIsoDate(visitDate).length > 0;
        if (lastAddedProvider && !visitUseChipMode) return hasDate;
        return visitType.trim().length > 0 && hasDate;
      }
      if (addKind === "insurance") {
        if (insuranceCarrier === "Other") return insuranceCustomName.trim().length > 0;
        return insuranceCarrier.length > 0;
      }
      if (addKind === "family") return (
        familyFirstName.trim().length > 0 &&
        familyLastName.trim().length > 0
      );
      return false;
    })();

    return createPortal(
      <>
        <button
          type="button"
          onClick={skipTour}
          className="fixed top-4 right-4 z-[100000] text-[12px] font-medium text-[#8E8E93] transition-colors hover:text-[#0F1B3D]"
        >
          Skip for now
        </button>
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
            // Spring-based layout morph softens the resize between
            // compact Yes/No states and expanded form states. Without
            // this, the card snap-resized and read as twitchy.
            // Settles in ~0.45s; feels decided without dragging.
            transition={{ layout: { type: "spring", stiffness: 200, damping: 26, mass: 0.8 } }}
            // iOS Safari doesn't auto-dismiss the keyboard when you tap
            // outside an input on the web. Without this, tapping a button
            // while keyboard is open can fail because the button is below
            // the keyboard's visual viewport. Blur the focused element on
            // any pointer-down that isn't itself an input/select/textarea.
            onPointerDownCapture={(e) => {
              const target = e.target as HTMLElement | null;
              const isField = !!target?.closest("input, select, textarea");
              if (!isField && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            }}
            className={`relative rounded-2xl bg-white p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-4px_30px_rgba(15,27,61,0.15)] border border-[#E5E5EA] overflow-hidden flex flex-col max-h-[80vh] ${successOverlay ? "h-[240px] sm:h-[300px]" : ""}`}
          >
            {/* Progress dots — tiny row showing how many profile-walkthrough
                cards remain. Keeps late-stage dropout in check. */}
            <div className="flex justify-center gap-1.5 mb-2 sm:mb-5">
              {PROFILE_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === profileStep
                      ? "w-5 bg-[#0F1B3D]"
                      : i < profileStep
                      ? "w-1.5 bg-[#0F1B3D]/30"
                      : "w-1.5 bg-[#0F1B3D]/10"
                  }`}
                />
              ))}
            </div>

            {/* Fade the content + buttons out while the success overlay is
                active. Otherwise the button text (e.g. "Save and continue" →
                "Continue") was visibly morphing under the fading overlay,
                reading as a flicker during step transitions. */}
            <div className={`flex-1 flex flex-col min-h-0 transition-opacity duration-200 ${successOverlay ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={profileStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: motionEase }}
              >
                <div className="text-center">
                  <h3 className="text-[16px] sm:text-[18px] font-extrabold text-[#0F1B3D] mb-1.5 sm:mb-2">
                    <StreamingText text={currentStep.title} onDone={() => setHeadlineDone(true)} />
                  </h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: headlineDone ? 1 : 0 }}
                    transition={{ duration: 0.32, ease: motionEase, delay: 0.05 }}
                    className="text-[13px] sm:text-[14px] text-[#5a6a82] font-light leading-relaxed"
                  >
                    {currentStep.body}
                  </motion.p>
                </div>

                {/* Inline Yes/No chips for provider + visit steps. Yes
                    expands the add form; No just DESELECTS (doesn't
                    advance — Continue still goes to next step). Styled
                    like the specialty chips so they read as "pick one"
                    rather than "primary action". Insurance skips this
                    gate entirely — the carrier dropdown below is one
                    question, not worth a pre-gate. */}
                {showPrompt && headlineDone &&
                  (addKind === "provider" || addKind === "visit") && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: motionEase, delay: 0.15 }}
                      className="mt-4 flex items-center justify-between gap-3"
                    >
                      <p className="text-[13px] font-semibold text-[#0F1B3D] flex-1 min-w-0">
                        {addKind === "provider"
                          ? (isDependentSetup && managedFirstName ? `Any doctors ${managedFirstName} sees?` : "Have any doctors you like?")
                          : (
                              // Visit-step Y/N: if the user just added a
                              // doctor on the previous step and hasn't
                              // switched to chip-mode, continue the
                              // thread — "Have you seen Dr. X recently?"
                              // is tighter than a generic "any recent
                              // visits". Falls back to the generic
                              // question when no lastAddedProvider OR
                              // the user tapped "Add a different visit".
                              lastAddedProvider && !visitUseChipMode
                                ? (isDependentSetup && managedFirstName
                                    ? `Has ${managedFirstName} seen ${lastAddedProvider.name} recently?`
                                    : `Have you seen ${lastAddedProvider.name} recently?`)
                                : (isDependentSetup && managedFirstName
                                    ? `Any recent visits for ${managedFirstName}?`
                                    : "Any recent visits to log?")
                            )}
                      </p>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setStepChoice((s) => s === "yes" ? "pending" : "yes")}
                          className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                            stepChoice === "yes"
                              ? "bg-[#0F1B3D] text-white"
                              : "bg-[#0F1B3D]/[0.06] text-[#0F1B3D] hover:bg-[#0F1B3D]/[0.10]"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setStepChoice((s) => s === "no" ? "pending" : "no")}
                          className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                            stepChoice === "no"
                              ? "bg-[#0F1B3D] text-white"
                              : "bg-[#0F1B3D]/[0.06] text-[#0F1B3D] hover:bg-[#0F1B3D]/[0.10]"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </motion.div>
                  )}

                {showPrompt && headlineDone && stepChoice === "yes" && addKind ==="provider" && (
                  <div className="mt-3 text-left space-y-2">
                    {/* The "Any doctors ..." prompt is already shown on
                        the Yes/No gate above, so the expanded form
                        skips the title and goes straight to specialty
                        + name. */}
                    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5 scrollbar-hide sm:flex-wrap sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
                      {TOUR_SPECIALTY_OPTIONS.map((s) => {
                        const active = providerSpecialty === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setProviderSpecialty(s);
                              if (s !== "Other") setProviderCustomSpecialty("");
                            }}
                            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                              active
                                ? "bg-[#0F1B3D] text-white"
                                : "bg-[#0F1B3D]/[0.06] text-[#0F1B3D] hover:bg-[#0F1B3D]/[0.10]"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    {providerSpecialty === "Other" && (
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="What kind of doctor?"
                        value={providerCustomSpecialty}
                        onChange={(e) => setProviderCustomSpecialty(e.target.value)}
                        autoFocus
                      />
                    )}
                    <input
                      className={inputClass}
                      type="text"
                      placeholder="Name or practice"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                    />
                    {providerMatchLoading && (
                      <p className="text-[11px] text-[#8E8E93] italic">Searching nearby…</p>
                    )}
                    {providerMatch && !providerMatchLoading && (
                      <motion.button
                        type="button"
                        onClick={() => setProviderMatchAccepted((v) => !v)}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28 }}
                        className={`w-full text-left rounded-xl border p-3 transition-colors ${
                          providerMatchAccepted
                            ? "border-[#2E6BB5] bg-[#2E6BB5]/[0.08]"
                            : "border-[#E5E5EA] hover:border-[#2E6BB5]/40 hover:bg-[#f5f7fb]"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            {providerMatch.practice && (
                              <p className="text-[13px] font-semibold text-[#0F1B3D] truncate">
                                {providerMatch.practice}
                              </p>
                            )}
                            {providerMatch.address && (
                              <p className="text-[11px] text-[#5a6a82] truncate mt-0.5">
                                {providerMatch.address}
                              </p>
                            )}
                            {providerMatch.phone && (
                              <p className="text-[11px] text-[#5a6a82] truncate">
                                {providerMatch.phone}
                              </p>
                            )}
                            {!providerMatchAccepted && (
                              <p className="text-[11px] text-[#2E6BB5] font-semibold mt-1">
                                Tap to use
                              </p>
                            )}
                          </div>
                          {providerMatchAccepted && (
                            <Check className="h-4 w-4 text-[#2E6BB5] mt-0.5 shrink-0" strokeWidth={3} />
                          )}
                        </div>
                      </motion.button>
                    )}
                  </div>
                )}
                {showPrompt && headlineDone && stepChoice === "yes" && addKind ==="visit" && lastAddedProvider && !visitUseChipMode && (
                  <div className="mt-3 text-left space-y-2">
                    <p className="text-[13px] font-semibold text-[#0F1B3D]">
                      {isDependentSetup && managedFirstName
                        ? `When did ${managedFirstName} see ${lastAddedProvider.name}?`
                        : `When did you see ${lastAddedProvider.name}?`}
                    </p>
                    <input
                      className={inputClass}
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="MM/DD/YYYY"
                      value={visitDate}
                      onChange={(e) => setVisitDate(maskDateInput(e.target.value))}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setVisitUseChipMode(true)}
                      className="text-[12px] text-[#2E6BB5] hover:underline"
                    >
                      Different appointment
                    </button>
                  </div>
                )}
                {showPrompt && headlineDone && stepChoice === "yes" && addKind ==="visit" && (!lastAddedProvider || visitUseChipMode) && (
                  <div className="mt-3 text-left space-y-2">
                    <p className="text-[13px] font-semibold text-[#0F1B3D]">What kind of visit?</p>
                    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5 scrollbar-hide sm:flex-wrap sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
                      {VISIT_TYPE_CHIPS.map((chip) => {
                        const isOther = chip === "Other";
                        const active = isOther ? visitCustomOpen : (!visitCustomOpen && visitType === chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              if (isOther) {
                                setVisitCustomOpen(true);
                                setVisitType("");
                              } else {
                                setVisitType(chip);
                                setVisitCustomOpen(false);
                              }
                            }}
                            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                              active
                                ? "bg-[#0F1B3D] text-white"
                                : "bg-[#0F1B3D]/[0.06] text-[#0F1B3D] hover:bg-[#0F1B3D]/[0.10]"
                            }`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                    {visitCustomOpen && (
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="What was the appointment?"
                        value={visitType}
                        onChange={(e) => setVisitType(e.target.value)}
                        autoFocus
                      />
                    )}
                    <input
                      className={inputClass}
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="MM/DD/YYYY"
                      value={visitDate}
                      onChange={(e) => setVisitDate(maskDateInput(e.target.value))}
                    />
                  </div>
                )}
                {showPrompt && headlineDone && addKind ==="insurance" && (
                  <div className="mt-3 text-left space-y-2">
                    <p className="text-[13px] font-semibold text-[#0F1B3D]">Who's the carrier?</p>
                    <div className="relative">
                      <select
                        className={selectClass}
                        value={insuranceCarrier}
                        onChange={(e) => {
                          setInsuranceCarrier(e.target.value);
                          if (e.target.value !== "Other") setInsuranceCustomName("");
                        }}
                        autoFocus
                      >
                        <option value="">Pick a carrier...</option>
                        {TOUR_INSURANCE_CARRIERS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0F1B3D]/60" />
                    </div>
                    {insuranceCarrier === "Other" && (
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="Enter carrier name"
                        value={insuranceCustomName}
                        onChange={(e) => setInsuranceCustomName(e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                )}
                {showPrompt && headlineDone && addKind ==="family" && familyMode === "manage" && (
                  <div className="mt-3 text-left space-y-2">
                    <div className="flex gap-2">
                      <input
                        className={`${inputClass} flex-1 min-w-0`}
                        type="text"
                        placeholder="First name"
                        value={familyFirstName}
                        onChange={(e) => setFamilyFirstName(e.target.value)}
                        autoFocus
                      />
                      <input
                        className={`${inputClass} flex-1 min-w-0`}
                        type="text"
                        placeholder="Last name"
                        value={familyLastName}
                        onChange={(e) => setFamilyLastName(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <select
                        className={selectClass}
                        value={familyRelation}
                        onChange={(e) => setFamilyRelation(e.target.value)}
                      >
                        <option value="">Relationship (optional)</option>
                        {RELATION_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0F1B3D]/60" />
                    </div>
                  </div>
                )}
                {showPrompt && headlineDone && addKind ==="family" && familyMode === "choose" && inviteFeedback && (
                  <p className="mt-3 text-[12px] text-[#2E6BB5] text-center">{inviteFeedback}</p>
                )}

                {itemError && (
                  <p className="mt-3 text-[12px] text-[#B5707A] text-center">{itemError}</p>
                )}
              </motion.div>
            </AnimatePresence>
            </div>

            {headlineDone && showPrompt && addKind === "family" && familyMode === "choose" ? (
              <>
                <button
                  onClick={() => { setFamilyMode("manage"); setInviteFeedback(null); }}
                  disabled={inviteBusy}
                  className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(15,27,61,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: ctaGradient }}
                >
                  I manage care for someone else
                </button>
                <button
                  onClick={handleSendInvite}
                  disabled={inviteBusy}
                  className="w-full mt-1.5 sm:mt-2 py-2.5 sm:py-3 rounded-full font-semibold font-sans text-[14px] text-[#0F1B3D] bg-[#0F1B3D]/[0.06] hover:bg-[#0F1B3D]/[0.10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {inviteBusy ? "Generating link..." : "Invite your family"}
                </button>
                <button
                  onClick={() => handleSkipItem("family")}
                  disabled={inviteBusy}
                  className="w-full mt-1.5 sm:mt-2 py-1.5 sm:py-2 text-[13px] text-[#5a6a82] hover:text-[#0F1B3D] transition-colors disabled:opacity-40"
                >
                  I'm just managing my own care
                </button>
              </>
            ) : headlineDone && showPrompt && addKind === "family" && familyMode === "manage" ? (
              <>
                <button
                  onClick={() => canSave ? handleSaveItem("family") : handleSkipItem("family")}
                  disabled={savingItem}
                  className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(15,27,61,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: ctaGradient }}
                >
                  {savingItem ? "Adding..." : canSave ? "Add family member" : "Continue"}
                </button>
                <button
                  onClick={() => setFamilyMode("choose")}
                  disabled={savingItem}
                  className="w-full mt-1.5 sm:mt-2 py-1.5 sm:py-2 text-[13px] text-[#5a6a82] hover:text-[#0F1B3D] transition-colors disabled:opacity-40"
                >
                  Back to options
                </button>
              </>
            ) : headlineDone && showPrompt ? (
              <button
                onClick={() => canSave ? handleSaveItem(addKind!) : handleSkipItem(addKind!)}
                disabled={savingItem}
                className="w-full mt-4 py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(15,27,61,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: ctaGradient }}
              >
                {savingItem ? "Saving..." : canSave ? "Save and continue" : "Continue"}
              </button>
            ) : headlineDone ? (
              <button
                onClick={nextProfile}
                className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                style={{ background: ctaGradient }}
              >
                {isLast ? "Got it" : "Next"}
              </button>
            ) : null}
            </div>

            {/* Success overlay — covers the card briefly after a save or an
                invite link is generated, then the tour advances. Absolutely
                positioned so the card's layout height doesn't shift. */}
            <AnimatePresence>
              {successOverlay && (
                <motion.div
                  key={`overlay-${successOverlay.kind}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center text-center px-6"
                >
                  {successOverlay.kind === "invite" ? (
                    <div className="relative w-16 h-16 mb-3">
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 17 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: ctaGradient }}
                      >
                        <motion.span
                          initial={{ x: 0, y: 0, opacity: 1 }}
                          animate={{ x: 36, y: -30, opacity: [1, 1, 0] }}
                          transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }}
                          className="inline-block"
                        >
                          <Send className="w-7 h-7 text-white" />
                        </motion.span>
                      </motion.div>
                    </div>
                  ) : successOverlay.kind === "family" ? (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 16 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-[22px] mb-3"
                      style={{ background: ctaGradient }}
                    >
                      {successOverlay.initial}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 16 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                      style={{ background: ctaGradient }}
                    >
                      <Check className="w-8 h-8 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                  <motion.h3
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.2 }}
                    className="text-[16px] font-extrabold text-[#0F1B3D]"
                  >
                    {successOverlay.title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.32 }}
                    className="text-[13px] text-[#5a6a82] mt-1"
                  >
                    {successOverlay.detail}
                  </motion.p>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.5 }}
                    onClick={nextProfile}
                    className="mt-5 w-full max-w-xs py-3 rounded-full text-white font-semibold font-sans text-[14px] transition-opacity hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                    style={{ background: ctaGradient }}
                  >
                    Continue
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
      </>,
      document.body
    );
  }

  // ── Phase: Chat explanation (Joyride targeting input bar) ──
  if (phase === "chat") {
    // Chat spotlight done → end the tour. Reviews + paywall now fire
    // together from chat-area when the user's second meaningful send
    // hits the post-seed gate, so the tour itself ends here.
    return (
      <ChatStepJoyride
        onMount={() => {
          // Keep the desktop/tablet shell stable for the final chat step.
          // The chat composer should be spotlighted in the layout the user
          // is about to actually use, which includes the persistent sidebar.
          // On mobile, still close the drawer so the composer remains visible.
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            onSidebar(false);
          } else {
            onSidebar(true);
          }
          onProfilePopover(false, undefined, false);
        }}
        onFinish={() => { setShellFading(false); finishTour(); }}
        onSkip={skipTour}
      />
    );
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
      className="mt-3 sm:mt-4 rounded-2xl border border-[#E5E5EA] p-4 sm:p-5 text-center"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #fff5f4 100%)" }}
    >
      <div className="flex items-baseline justify-center gap-0.5">
        {variant === "money" && (
          <span className="text-[32px] sm:text-[40px] font-extrabold text-[#FF3B30] tracking-tight leading-none">$</span>
        )}
        <AnimatedCounter target={target} className="text-[44px] sm:text-[56px] font-extrabold text-[#FF3B30] tracking-tight leading-none" />
      </div>
      <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mt-1 sm:mt-2">
        {unitLabel}
      </p>
      <p className="text-[15px] sm:text-[18px] font-bold text-[#0F1B3D] mt-3 sm:mt-4 text-balance leading-tight">{punchline}</p>
      <p className="text-[12px] sm:text-[13px] text-[#5a6a82] font-light mt-1.5 sm:mt-2 leading-snug">{bodyLine}</p>
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
      className={`flex items-center gap-3 w-full px-4 py-2.5 sm:py-3.5 rounded-full border text-left transition-all duration-200 ${
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

function GradientButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="w-full mt-5 py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}>
      {label}
    </button>
  );
}

function BenefitTiles({
  routerChoice,
  painSelection,
}: {
  routerChoice: RouterChoice | null;
  painSelection: string | null;
}) {
  // Four mini-spotlights in a 2×2 grid. Each tile reveals in three beats:
  //   1. Container fades + scales in
  //   2. Label streams word-by-word
  //   3. Visual fades in once the label finishes
  // Tiles start 700ms apart so the first lands before the next begins,
  // creating a clear top-left → top-right → bottom-left → bottom-right
  // cascade.
  //
  // Tile order is pain-first, router-second: if we captured a pain
  // bucket, that wins (money pain → costs tile leads; time pain → hours
  // tile leads) so the top-left spotlight echoes what the user just
  // named. routerChoice is only used as a fallback for users who
  // skipped pain (e.g. staying_healthy branch).
  const tileHours = { key: "hours", label: "Hours back every week", visual: <BookingMiniCard /> };
  const tileMoney = { key: "money", label: "Typically cut costs 20 to 40%", visual: <PricingMiniCard /> };
  const tileFamily = { key: "family", label: "Every family member in one place", visual: <FamilyMiniCard /> };
  const tileInsurance = { key: "insurance", label: "Get the most from your insurance", visual: <InsuranceMiniCard /> };

  const isMoneyPain = painSelection != null
    && ["lt500", "500to2k", "2kto5k", "5kplus"].includes(painSelection);
  const isTimePain = painSelection != null
    && ["lt1", "1to3", "3to6", "6plus"].includes(painSelection);

  let tiles: typeof tileHours[];
  if (isMoneyPain) {
    tiles = [tileMoney, tileInsurance, tileHours, tileFamily];
  } else if (isTimePain) {
    tiles = [tileHours, tileInsurance, tileMoney, tileFamily];
  } else if (routerChoice === "money" || routerChoice === "medications") {
    tiles = [tileMoney, tileInsurance, tileHours, tileFamily];
  } else {
    tiles = [tileHours, tileMoney, tileInsurance, tileFamily];
  }

  return (
    <div className="grid grid-cols-2 gap-3 mb-1">
      {tiles.map((tile, i) => (
        <RevealingTile
          key={tile.key}
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
          <div className="text-[9px] font-semibold text-[#0F1B3D] truncate">On hold with BCBS</div>
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

function ChatStepJoyride({ onFinish, onMount, onSkip }: { onFinish: () => void; onMount?: () => void; onSkip?: () => void }) {
  const finishRef = useRef(false);
  // Stash onFinish in a ref so the advance effect below doesn't re-run
  // (and reset its 20s safety timer) every time the parent passes a
  // fresh function identity.
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  // Fire once when the chat joyride first mounts — parent uses this to
  // guarantee the sidebar + profile popover are closed before the
  // chat-input spotlight lands.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    onMount?.();
  }, [onMount]);

  const { controls, on, Tour } = useJoyride({
    steps: [
      {
        target: "[data-tour='chat-input']",
        placement: "top",
        disableBeacon: true,
        skipBeacon: true,
        title: "Let's do this together.",
        content: "I'll start on the tasks we just went over. This is where you and I work side by side.",
        locale: { next: "Let's go", last: "Let's go" },
        hideCloseButton: true,
        tooltipComponent: TourTooltip,
      },
    ],
    continuous: true,
    styles: {
      // Dim-only — see note on the profile-button Joyride about why
      // backdrop-filter doesn't play well with masked spotlight overlays.
      options: { primaryColor: "#0F1B3D", zIndex: 99999, overlayColor: "rgba(0,0,0,0.45)" },
      beacon: { display: "none" },
    },
  } as any);

  useEffect(() => {
    controls.start();
  }, [controls]);

  // Listen on TOUR_END (not STEP_AFTER) so dismissing the spotlight via
  // Finish, X, or clicking the dim overlay all advance the tour. Using
  // STEP_AFTER alone left the tour state stuck at "chat" when users
  // closed the tooltip without clicking Finish. No auto-advance timeout
  // — user must click "Let's go" (or the X / dim overlay) to finish.
  useEffect(() => {
    const fire = () => {
      if (finishRef.current) return;
      finishRef.current = true;
      onFinishRef.current();
    };
    const unsub = on(EVENTS.TOUR_END, fire);
    return () => { unsub(); };
  }, [on]);

  return (
    <>
      <button
        type="button"
        onClick={() => onSkip?.()}
        className="fixed top-4 right-4 z-[100000] text-[12px] font-medium text-[#8E8E93] transition-colors hover:text-[#0F1B3D]"
      >
        Skip for now
      </button>
      {Tour}
    </>
  );
}
