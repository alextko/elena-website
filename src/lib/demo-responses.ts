/**
 * Demo mode: hardcoded responses for UGC recording sessions.
 *
 * To edit queries:  ctrl-F for the recording name (e.g. "RECORDING 1")
 * To disable:       set DEMO_MODE = false
 * To add a new one: add an entry to DEMO_ENTRIES
 */

import type {
  DoctorResult,
  BillAnalysis,
  AppealScript,
  AppealStatus,
  AssistanceResult,
} from "@/lib/types";

export const DEMO_MODE = true;

// Partial of the Message type from chat-area — only the card fields
type DemoCardFields = {
  doctorResults?: DoctorResult[] | null;
  billAnalysis?: BillAnalysis | null;
  appealScript?: AppealScript | null;
  appealStatus?: AppealStatus | null;
  assistanceResult?: AssistanceResult | null;
  priceComparisonLabel?: string | null;
};

interface DemoEntry {
  name: string;
  matchKeywords: string[];
  delay: number;
  toolLabel: string;
  reply: string;
  suggestions: string[];
  cardFields: DemoCardFields;
}

// ─────────────────────────────────────────────────────────────────
//  RECORDING 1: Bill Fighting (Geisinger ER bill)
//  Query: "I went to the ER after a car accident and they're saying
//          I owe $21,000?? I don't even understand what half of these
//          charges are"
// ─────────────────────────────────────────────────────────────────

const BILL_ANALYSIS_DATA: BillAnalysis = {
  items: [
    {
      description: "Level II Trauma Response",
      code: "G0390",
      charged: 23625,
      fair_price: 8000,
      potential_savings: 15625,
      issue_type: "overcharge",
      explanation: "Trauma activation fee — often waived or reduced when full trauma team wasn't deployed",
    },
    {
      description: "CT Scan of Chest",
      code: "71260",
      charged: 6398,
      fair_price: 1200,
      potential_savings: 5198,
      issue_type: "overcharge",
      explanation: "Facility fee is 5x the national median for this scan",
    },
    {
      description: "CT Scan of Abdomen & Pelvis",
      code: "74177",
      charged: 6281,
      fair_price: 1400,
      potential_savings: 4881,
      issue_type: "overcharge",
      explanation: "Facility fee is 4.5x the national median",
    },
    {
      description: "CT Scan of Upper Spine",
      code: "72125",
      charged: 5361,
      fair_price: 900,
      potential_savings: 4461,
      issue_type: "overcharge",
      explanation: "Facility fee is 6x the national median",
    },
    {
      description: "ER Room Charge",
      code: "99285",
      charged: 5186,
      fair_price: 2800,
      potential_savings: 2386,
      issue_type: "above_average",
      explanation: "High-acuity visit justified, but this charge is above the 80th percentile",
    },
    {
      description: "CT Scan of Head",
      code: "70450",
      charged: 2756,
      fair_price: 600,
      potential_savings: 2156,
      issue_type: "overcharge",
      explanation: "Facility fee is 4.6x the national median",
    },
  ],
  total_charged: 49607,
  total_fair: 14900,
  total_potential_savings: 34707,
  next_steps: [
    "Request an itemized bill under the No Surprises Act",
    "Dispute the trauma activation fee — ask if a full trauma team was actually deployed",
    "Ask about Geisinger's financial assistance program (they're a 501(r) nonprofit)",
  ],
};

// ─────────────────────────────────────────────────────────────────
//  RECORDING 2: Charity Care (follow-up in same session)
//  Query: "there's no way I can pay this. I work full time and only
//          make like $52,000 a year. what are my options"
// ─────────────────────────────────────────────────────────────────

