"use client";

import { useState } from "react";
import { Paperclip, FileText, AlertTriangle, Check } from "lucide-react";
import {
  DoctorResultsCard,
  NegotiationCard,
  BookingStatusBubble,
} from "@/components/chat-cards";
import type { DoctorResult, NegotiationResult, BookingStatusResponse } from "@/lib/types";

/*
 * /screenshots — Screenshot Generator for Marketing Assets
 *
 * Uses Elena's REAL chat-cards components with mock data to produce
 * pixel-perfect screenshots of chat conversations for ads, social,
 * and landing pages.
 *
 * HOW TO VIEW: localhost:3000/screenshots — pick a tab, resize
 * browser to mobile (430px), crop below the tab bar, screenshot.
 *
 * ═══════════════════════════════════════════════════════════════
 * AGENT INSTRUCTIONS: HOW TO ADD A NEW SCREENSHOT SCENARIO
 * ═══════════════════════════════════════════════════════════════
 *
 * 1. DEFINE MOCK DATA (if needed)
 *    - Add mock data constants near the other MOCK_* constants
 *      (search for "Mock data" sections below).
 *    - Use existing types from "@/lib/types" (DoctorResult,
 *      NegotiationResult, BookingStatusResponse, etc.).
 *    - If you need a brand-new card that doesn't exist in
 *      @/components/chat-cards, build it inline in this file
 *      (see AppealStatusCard, EOBCard, FamilyProfileCard for examples).
 *
 * 2. CREATE A CONVERSATION COMPONENT
 *    - Write a new function component (e.g. `function Ad6MyScenario()`)
 *      that returns a <div className="space-y-6"> with a sequence of:
 *        • <UserBubble text="..." attachment?="filename.ext" />
 *        • <Elena>...</Elena>  (for assistant prose — use <B>, <Flag>
 *          helpers for bold / red-flagged text)
 *        • Any card component (NegotiationCard, DoctorResultsCard,
 *          BookingStatusBubble, or a custom card)
 *    - See the existing Ad1–Ad5 and CG1–CG2 functions for patterns.
 *
 * 3. REGISTER THE TAB
 *    - Add an entry to the TABS array at the bottom of this file:
 *        { id: "ad6", label: "Short Label", component: Ad6MyScenario }
 *    - The id must be unique. The label shows in the tab bar.
 *
 * That's it — the page layout, tab switching, fake input bar, and
 * background texture are all handled automatically.
 *
 * AVAILABLE PRIMITIVES:
 *   UserBubble       — user message bubble (right-aligned, gray)
 *   Elena            — assistant message wrapper
 *   B                — bold text within Elena messages
 *   Flag             — red highlighted text (for flagged billing issues)
 *
 * AVAILABLE CARDS (from @/components/chat-cards):
 *   DoctorResultsCard   — list of doctors with prices/ratings
 *   NegotiationCard     — bill negotiation result summary
 *   BookingStatusBubble — live call / booking status indicator
 *
 * CUSTOM CARDS (defined in this file):
 *   AppealStatusCard    — step-by-step appeal progress tracker
 *   EOBCard             — EOB vs actual bill explainer
 *   FamilyProfileCard   — family member health profile summary
 * ═══════════════════════════════════════════════════════════════
 */

// ── Shared chat primitives ───────────────────────────────

function UserBubble({ text, attachment }: { text: string; attachment?: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8ecf4] px-5 py-3">
        {attachment && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#0F1B3D]/[0.06] px-2.5 py-1 text-xs text-[#0F1B3D]/60">
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[140px] truncate">{attachment}</span>
            </span>
          </div>
        )}
        <p className="text-[0.9rem] leading-relaxed text-[#0F1B3D]">{text}</p>
      </div>
    </div>
  );
}

