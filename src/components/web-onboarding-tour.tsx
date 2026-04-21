"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronDown, Heart, Users, User, Baby, HelpCircle, DollarSign, Clock, HeartPulse, Phone, Check, Send, Plus } from "lucide-react";
import { useJoyride, EVENTS, STATUS } from "react-joyride";
import * as analytics from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
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

interface WebOnboardingTourProps {
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
  { id: "family", title: "For you and your people", body: "Keep all of your family's health in one place.", tab: "health", addKind: "family", showSwitcher: true },
];

type Phase = "intro" | "care" | "care-ack" | "router" | "pain" | "value" | "profile-form" | "situation" | "meds" | "care-plan" | "validation" | "dependents" | "elena-plan" | "joyride" | "profile" | "chat" | "done";

// Dependent entry for the caregiver-branch "who are you caring for"
// phase. relationship maps to the backend's ManagedProfileRequest
// vocabulary (child, spouse, parent, sibling, other); careId is the
// originating CARE_OPTIONS id so we can match back to selections.
type Dependent = { careId: string; relationship: string; label: string; firstName: string; lastName: string };

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
// what's going on) but diverge after. Caregiver / staying-healthy skip
// the condition block entirely and go straight to a branch-tuned
// elena-plan → joyride.
type RouterChoice = "condition" | "medications" | "money" | "caregiver" | "staying_healthy";

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
  "I can find the best price for your appointments, procedures, and medications.",
  "I can call your insurance to check coverage before you go.",
  "I can help you pay bills on time and dispute wrong charges.",
  "I can compare plans and help you get the most out of your insurance.",
  "I can find home medical equipment at the best price.",
];
const CAREGIVER_BRANCH_HERO_VALUES = [
  "I can call providers to book visits for everyone you care for.",
  "I can research in-network options for each person.",
  "I can flag med interactions across the family.",
];
const STAYING_HEALTHY_BRANCH_HERO_VALUES = [
  "I can call your PCP to book your annual physical.",
  "I can schedule screenings on the right cadence.",
  "I can price-shop labs and imaging in-network.",
];

// Classify a hero line into a visual bucket. Kept in sync with
// visualForHeroLine below so we can dedupe lines that would render the
// same mockup (e.g. a derived refill line + a base refill line both
// hitting CallMini's refill variant). Using string tags makes the
// dedup work across visual families (CallMini's 3 contexts each count
// as distinct variants).
type HeroVariant =
  | "pain"
  | "family"
  | "bill"
  | "pricing"
  | "call-refill"
  | "call-hold"
  | "call-schedule"
  | "booking";