const CHARITY_CARE_DATA: AssistanceResult = {
  programs: [
    {
      name: "Geisinger Medical Center",
      program_name: "Financial Assistance Program",
      type: "charity_care",
      covers: "Hospital bills for uninsured and underinsured patients",
      eligibility: "likely",
      eligibility_detail: "Income ≤ 300% FPL ($47,790/yr for individual). Your income qualifies.",
      max_benefit: "Up to 100% write-off",
      latitude: 40.9615,
      longitude: -76.6105,
      distance_km: 0,
      phone: "800-640-4206",
      is_501r: true,
    },
    {
      name: "Scranton Regional Hospital",
      program_name: "Community Care Financial Assistance",
      type: "charity_care",
      covers: "Emergency and inpatient services",
      eligibility: "likely",
      eligibility_detail: "Income ≤ 400% FPL ($63,720/yr). Sliding scale above 200% FPL.",
      max_benefit: "Up to 75% discount",
      latitude: 41.4090,
      longitude: -75.6624,
      distance_km: 3.4,
      phone: "570-770-5000",
      is_501r: true,
    },
    {
      name: "Moses Taylor Hospital",
      program_name: "Patient Financial Aid",
      type: "charity_care",
      covers: "Emergency, inpatient, and outpatient services",
      eligibility: "possible",
      eligibility_detail: "Income-based sliding scale. Application required.",
      max_benefit: "Sliding scale discount",
      latitude: 41.4122,
      longitude: -75.6571,
      distance_km: 5.5,
      phone: "570-770-5600",
      is_501r: true,
    },
    {
      name: "Hospital Payment Plan",
      program_name: "0% Interest Installment Plan",
      type: "payment_plan",
      covers: "Any remaining balance after discounts",
      eligibility: "possible",
      eligibility_detail: "Available at most hospitals. No credit check required.",
      max_benefit: "12-month 0% interest plan",
    },
  ],
  user_context: "Based on your household income (~$52,000/yr, est. ~270% FPL)",
  total_potential_benefit: "Up to $21,814 (your full remaining balance)",
};

// ─────────────────────────────────────────────────────────────────
//  RECORDING 3: Financial Support (surgery out-of-pocket)
//  Query: "I need surgery but my insurance said they're only covering
//          part of it and the rest is like $18,000 out of pocket.
//          what do I even do"
// ─────────────────────────────────────────────────────────────────

const FINANCIAL_SUPPORT_DATA: AssistanceResult = {
  programs: [
    {
      name: "Patient Advocate Foundation",
      program_name: "Co-Pay Relief Program",
      type: "grant",
      covers: "Out-of-pocket surgical and treatment costs",
      eligibility: "likely",
      eligibility_detail: "Income ≤ 400% FPL. Covers most surgical procedures.",
      max_benefit: "Up to $12,000/year",
      apply_url: "https://www.patientadvocate.org",
    },
    {
      name: "HealthWell Foundation",
      program_name: "Disease-Specific Assistance",
      type: "grant",
      covers: "Treatment costs, medication copays, and insurance premiums",
      eligibility: "likely",
      eligibility_detail: "Based on diagnosis and income. Most conditions covered.",
      max_benefit: "Up to $5,000 per grant cycle",
      apply_url: "https://www.healthwellfoundation.org",
    },
    {
      name: "NeedyMeds",
      program_name: "Database of 5,000+ Assistance Programs",
      type: "grant",
      covers: "Prescriptions, medical care, and related expenses",
      eligibility: "likely",
      eligibility_detail: "Free database matching you to programs based on your situation",
      max_benefit: "Varies by program",
      apply_url: "https://www.needymeds.org",
    },
    {
      name: "Medicaid Spend-Down",
      program_name: "State Medical Assistance",
      type: "government",
      covers: "Medical expenses exceeding income threshold",
      eligibility: "possible",
      eligibility_detail: "Depends on your state's rules and your monthly medical expenses",
    },
    {
      name: "Hospital Payment Plan",
      program_name: "0% Interest Installment Plan",
      type: "payment_plan",
      covers: "Any remaining balance after other assistance",
      eligibility: "possible",
      eligibility_detail: "Available at most hospitals. No credit check required.",
      max_benefit: "12-24 month 0% interest plan",
    },
  ],
  user_context: "Based on your situation: $18,000 out-of-pocket for surgery",
  total_potential_benefit: "Up to $17,000+ across multiple programs",
};