function Elena({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.9rem] leading-[1.75] text-[#1C1C1E]">{children}</div>
    </div>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}

function Flag({ children }: { children: React.ReactNode }) {
  return <span className="text-red-500 font-semibold">{children}</span>;
}

// ── Custom cards (only for what the existing components don't cover) ──

function AppealStatusCard({
  claimType, provider, stages,
}: {
  claimType: string;
  provider: string;
  stages: { label: string; status: "done" | "active" | "pending" }[];
}) {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--elena-border-light)] bg-white elena-card-shadow overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--elena-border-light)]">
        <p className="text-sm font-bold text-[var(--elena-text-primary)]">Appeal Status</p>
        <p className="text-xs text-[var(--elena-text-muted)]">{claimType} · {provider}</p>
      </div>
      <div className="px-4 py-3">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
            <div className="flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                stage.status === "done" ? "bg-[var(--elena-green)]" :
                stage.status === "active" ? "bg-[#3b82f6] animate-pulse" : "bg-[#e5e7eb]"
              }`}>
                {stage.status === "done" ? <Check className="h-3.5 w-3.5 text-white" /> :
                 stage.status === "active" ? <div className="h-2 w-2 rounded-full bg-white" /> :
                 <div className="h-2 w-2 rounded-full bg-[#9ca3af]" />}
              </div>
              {i < stages.length - 1 && (
                <div className={`w-0.5 h-5 mt-1 ${stage.status === "done" ? "bg-[var(--elena-green)]" : "bg-[#e5e7eb]"}`} />
              )}
            </div>
            <p className={`text-sm pt-0.5 ${
              stage.status === "done" ? "text-[var(--elena-green-dark)] font-medium" :
              stage.status === "active" ? "text-[#3b82f6] font-semibold" : "text-[var(--elena-text-muted)]"
            }`}>{stage.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EOBCard() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--elena-border-light)] bg-white elena-card-shadow overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--elena-border-light)] bg-[var(--elena-card-bg)]">
        <p className="text-sm font-bold text-[var(--elena-text-primary)]">Know the difference</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[var(--elena-border-light)]">
        <div className="p-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <FileText className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-[var(--elena-text-primary)] mb-1">EOB</p>
          <p className="text-xs text-[var(--elena-text-muted)] mb-2">Explanation of Benefits</p>
          <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-amber-600">Not a bill</span>
        </div>
        <div className="p-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-sm font-semibold text-[var(--elena-text-primary)] mb-1">Actual Bill</p>
          <p className="text-xs text-[var(--elena-text-muted)] mb-2">From your provider</p>
          <span className="inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-red-600">This is what you owe</span>
        </div>
      </div>
      <div className="px-4 py-2 bg-[#fffbeb] border-t border-amber-100">
        <p className="text-xs text-amber-700 text-center">Always wait for the actual bill before paying.</p>
      </div>
    </div>
  );
}

// ── Mock data for real components ────────────────────────

const MOCK_MRI_DOCTORS: DoctorResult[] = [
  {
    name: "NYU Langone Medical Center",
    specialty: "Diagnostic Radiology",
    facility_type: "hospital",
    in_network: true,
    negotiated_rate: 2547,
    estimated_oop: 2547,
    distance_km: 3.4,
    google_rating: 4.1,
    google_review_count: 2841,
    phone_number: "(212) 263-5550",
    address: "550 1st Avenue",
    city: "New York",
    state: "NY",
    postal_code: "10016",
    latitude: 40.7421,
    longitude: -73.9741,
  },
  {
    name: "Mount Sinai West",
    specialty: "Diagnostic Radiology",
    facility_type: "hospital",
    in_network: true,
    negotiated_rate: 1180,
    estimated_oop: 1180,
    distance_km: 2.9,
    google_rating: 3.8,
    google_review_count: 1203,
    phone_number: "(212) 523-4000",
    address: "1000 10th Avenue",
    city: "New York",
    state: "NY",
    postal_code: "10019",
    latitude: 40.7695,
    longitude: -73.9918,
  },
  {
    name: "SimonMed Imaging — Midtown",
    specialty: "Diagnostic Radiology",
    facility_type: "imaging_center",
    in_network: true,
    negotiated_rate: 412,
    estimated_oop: 412,
    distance_km: 5.5,
    google_rating: 4.6,
    google_review_count: 387,
    phone_number: "(212) 555-0192",
    address: "315 W 57th Street",
    city: "New York",
    state: "NY",
    postal_code: "10019",
    latitude: 40.7664,
    longitude: -73.9845,
  },
];

const MOCK_NEGOTIATION_AD1: NegotiationResult = {
  provider_name: "Memorial Hospital Billing Dept",
  provider_phone: "(555) 234-5678",
  status: "completed",
  original_amount: 14837,
  negotiated_amount: 6055,
  next_steps: [
    "Duplicate Comprehensive Metabolic Panel charge removed ($2,981)",
    "TSH re-rated to negotiated price ($45 vs $3,336)",
    "Drug Screen re-rated to negotiated price ($85 vs $2,502)",
    "Revised bill will arrive in 7-10 business days",
  ],
};

const MOCK_NEGOTIATION_AD5: NegotiationResult = {
  provider_name: "St. Luke's Hospital Billing",
  provider_phone: "(555) 876-5432",
  status: "completed",
  original_amount: 12847,
  negotiated_amount: 4284,
  next_steps: [
    "Duplicate lab charge removed ($2,981)",
    "ER facility fee downgraded from Level 5 to Level 3 ($4,122 → $1,540)",
    "Revised statement mailing in 5-7 business days",
  ],
};

// ── The 5 Bill Fighter conversations ─────────────────────

function Ad1BillErrors() {
  return (
    <div className="space-y-6">
      <UserBubble text="Can you check my bill for errors?" attachment="bill.jpg" />
      <Elena>
        <p className="mb-1">Oof, this is a big one — let me take a look 👀</p>
        <p className="mb-1">A few things jump out immediately:</p>
        <p className="mb-1"><Flag>► Duplicate charge</Flag></p>
        <p className="mb-1">- Comprehensive Metabolic Panel billed <B>twice</B> (10/09 AND 10/10) at $2,981.08 each = <B>$5,962.16 total</B>. Unless they genuinely ran it two separate days for a clinical reason, one of those is likely a billing error.</p>
        <p className="mb-1"><Flag>► Inflated lab prices</Flag></p>
        <p className="mb-1">These hospital charges are *wildly* above normal negotiated rates:</p>
        <p className="mb-1">- TSH at <B>$3,335.81</B> — typical negotiated rate is $20–80</p>
        <p className="mb-1">- Drug Screen at <B>$2,501.90</B> — usually $50–200</p>
        <p className="mb-1">- T4 Free at <B>$154.08</B> — reasonable, but the others are not</p>
        <p className="mb-1"><Flag>► Rocuronium at $883.45</Flag></p>
        <p className="mb-1">That's a standard surgical paralytic. $883 for one vial is very high — typical cost is $10–50.</p>
      </Elena>
      <NegotiationCard data={MOCK_NEGOTIATION_AD1} />
    </div>
  );
}

function Ad2MRICompare() {
  return (
    <div className="space-y-6">
      <UserBubble text="Compare MRI prices near me" />
      <Elena>
        <p className="mb-1">I pulled the negotiated rates from your Anthem plan for a brain MRI without contrast (CPT 70551). The price difference is wild:</p>
      </Elena>
      <DoctorResultsCard doctors={MOCK_MRI_DOCTORS} />
      <Elena>
        <p className="mb-1">Same scan, same insurance, same city. SimonMed is <B>$2,135 less</B> than NYU Langone. If you haven't hit your deductible, that difference comes straight from your pocket.</p>
        <p className="mb-1">Want me to call SimonMed and check availability?</p>
      </Elena>
    </div>
  );
}

function Ad3DeniedClaim() {
  return (
    <div className="space-y-6">
      <UserBubble text="My insurance denied my claim for blood work. Can you help me appeal?" />
      <Elena>
        <p className="mb-1">Yes — and you should. Most people give up after the first denial, but <B>82% of appeals succeed</B> when actually filed. Only 0.2% of people bother.</p>
        <p className="mb-1">Here's what I found on your claim:</p>
        <p className="mb-1">Your preventive labs were coded as <B>diagnostic</B> instead of <B>preventive</B> — that's a CPT modifier error. Your plan covers preventive labs at 100%, so this should be $0 out of pocket.</p>
        <p className="mb-1">I can handle this two ways:</p>
        <p className="mb-1">1. <B>Call your provider's billing office</B> and ask them to resubmit with the correct preventive modifier</p>
        <p className="mb-1">2. <B>Call Anthem</B> and flag the claim for reprocessing once the code is corrected</p>
        <p className="mb-1">Want me to make both calls?</p>
      </Elena>
      <AppealStatusCard
        claimType="Preventive Labs — Coding Error"
        provider="Anthem Blue Cross"
        stages={[
          { label: "Denial received", status: "done" },
          { label: "Error identified (CPT modifier)", status: "done" },
          { label: "Provider resubmission requested", status: "active" },
          { label: "Claim reprocessed", status: "pending" },
          { label: "Refund issued", status: "pending" },
        ]}
      />
    </div>
  );
}

function Ad4EOB() {
  return (
    <div className="space-y-6">
      <UserBubble text="I got this confusing paper from my insurance. Do I owe $4,200?" />
      <Elena>
        <p className="mb-1">Don't pay that yet. What you're looking at is an <B>Explanation of Benefits</B> — it's not a bill.</p>
        <p className="mb-1">I know it looks like one. It has your name, dollar amounts, and "amount you may owe" in bold. But an EOB is just your insurance company telling you what they processed and what they think your share might be.</p>
        <p className="mb-1">Your actual bill comes separately from the provider. Sometimes it's less than the EOB says, sometimes the provider never sends one at all.</p>
      </Elena>
      <EOBCard />
      <Elena>
        <p className="mb-1">About <B>60% of people</B> pay the EOB amount without waiting for the real bill. That's how hospitals make money on billing confusion.</p>
        <p className="mb-1">Wait for the actual bill from your provider, then send it to me and I'll compare the two line by line.</p>
      </Elena>
    </div>
  );
}

function Ad5DuplicateCharges() {
  return (
    <div className="space-y-6">
      <UserBubble text="I think I got double-charged on my ER visit" attachment="hospital-bill.pdf" />
      <Elena>
        <p className="mb-1">You're right — I found two problems:</p>
        <p className="mb-1"><Flag>► Duplicate charge</Flag></p>
        <p className="mb-1">The <B>Comprehensive Metabolic Panel</B> appears on two separate dates (10/09 and 10/10) for $2,981.08 each. That's $5,962 for a test that typically costs $20-50. Unless they ran it twice for a medical reason — and for an ER visit that's unlikely — one charge needs to come off.</p>
        <p className="mb-1"><Flag>► Incorrect facility fee</Flag></p>
        <p className="mb-1">You were charged a <B>Level 5 ER facility fee</B> ($4,122). Level 5 is for critical/life-threatening situations. A cut requiring stitches is typically Level 2 or 3 ($800-$1,500). That's a potential overcharge of <B>$2,600+</B>.</p>
        <p className="mb-1">Want me to call the hospital billing department about both of these?</p>
      </Elena>
      <NegotiationCard data={MOCK_NEGOTIATION_AD5} />
    </div>
  );
}

// ── Mock data for caregiver conversations ────────────────

const MOCK_BOOKING_STATUS_CALLING: BookingStatusResponse = {
  booking_id: "bk_mock_001",
  phase: "on_hold",
  message: "Elena is on the phone with Dr. Patel's office. Currently on hold — 4:32 elapsed.",
  elapsed_seconds: 272,
  provider_name: "Dr. Rajesh Patel",
  provider_specialty: "Endocrinology",
  provider_phone: "(212) 555-0147",
  reason_for_visit: "Reschedule Mom's follow-up appointment",
};

const MOCK_BOOKING_STATUS_INSURANCE: BookingStatusResponse = {
  booking_id: "bk_mock_002",
  phase: "connected",
  message: "Elena is speaking with a representative at Anthem Blue Cross about Margaret's denied PT claim.",
  elapsed_seconds: 847,
  provider_name: "Anthem Blue Cross",
  provider_phone: "(800) 555-0199",
  reason_for_visit: "Appeal denied physical therapy claim",
};

function FamilyProfileCard() {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--elena-border-light)] bg-white elena-card-shadow overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--elena-border-light)] flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-[#F4B084]/30 flex items-center justify-center text-sm font-bold text-[#0F1B3D]">M</div>
        <div>
          <p className="text-sm font-bold text-[var(--elena-text-primary)]">Mom — Margaret</p>
          <p className="text-xs text-[var(--elena-text-muted)]">Medicare Advantage · Anthem</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--elena-text-muted)]">Next appointment</span>
          <span className="text-xs font-medium text-[var(--elena-text-primary)]">Dr. Patel · Apr 8</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--elena-text-muted)]">Medications</span>
          <span className="text-xs font-medium text-[var(--elena-text-primary)]">5 active</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--elena-text-muted)]">Pending claims</span>
          <span className="text-xs font-medium text-[var(--elena-text-primary)]">2 processing</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--elena-text-muted)]">Denied bills</span>
          <span className="text-xs font-medium text-amber-600">1 — appeal ready</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--elena-text-muted)]">Refills due</span>
          <span className="text-xs font-medium text-red-500">Metformin — 3 days</span>
        </div>
      </div>
    </div>
  );
}

// ── Caregiver Ad 1: managing-mom-v1 ──────────────────────

function CG1ManagingMom() {
  return (
    <div className="space-y-6">
      <UserBubble text="I need help managing my mom's healthcare" />
      <Elena>
        <p className="mb-1">I can help with that. Let me set up a profile for your mom so I can track everything in one place — her doctors, insurance, medications, appointments, and bills.</p>
        <p className="mb-1">Once it's set up, you can switch between your profile and hers anytime. I'll keep track of what's coming up and flag anything that needs your attention.</p>
        <p className="mb-1">Here's what I pulled together based on what you've told me so far:</p>
      </Elena>
      <FamilyProfileCard />
      <Elena>
        <p className="mb-1">A couple things that need attention right now:</p>
        <p className="mb-1">- Her <B>Metformin refill</B> is due in 3 days. Want me to call the pharmacy and make sure it's ready?</p>
        <p className="mb-1">- She has a <B>denied PT claim</B> with Anthem. I can call them and start the appeal — 82% of these get overturned.</p>
        <p className="mb-1">What should I tackle first?</p>
      </Elena>
    </div>
  );
}

// ── Caregiver Ad 2: fulltime-job-v2 ──────────────────────

function CG2FulltimeJob() {
  return (
    <div className="space-y-6">
      <UserBubble text="Can you call my mom's doctor to reschedule her appointment?" />
      <Elena>
        <p className="mb-1">On it. I'm calling Dr. Patel's office now to reschedule Margaret's endocrinology follow-up.</p>
        <p className="mb-1">I'll let you know as soon as it's done — you don't need to stay on the line.</p>
      </Elena>
      <BookingStatusBubble status={MOCK_BOOKING_STATUS_CALLING} />
      <Elena>
        <p className="mb-1">While I'm on hold with Dr. Patel's office — is there anything else on your mom's list I can help with? I also noticed her Anthem claim for physical therapy is still denied. I can call them next if you want.</p>
      </Elena>
    </div>
  );
}

// ── Page layout ──────────────────────────────────────────

const TABS = [
  { id: "ad1", label: "Bill Errors", component: Ad1BillErrors },
  { id: "ad2", label: "MRI Compare", component: Ad2MRICompare },
  { id: "ad3", label: "Denied Claim", component: Ad3DeniedClaim },
  { id: "ad4", label: "EOB", component: Ad4EOB },
  { id: "ad5", label: "Duplicates", component: Ad5DuplicateCharges },
  { id: "cg1", label: "CG: Managing Mom", component: CG1ManagingMom },
  { id: "cg2", label: "CG: Call Doctor", component: CG2FulltimeJob },
];

export default function ScreenshotsPage() {
  const [activeTab, setActiveTab] = useState("ad1");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)!.component;

  return (
    <div className="min-h-dvh bg-white font-[family-name:var(--font-inter)]">
      {/* Tab bar — crop this out of screenshots */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] px-4 py-2">
        <div className="flex items-center gap-1 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-[#0F1B3D]/40 mr-2">AD:</span>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#0F1B3D] text-white"
                  : "bg-[#f3f4f6] text-[#0F1B3D]/60 hover:bg-[#e5e7eb]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area — screenshot this */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6 relative z-10">
          <ActiveComponent />
        </div>

        {/* Fake input bar */}
        <div className="sticky bottom-0 z-20 bg-white/80 backdrop-blur-sm border-t border-[#e5e5ea]/60">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="flex items-center gap-2 rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3">
              <span className="text-[#0F1B3D]/20 text-sm">+</span>
              <span className="flex-1 text-sm text-[#0F1B3D]/30">Ask Elena anything...</span>
              <div className="h-8 w-8 rounded-full bg-[#0F1B3D] flex items-center justify-center">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