function variantForLine(line: string): HeroVariant {
  const l = line.toLowerCase();
  if (l.includes("you said")) return "pain";
  if (l.includes("you're caring for") || l.includes("across the family") || l.includes("care straight")) return "family";
  if (l.includes("pay ") || l.includes("bill") || l.includes("dispute")) return "bill";
  if (l.includes("price-shop") || l.includes("best price") || l.includes("compare plans")) return "pricing";
  if (l.includes("call") || l.includes("track when") || l.includes("renew")) {
    if (l.includes("refill") || l.includes("renew") || l.includes("runs out") || l.includes("pharmacy")) return "call-refill";
    if (l.includes("insurance") || l.includes("coverage")) return "call-hold";
    return "call-schedule";
  }
  if (l.includes("schedule") || l.includes(" book") || l.includes("coordinate")) return "booking";
  if (l.includes("research") || l.includes("find")) return "pricing";
  return "call-schedule";
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

// Strip Elena-voice prefaces and rewrite to user-voice. Used by both the
// seed-message builder and the todo-creation path so what Elena receives
// and what shows up on the game plan stay in sync. Handles both chip-
// picked hero lines ("I can help bring that down") and custom-typed
// actions (already user-voice, passed through unchanged except casing).
function cleanActionToUserVoice(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^You said [^.]+\.\s*/i, "");
  s = s.replace(/^You're caring for [^.]+\.\s*/i, "");
  s = s.replace(/^I can /i, "");
  s = s.replace(/\byour\b/gi, "my");
  if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

// Build a human-readable list ("my mom Linda Smith", "my mom Linda
// and my partner David", etc.). Used by buildSeedMessageFromActions
// to give Elena concrete context about who the caregiver is asking
// about. Full name if lastName present, else first name only.
function formatDependentsList(deps: { relationship: string; label: string; firstName: string; lastName: string }[]): string {
  if (deps.length === 0) return "";
  const parts = deps.map((d) => {
    const full = d.lastName ? `${d.firstName} ${d.lastName}`.trim() : d.firstName;
    return `my ${d.label} ${full}`;
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// Convert the user's picked hero lines (written in Elena's first-person
// "I can..." voice) into a user-addressed opening message for the chat.
// Elena's agent receives this as the user's first turn and starts on it.
// Multi-action picks join as a bulleted request; solo picks become a
// single imperative sentence. Derived lines that don't start with "I
// can" (e.g. "You said $X. I can help…") get their "You said" prefix
// trimmed off so the request reads naturally.
//
// Context-aware preamble: caregivers get a lead-in line naming who they
// care for ("I'm caring for my mom Linda and my partner David.") so
// Elena starts with concrete context instead of generic bullets like
// "Keep it all straight" that don't tell her about whom. Falls back to
// plain bullets when no dependents were captured or branch isn't caregiver.
function buildSeedMessageFromActions(
  actions: string[],
  opts?: {
    branch?: RouterChoice | null;
    dependents?: { relationship: string; label: string; firstName: string; lastName: string }[];
  },
): string {
  const cleaned = actions.map(cleanActionToUserVoice).filter((s) => s.length > 0);
  if (cleaned.length === 0) return "";
  const isCaregiver = opts?.branch === "caregiver";
  const deps = opts?.dependents || [];
  const preamble = isCaregiver && deps.length > 0
    ? `I'm a caregiver helping ${formatDependentsList(deps)}.`
    : "";
  const body = cleaned.length === 1
    ? cleaned[0]
    : `Please help me with these:\n${cleaned.map((s) => `• ${s}`).join("\n")}`;
  return preamble ? `${preamble}\n\n${body}` : body;
}

// elena-plan row: selectable action card. Vertical layout with the mini
// mockup up top and the "Want me to..." proposal text below. Tapping
// the card toggles it into a selected state (soft green tint + check
// badge) — users can pick multiple. Three-beat entry cascade (card
// springs in → mockup fades in → text fades in) mirrors BenefitTiles.
function ElenaPlanRow({
  line,
  startDelayMs,
  selected,
  onToggle,
}: {
  line: string;
  startDelayMs: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const [cardShown, setCardShown] = useState(false);
  const [visualShown, setVisualShown] = useState(false);
  const [textShown, setTextShown] = useState(false);
  const ease = [0.4, 0, 0.2, 1] as const;

  useEffect(() => {
    const t1 = setTimeout(() => setCardShown(true), startDelayMs);
    const t2 = setTimeout(() => setVisualShown(true), startDelayMs + 240);
    const t3 = setTimeout(() => setTextShown(true), startDelayMs + 420);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [startDelayMs]);

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={cardShown ? { opacity: 1, y: 0, scale: 1 } : undefined}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
      className={`relative flex flex-col gap-3 max-md:gap-1.5 p-4 max-md:p-2.5 rounded-2xl text-left transition-colors duration-200 ${
        selected
          ? "bg-gradient-to-br from-[#34C759]/[0.12] to-[#34C759]/[0.04] ring-2 ring-[#34C759]/45 shadow-[0_3px_14px_rgba(52,199,89,0.18)]"
          : "bg-[#F6F7FB] ring-1 ring-[#0F1B3D]/[0.07] shadow-[0_3px_14px_rgba(15,27,61,0.06)] hover:ring-[#0F1B3D]/[0.15]"
      }`}
    >
      <AnimatePresence>
        {selected && (
          <motion.span
            key="check-badge"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute top-2.5 right-2.5 max-md:top-1.5 max-md:right-1.5 w-7 h-7 max-md:w-5 max-md:h-5 rounded-full bg-[#34C759] flex items-center justify-center shadow-[0_2px_6px_rgba(52,199,89,0.4)]"
          >
            <Check className="w-4 h-4 max-md:w-3 max-md:h-3 text-white" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
      <div className="min-h-[80px] max-md:min-h-[48px] flex items-center justify-center px-1">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={visualShown ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.34, ease }}
          className="w-full max-md:scale-[0.78] max-md:origin-center"
        >
          {visualForHeroLine(line)}
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={textShown ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3, ease }}
        className={`text-[14px] max-md:text-[12.5px] leading-snug font-semibold text-center text-balance ${selected ? "text-[#0F1B3D]" : "text-[#0F1B3D]"}`}
      >
        {line}
      </motion.div>
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
  return (
    <div className="w-full max-w-[300px] mx-auto bg-white rounded-xl shadow-[0_2px_10px_rgba(15,27,61,0.10)] border border-[#E5E5EA] px-3 py-2.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[#34C759] flex items-center justify-center flex-shrink-0">
        <Check className="w-4 h-4 text-white" strokeWidth={3} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[#0F1B3D] truncate">Booked with Dr. Chen</div>
        <div className="text-[11px] font-semibold text-[#34C759] mt-[2px]">Thu · Apr 18 · 10am</div>
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
  return (
    <div className="w-full max-w-[300px] mx-auto flex flex-col gap-1">
      {members.map((m, i) => (
        <div
          key={m.label}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 ${
            i === 0
              ? "bg-white border border-[#0F1B3D]/20 shadow-[0_1px_4px_rgba(15,27,61,0.08)]"
              : ""
          }`}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
            style={{ background: m.bg, color: m.fg }}
          >
            {m.initials}
          </div>
          <div className="text-[12px] font-semibold text-[#0F1B3D] truncate">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

export function WebOnboardingTour({ onComplete, onShowPaywall, onProfilePopover, onSidebar, onSeedQuery }: WebOnboardingTourProps) {
  // Auth hooks for the profile-form phase (migrated from the old OnboardingModal)
  const {
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
  } = useAuth();

  // Resume-on-refresh: tour state is persisted to sessionStorage on every
  // change and restored here on mount. Snapshot is computed once (useMemo
  // with []) so state initializers see a stable value. Cleared in
  // finishTour / skipTour so a fresh tour starts at phase "intro".
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
    dependents: Dependent[];
  }> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = sessionStorage.getItem("elena_tour_state");
      if (!raw) return {};
      const s = JSON.parse(raw);
      if (s.phase === "joyride") s.phase = "profile";
      return s;
    } catch {
      return {};
    }
  }, []);

  const [phase, setPhase] = useState<Phase>(tourSnapshot.phase ?? "intro");
  const [profileStep, setProfileStep] = useState(tourSnapshot.profileStep ?? 0);

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
  const [checkedPlanItems, setCheckedPlanItems] = useState<string[]>(tourSnapshot.checkedPlanItems ?? []);
  const [savingSituation, setSavingSituation] = useState(false);
  // elena-plan is now an action picker, not a promise read-out. Users
  // toggle which cards they want Elena to actually start on; freeform
  // captures "something else" intent. These persist into the chat via
  // sessionStorage on tour finish so the landing chat can kick off
  // exactly what the user just asked for.
  const [confirmedActions, setConfirmedActions] = useState<string[]>(tourSnapshot.confirmedActions ?? []);
  const [customActionText, setCustomActionText] = useState(tourSnapshot.customActionText ?? "");

  // Caregiver-branch "who are you caring for" phase. Seeded lazily on
  // phase entry from careSelections (user's earlier relationship picks);
  // each row is a name input that can be left blank to skip. Saved as
  // linked managed profiles via POST /profiles on Continue.
  const [dependents, setDependents] = useState<Dependent[]>(tourSnapshot.dependents ?? []);
  const [savingDependents, setSavingDependents] = useState(false);

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

  // Sync form fields from profileData when it arrives (OAuth name, quiz-funnel DOB/zip).
  useEffect(() => {
    if (profileData?.firstName && !firstName) setFirstName(profileData.firstName);
    if (profileData?.lastName && !lastName) setLastName(profileData.lastName);
    if (profileData?.dob && !dob) setDob(isoToDisplayDate(profileData.dob));
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
  // Synchronous guard for advanceFromElenaPlan — the state-based
  // `savingSituation` flag doesn't flush in time to block a double-
  // click, which produces duplicate todo POSTs. A ref flips before
  // any async work so a second invocation short-circuits cleanly.
  const advanceFromElenaPlanRef = useRef(false);

  const { controls, on, Tour } = useJoyride({
    steps: JOYRIDE_STEPS,
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
    analytics.track("Web Tour Started" as any);
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
    if (phase === "done" || phase === "intro") return;
    try {
      sessionStorage.setItem(
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
          dependents,
        }),
      );
    } catch {}
  }, [
    phase, profileStep, careSelections, routerChoice, painSelection,
    firstName, lastName, dob, zipCode,
    selectedSituation, customSituation,
    selectedMeds, customMeds, checkedPlanItems,
    confirmedActions, customActionText, dependents,
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
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      if (isMobile.current) onSidebarRef.current(false);
      onProfilePopoverRef.current(true, "health", false);
      setPhase("profile");
      setProfileStep(0);
    };
    const unsub = on(EVENTS.TOUR_END, fire);
    const timer = setTimeout(fire, 20000);
    return () => { unsub(); clearTimeout(timer); };
  }, [phase, on]);

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
    if (trimmed.length < 3 || !providerSpecialty) {
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
        // Prefer the tour's own zip state (captured in the profile-form
        // phase a few screens back) — it's always fresh. Fall back to the
        // auth-context cached profile data which can lag after signup.
        const zipUsed = zipCode.trim() || profileData?.zipCode || "";
        const res = await apiFetch("/doctors/enrich", {
          method: "POST",
          body: JSON.stringify({
            doctors: [{ name: bareName, specialty: providerSpecialty }],
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
  }, [providerName, providerSpecialty, zipCode, profileData?.zipCode]);

  const nextProfile = useCallback(() => {
    if (guardRef.current) return;
    guardRef.current = true;
    setTimeout(() => { guardRef.current = false; }, 600);

    analytics.track("Web Tour Step Viewed" as any, { step: profileStep + 2, step_name: PROFILE_STEPS[profileStep]?.title });

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

    if (profileStep >= PROFILE_STEPS.length - 1) {
      onProfilePopover(false, undefined, false);
      setPhase("chat");
      return;
    }
    // Card stays mounted in place — only tab + text content swap
    setProfileStep((s) => s + 1);
  }, [profileStep, onProfilePopover]);

  // Does the user already have ≥1 item of this kind? If yes, we skip the
  // inline add prompt on that card and show the plain description instead.
  const hasExistingData = useCallback(
    (kind: AddKind | null) => {
      // Dev override — see forcePrompts declaration.
      if (forcePrompts) return false;
      if (!kind) return false;
      if (kind === "provider") return doctors.length > 0;
      if (kind === "visit") return careVisits.length > 0;
      // profiles includes the user's own profile, so >1 means they've added
      // someone else.
      if (kind === "family") return profiles.length > 1;
      // Treat any medical insurance card as "already has data" so we don't
      // overwrite structured fields the user already captured by uploading.
      if (kind === "insurance") return insuranceCards.some((c) => c.card_type === "medical");
      return false;
    },
    [forcePrompts, doctors.length, careVisits.length, profiles.length, insuranceCards],
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
          if (!providerName.trim() || !resolvedSpecialty || !profileId) {
            throw new Error("Pick a type and enter a name");
          }
          const bareName = providerName.trim().replace(/^(Dr\.?\s+)/i, "").trim() || providerName.trim();
          // If the user tapped the enrichment card, include the backfilled
          // practice/phone/address so Elena starts with a fully-formed
          // provider record. Otherwise just send what they typed.
          const payload: Record<string, unknown> = {
            name: bareName,
            specialty: resolvedSpecialty,
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
          // Refresh the profiles dropdown so the new family member appears
          // without switching the active profile (refreshProfiles does not
          // touch profileId).
          await refreshProfiles();
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
    try {
      const res = await apiFetch("/family/invite", {
        method: "POST",
        body: JSON.stringify({ invitee_name: "", relationship: "other" }),
      });
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
      setItemError(e?.message || "Something went wrong");
      setInviteBusy(false);
      return;
    }
    // leave inviteBusy true until the success overlay advances the tour.
  }, [inviteBusy, profileStep, profileData]);

  // Hold the success overlay briefly, then advance. Separate effect so the
  // overlay animates in first and the tour doesn't snap away instantly.
  useEffect(() => {
    if (!successOverlay) return;
    // Hold long enough for the user to both see the overlay confirmation on
    // the card AND register the entrance/pulse in the profile popover
    // above. Family holds slightly longer because the tour closes the
    // popover entirely when advancing past the last profile step, and we
    // want the user to see the new profile arrive before it disappears.
    const hold = successOverlay.kind === "invite"
      ? 1500
      : successOverlay.kind === "family"
      ? 1900
      : 1200;
    const timer = setTimeout(() => { nextProfile(); }, hold);
    return () => clearTimeout(timer);
  }, [successOverlay, nextProfile]);


  const finishTour = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    analytics.track("Web Tour Completed" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    try { sessionStorage.removeItem("elena_tour_in_progress"); } catch {}
    try { sessionStorage.removeItem("elena_tour_state"); } catch {}
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
          dependents?: { relationship: string; label: string; firstName: string; lastName: string }[];
        };
        const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
        if (actions.length > 0) {
          const seedMessage = buildSeedMessageFromActions(actions, {
            branch: parsed.branch ?? null,
            dependents: Array.isArray(parsed.dependents) ? parsed.dependents : [],
          });
          if (seedMessage) {
            // Prefer the callback path: force-tour users already have
            // the chat page mounted, and its one-time pending-query
            // pickup has already run — they'd never see a localStorage
            // write. localStorage stays as a fallback for the rare
            // case where the parent doesn't wire the callback.
            if (onSeedQuery) {
              onSeedQuery(seedMessage);
            } else {
              localStorage.setItem("elena_pending_query", seedMessage);
            }
            // Post-tour paywall gate: let the seeded first message run
            // end-to-end for free (activation moment), then gate the
            // user's next meaningful send on subscription. chat-area
            // reads this flag in its handleSend to intercept send #2.
            try { sessionStorage.setItem("elena_tour_post_seed_gate", "1"); } catch {}
          }
          analytics.track("Web Tour Seed Query Written" as any, {
            action_count: actions.length,
            via: onSeedQuery ? "callback" : "localStorage",
          });
        }
        sessionStorage.removeItem("elena_tour_seeded_actions");
      }
    } catch {}
    onProfilePopover(false, undefined, false);
    if (isMobile.current) onSidebar(false);
    setPhase("done");
    onComplete();
  }, [onComplete, onProfilePopover, onSidebar, onSeedQuery]);

  const skipTour = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    analytics.track("Web Tour Skipped" as any);
    localStorage.setItem("elena_web_tour_done", "true");
    try { sessionStorage.removeItem("elena_tour_in_progress"); } catch {}
    try { sessionStorage.removeItem("elena_tour_state"); } catch {}
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

  const advanceFromIntro = useCallback(() => {
    setPhase("care");
  }, []);

  const advanceFromCare = useCallback(() => {
    if (careSelections.length > 0) analytics.track("Web Tour Care Context" as any, { care_for: careSelections });
    // Caregivers managing more than one person get an acknowledgment beat
    // first so they feel seen about the multi-person load. Single-person
    // selections (including myself-only) skip straight to the router.
    if (careSelections.length >= 2) {
      setPhase("care-ack");
    } else {
      setPhase("router");
    }
  }, [careSelections]);

  const advanceFromCareAck = useCallback(() => {
    analytics.track("Web Tour Care Ack Continued" as any, { count: careSelections.length });
    setPhase("router");
  }, [careSelections.length]);

  const advanceFromPain = useCallback(() => {
    analytics.track("Web Tour Pain Step" as any, { bucket: painSelection });
    analytics.track("Web Tour Value Step Shown" as any, { lp_variant: lpVariant || "homepage" });
    setPhase("value");
  }, [painSelection, lpVariant]);

  // Post-profile routing: condition / medications / money collect
  // what's going on first via situation. Caregiver routes into its
  // own "who are you caring for" dependents capture. Staying-healthy
  // has no domain-specific capture and goes straight to elena-plan.
  const routeAfterProfile = useCallback(() => {
    if (routerChoice === "caregiver") {
      setPhase("dependents");
    } else if (routerChoice === "staying_healthy") {
      setPhase("elena-plan");
    } else {
      setPhase("situation");
    }
  }, [routerChoice]);

  const advanceFromValue = useCallback(() => {
    analytics.track("Web Tour Value Step Continued" as any, { lp_variant: lpVariant || "homepage" });
    // Fresh signup without pre-filled profile → collect name/DOB/zip first;
    // handleProfileSubmit then routes into the appropriate branch.
    if (needsOnboarding) {
      setPhase("profile-form");
    } else {
      // Profile already set up (quiz funnel, force-tour, etc.). Route
      // straight into the branch the user picked in the router earlier.
      routeAfterProfile();
    }
  }, [lpVariant, needsOnboarding, routeAfterProfile]);

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
      date_of_birth: displayToIsoDate(dob) || undefined,
      home_address: zipCode.trim(),
    });
    setSavingProfile(false);
    // Router already ran before value + profile-form, so we have the
    // user's branch pick. Go straight into the right downstream phase.
    routeAfterProfile();
  }, [canSubmitProfile, firstName, lastName, dob, zipCode, completeOnboarding, routeAfterProfile]);

  // Fire "Onboarding Modal Shown" analytics when the profile-form phase opens,
  // preserving data continuity with the prior OnboardingModal. (Event name kept
  // the same on purpose — so dashboards keep working.)
  useEffect(() => {
    if (phase === "profile-form") analytics.track("Onboarding Modal Shown" as any, { source: "tour" });
  }, [phase]);

  // Router → pain. The router's 5 buckets also drive the pain variant:
  // money-centric picks (money, medications) show the dollars-over-decade
  // variant; others show the hours-per-year variant. Branching into the
  // condition block (situation vs elena-plan) happens later, via
  // routeAfterProfile, after value + profile-form.
  const advanceFromRouter = useCallback(() => {
    if (!routerChoice) return;
    analytics.track("Web Tour Router Selected" as any, { choice: routerChoice });
    setPhase("pain");
  }, [routerChoice]);

  const advanceFromSituation = useCallback(() => {
    const chip = getChip(selectedSituation);
    const tpl = getTemplate(selectedSituation);
    analytics.track("Web Tour Situation Selected" as any, {
      situation: selectedSituation,
      source: chip ? (chip.conditionName ? "chips" : "chips_freeform") : "alias",
      custom_text: customSituation.trim() || undefined,
      branch: routerChoice,
    });
    // Condition, medications, and money branches all collect meds next.
    // Money also goes through meds so Elena can price-shop the user's
    // specific prescriptions, not just speak in generalities.
    if (tpl) {
      setPhase("meds");
      return;
    }
    // Freeform non-template (user picked "Something else" and typed a
    // condition that didn't match any alias). Condition branch skips to
    // validation; medications / money branches still want meds so we
    // route there so they can type their list.
    if (routerChoice === "medications" || routerChoice === "money") {
      setPhase("meds");
    } else {
      setPhase("validation");
    }
  }, [selectedSituation, customSituation, routerChoice]);

  // User tapped the alias-match suggestion card under the "Something else"
  // input. Swap selectedSituation to the matched template key so the rest
  // of the condition block uses that template's content.
  const acceptSituationSuggestion = useCallback((templateKey: string) => {
    setSelectedSituation(templateKey);
    setSelectedMeds([]);
    setCustomMeds([]);
    setCheckedPlanItems([]);
    analytics.track("Web Tour Situation Selected" as any, {
      situation: templateKey,
      source: "alias",
      custom_text: customSituation.trim(),
      branch: routerChoice,
    });
    setPhase("meds");
  }, [customSituation, routerChoice]);

  const advanceFromMeds = useCallback(() => {
    analytics.track("Web Tour Meds Selected" as any, {
      situation: selectedSituation,
      count: selectedMeds.length,
      custom_count: customMeds.length,
      branch: routerChoice,
    });
    // Medications and money branches skip the care-plan review +
    // validation beat and go straight to the elena-plan pitch.
    // Only the condition branch does the full care-plan + validation.
    if (routerChoice === "medications" || routerChoice === "money") {
      setPhase("elena-plan");
    } else {
      setPhase("care-plan");
    }
  }, [selectedSituation, selectedMeds.length, customMeds.length, routerChoice]);

  const advanceFromCarePlan = useCallback(() => {
    const tpl = getTemplate(selectedSituation);
    const total = tpl?.planItems.length ?? 0;
    analytics.track("Web Tour Care Plan Reviewed" as any, {
      situation: selectedSituation,
      checked_count: checkedPlanItems.length,
      total_items: total,
    });
    setPhase("validation");
  }, [selectedSituation, checkedPlanItems.length]);

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
    analytics.track("Web Tour Elena Plan Continued" as any, {
      situation: selectedSituation,
      branch: routerChoice,
      confirmed_count: confirmedActions.length,
      has_custom: trimmedCustom.length >= 3,
    });
    // Stash the user's chosen actions for the chat page to read on
    // mount. Phase 2 will pick these up and seed the opening exchange
    // so Elena starts on them automatically. For now it's just a
    // persisted handoff — no chat behavior change yet.
    try {
      if (seededActions.length > 0) {
        const namedDeps = dependents
          .filter((d) => d.firstName.trim().length > 0)
          .map((d) => ({
            relationship: d.relationship,
            label: d.label,
            firstName: d.firstName.trim(),
            lastName: d.lastName.trim(),
          }));
        sessionStorage.setItem("elena_tour_seeded_actions", JSON.stringify({
          actions: seededActions,
          branch: routerChoice,
          situation: selectedSituation,
          conditionName: customSituation.trim() || null,
          dependents: namedDeps,
          created_at: new Date().toISOString(),
        }));
      }
    } catch {}
    setSavingSituation(true);
    const chip = getChip(selectedSituation);
    const tpl = getTemplate(selectedSituation);
    const conditionName = chip?.conditionName || customSituation.trim();
    // Branches that collected a condition (condition / medications / money)
    // save it. Caregiver / staying-healthy didn't collect one.
    const collectedCondition = routerChoice === "condition" || routerChoice === "medications" || routerChoice === "money";
    try {
      if (profileId && collectedCondition && conditionName) {
        await apiFetch(`/profile/${profileId}/conditions/add`, {
          method: "POST",
          body: JSON.stringify({ name: conditionName, status: "active" }),
        }).catch((e) => console.log("[tour] condition save failed", e));
      }
      // Meds: condition, medications, and money branches all collect
      // them. Only caregiver / staying_healthy skipped this step.
      if (profileId && tpl && (routerChoice === "condition" || routerChoice === "medications" || routerChoice === "money")) {
        const allMeds = [...selectedMeds, ...customMeds.map((m) => m.trim()).filter(Boolean)];
        await Promise.all(
          allMeds.map((name) =>
            apiFetch(`/profile/${profileId}/medications/add`, {
              method: "POST",
              body: JSON.stringify({ name, indication: tpl.conditionName }),
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

      // Care-plan template items (condition branch only)
      if (profileId && tpl && routerChoice === "condition") {
        const remaining = tpl.planItems.filter((it) => !checkedPlanItems.includes(it.id));
        for (const it of remaining) {
          push({
            title: it.todoText,
            subtitle: tpl.conditionName,
            book_message: `Help me ${it.todoText.charAt(0).toLowerCase() + it.todoText.slice(1)}`,
          });
        }
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
        const isCaregiver = routerChoice === "caregiver";
        const namedDeps = dependents.filter((d) => d.firstName.trim().length > 0);
        for (const raw of seededActions) {
          const cleanedTitle = cleanActionToUserVoice(raw);
          if (!cleanedTitle) continue;
          const isGenericCaregiver =
            /everyone (i|my) care for|everyone i care for|for each person|across the family/i.test(cleanedTitle);
          const isAbstract =
            /keep it all straight|keep.*straight in one place|keep it straight/i.test(cleanedTitle);
          if (isCaregiver && isAbstract) continue;
          if (isCaregiver && isGenericCaregiver && namedDeps.length > 0) {
            for (const d of namedDeps) {
              const name = d.firstName.trim();
              let perPerson: string;
              if (/book.*visit|call.*provider/i.test(cleanedTitle)) {
                perPerson = `Book ${name}'s next visit`;
              } else if (/in-network.*option|in.*network/i.test(cleanedTitle)) {
                perPerson = `Find in-network providers for ${name}`;
              } else if (/med.*interaction|medication/i.test(cleanedTitle)) {
                perPerson = `Review ${name}'s medications for interactions`;
              } else {
                perPerson = cleanedTitle
                  .replace(/for everyone (i|my) care for/gi, `for ${name}`)
                  .replace(/for each person/gi, `for ${name}`)
                  .replace(/across the family/gi, `for ${name}`);
              }
              const stem = perPerson.charAt(0).toLowerCase() + perPerson.slice(1);
              push({ title: perPerson, subtitle: name, book_message: `Help me ${stem}` });
            }
            continue;
          }
          const lowered = cleanedTitle.charAt(0).toLowerCase() + cleanedTitle.slice(1);
          const bookStem = lowered.startsWith("help ") ? lowered.slice(5) : lowered;
          push({
            title: cleanedTitle,
            ...(actionSubtitle ? { subtitle: actionSubtitle } : {}),
            book_message: `Help me ${bookStem}`,
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
  }, [savingSituation, selectedSituation, customSituation, selectedMeds, customMeds, checkedPlanItems, profileId, routerChoice, confirmedActions, customActionText, dependents, beginJoyride, leaveShellThen]);

  // Fire the validation-shown event once when the phase enters (it's the
  // "wow" beat, so we track regardless of what the user does next).
  useEffect(() => {
    if (phase !== "validation") return;
    const tpl = getTemplate(selectedSituation);
    analytics.track("Web Tour Validation Shown" as any, {
      situation: selectedSituation,
      done_count: checkedPlanItems.length,
      remaining_count: tpl ? tpl.planItems.length - checkedPlanItems.length : 0,
    });
  }, [phase, selectedSituation, checkedPlanItems.length]);

  // Seed the dependents state on entering the phase from careSelections.
  // Non-"myself" picks become one row each; if the user picked only
  // "myself" (or nothing) we still render a single freeform row so a
  // caregiver can type a name without the flow being a dead end.
  useEffect(() => {
    if (phase !== "dependents") return;
    if (dependents.length > 0) return;
    const rows = careSelections
      .filter((id) => id !== "myself")
      .map<Dependent>((id) => ({
        careId: id,
        relationship: careIdToRelationship(id),
        label: careIdToNounLabel(id),
        firstName: "",
        lastName: "",
      }));
    setDependents(
      rows.length > 0
        ? rows
        : [{ careId: "other", relationship: "other", label: "someone", firstName: "", lastName: "" }],
    );
  }, [phase, careSelections, dependents.length]);

  useEffect(() => {
    if (phase !== "dependents") return;
    analytics.track("Web Tour Dependents Shown" as any, {
      relationship_count: careSelections.filter((id) => id !== "myself").length,
    });
  }, [phase, careSelections]);

  // Save dependents as linked managed profiles, then continue to
  // elena-plan. Each non-empty row POSTs once via /profiles. Failures
  // are logged but don't block the flow — name capture is best-effort.
  const advanceFromDependents = useCallback(async () => {
    if (savingDependents) return;
    const toSave = dependents.filter((d) => d.firstName.trim().length > 0);
    analytics.track("Web Tour Dependents Continued" as any, {
      saved_count: toSave.length,
      total_rows: dependents.length,
    });
    setSavingDependents(true);
    try {
      if (toSave.length > 0) {
        await Promise.all(
          toSave.map((d) =>
            apiFetch("/profiles", {
              method: "POST",
              body: JSON.stringify({
                first_name: d.firstName.trim(),
                last_name: d.lastName.trim(),
                label: d.relationship,
                relationship: d.relationship,
              }),
            }).catch((e) => console.log("[tour] dependent save failed", d, e)),
          ),
        );
        await refreshProfiles();
      }
    } finally {
      setSavingDependents(false);
      setPhase("elena-plan");
    }
  }, [savingDependents, dependents, refreshProfiles]);

  useEffect(() => {
    if (phase !== "elena-plan") return;
    analytics.track("Web Tour Elena Plan Shown" as any, {
      situation: selectedSituation,
      med_count: selectedMeds.length + customMeds.length,
    });
  }, [phase, selectedSituation, selectedMeds.length, customMeds.length]);

  useEffect(() => {
    if (phase !== "care-ack") return;
    analytics.track("Web Tour Care Ack Shown" as any, { count: careSelections.length });
  }, [phase, careSelections.length]);

  if (!mounted || phase === "done") return null;

  // ── Phases care + goals + pain + value share one backdrop + card shell.
  //    The shell itself fades in on mount and fades out when we head to the
  //    joyride spotlight. Inside, AnimatePresence crossfades the content
  //    between phases, and the card's max-width animates so the transition
  //    feels like one continuous container morphing rather than separate
  //    modals. ──
  if (phase === "intro" || phase === "care" || phase === "care-ack" || phase === "router" || phase === "pain" || phase === "value" || phase === "profile-form" || phase === "situation" || phase === "meds" || phase === "care-plan" || phase === "validation" || phase === "dependents" || phase === "elena-plan") {
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
        <SkipButton onClick={skipTour} />
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
                    {/* Overlapping avatar stack: reads as "a group of people"
                        instead of a labeled grid, and sidesteps the "My X /
                        My Y" copy repetition that felt awkward when each icon
                        had its own caption. Each circle springs in with a
                        slight x-offset so the stack assembles left-to-right. */}
                    <div className="flex items-center justify-center">
                      {picked.map((opt, i) => {
                        const Icon = opt.icon;
                        return (
                          <motion.div
                            key={opt.id}
                            initial={{ opacity: 0, scale: 0.4, x: -12 }}
                            animate={headlineDone ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.4, x: -12 }}
                            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 + i * 0.09 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(15,27,61,0.22)]"
                            style={{
                              background: "linear-gradient(135deg, #0F1B3D 0%, #2E6BB5 100%)",
                              border: "3px solid white",
                              marginLeft: i === 0 ? 0 : -14,
                              zIndex: picked.length - i,
                            }}
                          >
                            <Icon className="w-7 h-7 text-white" />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                  <RevealButton visible={headlineDone} delay={0.15 + picked.length * 0.09 + 0.15}>
                    <GradientButton onClick={advanceFromCareAck} label="Continue" />
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "pain" && (() => {
              // Variant derived from the router pick: money-centric
              // intents (money, medications) show the dollars-over-decade
              // panic; everything else shows the hours-per-year panic.
              const isMoney = routerChoice === "money" || routerChoice === "medications";
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
              const valueCopy: Record<RouterChoice, { headline: string; subtitle: string }> = {
                condition: {
                  headline: "You shouldn't carry this alone.",
                  subtitle: "Appointments, meds, and coverage — I'll stay on top of it with you.",
                },
                medications: {
                  headline: "Your prescriptions, handled.",
                  subtitle: "Refills, price-shopping, and interactions — I'll keep it all straight.",
                },
                money: {
                  headline: "Let's bring those costs down.",
                  subtitle: "Price checks, bills, and appeals — I'll fight for every dollar.",
                },
                caregiver: {
                  headline: "Less on your plate, starting today.",
                  subtitle: "One place for their care, one place for yours. I'll keep it straight.",
                },
                staying_healthy: {
                  headline: "Stay ahead of it, not behind it.",
                  subtitle: "Checkups, screenings, and reminders — I'll keep you current.",
                },
              };
              const copy = routerChoice
                ? valueCopy[routerChoice]
                : { headline: "We've got your back.", subtitle: "From bookings to bills, I'm on it." };
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
                  {subtitleDone && <BenefitTiles routerChoice={routerChoice} />}
                </div>
                {/* Each tile reveals in three beats (container → label
                    stream → visual) and they start 700ms apart, so the
                    last tile's visual lands around ~3.4s. Continue waits
                    for that. */}
                <RevealButton visible={subtitleDone} delay={3.6}>
                  <GradientButton onClick={advanceFromValue} label="Continue" />
                </RevealButton>
              </motion.div>
              );
            })()}

            {phase === "profile-form" && (
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
                      <StreamingText text="Let's get you set up." onDone={() => setHeadlineDone(true)} />
                    </h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: headlineDone ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: motionEase, delay: 0.1 }}
                      className="text-[14px] text-[#8E8E93] font-light"
                      onAnimationComplete={() => { if (headlineDone) setSubtitleDone(true); }}
                    >
                      Just a few quick details.
                    </motion.p>
                  </div>
                  {subtitleDone && (
                    <RevealStack visible className="space-y-3">
                      {!hasOAuthName && (
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
                      <motion.div variants={REVEAL_ITEM}>
                        <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                          Date of birth
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="bday"
                          autoComplete="bday"
                          maxLength={10}
                          placeholder="MM/DD/YYYY"
                          value={dob}
                          onChange={(e) => setDob(maskDateInput(e.target.value))}
                          className="mt-1 w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
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
                          name="postal-code"
                          autoComplete="postal-code"
                          maxLength={5}
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                          placeholder="10001"
                          className="mt-1 w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 text-[16px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                        />
                      </motion.div>
                    </RevealStack>
                  )}
                </div>
                <RevealButton visible={subtitleDone} delay={(hasOAuthName ? 2 : 3) * 0.07 + 0.1}>
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
            )}

            {phase === "router" && (() => {
              const firstNamePrefix = firstName.trim() ? `${firstName.trim()}, ` : "";
              // When there's no name prefix, capitalize the first letter so
              // the sentence doesn't read as "what's top of mind...".
              const base = "what's top of mind for you right now?";
              const headline = firstNamePrefix
                ? `${firstNamePrefix}${base}`
                : `${base.charAt(0).toUpperCase()}${base.slice(1)}`;
              // Short noun-phrase labels so the router reads as quick
              // answers to "What's top of mind?" rather than sentences.
              // Tighter rows also give the icons more visual breathing
              // room on mobile, where the longer strings wrapped.
              const ROUTER_OPTIONS: { key: RouterChoice; label: string; icon: typeof HeartPulse }[] = [
                { key: "condition", label: "Managing a condition", icon: HeartPulse },
                { key: "medications", label: "My medications", icon: Heart },
                { key: "money", label: "Saving money", icon: DollarSign },
                { key: "caregiver", label: "Caring for someone", icon: Users },
                { key: "staying_healthy", label: "Staying on top of it", icon: HelpCircle },
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
              const chip = getChip(selectedSituation);
              const needsFreeform = !!chip && chip.conditionName === null;
              const canContinue = !!chip && (!needsFreeform || customSituation.trim().length > 1);
              const firstNamePrefix = firstName.trim() ? `${firstName.trim()}, ` : "";
              // Router-aware prompt: continues the thread from the router
              // pick instead of re-asking a generic "what's going on."
              let headlineBase: string;
              if (routerChoice === "medications") {
                headlineBase = "what are your meds for?";
              } else if (routerChoice === "money") {
                headlineBase = "what care are you paying for?";
              } else {
                headlineBase = "what condition are you managing?";
              }
              // No-name fallback capitalizes the base so "what are..." reads
              // as "What are..." when there's no first-name prefix.
              const headline = firstNamePrefix
                ? `${firstNamePrefix}${headlineBase}`
                : `${headlineBase.charAt(0).toUpperCase()}${headlineBase.slice(1)}`;
              // Only surface alias suggestions on the generic "Something
              // else" path. injury_recovery already has its own template
              // and doesn't need matching.
              const suggestedTemplate =
                selectedSituation === "other"
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
                        Pick one, or tell me in your own words.
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <>
                        <RevealStack visible className="flex flex-col gap-2">
                          {SITUATION_CHIPS.map((c) => (
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
                            placeholder={selectedSituation === "injury_recovery" ? "e.g. torn ACL, back strain" : "Tell us in a few words"}
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
                  <RevealButton visible={headlineDone} delay={0.1 + SITUATION_CHIPS.length * 0.05}>
                    <button
                      onClick={advanceFromSituation}
                      disabled={!canContinue}
                      className="w-full py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                    >
                      Continue
                    </button>
                  </RevealButton>
                  {headlineDone && (
                    <button
                      onClick={() => {
                        analytics.track("Web Tour Situation Skipped" as any);
                        leaveShellThen(beginJoyride);
                      }}
                      className="text-[13px] text-[#8E8E93] hover:text-[#0F1B3D] self-center"
                    >
                      I don&apos;t have an active condition
                    </button>
                  )}
                </motion.div>
              );
            })()}

            {phase === "meds" && (() => {
              const tpl = getTemplate(selectedSituation);
              if (!tpl) return null;
              return (
                <motion.div
                  key="meds"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: motionEase }}
                  className="p-5 sm:p-7 flex flex-col gap-4 min-h-[380px] sm:min-h-[440px]"
                >
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="text-center">
                      <h2 className="text-[20px] font-extrabold text-[#0F1B3D] mb-2 text-balance leading-tight">
                        <StreamingText text={tpl.medsPrompt} onDone={() => setHeadlineDone(true)} />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] text-[#8E8E93] font-light"
                      >
                        Tap what you take. We&apos;ll add them to your profile.
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <>
                        <RevealStack visible className="flex flex-wrap gap-2 justify-center">
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
                                className={`px-3.5 py-2 rounded-full border text-[14px] transition-all duration-200 ${
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
                        {customMeds.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-center">
                            {customMeds.map((m, i) => (
                              <span
                                key={`${m}-${i}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0F1B3D]/5 text-[13px] text-[#0F1B3D]"
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
                            className="flex-1 min-w-0 rounded-full border border-[#E5E5EA] bg-white px-4 py-2.5 text-[14px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                          />
                          <button
                            onClick={() => {
                              if (!newMedDraft.trim()) return;
                              setCustomMeds((p) => [...p, newMedDraft.trim()]);
                              setNewMedDraft("");
                            }}
                            disabled={!newMedDraft.trim()}
                            className="px-4 rounded-full border border-[#E5E5EA] text-[14px] text-[#0F1B3D] hover:border-[#0F1B3D]/30 disabled:opacity-40"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1}>
                    <GradientButton onClick={advanceFromMeds} label="Continue" />
                  </RevealButton>
                  {headlineDone && (
                    <button
                      onClick={() => {
                        setSelectedMeds([]);
                        setCustomMeds([]);
                        advanceFromMeds();
                      }}
                      className="text-[13px] text-[#8E8E93] hover:text-[#0F1B3D] self-center"
                    >
                      I&apos;m not on anything
                    </button>
                  )}
                </motion.div>
              );
            })()}

            {phase === "care-plan" && (() => {
              const tpl = getTemplate(selectedSituation);
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
              const tpl = getTemplate(selectedSituation);
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

            {phase === "dependents" && (() => {
              const headline = "Who are you taking care of?";
              const subtitle = "Add names to personalize — skip any you want.";
              const canContinue = !savingDependents;
              return (
                <motion.div
                  key="dependents"
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
                        {subtitle}
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <RevealStack visible className="flex flex-col gap-3">
                        {dependents.map((d, i) => (
                          <motion.div
                            key={`${d.careId}-${i}`}
                            variants={REVEAL_ITEM}
                            className="flex flex-col gap-1.5"
                          >
                            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">
                              Your {d.label}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={d.firstName}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setDependents((prev) => prev.map((row, idx) => (idx === i ? { ...row, firstName: v } : row)));
                                }}
                                placeholder="First name"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="words"
                                className="flex-1 rounded-xl border border-[#0F1B3D]/[0.08] bg-white px-3.5 py-2.5 text-base text-[#0F1B3D] placeholder:text-[#8E8E93] outline-none focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5] transition-colors"
                              />
                              <input
                                type="text"
                                value={d.lastName}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setDependents((prev) => prev.map((row, idx) => (idx === i ? { ...row, lastName: v } : row)));
                                }}
                                placeholder="Last name"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="words"
                                className="flex-1 rounded-xl border border-[#0F1B3D]/[0.08] bg-white px-3.5 py-2.5 text-base text-[#0F1B3D] placeholder:text-[#8E8E93] outline-none focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5] transition-colors"
                              />
                            </div>
                          </motion.div>
                        ))}
                      </RevealStack>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1 + dependents.length * 0.07}>
                    <button
                      onClick={advanceFromDependents}
                      disabled={!canContinue}
                      className="w-full py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
                    >
                      {savingDependents ? "Saving..." : "Continue"}
                    </button>
                  </RevealButton>
                </motion.div>
              );
            })()}

            {phase === "elena-plan" && (() => {
              const tpl = getTemplate(selectedSituation);
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
              const allMeds = [...selectedMeds, ...customMeds];
              const primaryRxMed = allMeds.find((m) => !isOtc(m)) || null;
              // Base hero lines by branch. Condition branch uses the
              // template's per-condition values (most specific). Other
              // branches use branch-wide constants since they don't have
              // a condition template driving content.
              let baseLines: string[];
              if (routerChoice === "condition" && tpl) {
                baseLines = tpl.heroValues;
              } else if (routerChoice === "medications") {
                baseLines = MEDS_BRANCH_HERO_VALUES;
              } else if (routerChoice === "money") {
                baseLines = MONEY_BRANCH_HERO_VALUES;
              } else if (routerChoice === "caregiver") {
                baseLines = CAREGIVER_BRANCH_HERO_VALUES;
              } else if (routerChoice === "staying_healthy") {
                baseLines = STAYING_HEALTHY_BRANCH_HERO_VALUES;
              } else {
                baseLines = tpl?.heroValues || [];
              }
              // Derived data-grounded lines: a prescription med pitch for
              // any branch that collected meds (condition / medications),
              // and a pain-number callout for the money branch if they
              // gave one earlier.
              const derived: string[] = [];
              if (primaryRxMed && (routerChoice === "condition" || routerChoice === "medications")) {
                derived.push(`I can track when your ${primaryRxMed} runs out and call your provider to renew it.`);
              } else if (primaryRxMed && routerChoice === "money") {
                // Money branch got a specific med — promise price action
                // on *that* med, reinforcing the "find best price" pitch.
                derived.push(`I can price-shop your ${primaryRxMed} refills every month.`);
              }
              if (routerChoice === "money" && painSelection) {
                const painOpt = [...TIME_PAIN_OPTIONS, ...MONEY_PAIN_OPTIONS].find((o) => o.id === painSelection);
                if (painOpt) {
                  derived.unshift(`You said ${painOpt.label.toLowerCase()}. I can help bring that down.`);
                }
              }
              if (routerChoice === "caregiver") {
                // Prefer first names captured in the dependents phase.
                // Multiple names → "I can keep Linda and David's care
                // straight"; single name → "I can book Linda's next
                // visit". Falls back to the relationship-count headline
                // when the user skipped every dependents row.
                const namedDeps = dependents.filter((d) => d.firstName.trim().length > 0);
                if (namedDeps.length >= 2) {
                  const names = namedDeps.map((d) => d.firstName.trim());
                  const joined = names.length === 2
                    ? `${names[0]} and ${names[1]}`
                    : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
                  derived.unshift(`I can keep ${joined}'s care straight in one place.`);
                } else if (namedDeps.length === 1) {
                  const d = namedDeps[0];
                  derived.unshift(`I can book ${d.firstName.trim()}'s next visit.`);
                } else if (careSelections.length >= 2) {
                  derived.unshift(`You're caring for ${careSelections.length} people. I can keep it all straight.`);
                }
              }
              // Cap at 3 AND dedupe by visual variant. Two cards that map
              // to the same mockup (e.g. derived "track your Fluoxetine
              // runs out" + base "call your provider to renew") would
              // read as duplicates even though the text differs. Derived
              // prepends, so personalized lines win over their generic
              // base counterparts. Final order preserved for whichever
              // line was seen first per variant.
              const seenVariants = new Set<HeroVariant>();
              const dedupedLines: string[] = [];
              for (const l of [...derived, ...baseLines]) {
                const v = variantForLine(l);
                if (seenVariants.has(v)) continue;
                seenVariants.add(v);
                dedupedLines.push(l);
              }
              const lines = dedupedLines.slice(0, 3);
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
                          text="Want me to start on one of these?"
                          onDone={() => setHeadlineDone(true)}
                        />
                      </h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: headlineDone ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: motionEase }}
                        className="text-[14px] max-md:text-[12.5px] text-[#8E8E93] font-light text-balance"
                      >
                        Pick the one that matters most. We can do the others next.
                      </motion.p>
                    </div>
                    {headlineDone && (
                      <div className="flex flex-col gap-2.5 max-md:gap-1.5">
                        {lines.map((line, i) => (
                          <ElenaPlanRow
                            key={`hero-${i}`}
                            line={line}
                            startDelayMs={200 + i * 320}
                            selected={confirmedActions.includes(line)}
                            onToggle={() => {
                              // Single-select: tapping a selected card
                              // clears it; tapping a different card
                              // replaces the selection. Also clears any
                              // custom text so we always seed Elena with
                              // exactly one action to focus on.
                              const wasSelected = confirmedActions.includes(line);
                              setConfirmedActions(wasSelected ? [] : [line]);
                              if (!wasSelected && customActionText.trim().length > 0) {
                                setCustomActionText("");
                              }
                              analytics.track("Web Tour Action Toggled" as any, {
                                branch: routerChoice,
                                line,
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
                          transition={{ duration: 0.3, ease: motionEase, delay: 0.2 + lines.length * 0.32 }}
                          className="w-full rounded-full border border-[#E5E5EA] bg-white px-4 py-3 max-md:px-3.5 max-md:py-2 text-[15px] max-md:text-[14px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                  <RevealButton visible={headlineDone} delay={0.1 + lines.length * 0.07}>
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
    const selectClass = `${inputClass} appearance-none pr-10 bg-no-repeat`;

    const canSave = (() => {
      if (addKind === "provider") {
        if (!providerName.trim()) return false;
        if (providerSpecialty === "Other") return providerCustomSpecialty.trim().length > 0;
        return providerSpecialty.length > 0;
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
            transition={{ layout: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } }}
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
            <div className="flex-1 flex flex-col justify-center min-h-0 overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={profileStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: motionEase }}
              >
                <div className="text-center">
                  <h3 className="text-[16px] sm:text-[18px] font-extrabold text-[#0F1B3D] mb-1.5 sm:mb-2">{currentStep.title}</h3>
                  <p className="text-[13px] sm:text-[14px] text-[#5a6a82] font-light leading-relaxed">{currentStep.body}</p>
                </div>

                {showPrompt && addKind === "provider" && (
                  <div className="mt-3 text-left space-y-2">
                    <p className="text-[13px] font-semibold text-[#0F1B3D]">Have any doctors you like?</p>
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
                {showPrompt && addKind === "visit" && lastAddedProvider && !visitUseChipMode && (
                  <div className="mt-3 text-left space-y-2">
                    <p className="text-[13px] font-semibold text-[#0F1B3D]">Have any visits with {lastAddedProvider.name} to log?</p>
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
                {showPrompt && addKind === "visit" && (!lastAddedProvider || visitUseChipMode) && (
                  <div className="mt-3 text-left space-y-2">
                    <p className="text-[13px] font-semibold text-[#0F1B3D]">Any recent or upcoming appointments?</p>
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
                {showPrompt && addKind === "insurance" && (
                  <div className="mt-3 text-left space-y-2">
                    <p className="text-[13px] font-semibold text-[#0F1B3D]">Who's your insurance?</p>
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
                {showPrompt && addKind === "family" && familyMode === "manage" && (
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
                {showPrompt && addKind === "family" && familyMode === "choose" && inviteFeedback && (
                  <p className="mt-3 text-[12px] text-[#2E6BB5] text-center">{inviteFeedback}</p>
                )}

                {itemError && (
                  <p className="mt-3 text-[12px] text-[#B5707A] text-center">{itemError}</p>
                )}
              </motion.div>
            </AnimatePresence>
            </div>

            {showPrompt && addKind === "family" && familyMode === "choose" ? (
              <>
                <button
                  onClick={() => { setFamilyMode("manage"); setInviteFeedback(null); }}
                  disabled={inviteBusy}
                  className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(15,27,61,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: ctaGradient }}
                >
                  Manage a family member's account
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
            ) : showPrompt && addKind === "family" && familyMode === "manage" ? (
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
            ) : showPrompt ? (
              <button
                onClick={() => canSave ? handleSaveItem(addKind!) : handleSkipItem(addKind!)}
                disabled={savingItem}
                className="w-full mt-4 py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(15,27,61,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: ctaGradient }}
              >
                {savingItem ? "Saving..." : canSave ? "Save and continue" : "Continue"}
              </button>
            ) : (
              <button
                onClick={nextProfile}
                className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 rounded-full text-white font-semibold font-sans text-[14px] hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
                style={{ background: ctaGradient }}
              >
                {isLast ? "Got it" : "Next"}
              </button>
            )}
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>,
      document.body
    );
  }

  // ── Phase: Chat explanation (Joyride targeting input bar) ──
  if (phase === "chat") {
    // Chat spotlight done → end the tour. Reviews + paywall now fire
    // together from chat-area when the user's second meaningful send
    // hits the post-seed gate, so the tour itself ends here.
    return <ChatStepJoyride onFinish={() => { setShellFading(false); finishTour(); }} />;
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

function BenefitTiles({ routerChoice }: { routerChoice: RouterChoice | null }) {
  // Four mini-spotlights in a 2×2 grid. Each tile reveals in three beats:
  //   1. Container fades + scales in
  //   2. Label streams word-by-word
  //   3. Visual fades in once the label finishes
  // Tiles start 700ms apart so the first lands before the next begins,
  // creating a clear top-left → top-right → bottom-left → bottom-right
  // cascade.
  //
  // Copy is quantitative — "5+ hours back every week" beats "Save hours"
  // because it gives the user something concrete to remember. Numbers
  // are phrased as typical / ballpark so they read as claims we can
  // defend, not guarantees.
  //
  // Tile order is tailored to the router pick so the most relevant tile
  // lands first (top-left, where reading and animation both start). The
  // user's stated intent gets the strongest emphasis.
  const tileHours = { key: "hours", label: "Hours back every week", visual: <BookingMiniCard /> };
  const tileMoney = { key: "money", label: "Typically cut costs 20 to 40%", visual: <PricingMiniCard /> };
  const tileFamily = { key: "family", label: "Every family member in one place", visual: <FamilyMiniCard /> };
  const tileInsurance = { key: "insurance", label: "Get the most from your insurance", visual: <InsuranceMiniCard /> };

  let tiles: typeof tileHours[];
  if (routerChoice === "money" || routerChoice === "medications") {
    // Money-first: costs tile leads, insurance (coverage + bills) second.
    tiles = [tileMoney, tileInsurance, tileHours, tileFamily];
  } else if (routerChoice === "caregiver") {
    // Caregiver-first: family tile leads, hours-back second.
    tiles = [tileFamily, tileHours, tileInsurance, tileMoney];
  } else {
    // Condition / staying-healthy / null: default to hours-back leading,
    // since those users typically feel time pressure (appointments,
    // follow-ups, preventive upkeep) more than pure money pressure.
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

function ChatStepJoyride({ onFinish }: { onFinish: () => void }) {
  const finishRef = useRef(false);
  // Stash onFinish in a ref so the advance effect below doesn't re-run
  // (and reset its 20s safety timer) every time the parent passes a
  // fresh function identity.
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

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
  // closed the tooltip without clicking Finish. A 20s safety timeout
  // advances the tour even if the chat-input target isn't mountable
  // (e.g. on force-tour runs where the chat surface takes a moment to
  // hydrate). Guarantees finishTour always runs at the end.
  useEffect(() => {
    const fire = () => {
      if (finishRef.current) return;
      finishRef.current = true;
      onFinishRef.current();
    };
    const unsub = on(EVENTS.TOUR_END, fire);
    const timer = setTimeout(fire, 20000);
    return () => { unsub(); clearTimeout(timer); };
  }, [on]);

  return Tour;
}
