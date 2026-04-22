"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { trackViewContent, trackActivation } from "@/lib/tracking-events";
import * as analytics from "@/lib/analytics";
import { AuthModal } from "@/components/auth-modal";
import Spotlights from "@/components/landing/spotlights";
import { postPendingMessage } from "@/lib/pendingMessage";
import "./landing.css";

const STATS = [
  { value: 86, suffix: "%", label: "have delayed care due to cost uncertainty" },
  { value: 76, suffix: "%", label: "received a surprise medical bill" },
  { value: 95, suffix: "%", label: "want a price transparency tool" },
  { value: 90, suffix: "%", label: "want help navigating the system" },
];

const PERSONA_STATS: Record<string, typeof STATS> = {
  caregiver: [
    { value: 53, suffix: "M", label: "Americans are unpaid caregivers" },
    { value: 24, suffix: "hrs", label: "per week spent on caregiving tasks" },
    { value: 78, suffix: "%", label: "of caregivers manage insurance and bills" },
    { value: 40, suffix: "%", label: "of caregivers report high emotional stress" },
  ],
  fertility: [
    { value: 23, suffix: "K", label: "average cost of one IVF cycle" },
    { value: 42, suffix: "%", label: "of employers now cover fertility treatment" },
    { value: 61, suffix: "%", label: "say cost is the biggest barrier to treatment" },
    { value: 3, suffix: "x", label: "price variation between clinics for the same procedure" },
  ],
  chronic: [
    { value: 60, suffix: "%", label: "of adults live with a chronic condition" },
    { value: 90, suffix: "%", label: "of healthcare spending goes to chronic disease" },
    { value: 47, suffix: "%", label: "skip medications due to cost" },
    { value: 4, suffix: "+", label: "specialists the average chronic patient sees" },
  ],
  insurance: [
    { value: 49, suffix: "%", label: "chose the wrong plan for their needs" },
    { value: 2, suffix: "K", label: "average overspend on the wrong insurance plan" },
    { value: 73, suffix: "%", label: "don't understand their insurance benefits" },
    { value: 12, suffix: "M", label: "Americans are uninsured and don't know their options" },
  ],
  care_now: [
    { value: 5, suffix: "x", label: "more expensive to go to the ER vs urgent care" },
    { value: 27, suffix: "%", label: "of ER visits could be handled at urgent care" },
    { value: 145, suffix: "min", label: "average ER wait time in the U.S." },
    { value: 82, suffix: "%", label: "don't know which providers are in-network nearby" },
  ],
};

function CountUp({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!active || hasRun.current) return;
    hasRun.current = true;
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      // Ease-out: fast start, slow finish
      const progress = 1 - Math.pow(1 - step / steps, 3);
      current = Math.round(progress * target);
      setCount(current);
      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [active, target]);

  return (
    <span>
      {active ? count : 0}{suffix}
    </span>
  );
}

function StatsBar({ persona }: { persona?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative z-10 py-20 px-8 max-md:py-14 max-md:px-5 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 40%, #2E6BB5 100%)",
      }}
    >
      {/* Warm accent glow */}
      <div
        className="absolute -bottom-[30%] -left-[10%] w-[60%] h-[80%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(244,176,132,0.2) 0%, transparent 70%)" }}
      />
      <div
        className="absolute -top-[20%] -right-[5%] w-[40%] h-[60%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(46,107,181,0.3) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-[960px]">
        {/* Title */}
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 mb-4">
            Our data shows
          </p>
          <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.15] tracking-tight text-white">
            <span className="font-extrabold">U.S. Healthcare System</span>
            {" "}
            <em className="font-normal italic font-[family-name:var(--font-dm-serif)] text-[#F4B084]">is broken.</em>
          </h2>
        </div>


        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-6 max-md:grid-cols-2 max-md:gap-x-6 max-md:gap-y-10 max-sm:grid-cols-1 max-sm:gap-8">
          {(persona && PERSONA_STATS[persona] ? PERSONA_STATS[persona] : STATS).map((stat, i) => {
            const accents = ["#F4B084", "#93B5E1", "#FFFFFF", "#F4B084"];
            const delays = [0, 150, 300, 450];
            return (
              <div
                key={stat.label}
                className="text-center transition-all duration-700 ease-out min-w-0"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(20px)",
                  transitionDelay: `${delays[i]}ms`,
                }}
              >
                <div
                  className="text-[clamp(3rem,6vw,4.5rem)] font-extrabold leading-none mb-3"
                  style={{ color: accents[i] }}
                >
                  <CountUp target={stat.value} suffix={stat.suffix} active={visible} />
                </div>
                <p className="text-[15px] font-light text-white/60 leading-snug">
                  {stat.label.split(" ").map((word, wi) => {
                    const highlights = ["delayed", "surprise", "transparency", "navigating"];
                    if (highlights.some((h) => word.toLowerCase().includes(h))) {
                      return <em key={wi} className="font-semibold italic text-white/90 font-[family-name:var(--font-dm-serif)]">{word} </em>;
                    }
                    return <span key={wi}>{word} </span>;
                  })}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-12">
          <a
            href="/research"
            className="text-sm font-medium text-white/50 underline hover:text-white/80 transition-colors"
          >
            Read the full report
          </a>
          <span className="text-white/20">|</span>
          <a
            href="https://forms.gle/z4fSReqNxGgeT38p7"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-light text-white/40 underline hover:text-white/70 transition-colors"
          >
            Take the survey
          </a>
        </div>
      </div>
    </section>
  );
}

const SUGGESTIONS: {
  label: string;
  text: string;
  madlib?: { segments: { type: "text" | "blank"; value: string; placeholder?: string }[] };
}[] = [
  {
    label: "Compare Prices",
    text: "Compare MRI prices near me",
    madlib: {
      segments: [
        { type: "text", value: "Find me the cheapest " },
        { type: "blank", value: "", placeholder: "procedure" },
        { type: "text", value: " near me." },
      ],
    },
  },
  {
    label: "Dispute a Bill",
    text: "I want to dispute a medical bill",
    madlib: {
      segments: [
        { type: "text", value: "I got a bill from " },
        { type: "blank", value: "", placeholder: "provider" },
        { type: "text", value: ". Help me dispute it." },
      ],
    },
  },
  {
    label: "Find a Doctor",
    text: "Find an in-network doctor near me",
    madlib: {
      segments: [
        { type: "text", value: "Find me a " },
        { type: "blank", value: "", placeholder: "specialty" },
        { type: "text", value: " that takes " },
        { type: "blank", value: "", placeholder: "insurance" },
        { type: "text", value: " near me." },
      ],
    },
  },
  {
    label: "Manage Family Care",
    text: "Help me manage my parents' healthcare from my phone",
    madlib: {
      segments: [
        { type: "text", value: "Help me manage " },
        { type: "blank", value: "", placeholder: "family member" },
        { type: "text", value: "'s healthcare." },
      ],
    },
  },
  {
    label: "Find Insurance",
    text: "Help me find the right insurance plan",
    madlib: {
      segments: [
        { type: "text", value: "Help me find " },
        { type: "blank", value: "", placeholder: "individual or family" },
        { type: "text", value: " health insurance." },
      ],
    },
  },
];

