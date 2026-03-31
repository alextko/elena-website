"use client";

import { useState } from "react";
import { Paperclip, FileText, AlertTriangle, Check, Stethoscope, Plus } from "lucide-react";
import {
  DoctorResultsCard,

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
    <div className="flex justify-end mb-6">
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

function SuggestionChips({ suggestions }: { suggestions: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1 pb-8">
      {suggestions.map((s) => (
        <button
          key={s}
          className="rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]/70 shadow-[0_2px_8px_rgba(15,27,61,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[#0F1B3D]/[0.08] hover:-translate-y-px"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ── Custom cards (Elena design language) ─────────────────

function AppealStatusCard({
  claimType, provider, stages,
}: {
  claimType: string;
  provider: string;
  stages: { label: string; status: "done" | "active" | "pending" }[];
}) {
  return (
    <div className="mt-3 rounded-2xl border border-[#E5E5EA] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-[20px] font-extrabold text-[#0F1B3D]">Appeal Status</p>
        <p className="text-[13px] text-[#8E8E93]">{claimType}</p>
      </div>
      <div className="h-px bg-[#E5E5EA] mx-3.5" />
      <div className="px-4 py-3.5">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
            <div className="flex flex-col items-center">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                stage.status === "done" ? "bg-[#0F1B3D]" :
                stage.status === "active" ? "bg-[#4A6CF7]" : "bg-[#F2F2F7]"
              }`}>
                {stage.status === "done" ? <Check className="h-3.5 w-3.5 text-white" /> :
                 stage.status === "active" ? <div className="h-2 w-2 rounded-full bg-white" /> :
                 <div className="h-2 w-2 rounded-full bg-[#AEAEB2]" />}
              </div>
              {i < stages.length - 1 && (
                <div className={`w-0.5 h-4 mt-1 ${stage.status === "done" ? "bg-[#0F1B3D]" : "bg-[#E5E5EA]"}`} />
              )}
            </div>
            <p className={`text-[14px] pt-1 ${
              stage.status === "done" ? "text-[#1C1C1E] font-medium" :
              stage.status === "active" ? "text-[#0F1B3D] font-semibold" : "text-[#AEAEB2]"
            }`}>{stage.label}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 bg-[#F7F6F2]">
        <p className="text-[12px] text-[#8E8E93]">{provider}</p>
      </div>
    </div>
  );
}

function EOBCard() {
  return (
    <div className="mt-3 rounded-2xl border border-[#E5E5EA] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-[20px] font-extrabold text-[#0F1B3D]">EOB vs. Actual Bill</p>
      </div>
      <div className="h-px bg-[#E5E5EA] mx-3.5" />
      <div className="divide-y divide-[#F2F2F7]">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[16px] font-bold text-[#1C1C1E]">Explanation of Benefits</p>
            <p className="text-[13px] text-[#8E8E93]">Summary from your insurer</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#FFF8E1] px-2.5 py-1 text-[11px] font-semibold text-[#F5A623]">Not a bill</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[16px] font-bold text-[#1C1C1E]">Actual Bill</p>
            <p className="text-[13px] text-[#8E8E93]">From your provider directly</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-semibold text-[#EF4444]">You owe this</span>
        </div>
      </div>
      <div className="px-4 py-2.5 bg-[#F7F6F2]">
        <p className="text-[12px] text-[#8E8E93]">Always wait for the actual bill before paying.</p>
      </div>
    </div>
  );
}

function BillResultCard({ data }: { data: NegotiationResult }) {
  const saved = data.original_amount - data.negotiated_amount;
  const pct = data.original_amount > 0 ? Math.round((saved / data.original_amount) * 100) : 0;
  return (
    <div
      className="mt-3 rounded-[22px] overflow-hidden"
      style={{ background: "#C8E6C9", boxShadow: "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="px-5 pt-4 pb-1">
        <p className="text-[20px] font-extrabold" style={{ color: "#1B7A3D" }}>Bill Resolved</p>
        <p className="text-[13px] font-medium" style={{ color: "#2D8A4E" }}>{data.provider_name}</p>
      </div>
      <div className="px-5 py-3">
        <div className="rounded-[14px] px-4 py-3.5" style={{ background: "rgba(255,255,255,0.5)" }}>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[13px] font-medium line-through" style={{ color: "#2D8A4E" }}>
              ${data.original_amount.toLocaleString()}
            </span>
            <span className="text-[24px] font-extrabold" style={{ color: "#1B7A3D" }}>
              ${data.negotiated_amount.toLocaleString()}
            </span>
            {pct > 0 && (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: "rgba(27,122,61,0.15)", color: "#1B7A3D" }}
              >
                {pct}% saved
              </span>
            )}
          </div>
          {data.next_steps.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold mb-1.5" style={{ color: "#2D8A4E" }}>What changed</p>
              {data.next_steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                  <div className="w-1.5 h-1.5 rounded-full mt-[6px] shrink-0" style={{ background: "#1B7A3D" }} />
                  <p className="text-[13px] font-medium" style={{ color: "#1B7A3D" }}>{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>
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
    "Duplicate Metabolic Panel charge removed ($2,981)",
    "TSH re-rated to negotiated price ($45 vs $3,336)",
    "Drug Screen re-rated ($85 vs $2,502)",
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
    <div className="space-y-4">
      <UserBubble text="Can you check my bill for errors?" attachment="bill.jpg" />
      <Elena>
        <p className="mb-1">I found three issues on your bill:</p>
        <p className="mb-1"><Flag>Duplicate charge</Flag> — Comprehensive Metabolic Panel billed <B>twice</B> at $2,981 each. One is likely a billing error.</p>
        <p className="mb-1"><Flag>Inflated lab prices</Flag> — TSH at <B>$3,336</B> (typical rate $20-80), Drug Screen at <B>$2,502</B> (typical $50-200).</p>
        <p className="mb-1"><Flag>Rocuronium at $883</Flag> — Standard paralytic, typical cost is $10-50.</p>
        <p className="mb-1">I called the billing department and got this resolved:</p>
      </Elena>
      <BillResultCard data={MOCK_NEGOTIATION_AD1} />
      <SuggestionChips suggestions={["Set up a payment plan", "Scan my other bills", "Send the breakdown"]} />
    </div>
  );
}

function Ad2MRICompare() {
  return (
    <div className="space-y-4">
      <UserBubble text="Compare MRI prices near me" />
      <Elena>
        <p className="mb-1">Here are the negotiated rates from your Anthem plan for a brain MRI (CPT 70551):</p>
      </Elena>
      <DoctorResultsCard doctors={MOCK_MRI_DOCTORS.slice(0, 2)} onBookDoctor={() => {}} />
      <Elena>
        <p className="mb-1">Same scan, same insurance, same city. SimonMed is <B>$2,135 less</B> than NYU Langone.</p>
      </Elena>
      <SuggestionChips suggestions={["Book SimonMed", "Check my deductible", "Find cheaper options"]} />
    </div>
  );
}

function Ad3DeniedClaim() {
  return (
    <div className="space-y-4">
      <UserBubble text="My insurance denied my blood work claim. Can you help?" />
      <Elena>
        <p className="mb-1"><B>82% of appeals succeed</B> when actually filed. Only 0.2% of people bother.</p>
        <p className="mb-1">Your labs were coded as <B>diagnostic</B> instead of <B>preventive</B>. Your plan covers preventive labs at 100%, so this should be $0.</p>
        <p className="mb-1">I can <B>call your provider</B> to resubmit with the correct code, then <B>call Anthem</B> to flag it for reprocessing.</p>
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
      <SuggestionChips suggestions={["Make both calls", "Draft the appeal letter", "Show claim details"]} />
    </div>
  );
}

function Ad4EOB() {
  return (
    <div className="space-y-4">
      <UserBubble text="I got this paper from my insurance. Do I owe $4,200?" attachment="anthem-eob.pdf" />
      <Elena>
        <p className="mb-1">Don't pay that yet. That's an <B>Explanation of Benefits</B>, not a bill. Your actual bill comes separately from the provider.</p>
      </Elena>
      <EOBCard />
      <Elena>
        <p className="mb-1"><B>60% of people</B> pay the EOB amount without waiting for the real bill. Send me the actual bill when it arrives and I'll compare them line by line.</p>
      </Elena>
      <SuggestionChips suggestions={["Upload my actual bill", "Call the provider", "Check if I paid already"]} />
    </div>
  );
}

function Ad5DuplicateCharges() {
  return (
    <div className="space-y-4">
      <UserBubble text="I think I got double-charged on my ER visit" attachment="hospital-bill.pdf" />
      <Elena>
        <p className="mb-1">You're right. I found two problems:</p>
        <p className="mb-1"><Flag>Duplicate charge</Flag> — Metabolic Panel billed twice at $2,981 each. One needs to come off.</p>
        <p className="mb-1"><Flag>Incorrect facility fee</Flag> — You were charged Level 5 ($4,122) for stitches. That should be Level 2-3 ($800-$1,500).</p>
        <p className="mb-1">I called billing and got both resolved:</p>
      </Elena>
      <BillResultCard data={MOCK_NEGOTIATION_AD5} />
      <SuggestionChips suggestions={["Set up a payment plan", "Scan my other bills", "Email the breakdown"]} />
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
  const rows: { label: string; value: string; alert?: boolean; warning?: boolean }[] = [
    { label: "Next appointment", value: "Dr. Patel, Apr 8" },
    { label: "Medications", value: "5 active" },
    { label: "Pending claims", value: "2 processing" },
    { label: "Denied claims", value: "1 appeal ready", warning: true },
    { label: "Refills due", value: "Metformin, 3 days", alert: true },
  ];
  return (
    <div className="mt-3 rounded-2xl border border-[#E5E5EA] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-[#F4B084]/20 flex items-center justify-center text-[14px] font-bold text-[#0F1B3D]">M</div>
        <div>
          <p className="text-[20px] font-extrabold text-[#0F1B3D]">Margaret</p>
          <p className="text-[13px] text-[#8E8E93]">Medicare Advantage via Anthem</p>
        </div>
      </div>
      <div className="h-px bg-[#E5E5EA] ml-[62px] mr-3.5" />
      <div className="px-4 py-1">
        {rows.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[13px] text-[#8E8E93]">{row.label}</span>
              <span className={`text-[13px] font-medium ${
                row.alert ? "text-[#EF4444]" : row.warning ? "text-[#F5A623]" : "text-[#1C1C1E]"
              }`}>{row.value}</span>
            </div>
            {i < rows.length - 1 && <div className="h-px bg-[#F2F2F7]" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Caregiver Ad 1: managing-mom-v1 ──────────────────────

function CG1ManagingMom() {
  return (
    <div className="space-y-4">
      <UserBubble text="I need help managing my mom's healthcare" />
      <Elena>
        <p className="mb-1">I set up a profile for your mom. You can switch between yours and hers anytime. Here's what I have so far:</p>
      </Elena>
      <FamilyProfileCard />
      <Elena>
        <p className="mb-1">Two things need attention: her <B>Metformin refill</B> is due in 3 days, and she has a <B>denied PT claim</B> with Anthem I can appeal.</p>
      </Elena>
      <SuggestionChips suggestions={["Call the pharmacy", "Start the appeal", "Reschedule Dr. Patel"]} />
    </div>
  );
}

// ── Caregiver Ad 2: fulltime-job-v2 ──────────────────────

function MedsRefillCard() {
  const meds = [
    { name: "Metformin 500mg", status: "Refill in 3 days", alert: true },
    { name: "Lisinopril 10mg", status: "Refill in 12 days", alert: false },
    { name: "Atorvastatin 20mg", status: "OK until May", alert: false },
  ];
  return (
    <div className="mt-2 rounded-2xl border border-[#E5E5EA] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-2.5">
        <p className="text-[16px] font-bold text-[#0F1B3D]">Margaret's Medications</p>
      </div>
      <div className="h-px bg-[#E5E5EA] mx-3.5" />
      <div className="divide-y divide-[#F2F2F7]">
        {meds.map((m) => (
          <div key={m.name} className="flex items-center justify-between px-4 py-2.5">
            <p className="text-[14px] font-medium text-[#1C1C1E]">{m.name}</p>
            <span className={`text-[12px] font-semibold ${m.alert ? "text-[#EF4444]" : "text-[#8E8E93]"}`}>{m.status}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 bg-[#F7F6F2] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#34C759]" />
        <p className="text-[12px] text-[#8E8E93]">Pharmacy on file: <span className="font-medium text-[#1C1C1E]">CVS, 340 E 23rd St</span></p>
      </div>
    </div>
  );
}

function CG2FulltimeJob() {
  return (
    <div className="space-y-4">
      <UserBubble text="Can you call my mom's doctor to reschedule?" />
      <Elena>
        <p className="mb-1">On it. Calling Dr. Patel's office now to reschedule Margaret's follow-up.</p>
      </Elena>
      <BookingStatusBubble status={MOCK_BOOKING_STATUS_CALLING} />
      <Elena>
        <p className="mb-1">While I'm on hold, I checked Margaret's medications. Her Metformin refill is due in 3 days. Want me to call CVS and get it refilled?</p>
      </Elena>
      <MedsRefillCard />
      <SuggestionChips suggestions={["Yes, call CVS", "Refill all three", "Her appointment schedule"]} />
    </div>
  );
}

// ── Custom card: Your Options (plan comparison) ─────────

function YourOptionsCard() {
  const options = [
    { name: "ACA Marketplace", estimate: "$0-$350/mo", note: "Bronze to Platinum, subsidies based on income" },
    { name: "Employer plan", estimate: "Varies", note: "Often cheapest, check with HR this week" },
    { name: "Short-term plan", estimate: "$95/mo", note: "Gap coverage only, no pre-existing conditions" },
  ];
  return (
    <div className="mt-3 rounded-2xl border border-[#E5E5EA] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-[20px] font-extrabold text-[#0F1B3D]">Coverage Options</p>
        <p className="text-[13px] text-[#8E8E93]">60-day Special Enrollment Period</p>
      </div>
      <div className="h-px bg-[#E5E5EA] mx-3.5" />
      <div className="divide-y divide-[#F2F2F7]">
        {options.map((opt) => (
          <div key={opt.name} className="flex items-center gap-3.5 px-4 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-[#1C1C1E]">{opt.name}</p>
              <p className="text-[13px] text-[#8E8E93] mt-px">{opt.note}</p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[14px] font-bold text-[#0F1B3D]">{opt.estimate}</span>
              <button className="shrink-0 rounded-lg bg-[#4A6CF7] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 transition-opacity">
                Compare
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Turned 26 / Lost Insurance ──────────────────────────

function Ad6Turned26() {
  return (
    <div className="space-y-4">
      <UserBubble text="I just turned 26 and lost my parents' insurance. What do I do?" />
      <Elena>
        <p className="mb-1">You have a <B>60-day Special Enrollment Period</B> from the date you aged off. A few things I need to narrow down the best option:</p>
        <p className="mb-1"><B>1.</B> Does your employer offer insurance? Losing your parents' plan lets you enroll immediately.</p>
        <p className="mb-1"><B>2.</B> What's your income? Under $20K may qualify for <B>Medicaid</B>. $20K-$60K gets Marketplace subsidies.</p>
        <p className="mb-1"><B>3.</B> Any prescriptions or doctors to keep? That affects which plan tier makes sense.</p>
      </Elena>
      <YourOptionsCard />
      <Elena>
        <p className="mb-1">The <B>60-day window</B> is what matters most. Miss it and you're uninsured until January.</p>
      </Elena>
      <SuggestionChips suggestions={["Check my subsidies", "Browse Marketplace plans", "Call my employer's HR"]} />
    </div>
  );
}

// ── Turned 26 — Deductibles & Copays Explainer ─────────

function TermsCard() {
  const terms = [
    { term: "Deductible", amount: "$1,500", desc: "What you pay before insurance kicks in" },
    { term: "Copay", amount: "$25", desc: "Flat fee per visit, regardless of deductible" },
    { term: "Coinsurance", amount: "20%", desc: "Your share after deductible is met" },
    { term: "Out-of-pocket max", amount: "$8,700", desc: "The most you'll pay in a year, then insurance covers 100%" },
  ];
  return (
    <div className="mt-3 rounded-2xl border border-[#E5E5EA] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-[20px] font-extrabold text-[#0F1B3D]">How health insurance works</p>
        <p className="text-[13px] text-[#8E8E93]">Silver plan example</p>
      </div>
      <div className="h-px bg-[#E5E5EA] mx-3.5" />
      <div className="divide-y divide-[#F2F2F7]">
        {terms.map((t) => (
          <div key={t.term} className="flex items-center gap-3.5 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-[#1C1C1E]">{t.term}</p>
              <p className="text-[13px] text-[#8E8E93]">{t.desc}</p>
            </div>
            <span className="text-[14px] font-bold text-[#0F1B3D] shrink-0">{t.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ad7Deductibles() {
  return (
    <div className="space-y-4">
      <UserBubble text="What's the difference between a deductible and a copay?" />
      <Elena>
        <p className="mb-1">Think of it this way. Your <B>deductible</B> is the amount you pay out of pocket before your insurance starts covering things. Your <B>copay</B> is a fixed fee you pay per visit, like $25 to see your doctor.</p>
        <p className="mb-1">Here's how it works on a typical Silver plan:</p>
      </Elena>
      <TermsCard />
      <Elena>
        <p className="mb-1">So if you go to the doctor and the visit costs $200, you pay <B>$25 copay</B> upfront. The remaining $175 goes toward your deductible. Once you've paid $1,500 total, insurance starts covering 80% and you pay 20%.</p>
      </Elena>
      <SuggestionChips suggestions={["Show me a real example", "Compare Silver vs Bronze", "What plan fits my budget?"]} />
    </div>
  );
}

// ── Call Summary ─────────────────────────────────────────

function CallSummaryCard() {
  return (
    <div
      className="mt-3 rounded-[22px] overflow-hidden"
      style={{ background: "#C8E6C9", boxShadow: "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="px-5 pt-4 pb-1">
        <p className="text-[20px] font-extrabold" style={{ color: "#1B7A3D" }}>Referral Approved</p>
        <p className="text-[13px] font-medium" style={{ color: "#2D8A4E" }}>Anthem Blue Cross, Rep Maria H., 34 min call</p>
      </div>
      <div className="px-5 py-3">
        <div className="rounded-[14px] px-4 py-3.5" style={{ background: "rgba(255,255,255,0.5)" }}>
          <p className="text-[14px] font-semibold" style={{ color: "#1B7A3D" }}>Lucas's allergist referral to Dr. Patel</p>
          <p className="text-[13px] mt-1" style={{ color: "#1C1C1E" }}>Prior auth was missing. Maria submitted it during the call. Approved on the spot.</p>
          <div className="h-px my-3" style={{ background: "rgba(27,122,61,0.15)" }} />
          <p className="text-[13px] font-semibold" style={{ color: "#1B7A3D" }}>Next step</p>
          <p className="text-[13px] mt-0.5" style={{ color: "#1C1C1E" }}>Call Dr. Patel's office to schedule. Auth on file within 24 hours.</p>
        </div>
      </div>
      <div className="px-5 pb-3 flex items-center justify-between">
        <p className="text-[12px] font-medium" style={{ color: "#2D8A4E" }}>Ref # AUTH-884710</p>
        <p className="text-[12px] font-medium" style={{ color: "#2D8A4E" }}>31 min on hold</p>
      </div>
    </div>
  );
}

function Ad8CallSummary() {
  return (
    <div className="space-y-4">
      <UserBubble text="Can you call insurance about my son's denied referral to the allergist?" />
      <BookingStatusBubble status={{
        booking_id: "bk_mock_done",
        phase: "completed",
        message: "Call complete. Elena spoke with Rep Maria H. at Anthem Blue Cross.",
        elapsed_seconds: 2040,
        provider_name: "Anthem Blue Cross",
        provider_phone: "(800) 331-1476",
        reason_for_visit: "Lucas's allergist referral denial",
      }} />
      <CallSummaryCard />
      <Elena>
        <p className="mb-1">The hold was 31 minutes. You would've been stuck on the phone through half of naptime. Dr. Patel's office opens at 8am. Want me to call and book tomorrow?</p>
      </Elena>
      <SuggestionChips suggestions={["Book Dr. Patel tomorrow", "Save the reference number", "Check Lucas's other claims"]} />
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
  { id: "ad6", label: "Turned 26", component: Ad6Turned26 },
  { id: "ad7", label: "Deductibles", component: Ad7Deductibles },
  { id: "ad8", label: "Call Summary", component: Ad8CallSummary },
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
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-4 relative z-10">
          <ActiveComponent />
        </div>

        {/* Fake input bar — matches real ChatArea input */}
        <div className="sticky bottom-0 z-20 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="flex items-end gap-2 rounded-[28px] border border-[#E5E5EA] bg-white px-2 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <div className="flex h-8 w-8 mb-0.5 flex-shrink-0 items-center justify-center rounded-full text-[#AEAEB2]">
                <Plus className="h-4 w-4" />
              </div>
              <div className="flex-1 py-2 text-sm text-[#AEAEB2]">Ask Elena anything...</div>
              <div className="h-[34px] w-[34px] mb-0.5 flex-shrink-0 rounded-full bg-[#0F1B3D] flex items-center justify-center opacity-40">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </div>
            </div>
            <p className="mt-2 text-center text-[0.7rem] text-[#AEAEB2]">
              Elena can make mistakes. Always verify important health information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