// ─────────────────────────────────────────────────────────────────
//  RECORDING 4: Prior Auth Appeal (UHC denied MRI)
//  Query: "I just got a letter from UHC saying they won't cover my
//          MRI. my doctor literally told me I need it for my back
//          pain but insurance said no. is there anything I can even do?"
// ─────────────────────────────────────────────────────────────────

const APPEAL_SCRIPT_DATA: AppealScript = {
  denial_reason: "MRI lumbar spine (CPT 72148) deemed not medically necessary",
  denial_code: "PR-204",
  insurer: "UnitedHealthcare",
  procedure: "MRI Lumbar Spine without Contrast",
  appeal_text: `Dear UnitedHealthcare Appeals Department,

I am writing to formally appeal the denial of prior authorization for an MRI of the lumbar spine (CPT 72148) for the above-referenced member.

My treating physician has ordered this MRI due to chronic lower back pain that has persisted for over 6 months and has not responded to conservative treatment including physical therapy (12 sessions completed) and anti-inflammatory medication.

Under the Affordable Care Act §2719, I have the right to appeal this decision within 180 days. Additionally, UnitedHealthcare's own clinical policy guidelines indicate that MRI is appropriate when conservative treatment has failed after 6 weeks.

The denial states this imaging is "not medically necessary." However, the following clinical evidence supports medical necessity:

1. Persistent radiculopathy symptoms despite 12 weeks of physical therapy
2. Neurological examination findings suggesting possible disc herniation
3. Conservative treatment failure documented across multiple office visits
4. Functional limitations affecting daily activities and employment

I respectfully request that this denial be overturned and authorization be granted for the requested MRI. If this appeal is denied, I intend to exercise my right to an external review under federal law.

Sincerely,
[Your Name]`,
  legal_citations: [
    "ACA §2719 — Right to appeal within 180 days",
    "29 CFR §2590.715-2719 — Internal claims and appeals process",
    "UHC Clinical Policy: Imaging of the Spine — MRI indicated after conservative treatment failure",
  ],
  success_rate_note: "82% of appealed insurance denials are overturned",
};

const APPEAL_STATUS_DATA: AppealStatus = {
  steps: [
    { label: "Denial Received", date: "Apr 1", status: "completed" },
    { label: "Appeal Drafted", date: "Apr 7", status: "completed" },
    { label: "Ready to Submit", status: "current", detail: "Elena can submit this for you" },
    { label: "Under Review", status: "pending", detail: "Insurer has 30 days to respond" },
    { label: "Decision", status: "pending" },
    { label: "External Review (if denied again)", status: "pending" },
  ],
};

// ─────────────────────────────────────────────────────────────────
//  RECORDING 5: Blood Test (price comparison)
//  Query: "I haven't had bloodwork done in like 3 years and I know
//          I should. where do I even go for that"
// ─────────────────────────────────────────────────────────────────

const BLOODWORK_DOCTORS: DoctorResult[] = [
  {
    name: "Quest Diagnostics",
    specialty: "Clinical Laboratory",
    practice_name: "Quest Diagnostics - Scranton",
    npi_number: "1234567890",
    latitude: 41.4089,
    longitude: -75.6624,
    distance_km: 1.3,
    estimated_oop: 45,
    facility_type: "freestanding",
    in_network: true,
    healthgrades_rating: 4.2,
    google_review_count: 89,
  },
  {
    name: "LabCorp",
    specialty: "Clinical Laboratory",
    practice_name: "LabCorp - Dickson City",
    npi_number: "0987654321",
    latitude: 41.4710,
    longitude: -75.6090,
    distance_km: 2.3,
    estimated_oop: 85,
    facility_type: "freestanding",
    in_network: true,
    healthgrades_rating: 4.0,
    google_review_count: 56,
  },
  {
    name: "Geisinger Outpatient Lab",
    specialty: "Hospital Laboratory",
    practice_name: "Geisinger Community Medical Center",
    npi_number: "1122334455",
    latitude: 41.4150,
    longitude: -75.6500,
    distance_km: 5.2,
    estimated_oop: 350,
    facility_type: "hospital",
    in_network: true,
    healthgrades_rating: 4.5,
    google_review_count: 142,
  },
];