const TESTIMONIALS = [
  { name: "Alex", text: <><span className="font-bold">Alex</span> saved <span className="font-bold">$650</span> on a CT scan by comparing prices before the appointment.</>, logo: "/images/insurers/oscar.svg", logoAlt: "Oscar" },
  { name: "Elena", text: <><span className="font-bold">Elena</span> negotiated an out-of-network ambulance ride down by <span className="font-bold">$1,000</span>.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
  { name: "Andrew", text: <><span className="font-bold">Andrew</span> had Elena call UnitedHealthcare and got his <span className="font-bold">$2,400</span> claim reprocessed.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  { name: "Abhi", text: <><span className="font-bold">Abhi</span> got back on track with all of his preventative health for free.</>, logo: "/images/insurers/kaiser.svg", logoAlt: "Kaiser Permanente" },
  { name: "Ryan", text: <><span className="font-bold">Ryan</span> found an in-network MRI for <span className="font-bold">$350</span> instead of the <span className="font-bold">$1,200</span> quoted.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  { name: "Maria", text: <><span className="font-bold">Maria</span> got her prior authorization for her inhaler approved after being rejected.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
  { name: "Doriam", text: <><span className="font-bold">Doriam</span> found the best price for her blood work and cardiology appointments.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  { name: "Andy", text: <><span className="font-bold">Andy</span> figured out the best insurance plan for him and his family.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
];

const PERSONA_TESTIMONIALS: Record<string, typeof TESTIMONIALS> = {
  caregiver: [
    { name: "Lisa", text: <><span className="font-bold">Lisa</span> manages her mom&apos;s <span className="font-bold">12 medications</span> and all her appointments from one app.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
    { name: "David", text: <><span className="font-bold">David</span> had Elena call his dad&apos;s insurance and got a <span className="font-bold">$3,200</span> bill reduced to <span className="font-bold">$800</span>.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
    { name: "Karen", text: <><span className="font-bold">Karen</span> keeps track of her parents&apos; doctors, prescriptions, and upcoming visits without a single spreadsheet.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
    { name: "Michael", text: <><span className="font-bold">Michael</span> found a geriatrician for his mom that takes Medicare and is <span className="font-bold">5 minutes</span> from her house.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
    { name: "Sarah", text: <><span className="font-bold">Sarah</span> got her dad&apos;s denied physical therapy claim overturned after Elena called Humana.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
    { name: "James", text: <><span className="font-bold">James</span> saved <span className="font-bold">$400/month</span> by switching his parents to better Medicare Advantage plans.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
    { name: "Amy", text: <><span className="font-bold">Amy</span> coordinates care across <span className="font-bold">4 specialists</span> for her husband without missing a single follow-up.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
    { name: "Tom", text: <><span className="font-bold">Tom</span> set up medication reminders for his mom and hasn&apos;t missed a refill in <span className="font-bold">6 months</span>.</>, logo: "/images/insurers/kaiser.svg", logoAlt: "Kaiser Permanente" },
  ],
  fertility: [
    { name: "Jessica", text: <><span className="font-bold">Jessica</span> compared IVF costs at <span className="font-bold">5 clinics</span> and saved <span className="font-bold">$8,000</span> on her first cycle.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
    { name: "Rachel", text: <><span className="font-bold">Rachel</span> got her egg freezing pre-authorized after Elena called Aetna <span className="font-bold">3 times</span>.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
    { name: "Priya", text: <><span className="font-bold">Priya</span> found out her plan covers <span className="font-bold">3 IUI cycles</span> she didn&apos;t know about.</>, logo: "/images/insurers/cigna.svg", logoAlt: "Cigna" },
    { name: "Megan", text: <><span className="font-bold">Megan</span> tracks her fertility medications, appointments, and lab results all in one place.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
    { name: "Lauren", text: <><span className="font-bold">Lauren</span> saved <span className="font-bold">$2,100</span> on fertility meds by comparing pharmacy prices through Elena.</>, logo: "/images/insurers/oscar.svg", logoAlt: "Oscar" },
    { name: "Nina", text: <><span className="font-bold">Nina</span> got her denied IVF claim appealed and <span className="font-bold">$12,000</span> reimbursed.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
    { name: "Emily", text: <><span className="font-bold">Emily</span> found a fertility specialist with a <span className="font-bold">62% success rate</span> that takes her insurance.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
    { name: "Aisha", text: <><span className="font-bold">Aisha</span> navigated her entire IVF journey without a single surprise bill.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
  ],
  chronic: [
    { name: "Marcus", text: <><span className="font-bold">Marcus</span> found insulin for <span className="font-bold">$35/month</span> instead of the <span className="font-bold">$300</span> his pharmacy quoted.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
    { name: "Jen", text: <><span className="font-bold">Jen</span> got her Humira prior authorization approved in <span className="font-bold">48 hours</span> after weeks of waiting.</>, logo: "/images/insurers/cigna.svg", logoAlt: "Cigna" },
    { name: "Chris", text: <><span className="font-bold">Chris</span> tracks his A1C, blood pressure meds, and endocrinologist visits all in one place.</>, logo: "/images/insurers/kaiser.svg", logoAlt: "Kaiser Permanente" },
    { name: "Diana", text: <><span className="font-bold">Diana</span> found a rheumatologist that takes her insurance and has <span className="font-bold">next-week</span> availability.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
    { name: "Robert", text: <><span className="font-bold">Robert</span> saved <span className="font-bold">$180/month</span> by switching to a generic his doctor didn&apos;t know about.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
    { name: "Tanya", text: <><span className="font-bold">Tanya</span> manages her thyroid medication, lab work, and follow-ups without missing a beat.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
    { name: "Alex", text: <><span className="font-bold">Alex</span> found a therapist taking new patients with <span className="font-bold">$20 copays</span> through his plan.</>, logo: "/images/insurers/oscar.svg", logoAlt: "Oscar" },
    { name: "Maria", text: <><span className="font-bold">Maria</span> got her autoimmune specialist referral pushed through after Elena called her PCP.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  ],
  insurance: [
    { name: "Kevin", text: <><span className="font-bold">Kevin</span> found a plan that covers all <span className="font-bold">3 of his medications</span> and saves <span className="font-bold">$200/month</span>.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
    { name: "Sara", text: <><span className="font-bold">Sara</span> compared <span className="font-bold">12 marketplace plans</span> in minutes and picked one that keeps her doctors.</>, logo: "/images/insurers/oscar.svg", logoAlt: "Oscar" },
    { name: "Dan", text: <><span className="font-bold">Dan</span> turned 65 and Elena walked him through every Medicare option without a single confusing brochure.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
    { name: "Linda", text: <><span className="font-bold">Linda</span> found out her employer&apos;s HSA plan would save her family <span className="font-bold">$3,400/year</span>.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
    { name: "Jason", text: <><span className="font-bold">Jason</span> switched from a PPO to an HMO and saved <span className="font-bold">$150/month</span> without losing his doctors.</>, logo: "/images/insurers/kaiser.svg", logoAlt: "Kaiser Permanente" },
    { name: "Pam", text: <><span className="font-bold">Pam</span> found a Silver plan with <span className="font-bold">$0 deductible</span> she didn&apos;t know she qualified for.</>, logo: "/images/insurers/cigna.svg", logoAlt: "Cigna" },
    { name: "Tony", text: <><span className="font-bold">Tony</span> compared dental and vision add-ons and found bundled savings of <span className="font-bold">$60/month</span>.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
    { name: "Grace", text: <><span className="font-bold">Grace</span> got COBRA alternatives that cost <span className="font-bold">half the price</span> with better coverage.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  ],
  care_now: [
    { name: "Mike", text: <><span className="font-bold">Mike</span> found an urgent care open at <span className="font-bold">9 PM</span> that takes his insurance and is <span className="font-bold">2 miles</span> away.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
    { name: "Jess", text: <><span className="font-bold">Jess</span> skipped the ER and saved <span className="font-bold">$1,800</span> by going to an urgent care Elena found.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
    { name: "Omar", text: <><span className="font-bold">Omar</span> got a same-day telehealth appointment in <span className="font-bold">15 minutes</span> through Elena.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
    { name: "Katie", text: <><span className="font-bold">Katie</span> needed an X-ray and Elena found a walk-in clinic with <span className="font-bold">no wait</span> and <span className="font-bold">$45 copay</span>.</>, logo: "/images/insurers/cigna.svg", logoAlt: "Cigna" },
    { name: "Brian", text: <><span className="font-bold">Brian</span> got a prescription refill the same day after his pharmacy was out of stock.</>, logo: "/images/insurers/oscar.svg", logoAlt: "Oscar" },
    { name: "Anita", text: <><span className="font-bold">Anita</span> found a pediatrician with Saturday hours when her kid got sick on a weekend.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
    { name: "Derek", text: <><span className="font-bold">Derek</span> avoided a <span className="font-bold">$3,000</span> ER visit by finding an in-network urgent care open late.</>, logo: "/images/insurers/kaiser.svg", logoAlt: "Kaiser Permanente" },
    { name: "Sophie", text: <><span className="font-bold">Sophie</span> got antibiotics prescribed via telehealth and picked them up an hour later.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  ],
};

const INSURERS = [
  { src: "/images/insurers/bcbs.svg", alt: "Blue Cross Blue Shield" },
  { src: "/images/insurers/uhc.svg", alt: "UnitedHealthcare" },
  { src: "/images/insurers/aetna.svg", alt: "Aetna" },
  { src: "/images/insurers/cigna.svg", alt: "Cigna" },
  { src: "/images/insurers/humana.svg", alt: "Humana" },
  { src: "/images/insurers/kaiser.svg", alt: "Kaiser Permanente" },
  { src: "/images/insurers/anthem.svg", alt: "Anthem" },
  { src: "/images/insurers/medicare.svg", alt: "Medicare" },
  { src: "/images/insurers/centene.svg", alt: "Centene" },
  { src: "/images/insurers/oscar.svg", alt: "Oscar Health" },
  { src: "/images/insurers/delta-dental.svg", alt: "Delta Dental" },
  { src: "/images/insurers/vsp.svg", alt: "VSP Vision" },
];

// Default first-message template for users arriving via the homepage mobile
// "Get started" CTA (no ref-specific landing page, so no targeted prefill).
// Without this the agent lands with an empty first message and responds with
// awkward "I don't have your data" copy. This opener invites Elena to do her
// own pitch instead.
const HOMEPAGE_DEFAULT_QUERY = "Hi Elena, I'm new here. What can you help me with?";

const HERO_COPY: Record<string, { headline: [string, string]; accent?: string; subtitle: string; prefill: string }> = {
  bill_fighting: {
    headline: ["Most medical bills", "have errors. Fight back."],
    accent: "Fight back",
    subtitle: "Up to 80% of medical bills contain mistakes. Elena finds overcharges, files appeals, and negotiates on your behalf so you never pay more than you owe.",
    prefill: "I have questions about a medical bill.",
  },
  calls: {
    headline: ["Elena calls your", "insurance for you."],
    accent: "for you",
    subtitle: "No more hold music. No more transfers. Elena sits on hold, talks to your insurer, and reports back.",
    prefill: "I need help with some healthcare calls.",
  },
  caregiver: {
    headline: ["Caregiving is exhausting.", "Elena handles it."],
    accent: "Elena handles it",
    subtitle: "Calling doctors, fighting insurance, tracking medications. Elena does it all so you can focus on being there for them.",
    prefill: "I'm helping take care of someone's health. Where should I start?",
  },
  risk_assessment: {
    headline: ["Know your risk", "before it's too late."],
    accent: "too late",
    subtitle: "Take our assessment, learn your risks, and get the right tests on the way.",
    prefill: "I want to understand my health risks.",
  },
  meds: {
    headline: ["Find your medications", "in stock today."],
    accent: "today",
    subtitle: "Stop calling pharmacy after pharmacy. Tell Elena what you need and she'll find it in stock near you.",
    prefill: "I need help with my medications.",
  },
  fertility: {
    headline: ["Your fertility journey,", "all in one place."],
    accent: "all in one place",
    subtitle: "Track medications and appointments, compare clinic prices, call your insurance about coverage, and manage the whole process without the spreadsheets.",
    prefill: "I'm going through fertility treatment. Where should I start?",
  },
  chronic: {
    headline: ["Take control of", "your condition."],
    accent: "your condition",
    subtitle: "Living with diabetes, autoimmune disease, thyroid disorders, or mental health conditions means constant doctor visits, medications, and insurance battles. Elena manages it all for you.",
    prefill: "I'm managing a chronic condition. Where should I start?",
  },
  insurance: {
    headline: ["Find the right insurance.", "Stop overpaying."],
    accent: "overpaying",
    subtitle: "Marketplace plans, employer options, Medicare, Medicaid. Elena compares plans based on your doctors, medications, and expected needs so you pick the one that actually saves you money.",
    prefill: "I need help with my health insurance.",
  },
  care_now: {
    headline: ["Need care today?", "Elena finds it."],
    accent: "finds it",
    subtitle: "Urgent care, same-day appointments, telehealth, or an ER alternative. Elena finds available providers near you right now and tells you what it'll cost before you go.",
    prefill: "I need to see someone about my health soon.",
  },
  prices: {
    headline: ["Never get a surprise bill again.", "See prices before you go."],
    accent: "before you go",
    subtitle: "Elena uses real insurance-negotiated rates to show you what procedures actually cost at every provider near you. No surprises, no guessing.",
    prefill: "I need to get a procedure done near me. Walk me through what it'll cost.",
  },
};

const DEFAULT_HERO = {
  headline: "What can I help you with <em>today?</em>",
  subtitle: "Elena is a personal health assistant. She can make calls, use a computer, and write emails, and she's an expert in navigating the healthcare system.",
};

const BLOB_SPEEDS = [0.04, -0.03, 0.025, -0.02];

const BLOBS = [
  "w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]",
  "w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]",
  "w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,110,0.4)_0%,transparent_70%)] top-[30%] right-[25%]",
  "w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(232,149,109,0.25)_0%,transparent_70%)] bottom-[10%] left-[5%]",
];

// Mad Libs template: editable textarea with inline styled blanks
// Each template is an array of segments. "text" segments are plain text,
// "blank" segments render as styled pill inputs inline.
const MADLIB_TEMPLATES: Record<string, { segments: { type: "text" | "blank"; value: string; placeholder?: string }[] }> = {
  calls: {
    segments: [
      { type: "text", value: "Call " },
      { type: "blank", value: "", placeholder: "insurer" },
      { type: "text", value: " and ask about " },
      { type: "blank", value: "", placeholder: "claim or issue" },
      { type: "text", value: "." },
    ],
  },
  meds: {
    segments: [
      { type: "text", value: "Find " },
      { type: "blank", value: "", placeholder: "medication" },
      { type: "text", value: " " },
      { type: "blank", value: "", placeholder: "dosage" },
      { type: "text", value: " in stock near me." },
    ],
  },
  chronic: {
    segments: [
      { type: "text", value: "I have " },
      { type: "blank", value: "", placeholder: "condition" },
      { type: "text", value: ". Find me the cheapest " },
      { type: "blank", value: "", placeholder: "medication" },
      { type: "text", value: " and a specialist near me." },
    ],
  },
  care_now: {
    segments: [
      { type: "text", value: "I need to see a " },
      { type: "blank", value: "", placeholder: "doctor type" },
      { type: "text", value: " today near " },
      { type: "blank", value: "", placeholder: "zip code" },
      { type: "text", value: "." },
    ],
  },
};

const ROTATING_QUERIES: Record<string, string[]> = {
  bill_fighting: [
    "I got a $4,200 ER bill, can you check if it's correct?",
    "my insurance denied my claim, help me appeal",
    "I was charged $800 for blood work, that seems way too high",
    "help me negotiate this hospital bill down",
    "I got a surprise out-of-network bill, what are my options?",
    "can you check if my insurance should have covered this?",
    "I'm being billed for a procedure that was supposed to be preventive",
  ],
  calls: [
    "call UnitedHealthcare about my denied claim",
    "call my insurance and ask why my referral was rejected",
    "call Aetna and dispute this $800 charge",
    "call Blue Cross and check if my MRI is covered",
    "call my provider and negotiate my outstanding balance",
    "call Cigna and get my prior authorization status",
  ],
  meds: [
    "find the cheapest Ozempic near me",
    "compare pharmacy prices for Adderall",
    "where can I get Eliquis the cheapest?",
    "find the best price on my Humira prescription",
    "compare GoodRx vs insurance price for Lipitor",
    "which pharmacy near me has the cheapest generics?",
    "find affordable insulin near me",
  ],
  fertility: [
    "help me navigate my fertility journey",
    "compare IVF clinic prices near me",
    "does my insurance cover fertility treatments?",
    "how much does egg freezing cost with my plan?",
    "help me keep track of my fertility appointments",
    "find a fertility specialist that takes my insurance",
    "what does my plan cover for IUI?",
  ],
  caregiver: [
    "help me manage my mom's medications and refills",
    "find a geriatrician near my parents that takes Medicare",
    "my dad got a bill for $3,200, can you help dispute it?",
    "schedule my mom's annual checkup with her PCP",
    "which of my dad's prescriptions have cheaper alternatives?",
    "call my mom's insurance about her denied claim",
    "help me keep track of my parents' upcoming appointments",
  ],
  chronic: [
    "find the cheapest insulin near me",
    "help me find an endocrinologist that takes my insurance",
    "compare prices for my Humira prescription",
    "find a therapist near me that takes Blue Cross",
    "what blood tests should I get for my thyroid this year?",
    "help me find a rheumatologist for my autoimmune condition",
    "is there a generic alternative to my antidepressant?",
  ],
  insurance: [
    "compare marketplace plans that cover my medications",
    "which plans have the lowest out-of-pocket for a family of 4?",
    "does this plan cover my current doctors?",
    "help me understand the difference between HMO and PPO",
    "I'm turning 65, walk me through Medicare options",
    "which plan has the best mental health coverage?",
    "compare deductibles across Silver plans in my area",
  ],
  care_now: [
    "find urgent care open right now near me",
    "I need a same-day appointment with a doctor",
    "is it cheaper to go to urgent care or the ER for this?",
    "find a telehealth doctor I can see in the next hour",
    "where can I get an X-ray today without a referral?",
    "find a walk-in clinic near me that takes Aetna",
    "I need a prescription refill today, who can help?",
  ],
  prices: [
    "how much does an MRI cost near me?",
    "compare colonoscopy prices at hospitals vs outpatient centers",
    "what will a knee replacement cost with my insurance?",
    "find the cheapest place to get blood work done near me",
    "how much does physical therapy cost per session?",
    "compare prices for a CT scan at facilities near me",
    "what's the cash price vs insurance price for an ultrasound?",
  ],
};

function useRotatingQuery(
  queries: string[] | undefined,
  paused: boolean,
) {
  const [displayed, setDisplayed] = useState(queries?.[0] ?? "");
  const [queryIndex, setQueryIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(queries?.[0]?.length ?? 0);
  const [phase, setPhase] = useState<"idle" | "erasing" | "typing">("idle");

  // The full query the animation is currently targeting
  const fullQuery = queries?.[queryIndex] ?? "";

  useEffect(() => {
    if (!queries || queries.length <= 1 || paused) return;

    if (phase === "idle") {
      const t = setTimeout(() => setPhase("erasing"), 3000);
      return () => clearTimeout(t);
    }

    if (phase === "erasing") {
      if (charIndex > 0) {
        const t = setTimeout(() => {
          setCharIndex((c) => c - 1);
          setDisplayed(queries[queryIndex].slice(0, charIndex - 1));
        }, 20);
        return () => clearTimeout(t);
      }
      const next = (queryIndex + 1) % queries.length;
      setQueryIndex(next);
      setCharIndex(0);
      setDisplayed("");
      setPhase("typing");
      return;
    }

    if (phase === "typing") {
      const target = queries[queryIndex % queries.length];
      if (charIndex < target.length) {
        const t = setTimeout(() => {
          setCharIndex((c) => c + 1);
          setDisplayed(target.slice(0, charIndex + 1));
        }, 35);
        return () => clearTimeout(t);
      }
      setPhase("idle");
      return;
    }
  }, [phase, charIndex, queryIndex, queries, paused]);

  return { displayed, fullQuery };
}

export default function LandingPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F1B3D] border-t-transparent" /></div>}>
      <LandingPage />
    </Suspense>
  );
}

function LandingPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [demoMode] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("elena_demo_mode") === "true"
  );

  // Prefetch the /onboard route on landing-page mount. `/onboard` statically
  // imports WebOnboardingTour (~5k-line component), which is the heaviest
  // chunk in the whole app. Without prefetch, clicking "Get Started" blocks
  // the user on network fetch + parse of that chunk — felt like 300ms-2s
  // depending on connection. Prefetching in an effect starts the background
  // download the moment the user sees the landing page, so by the time they
  // tap the CTA the bundle is already parsed and navigation is instant.
  useEffect(() => {
    router.prefetch("/onboard");
  }, [router]);

  // Support both ?ref=bills (direct) and /lp/bills (rewrite).
  // Rewrites keep the browser URL as /lp/bills but serve /?ref=bills internally.
  // useSearchParams reads the browser URL, so we also extract ref from the path.
  const LP_PATH_MAP: Record<string, string> = {
    "/lp/bill-fighting": "bill_fighting",
    "/lp/calls": "calls",
    "/lp/caregiver": "caregiver",
    "/lp/meds": "meds",
    "/lp/fertility": "fertility",
    "/lp/chronic": "chronic",
    "/lp/insurance": "insurance",
    "/lp/care-now": "care_now",
    "/lp/price-transparency": "prices",
  };
  // Priority: explicit ?ref= > /lp/* path map > utm_content (last-resort, only
  // if it happens to match a known variant key). utm_content MUST come after
  // the path map because ad campaigns use free-form slugs like "ugc_insurance"
  // that are not valid HERO_COPY keys and would blank the variant.
  const utmContentRef = searchParams.get("utm_content");
  const ref =
    searchParams.get("ref") ||
    LP_PATH_MAP[pathname] ||
    (utmContentRef && HERO_COPY[utmContentRef] ? utmContentRef : null);
  const hero = (ref && HERO_COPY[ref]) || null;
  const queries = ref ? ROTATING_QUERIES[ref] : undefined;
  const [userHasEdited, setUserHasEdited] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const { displayed: rotatingText, fullQuery } = useRotatingQuery(queries, userHasEdited || inputFocused);
  const [manualInput, setManualInput] = useState("");
  const [chipMadlib, setChipMadlib] = useState<typeof SUGGESTIONS[0]["madlib"] | null | undefined>(undefined);
  // undefined = no chip clicked (use LP template); null = chip clicked with no madlib (plain input); object = chip madlib
  const madlib = chipMadlib === undefined ? (ref ? MADLIB_TEMPLATES[ref] : undefined) : (chipMadlib ?? undefined);
  const input = userHasEdited ? manualInput : (queries ? rotatingText : (hero?.prefill || ""));
  // When sending mid-animation, use the full target query instead of partial text
  const madlibRef = useRef<HTMLDivElement>(null);
  const getMadlibText = () => {
    if (!madlibRef.current || !madlib) return "";
    const textSpans = madlibRef.current.querySelectorAll("[data-madlib-text]");
    const inputs = madlibRef.current.querySelectorAll("input");
    let textIdx = 0;
    let inputIdx = 0;
    return madlib.segments.map((seg) => {
      if (seg.type === "text") {
        const span = textSpans[textIdx];
        textIdx++;
        return span?.textContent ?? seg.value;
      }
      const val = inputs[inputIdx]?.value || seg.placeholder || "";
      inputIdx++;
      return val;
    }).join("").trim();
  };
  const sendQuery = madlib
    ? getMadlibText()
    : (userHasEdited ? manualInput : (queries ? fullQuery : (hero?.prefill || "")));
  const setInput = useCallback((val: string) => { setUserHasEdited(true); setManualInput(val); }, []);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [chatPreviewVisible, setChatPreviewVisible] = useState(false);
  const [chatPreviewQuery, setChatPreviewQuery] = useState<string>("");
  const [authDefaultMode, setAuthDefaultMode] = useState<"signin" | "signup">("signup");
  const [pendingDocFile, setPendingDocFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const landingDragCounter = useRef(0);
  const landingFileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  const hasTrackedPageView = useRef(false);

  // Authenticated → go to /chat (skip in demo mode so user can interact with landing page)
  useEffect(() => {
    if (!loading && session && !demoMode) {
      router.replace("/chat");
    }
  }, [loading, session, router, demoMode]);

  // ViewContent pixel event for landing pages
  useEffect(() => {
    trackViewContent('landing_page', ref || 'homepage');
  }, [ref]);

  // Track landing page view (Mixpanel)
  useEffect(() => {
    if (!loading && !session && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      analytics.track("Landing Page Viewed", {
        landing_variant: ref || "homepage",
      });
    }
  }, [loading, session]);

  // Set body background to match hero gradient edges on mobile
  useEffect(() => {
    document.body.style.backgroundColor = "#0F1B3D";
    document.documentElement.style.backgroundColor = "#0F1B3D";
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  // Parallax blobs
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const mouse = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf: number;

    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width - 0.5;
      mouse.y = (e.clientY - r.top) / r.height - 0.5;
    };
    const onScroll = () => {
      const p = Math.min(1, window.scrollY / window.innerHeight);
      mouse.y = p * 0.3 - 0.15;
      mouse.x = Math.sin(p * 2) * 0.1;
    };
    function animate() {
      current.x += (mouse.x - current.x) * 0.05;
      current.y += (mouse.y - current.y) * 0.05;
      blobRefs.current.forEach((blob, i) => {
        if (!blob) return;
        const dx = current.x * BLOB_SPEEDS[i] * 1000;
        const dy = current.y * BLOB_SPEEDS[i] * 1000;
        blob.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      raf = requestAnimationFrame(animate);
    }
    hero.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    animate();
    return () => {
      hero.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleSend = useCallback((opts?: { preferPrefill?: boolean }) => {
    // Read madlib inputs at send time (not render time) so user input is captured.
    // preferPrefill (used by the bottom CTA) skips the rotating placeholder text so
    // clicking "Get started" without typing sends the canonical persona prefill
    // instead of whatever random example query was animating in the hero input.
    const typed = opts?.preferPrefill && !userHasEdited
      ? (madlib ? getMadlibText().trim() : "")
      : (madlib ? getMadlibText().trim() : sendQuery.trim());
    // Fall back to the LP's prefill so users arriving via the mobile "Get
    // started" CTA (no input shown) or hitting send with an empty field open
    // chat with a coherent first message in Elena's voice. Ref-specific LPs
    // use their own prefill; the homepage gets HOMEPAGE_DEFAULT_QUERY so the
    // agent doesn't land with "I don't have your data".
    const query = typed || hero?.prefill || HOMEPAGE_DEFAULT_QUERY;
    // Late-signup is the default funnel. The user goes through the onboarding
    // tour first and is only prompted to sign up at the elena-plan Continue
    // step (Phase 3). Early-signup (immediate AuthModal on landing CTA) is
    // preserved for A/B testing via `?signup=first` and as a fallback if
    // anything breaks in the tour pipeline.
    //
    // Flag resolution (in order of precedence):
    //   1. `?signup=first` → force early-signup this session
    //   2. `?signup=late`  → force late-signup this session (historical opt-in;
    //      still honored so legacy share links keep working)
    //   3. sessionStorage persists the last explicit choice
    //   4. Default: late-signup
    //
    // Posting to pending_messages only happens in the early-signup path;
    // in late-signup the tour's action selection is the seed that reaches
    // /chat. Posting both produces two competing seeds.
    const lateSignupFlag = (() => {
      if (typeof window === "undefined") return true;
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("signup") === "first") {
        try { sessionStorage.setItem("elena_late_signup", "0"); } catch {}
        return false;
      }
      if (sp.get("signup") === "late") {
        try { sessionStorage.setItem("elena_late_signup", "1"); } catch {}
        return true;
      }
      return sessionStorage.getItem("elena_late_signup") !== "0";
    })();
    if (query) {
      analytics.track("Hero Input Submitted", { query_length: query.length });
      analytics.track("Message Sent", {
        is_first_message: true,
        has_attachment: !!pendingDocFile,
        message_length: query.length,
        authenticated: !!session,
        source: "landing_page",
        landing_variant: ref || "homepage",
        used_default: !typed,
      });
      if (session?.user?.id) {
        trackActivation(session.user.id);
      }
      // Always stash in localStorage — tour reads it for the value/care
      // step taglines. Only post to pending_messages on the OLD flow
      // (signup-first). For the late-signup flow, skip the server-side
      // row so claim doesn't fire on /chat and wipe the tour's seed.
      localStorage.setItem("elena_pending_query", query);
      if (!lateSignupFlag) {
        void postPendingMessage({
          content: query,
          source: typed ? (madlib ? "madlib" : "landing_hero") : "landing_default",
          landing_variant: ref || "homepage",
          pending_doc_name: pendingDocFile?.name ?? null,
        });
      }
    }
    // In demo mode with an attached file but no text query, use a default query
    if (!query && pendingDocFile && demoMode) {
      const fallback = "Help me understand this bill";
      localStorage.setItem("elena_pending_query", fallback);
      void postPendingMessage({
        content: fallback,
        source: "demo",
        landing_variant: ref || "homepage",
        pending_doc_name: pendingDocFile?.name ?? null,
      });
    }
    // Store pending doc name for the chat page
    if (pendingDocFile) {
      localStorage.setItem("elena_pending_doc", pendingDocFile.name);
    }
    // Demo mode + authenticated: skip auth modal, go straight to chat
    if (demoMode && session) {
      router.push("/chat");
      return;
    }
    // Stash the LP variant so the onboarding tour can tailor the value step
    // (e.g. skip it for bill_fighting / prices where the hero already is the pitch).
    localStorage.setItem("elena_lp_variant", ref || "homepage");

    // Plan A rollout: when the late-signup flag is on, route to the
    // anonymous /onboard surface instead of immediately gating with
    // AuthModal. The tour captures the rest of the funnel (care, router,
    // pain, profile, meds, care plan) and only triggers signup at
    // elena-plan Continue (Phase 3). Flag resolution happened earlier
    // (before postPendingMessage) so both code paths see the same value.
    if (lateSignupFlag) {
      // Arm the post-seed paywall gate the moment the user enters the
      // late-signup funnel. Previously this flag was only set inside the
      // tour's elena-plan "Continue" branch (web-onboarding-tour.tsx:1566),
      // which required the user to pick an action AND for
      // buildSeedMessageFromActions() to return a non-empty seed. Users
      // who skipped action selection bypassed the gate entirely — their
      // 2-message paywall trigger never fired on /chat, they could send
      // unlimited messages without hitting the paywall. Arming it here
      // guarantees every late-signup user is subject to the gate, and
      // the tour's line-1566 setter becomes a no-op reinforcement.
      try { sessionStorage.setItem("elena_tour_post_seed_gate", "1"); } catch {}
      analytics.track("Onboard Route Entered", { source: "landing_hero", landing_variant: ref || "homepage" });
      router.push("/onboard");
      return;
    }

    setAuthDefaultMode("signup");
    setChatPreviewQuery(query || "");
    setChatPreviewVisible(true);
    setAuthModalOpen(true);
  }, [sendQuery, ref, hero, madlib, demoMode, session, pendingDocFile, router, userHasEdited]);

  const handleChipClick = useCallback((suggestion: typeof SUGGESTIONS[number]) => {
    analytics.track("Suggested Prompt Clicked", { prompt_label: suggestion.label });
    if (suggestion.madlib) {
      setChipMadlib(suggestion.madlib);
      setUserHasEdited(false);
      setManualInput("");
    } else {
      setChipMadlib(null);
      setUserHasEdited(true);
      setManualInput(suggestion.text);
      inputRef.current?.focus();
    }
  }, []);

  if (loading || (session && !demoMode)) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F1B3D] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="font-[family-name:var(--font-inter)]">
      {/* NAV */}
      <nav className={`absolute top-0 left-0 right-0 z-[100] px-8 py-5 flex items-center justify-between max-md:px-4 transition-opacity duration-150 ${chatPreviewVisible ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <a
          href="#"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 max-md:px-4 max-md:py-2 max-md:h-10 max-md:flex max-md:items-center text-[1.35rem] max-md:text-[0.95rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          elena
        </a>
        <div
          className="hidden md:flex bg-white/[0.06] backdrop-blur-[40px] border border-white/15 border-t-white/25 rounded-full px-2 py-1.5 gap-1 shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          <a href="#how-it-works" className="text-white/80 no-underline text-[0.9rem] font-normal px-6 py-2 rounded-full transition-all hover:text-white hover:bg-white/10">
            How it Works
          </a>
          <a href="#features" className="text-white/80 no-underline text-[0.9rem] font-normal px-6 py-2 rounded-full transition-all hover:text-white hover:bg-white/10">
            Features
          </a>
        </div>
        <button
          onClick={() => { analytics.track("Login Button Clicked"); setAuthDefaultMode("signup"); setAuthModalOpen(true); }}
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-full px-7 py-3 max-md:px-5 max-md:py-2 max-md:h-10 text-white/90 text-[0.9rem] max-md:text-[0.8rem] font-normal cursor-pointer transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/15 hover:text-white hover:border-white/25"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          Log in
        </button>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative flex flex-col items-center overflow-hidden">
        {/* Gradient bg */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
        </div>
        {/* noise texture removed */}

        {/* Blobs */}
        <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
          {BLOBS.map((cls, i) => (
            <div
              key={i}
              ref={(el) => { blobRefs.current[i] = el; }}
              className={`absolute rounded-full blur-[80px] will-change-transform ${cls}`}
            />
          ))}
        </div>

        {/* Content wrapper — viewport-height centered for bills, inline for others */}
        <div className="min-h-[80dvh] flex flex-col items-center justify-center w-full shrink-0 pb-8" style={{ paddingTop: "max(6rem, 12vh)" }}>
        <div className="relative z-[4] text-center max-w-[700px] md:max-w-[880px] w-full px-6 max-md:px-5">
          <h1 className="text-[clamp(2.5rem,5vw,3.8rem)] max-md:text-[2.15rem] font-light leading-[1.15] tracking-tight text-white">
            {hero ? (
              <>
                {hero.headline[0]}<br />
                {hero.accent ? (() => {
                  const line = hero.headline[1];
                  const idx = line.toLowerCase().indexOf(hero.accent.toLowerCase());
                  if (idx === -1) return line;
                  const before = line.slice(0, idx);
                  const match = line.slice(idx, idx + hero.accent.length);
                  const after = line.slice(idx + hero.accent.length);
                  return <>{before}<em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">{match}</em>{after}</>;
                })() : hero.headline[1]}
              </>
            ) : (
              <>
                <span className="block md:whitespace-nowrap">Better healthcare starts with</span>
                <span className="block md:whitespace-nowrap">an <em className="italic font-normal font-[family-name:var(--font-dm-serif)]">advocate.</em> Meet Elena.</span>
              </>
            )}
          </h1>
          <p className="text-[0.95rem] max-md:text-[0.75rem] font-light text-white/85 mt-4 max-md:mt-2.5 tracking-wide">
            {hero ? hero.subtitle : (
              <>Elena makes the calls, fights the bills, and finds in-network care. So you don&apos;t have to.</>
            )}
          </p>

          {/* Chat input bar (desktop only — mobile gets a single CTA button below) */}
          <div
            className={`max-md:hidden flex flex-col bg-white/95 rounded-[20px] max-md:rounded-[16px] border max-w-[580px] w-full mx-auto mt-8 max-md:mt-5 shadow-[0_4px_24px_rgba(0,0,0,0.1)] transition-all ${isDraggingOver ? "border-[#2E6BB5] ring-2 ring-[#2E6BB5]/30" : "border-white/30"}`}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); landingDragCounter.current++; setIsDraggingOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); landingDragCounter.current--; if (landingDragCounter.current <= 0) { landingDragCounter.current = 0; setIsDraggingOver(false); } }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation();
              landingDragCounter.current = 0; setIsDraggingOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) setPendingDocFile(file);
            }}
          >
            {isDraggingOver && (
              <div className="flex items-center justify-center py-6 text-sm font-medium text-[#2E6BB5]">
                Drop file here
              </div>
            )}
            <div className={`px-5 max-md:px-3.5 pt-[18px] max-md:pt-3.5 pb-3 max-md:pb-2 relative min-h-[3.5rem] max-md:min-h-[2.5rem] ${isDraggingOver ? "hidden" : ""}`}>
              {madlib ? (
                <div
                  ref={madlibRef}
                  className="text-base max-md:text-[0.9rem] text-[#1C1C1E] leading-[2.6] h-full overflow-visible text-left"
                  style={{ wordBreak: "break-word" }}
                >
                  {madlib.segments.map((seg, i) =>
                    seg.type === "text" ? (
                      <span
                        key={i}
                        contentEditable
                        suppressContentEditableWarning
                        data-madlib-text
                        onInput={() => setUserHasEdited(true)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                        className="align-middle outline-none"
                      >{seg.value}</span>
                    ) : (
                      <input
                        key={i}
                        type="text"
                        placeholder={seg.placeholder}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                        onChange={() => setUserHasEdited(true)}
                        className="inline-block border border-[#D1D1D6] rounded-lg px-3 py-1 mx-0.5 text-base max-md:text-[0.9rem] text-[#1C1C1E] font-medium text-center bg-[#F9F9F9] min-w-[4rem] w-auto placeholder:text-[#C7C7CC] placeholder:font-normal focus:border-[#0F1B3D]/40 focus:shadow-[0_0_0_3px_rgba(15,27,61,0.06)] focus:outline-none transition-all align-middle"
                        style={{ width: seg.placeholder ? `${Math.max(seg.placeholder.length + 2, 6)}ch` : "6ch" }}
                      />
                    )
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onChange={(e) => {
                      setUserHasEdited(true);
                      setManualInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Ask Elena anything..."
                    rows={1}
                    className={`w-full border-none outline-none bg-transparent text-base max-md:text-sm text-[#1C1C1E] placeholder:text-[#AEAEB2] resize-none max-h-32 overflow-y-auto ${queries && !userHasEdited && !inputFocused ? "caret-transparent" : ""}`}
                  />
                  {queries && !userHasEdited && !inputFocused && (
                    <span className="pointer-events-none absolute top-[18px] left-5 text-base max-md:text-sm text-transparent whitespace-pre" aria-hidden>
                      {input}<span className="animate-[cursor-blink_1s_step-end_infinite] text-[#1C1C1E]">|</span>
                    </span>
                  )}
                </>
              )}
            </div>
            {/* Pending file chip */}
            {pendingDocFile && (
              <div className="flex items-center gap-1.5 px-5 max-md:px-3.5 pb-1">
                <span className="inline-flex items-center gap-1.5 bg-[#0F1B3D]/[0.08] px-3 py-1 rounded-full text-xs text-[#0F1B3D]/70">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span className="max-w-[140px] truncate">{pendingDocFile.name}</span>
                  <button onClick={() => setPendingDocFile(null)} className="ml-0.5 text-[#0F1B3D]/40 hover:text-[#0F1B3D]/70">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" /></svg>
                  </button>
                </span>
              </div>
            )}
            <div className="flex items-center justify-between px-3 max-md:px-2 pb-3 max-md:pb-2 pt-1">
              <input
                ref={landingFileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPendingDocFile(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => landingFileInputRef.current?.click()}
                className="w-9 h-9 max-md:w-7 max-md:h-7 rounded-full flex items-center justify-center text-[#AEAEB2] hover:text-[#8E8E93] hover:bg-black/[0.04] transition-all"
                aria-label="Attach document"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 max-md:w-4 max-md:h-4">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button
                onClick={() => handleSend()}
                className="w-10 h-10 max-md:w-8 max-md:h-8 rounded-full bg-[#0F1B3D] flex items-center justify-center cursor-pointer transition-colors hover:bg-[#1A3A6E]"
                aria-label="Send"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
                  <path d="M10 16V4M4 10l6-6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile-only CTA: replace the whole input + chips with a single
              "Get started" button matching the caregiver LP. */}
          <button
            onClick={() => handleSend({ preferPrefill: true })}
            className="md:hidden block w-auto mx-auto mt-6 h-12 px-10 rounded-full bg-white/[0.18] backdrop-blur-[40px] border border-white/30 border-t-white/50 text-white text-[0.95rem] font-semibold shadow-[0_10px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] active:scale-[0.97] transition-transform"
            style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
          >
            Get started
          </button>

          {/* Suggestion chips (desktop only — mobile hides these with the input) */}
          <div className="max-md:hidden text-[11px] max-md:text-[9px] font-semibold uppercase tracking-[1.5px] text-white/40 text-center mt-7 max-md:mt-4 mb-3.5 max-md:mb-2">
            Common problems Elena can solve
          </div>
          <div className="max-md:hidden flex gap-2.5 justify-center flex-nowrap px-3 max-md:overflow-x-auto max-md:justify-start max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden max-md:[mask-image:linear-gradient(to_right,black_80%,transparent_100%)]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => handleChipClick(s)}
                className={`rounded-[22px] px-[18px] py-2.5 max-md:px-3 max-md:py-1.5 text-sm max-md:text-[11px] font-normal whitespace-nowrap cursor-pointer transition-all active:scale-[0.97] ${chipMadlib === s.madlib && s.madlib ? "bg-white/25 border border-white/40 text-white" : "bg-white/10 border border-white/20 text-white/90 hover:bg-white/[0.18] hover:border-white/[0.35]"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        </div>{/* close content wrapper */}

        {/* Testimonial cards + trusted by */}
        <div className="relative z-[3] w-full mt-8 pb-20" style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          }}>
            <div className="flex w-max animate-[scroll-left_140s_linear_infinite] max-md:animate-[scroll-left_90s_linear_infinite] will-change-transform [backface-visibility:hidden] mb-28">
              {[0, 1].map((set) => (
                <div key={set} className="flex gap-3 pr-3 shrink-0">
                  {(ref && PERSONA_TESTIMONIALS[ref] ? PERSONA_TESTIMONIALS[ref] : TESTIMONIALS).map((card) => (
                    <div key={`${set}-${card.name}`} className="bg-white/[0.12] backdrop-blur-xl border border-white/[0.18] rounded-2xl px-6 pt-5 pb-4 w-[310px] h-[130px] shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col">
                      <p className="text-[0.88rem] text-white/90 leading-relaxed flex-1">{card.text}</p>
                      <img src={card.logo} alt={card.logoAlt} className="h-6 mt-auto pt-2 self-start brightness-0 invert opacity-60" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Trusted by carousel */}
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 mb-4">
                Trusted by members insured with
              </div>
              <div className="overflow-hidden w-full relative" style={{
                maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              }}>
                <div className="flex w-max items-center animate-[trusted-scroll_120s_linear_infinite] will-change-transform">
                  {[0, 1].map((set) => (
                    <div key={set} className="flex items-center gap-10 pr-10 shrink-0">
                      {INSURERS.map((ins) => (
                        <img key={`${set}-${ins.alt}`} src={ins.src} alt={ins.alt} className="h-7 w-auto brightness-0 invert opacity-60 shrink-0" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
      </section>

      {/* STATS BAR */}
      <StatsBar persona={ref} />

      {/* MANIFESTO */}
      <section className="relative z-10 py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[960px] flex items-center gap-16 max-md:flex-col max-md:text-center">
          <div className="flex-1">
            <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.7] mb-4">
              The healthcare system isn&apos;t built for you.
            </p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight mb-7">
              Elena is.
            </h2>
            <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.7]">
              The center of your healthcare used to be your PCP, but most people today don&apos;t have one. They see dozens of providers across multiple health systems. Data gets scattered. Follow-ups get lost. Bills pile up. No one is watching your back.
            </p>
            <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.7] mt-3">
              Patients should be at the center of their own care. Elena puts a teammate in your pocket that helps you use the system and fights for you.
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-5">
            <a href="https://apps.apple.com/us/app/elena-ai-health-navigator/id6760362771" target="_blank" rel="noopener noreferrer">
              <img
                src="/images/elena-icon.png"
                alt="Elena"
                className="w-[220px] h-[220px] rounded-[48px] shadow-[0_16px_48px_rgba(0,0,0,0.12)] bg-[#0F1B3D] hover:scale-[1.03] transition-transform"
              />
            </a>
            <a
              href="https://apps.apple.com/us/app/elena-ai-health-navigator/id6760362771"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#0F1B3D] px-5 py-2.5 shadow-[0_2px_12px_rgba(15,27,61,0.25)] hover:shadow-[0_4px_16px_rgba(15,27,61,0.35)] hover:scale-[1.02] transition-all"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <span className="text-white font-medium text-[13px]">Download on the App Store</span>
            </a>
          </div>
        </div>
      </section>

      {/* SPOTLIGHTS */}
      <Spotlights persona={ref} />

      {/* BOTTOM CTA */}
      <section className="relative z-10 py-24 px-8 bg-[#F7F6F2] max-md:py-16 max-md:px-5">
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight mb-4">
            Ready when you are.
          </h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.7] mb-8 max-md:mb-6">
            Elena&apos;s got your back. Start the conversation in seconds.
          </p>
          <button
            onClick={() => handleSend({ preferPrefill: true })}
            className="cta-shimmer inline-flex items-center justify-center h-14 max-md:h-12 px-12 max-md:px-10 rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_45%,#2E6BB5_100%)] text-white text-[1.05rem] max-md:text-[0.95rem] font-semibold shadow-[0_10px_30px_rgba(15,27,61,0.28)] hover:shadow-[0_14px_38px_rgba(15,27,61,0.38)] hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="relative z-[2]">Get started</span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 pt-20 pb-10 px-8 text-white overflow-hidden" style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.25)_0%,rgba(232,149,109,0.15)_25%,transparent_60%)]" />
        <div className="relative mx-auto max-w-[960px]">
          <div className="text-[clamp(3rem,8vw,5rem)] font-light tracking-tight text-white mb-2">elena</div>
          <p className="text-base font-light text-white/60 mb-12">Your healthcare assistant.</p>

          {/* Link columns */}
          <div className="grid grid-cols-3 gap-8 mb-10 max-md:grid-cols-1 max-md:text-center">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Product</p>
              <div className="flex flex-col gap-2">
                <a href="#how-it-works" className="text-sm text-white/60 no-underline transition-colors hover:text-white">How it Works</a>
                <a href="#features" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Features</a>
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Legal</p>
              <div className="flex flex-col gap-2">
                <a href="/terms-of-service" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Terms of Service</a>
                <a href="/privacy-policy" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Privacy Policy</a>
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Connect</p>
              <div className="flex flex-col gap-2">
                <a href="/blog" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Blog</a>
                <a href="/research" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Research</a>
                <a href="/support" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Support</a>
                <a href="https://www.tiktok.com/@elenahealth" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 no-underline transition-colors hover:text-white">TikTok</a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-between items-center text-[0.78rem] text-white/30 max-md:flex-col max-md:gap-1.5 max-md:text-center">
            <span>&copy; 2026 Elena AI. All rights reserved.</span>
            <span>Made with love in NYC</span>
          </div>
          <div className="mt-4 text-[0.7rem] text-white/20 font-light text-center leading-relaxed">
            Elena helps you navigate healthcare costs and logistics. Not a substitute for medical advice. Pricing data from CMS-mandated hospital price transparency files.
          </div>
        </div>
      </footer>

      {/* Chat UI preview shown behind the auth modal on send — mirrors the
          real /chat layout so when the modal's backdrop blurs it, the user
          sees "the chat is already open and Elena is working." */}
      {chatPreviewVisible && (
        <div className="fixed inset-0 z-40 flex bg-white text-[#0F1B3D]" aria-hidden>
          {/* Sidebar */}
          <div className="flex h-dvh w-64 flex-shrink-0 flex-col bg-[#f5f7fb] max-md:hidden">
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
              <div className="h-12 w-12 rounded-xl overflow-hidden bg-[#0F1B3D] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/elena-icon-cropped.png" alt="" className="h-full w-full object-cover" style={{ transform: "scale(1.1)" }} />
              </div>
              <span className="text-lg font-extrabold text-[#0F1B3D] flex-1">elena</span>
            </div>
            <div className="flex items-center gap-2 px-4 pb-3">
              <div className="relative flex-1 h-10 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04]" />
              <div className="h-10 w-10 shrink-0 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04]" />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden px-3">
              <p className="px-3 pt-4 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[#0F1B3D]/30">Today</p>
              <div className="px-3 py-2 rounded-xl bg-[#0F1B3D]/[0.06] text-sm text-[#0F1B3D]/80 truncate">
                {chatPreviewQuery || "New chat"}
              </div>
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-14 border-b border-[#0F1B3D]/[0.04] flex items-center px-5">
              <span className="text-sm font-semibold text-[#0F1B3D]/80 truncate">
                {chatPreviewQuery || "New chat"}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="max-w-2xl mx-auto w-full px-5 py-8 flex flex-col gap-6">
                {chatPreviewQuery && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#e8ecf4] px-5 py-3 text-[15px] text-[#0F1B3D]">
                      {chatPreviewQuery}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0F1B3D]/40 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-[#0F1B3D]/40 animate-pulse [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-[#0F1B3D]/40 animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        open={authModalOpen}
        onOpenChange={(open) => {
          setAuthModalOpen(open);
          if (!open) setChatPreviewVisible(false);
        }}
        defaultMode={authDefaultMode}
      />
    </div>
  );
}