// ─────────────────────────────────────────────────────────────────
//  RECORDING 6: Colonoscopy (price comparison)
//  Query: "my doctor told me I need to get a colonoscopy but I've
//          been putting it off because I know it's going to be
//          expensive. how much does it even cost"
// ─────────────────────────────────────────────────────────────────

const COLONOSCOPY_DOCTORS: DoctorResult[] = [
  {
    name: "Bay Endoscopy Center",
    specialty: "Gastroenterology",
    practice_name: "Bay Endoscopy Center",
    npi_number: "5566778899",
    latitude: 37.7749,
    longitude: -122.4194,
    distance_km: 3.4,
    estimated_oop: 950,
    facility_type: "freestanding",
    in_network: true,
    healthgrades_rating: 4.8,
    google_review_count: 142,
  },
  {
    name: "UCSF Medical Center",
    specialty: "Gastroenterology",
    practice_name: "UCSF Health — Gastroenterology",
    npi_number: "6677889900",
    latitude: 37.7631,
    longitude: -122.4586,
    distance_km: 6.9,
    estimated_oop: 1800,
    facility_type: "hospital",
    in_network: true,
    healthgrades_rating: 4.6,
    google_review_count: 89,
  },
  {
    name: "Stanford Hospital",
    specialty: "Gastroenterology",
    practice_name: "Stanford Health Care",
    npi_number: "7788990011",
    latitude: 37.4346,
    longitude: -122.1609,
    distance_km: 45.7,
    estimated_oop: 3200,
    facility_type: "hospital",
    in_network: true,
    healthgrades_rating: 4.9,
    google_review_count: 203,
  },
];

// ─────────────────────────────────────────────────────────────────
//  Entry list — each entry matches a recording
// ─────────────────────────────────────────────────────────────────

const DEMO_ENTRIES: DemoEntry[] = [
  // RECORDING 1: Bill fighting
  {
    name: "bill_fighting",
    matchKeywords: ["ER", "owe"],
    delay: 4000,
    toolLabel: "Reviewing your bill for errors...",
    reply: "I went through every line on your Geisinger bill. A few things jump out — the biggest one is a $23,625 \"trauma activation\" fee. That charge is often reduced or removed entirely if a full trauma team wasn't actually called. Your CT scans are also billed at 4–6x the national average. In total, I found about $34,700 in charges that look higher than they should be. Here's the full breakdown:",
    suggestions: ["What do I do next?", "Can you help me dispute this?", "Is there any way to get this reduced?"],
    cardFields: {
      billAnalysis: BILL_ANALYSIS_DATA,
    },
  },
  // RECORDING 2: Charity care (follow-up)
  {
    name: "charity_care",
    matchKeywords: ["pay", "make"],
    delay: 4000,
    toolLabel: "Searching for assistance programs near you...",
    reply: "Based on your income, you actually have some really good options. Geisinger is a nonprofit hospital, which means they're legally required to offer financial assistance. At your income level, you'd likely qualify to have most or all of this bill forgiven. I also found two other hospitals nearby with similar programs. Here's what I found:",
    suggestions: ["Help me apply to Geisinger's program", "What documents do I need?", "Can Elena call them for me?"],
    cardFields: {
      assistanceResult: CHARITY_CARE_DATA,
    },
  },
  // RECORDING 3: Financial support
  {
    name: "financial_support",
    matchKeywords: ["surgery", "out of pocket"],
    delay: 4000,
    toolLabel: "Finding financial assistance programs...",
    reply: "There are actually a lot of programs that help cover exactly this kind of situation — most people just don't know they exist. Based on what you've told me, I found 5 programs you might qualify for. Between grants, hospital charity care, and government programs, you could potentially offset most of that $18,000.",
    suggestions: ["Help me apply to these", "Which one should I start with?", "Can Elena handle the applications?"],
    cardFields: {
      assistanceResult: FINANCIAL_SUPPORT_DATA,
    },
  },
  // RECORDING 4: Prior auth / appeal
  {
    name: "prior_auth_appeal",
    matchKeywords: ["won't cover", "MRI"],
    delay: 5000,
    toolLabel: "Drafting your appeal...",
    reply: "Yes — you can fight this. What they sent you is called a \"denial,\" and you have the legal right to appeal it. Here's the thing most people don't know: 82% of insurance appeals actually get overturned. I wrote you an appeal letter based on your situation. You can send it yourself or I can send it for you.",
    suggestions: ["Send it for me", "Can I edit the letter first?", "What happens after I send it?"],
    cardFields: {
      appealScript: APPEAL_SCRIPT_DATA,
      appealStatus: APPEAL_STATUS_DATA,
    },
  },
  // Alt match for recording 4
  {
    name: "prior_auth_appeal_alt",
    matchKeywords: ["insurance", "said no", "MRI"],
    delay: 5000,
    toolLabel: "Drafting your appeal...",
    reply: "Yes — you can fight this. What they sent you is called a \"denial,\" and you have the legal right to appeal it. Here's the thing most people don't know: 82% of insurance appeals actually get overturned. I wrote you an appeal letter based on your situation. You can send it yourself or I can send it for you.",
    suggestions: ["Send it for me", "Can I edit the letter first?", "What happens after I send it?"],
    cardFields: {
      appealScript: APPEAL_SCRIPT_DATA,
      appealStatus: APPEAL_STATUS_DATA,
    },
  },
  // RECORDING 5: Blood test
  {
    name: "blood_test",
    matchKeywords: ["bloodwork"],
    delay: 3000,
    toolLabel: "Searching for labs near you...",
    reply: "You're smart to get back on track with bloodwork. I found 3 options near you that take your insurance. Heads up — the exact same blood panel ranges from $45 at Quest to $350 at the hospital lab. I'd recommend Quest or LabCorp for routine bloodwork.",
    suggestions: ["Book at Quest Diagnostics", "What does a blood panel check for?", "Do I need to fast before?"],
    cardFields: {
      doctorResults: BLOODWORK_DOCTORS,
      priceComparisonLabel: "Comprehensive Blood Panel",
    },
  },
  // RECORDING 6: Colonoscopy
  {
    name: "colonoscopy",
    matchKeywords: ["colonoscopy"],
    delay: 3000,
    toolLabel: "Comparing prices near you...",
    reply: "Good news — colonoscopy screenings are typically covered as preventive care, so you may pay much less than you think. But prices vary a LOT by location. I found 3 in-network options near you — the same exact procedure ranges from $950 to $3,200 depending on where you go.",
    suggestions: ["Book the cheapest one", "Are any of these highly rated?", "What should I know before a colonoscopy?"],
    cardFields: {
      doctorResults: COLONOSCOPY_DOCTORS,
      priceComparisonLabel: "Screening Colonoscopy",
    },
  },
];

// ─────────────────────────────────────────────────────────────────
//  Matcher function
// ─────────────────────────────────────────────────────────────────

export function matchDemoResponse(userMessage: string): DemoEntry | null {
  if (!DEMO_MODE) return null;
  const lower = userMessage.toLowerCase();
  for (const entry of DEMO_ENTRIES) {
    if (entry.matchKeywords.every((kw) => lower.includes(kw.toLowerCase()))) {
      return entry;
    }
  }
  return null;
}
