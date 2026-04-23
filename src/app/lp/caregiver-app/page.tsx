"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";
import { trackViewContent } from "@/lib/tracking-events";
import "../../landing.css";

const APP_STORE_URL = "https://apps.apple.com/us/app/elena-ai-health-navigator/id6760362771";
const LP_VARIANT = "caregiver_app";

const BLOB_SPEEDS = [0.04, -0.03, 0.025, -0.02];
const BLOBS = [
  "w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]",
  "w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]",
  "w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,110,0.4)_0%,transparent_70%)] top-[30%] right-[25%]",
  "w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(232,149,109,0.25)_0%,transparent_70%)] bottom-[10%] left-[5%]",
];

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
];

type Testimonial = {
  name: string;
  text: React.ReactNode;
  logo: string;
  logoAlt: string;
};

const CAREGIVER_TESTIMONIALS: Testimonial[] = [
  { name: "Lisa", text: <><span className="font-semibold">Lisa</span> manages her mom&apos;s <span className="font-semibold">12 medications</span> and all her appointments from one app.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
  { name: "David", text: <><span className="font-semibold">David</span> had Elena call his dad&apos;s insurance and got a <span className="font-semibold">$3,200</span> bill reduced to <span className="font-semibold">$800</span>.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  { name: "Karen", text: <><span className="font-semibold">Karen</span> keeps track of her parents&apos; doctors, prescriptions, and upcoming visits without a single spreadsheet.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
  { name: "Michael", text: <><span className="font-semibold">Michael</span> found a geriatrician for his mom that takes Medicare and is <span className="font-semibold">5 minutes</span> from her house.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
  { name: "Sarah", text: <><span className="font-semibold">Sarah</span> got her dad&apos;s denied physical therapy claim overturned after Elena called Humana.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
  { name: "James", text: <><span className="font-semibold">James</span> saved <span className="font-semibold">$400/month</span> by switching his parents to better Medicare Advantage plans.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
  { name: "Amy", text: <><span className="font-semibold">Amy</span> coordinates care across <span className="font-semibold">4 specialists</span> for her husband without missing a single follow-up.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
  { name: "Tom", text: <><span className="font-semibold">Tom</span> set up medication reminders for his mom and hasn&apos;t missed a refill in <span className="font-semibold">6 months</span>.</>, logo: "/images/insurers/kaiser.svg", logoAlt: "Kaiser Permanente" },
];

const FEATURED_TESTIMONIALS: Testimonial[] = CAREGIVER_TESTIMONIALS.slice(0, 3);

type PhoneFeature = { title: string; body: string };
const PHONE_FEATURES: PhoneFeature[] = [
  {
    title: "Tap once, she calls for you",
    body: "Elena dials insurance, pharmacies, and doctors. You see the transcript in the app when she's done.",
  },
  {
    title: "All their meds in your pocket",
    body: "Snap a photo of a bottle. Elena logs the prescription, dosage, and prescriber. Refill reminders turn on automatically.",
  },
  {
    title: "Push notifications that matter",
    body: "Appeal cleared. Refill ready. New EOB posted. Elena pings you when something actually happens, not for nothing.",
  },
  {
    title: "Share access with family",
    body: "Add your sibling, your parent's spouse, or a hired caregiver. Everyone sees the same chart. No more group texts.",
  },
];

type Benefit = { title: string; body: string; icon: string };
const BENEFITS: Benefit[] = [
  {
    title: "She makes the phone calls",
    body: "Insurance hold music, pharmacy transfers, voicemail tag. Elena sits through it, talks to the person on the other end, and reports back what they said.",
    icon: "phone",
  },
  {
    title: "She tracks every medication",
    body: "A dozen prescriptions across four specialists, no spreadsheet required. Refills, dosages, interactions, and who prescribed what, all in one place.",
    icon: "pill",
  },
  {
    title: "She finds the right providers",
    body: "In network, accepting new patients, close enough to drive to. Elena filters the noise and sends you a short list with pricing upfront.",
    icon: "map",
  },
  {
    title: "She fights the bills",
    body: "Up to 80% of medical bills contain errors. Elena audits statements, files appeals, and negotiates balances so you stop overpaying.",
    icon: "shield",
  },
];

const INCLUDED: string[] = [
  "Calling insurance and sitting on hold for you",
  "Tracking medications, refills, and interactions",
  "Finding in-network specialists and urgent care",
  "Reviewing bills and filing appeals",
  "Summarizing EOBs and claim statements",
  "Managing Medicare and Medicare Advantage details",
  "Coordinating multiple providers and appointments",
  "Reminders for follow-ups, labs, and refills",
];

const NOT_INCLUDED: string[] = [
  "Diagnosing conditions or replacing a doctor",
  "Prescribing, dispensing, or adjusting medications",
  "Emergency response (call 911 if it's urgent)",
  "Signing contracts or paying bills on your behalf without approval",
];

type Guarantee = { title: string; body: string };
const GUARANTEES: Guarantee[] = [
  {
    title: "Private and encrypted",
    body: "Your loved one's health information is encrypted at rest and in transit. You sign a HIPAA authorization to let Elena represent you with insurers and providers, and you control who else has access.",
  },
  {
    title: "We never sell your data",
    body: "No ads, no data brokers, no insurance companies buying your records. Your data is yours.",
  },
  {
    title: "Cancel anytime",
    body: "The app is free to download. Paid features start with a 3-day free trial. One tap to cancel, no retention calls.",
  },
];

type Faq = { q: string; a: string };
const FAQ: Faq[] = [
  {
    q: "How much does the app cost?",
    a: "The app is free to download and free to chat. Paid features (Elena making calls, filing appeals, medication tracking) start with a 3-day free trial, then $6.99 per week or $179.99 per year. Cancel anytime.",
  },
  {
    q: "Does Elena work for someone else's health, not mine?",
    a: "Yes, that's what most caregivers use her for. With a signed HIPAA authorization from the person you're caring for, Elena represents them on calls with insurance, pharmacies, and providers.",
  },
  {
    q: "What devices does the app work on?",
    a: "Elena is available on iPhone and iPad, running iOS 16 or newer. An Android version is on the roadmap.",
  },
  {
    q: "Is my loved one's health information safe?",
    a: "Every conversation is encrypted at rest and in transit. We never sell or share personal health information, and you control who has access. When Elena calls an insurer or provider on your behalf, she's acting under a HIPAA authorization you signed.",
  },
  {
    q: "Do you work with Medicare?",
    a: "Yes. Elena helps with Original Medicare, Medicare Advantage, Part D, and supplemental plans, including enrollment windows and plan comparisons.",
  },
  {
    q: "Can other family members use the same account?",
    a: "Yes. You can invite a sibling, spouse, or hired caregiver to share access so everyone sees the same health chart, calls, and appointments.",
  },
];

function Star() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-[#F4B084]">
      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.3 2.8 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
    </svg>
  );
}

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 flex-none fill-[#F4B084]">
      <path d="M8.3 13.1L4.7 9.5l-1.4 1.4 5 5 10-10-1.4-1.4z" />
    </svg>
  );
}

function XMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 flex-none fill-white/30">
      <path d="M14.3 5.7L10 10l4.3 4.3-1.4 1.4L8.6 11.4 4.3 15.7 2.9 14.3 7.2 10 2.9 5.7l1.4-1.4L8.6 8.6l4.3-4.3z" />
    </svg>
  );
}

function BenefitIcon({ name }: { name: string }) {
  const common = "h-6 w-6 fill-white";
  switch (name) {
    case "phone":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11 11 0 003.5.55 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11 11 0 00.55 3.5 1 1 0 01-.25 1l-2.2 2.3z" />
        </svg>
      );
    case "pill":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M4.5 12a7.5 7.5 0 0115 0 7.5 7.5 0 01-15 0zm2 0a5.5 5.5 0 0011 0 5.5 5.5 0 00-11 0zm3.5 0h4v1.5h-4z" />
        </svg>
      );
    case "map":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3zm-1 13.5l5.3-5.3-1.4-1.4L11 12.7l-2-2-1.4 1.4 3.4 3.4z" />
        </svg>
      );
    default:
      return null;
  }
}

/** Official Apple "Download on the App Store" badge.
 * Used as the primary CTA on every surface of this LP. */
function AppStoreBadge({
  source,
  onClick,
  size = "md",
}: {
  source: string;
  onClick: (source: string) => void;
  size?: "sm" | "md" | "lg";
}) {
  const h = size === "lg" ? "h-[56px]" : size === "sm" ? "h-[40px]" : "h-12";
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onClick(source)}
      className={`inline-flex items-center transition-transform hover:scale-[1.03] active:scale-[0.98] ${h}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/app-store-badge.svg" alt="Download on the App Store" className={`${h} w-auto`} />
    </a>
  );
}

/** CallingPill, TaskCard, NotificationCard — ports of the floating cards from
 * elena-ads/src/equipment/FloatingCards.tsx. Remotion's frame-driven springs are
 * replaced with CSS (animate-ping for the pulse, gentle-bounce for the float). */

function CallingPill({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-white/[0.97] backdrop-blur-xl px-4 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.25),0_2px_10px_rgba(0,0,0,0.1)]">
      <span className="relative h-5 w-5 shrink-0">
        <span className="absolute inset-0 rounded-full bg-[#4CD964] animate-ping opacity-60" />
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#4CD964] text-[9px]">📞</span>
      </span>
      <span className="text-[13px] font-semibold text-[#1a1a2e] whitespace-nowrap">{label}</span>
    </div>
  );
}

function TaskCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-white/[0.97] backdrop-blur-xl px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.25),0_2px_10px_rgba(0,0,0,0.1)] max-w-[280px]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#34C759]">
        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-white" aria-hidden="true">
          <path d="M8.3 13.1L4.7 9.5l-1.4 1.4 5 5 10-10-1.4-1.4z" />
        </svg>
      </span>
      <div>
        <div className="text-[13px] font-bold leading-tight text-[#1a1a2e]">{title}</div>
        <div className="mt-0.5 text-[11.5px] font-semibold leading-tight text-[#34C759]">{subtitle}</div>
      </div>
    </div>
  );
}

function NotificationCard({
  appName = "Elena",
  message,
  time = "now",
}: {
  appName?: string;
  message: string;
  time?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-white/[0.97] backdrop-blur-xl px-3.5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.25),0_2px_10px_rgba(0,0,0,0.1)] w-[260px]">
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[11px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/elena-icon-cropped.png" alt="" className="h-full w-full object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#8e8e93]">{appName}</span>
          <span className="text-[10px] text-[#8e8e93]">{time}</span>
        </div>
        <div className="mt-0.5 text-[12.5px] font-semibold leading-[1.35] text-[#1a1a2e]">{message}</div>
      </div>
    </div>
  );
}

/** iPhone mockup matching the ads aesthetic: dark gradient bezel, dynamic
 * island, real Elena app screenshot. Surrounded by the floating cards that
 * run in the caregiver ad video. */
function PhoneMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Warm bloom behind the phone */}
      <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(244,176,132,0.35)_0%,transparent_60%)] blur-2xl" />

      {/* Phone frame — gradient bezel from elena-ads/src/caregiver/PhoneMockup.tsx */}
      <div
        className="relative mx-auto rounded-[48px] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.6),0_15px_35px_rgba(0,0,0,0.4),0_0_120px_30px_rgba(180,60,30,0.15)]"
        style={{
          width: 320,
          height: 650,
          background: "linear-gradient(145deg, #2a2a2e 0%, #1a1a1c 40%, #252528 100%)",
        }}
      >
        {/* Dynamic island */}
        <div className="absolute top-[18px] left-1/2 -translate-x-1/2 h-[26px] w-[95px] rounded-[18px] bg-black z-20" />

        {/* Real app screenshot */}
        <div className="relative h-full w-full overflow-hidden rounded-[42px] bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/ads/screen-gameplan.png"
            alt="Elena's game plan for caring for a loved one"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Floating: Calling pill — top */}
      <div className="hidden md:block absolute -top-6 left-1/2 -translate-x-1/2 z-30 animate-[gentle-bounce_4s_ease-in-out_infinite]">
        <CallingPill label="Calling Humana..." />
      </div>

      {/* Floating: Task card — middle-left */}
      <div className="hidden md:block absolute top-[260px] -left-[120px] z-30 animate-[gentle-bounce_5s_ease-in-out_infinite] [animation-delay:1s]">
        <TaskCard title="Medication ready" subtitle="CVS Pharmacy · Lisinopril 10mg" />
      </div>

      {/* Floating: Notification — bottom-right */}
      <div className="hidden md:block absolute bottom-[40px] -right-[110px] z-30 animate-[gentle-bounce_4.5s_ease-in-out_infinite] [animation-delay:0.5s]">
        <NotificationCard message="MRI found for $300. You were quoted $1,200." />
      </div>
    </div>
  );
}

export default function CaregiverAppLandingPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const hasTrackedPageView = useRef(false);
  const heroRef = useRef<HTMLElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => { trackViewContent("landing_page", "caregiver_app"); }, []);

  useEffect(() => {
    if (!loading && !session && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      analytics.track("Landing Page Viewed", { landing_variant: LP_VARIANT });
    }
  }, [loading, session]);

  useEffect(() => {
    if (!loading && session) router.replace("/chat");
  }, [loading, session, router]);

  useEffect(() => {
    document.body.style.backgroundColor = "#0F1B3D";
    document.documentElement.style.backgroundColor = "#0F1B3D";
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

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

  const onDownloadClick = useCallback((source: string) => {
    analytics.track("App CTA: Download Clicked", {
      source,
      landing_variant: LP_VARIANT,
    });
  }, []);

  if (loading || session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0F1B3D]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <div className="font-[family-name:var(--font-inter)] text-white">
      {/* Glass nav */}
      <nav className="absolute top-0 left-0 right-0 z-[100] px-8 py-5 flex items-center justify-between max-md:px-4">
        <a
          href="/"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 max-md:px-4 max-md:py-2 max-md:h-10 max-md:flex max-md:items-center text-[1.35rem] max-md:text-[0.95rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          elena
        </a>
        <div
          className="hidden md:flex bg-white/[0.06] backdrop-blur-[40px] border border-white/15 border-t-white/25 rounded-full px-2 py-1.5 gap-1 shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          <a href="#features" className="text-white/80 no-underline text-[0.9rem] px-6 py-2 rounded-full transition-all hover:text-white hover:bg-white/10">Features</a>
          <a href="#pricing" className="text-white/80 no-underline text-[0.9rem] px-6 py-2 rounded-full transition-all hover:text-white hover:bg-white/10">Pricing</a>
          <a href="#faq" className="text-white/80 no-underline text-[0.9rem] px-6 py-2 rounded-full transition-all hover:text-white hover:bg-white/10">FAQ</a>
        </div>
        <AppStoreBadge source="nav" onClick={onDownloadClick} size="sm" />
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative flex flex-col items-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
        </div>
        <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
          {BLOBS.map((cls, i) => (
            <div
              key={i}
              ref={(el) => { blobRefs.current[i] = el; }}
              className={`absolute rounded-full blur-[80px] will-change-transform ${cls}`}
            />
          ))}
        </div>

        <div className="relative z-[4] w-full pt-[max(6rem,12vh)] pb-12 max-md:pt-28 max-md:pb-8 px-6 max-md:px-5">
          <div className="mx-auto max-w-[1160px] grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-12 items-center max-md:gap-8">
            {/* Copy */}
            <div className="max-md:text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] backdrop-blur px-4 py-1.5 text-[0.75rem] font-medium text-white/80 mb-7">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F4B084]" />
                For family caregivers, on iPhone and iPad
              </div>
              <h1 className="text-[clamp(2.5rem,5vw,3.8rem)] max-md:text-[2.15rem] font-light leading-[1.1] tracking-tight text-white">
                Hi. I&apos;m Elena.{" "}
                <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">I&apos;ll take it from here.</em>
              </h1>
              <p className="text-[1rem] max-md:text-[0.9rem] font-light text-white/85 mt-5 tracking-wide max-w-[540px] max-md:mx-auto leading-relaxed">
                An AI health assistant for caregivers. I make the calls, track the meds, and push back on bills for the person you&apos;re caring for.
              </p>

              <div className="mt-8 max-md:mt-6 flex flex-wrap items-center gap-4 max-md:justify-center">
                <AppStoreBadge source="hero_primary" onClick={onDownloadClick} size="lg" />
                <div className="flex items-center gap-2 text-white/60 text-[0.85rem]">
                  <div className="flex">{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</div>
                  <span>Loved by caregivers</span>
                </div>
              </div>
              <p className="mt-5 text-[0.75rem] text-white/50 max-md:text-center">
                Free to download. 3-day free trial for paid features. Private and encrypted.
              </p>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center md:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </div>

        {/* Testimonial reel + insurer carousel */}
        <div
          className="relative z-[3] w-full mt-4 pb-20"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          }}
        >
          <div className="flex w-max animate-[scroll-left_140s_linear_infinite] max-md:animate-[scroll-left_90s_linear_infinite] will-change-transform [backface-visibility:hidden] mb-20">
            {[0, 1].map((set) => (
              <div key={set} className="flex gap-3 pr-3 shrink-0">
                {CAREGIVER_TESTIMONIALS.map((card) => (
                  <div key={`${set}-${card.name}`} className="bg-white/[0.12] backdrop-blur-xl border border-white/[0.18] rounded-2xl px-6 pt-5 pb-4 w-[310px] h-[130px] shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col">
                    <p className="text-[0.88rem] text-white/90 leading-relaxed flex-1">{card.text}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.logo} alt={card.logoAlt} className="h-6 mt-auto pt-2 self-start brightness-0 invert opacity-60" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 mb-4">
              Trusted by members insured with
            </div>
            <div
              className="overflow-hidden w-full relative"
              style={{
                maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              }}
            >
              <div className="flex w-max items-center animate-[trusted-scroll_120s_linear_infinite] will-change-transform">
                {[0, 1].map((set) => (
                  <div key={set} className="flex items-center gap-10 pr-10 shrink-0">
                    {INSURERS.map((ins) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${set}-${ins.alt}`} src={ins.src} alt={ins.alt} className="h-7 w-auto brightness-0 invert opacity-60 shrink-0" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ON YOUR PHONE — cream section with phone screenshot */}
      <section className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[1040px] grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-16 items-center max-md:gap-10">
          <div className="flex justify-center max-md:order-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/feature-phone.jpg"
              alt="Elena on a phone"
              className="rounded-3xl w-full max-w-[400px] object-cover aspect-[4/5] shadow-[0_20px_60px_rgba(15,27,61,0.15)]"
            />
          </div>
          <div className="max-md:order-1">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">On your phone</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight mb-6">
              A caregiver&apos;s command center,{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">in the app.</em>
            </h2>
            <ul className="space-y-6">
              {PHONE_FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-[#F4B084] shrink-0" />
                  <div>
                    <div className="text-[1.05rem] font-semibold text-[#0F1B3D]">{f.title}</div>
                    <p className="text-[0.95rem] text-[#5a6a82] leading-relaxed mt-1">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-9">
              <AppStoreBadge source="phone_section" onClick={onDownloadClick} size="md" />
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS — dark */}
      <section id="features" className="relative py-[120px] px-8 overflow-hidden max-md:py-20 max-md:px-5">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,#0F1B3D_0%,#1A3A6E_60%,#0F1B3D_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(244,176,132,0.18)_0%,transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_100%,rgba(46,107,181,0.35)_0%,transparent_55%)]" />
        </div>
        <div className="relative z-[2] mx-auto max-w-[1040px]">
          <div className="max-w-[640px] mb-16 max-md:mb-12">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-4">What she handles</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-tight text-white leading-tight">
              The hard parts of caregiving,{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">handled.</em>
            </h2>
            <p className="mt-5 text-[1rem] text-white/70 leading-relaxed">
              The average family caregiver spends 24 hours a week managing someone else&apos;s health. Elena gives most of those hours back, right from the app on your phone.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.14] rounded-3xl p-7 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2E6BB5_0%,#1A3A6E_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <BenefitIcon name={b.icon} />
                  </div>
                  <h3 className="text-[1.1rem] font-semibold text-white tracking-tight">{b.title}</h3>
                </div>
                <p className="text-[0.95rem] text-white/70 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <AppStoreBadge source="features_section" onClick={onDownloadClick} size="lg" />
          </div>
        </div>
      </section>

      {/* FEATURED STORIES — cream */}
      <section className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[1040px]">
          <div className="max-w-[640px] mb-14 max-md:mb-10">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">Real caregiver wins</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
              Stories from people already{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">using Elena.</em>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURED_TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white border border-[#0F1B3D]/10 rounded-3xl p-7 shadow-[0_4px_24px_rgba(15,27,61,0.06)]"
              >
                <div className="flex mb-4">{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</div>
                <p className="text-[1rem] text-[#0F1B3D] leading-relaxed">{t.text}</p>
                <div className="mt-5 pt-4 border-t border-[#0F1B3D]/[0.08] flex items-center justify-between">
                  <span className="text-[0.75rem] uppercase tracking-[1.5px] text-[#5a6a82]/70 font-semibold">Insured with</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.logo} alt={t.logoAlt} className="h-6 opacity-80" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUALIFICATION — dark */}
      <section className="relative py-[120px] px-8 overflow-hidden max-md:py-20 max-md:px-5">
        <div className="absolute inset-0 z-0 bg-[#0F1B3D]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(46,107,181,0.25)_0%,transparent_60%)]" />
        </div>
        <div className="relative z-[2] mx-auto max-w-[1040px]">
          <div className="max-w-[640px] mb-14 max-md:mb-10">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-4">The line</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-tight text-white leading-tight">
              What Elena can{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">(and can&apos;t)</em>{" "}
              do.
            </h2>
            <p className="mt-5 text-[1rem] text-white/70 leading-relaxed">
              We&apos;re an administrative assistant for healthcare, not a doctor. Here&apos;s where we draw the line.
            </p>
          </div>
          <div className="grid gap-10 md:grid-cols-2">
            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.14] rounded-3xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-5">Elena helps with</div>
              <ul className="space-y-3.5">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[0.95rem] text-white/90 leading-snug">
                    <Check />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-white/40 mb-5">Not a fit if you need</div>
              <ul className="space-y-3.5">
                {NOT_INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[0.95rem] text-white/60 leading-snug">
                    <XMark />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING — cream, app-download framing */}
      <section id="pricing" className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">Pricing</p>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
            Free to download.{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">Free to chat.</em>
          </h2>
          <p className="mt-5 text-[1rem] text-[#5a6a82] leading-relaxed">
            Get the app and start asking Elena questions right away. Paid features (making calls, filing appeals, medication tracking) start with a 3-day free trial, then <span className="font-semibold text-[#0F1B3D]">$6.99 / week</span> or <span className="font-semibold text-[#0F1B3D]">$179.99 / year</span>. Cancel anytime from Settings.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <AppStoreBadge source="pricing_section" onClick={onDownloadClick} size="lg" />
            <p className="text-[0.78rem] text-[#5a6a82]/70">
              Available on iPhone and iPad. iOS 16 or newer.
            </p>
          </div>
        </div>
      </section>

      {/* GUARANTEES — dark */}
      <section className="relative py-[120px] px-8 overflow-hidden max-md:py-20 max-md:px-5">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_45%,#0F1B3D_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_100%,rgba(244,176,132,0.2)_0%,transparent_55%)]" />
        </div>
        <div className="relative z-[2] mx-auto max-w-[1040px]">
          <div className="text-center max-w-[640px] mx-auto mb-14 max-md:mb-10">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-4">Built on trust</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-tight text-white leading-tight">
              We handle health information for{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">someone you love.</em>
              <br />
              We treat it like it&apos;s ours.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {GUARANTEES.map((g) => (
              <div
                key={g.title}
                className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.14] rounded-3xl p-7 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]"
              >
                <h3 className="text-[1.1rem] font-semibold text-white tracking-tight mb-3">{g.title}</h3>
                <p className="text-[0.95rem] text-white/70 leading-relaxed">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — cream */}
      <section id="faq" className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[760px]">
          <div className="text-center mb-12">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">FAQ</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
              Questions caregivers{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">actually ask.</em>
            </h2>
          </div>
          <div className="bg-white border border-[#0F1B3D]/10 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(15,27,61,0.06)] divide-y divide-[#0F1B3D]/[0.08]">
            {FAQ.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <details
                  key={f.q}
                  open={isOpen}
                  onClick={(e) => { e.preventDefault(); setOpenFaq(isOpen ? null : i); }}
                  className="group px-7 py-5 max-md:px-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-[1rem] font-semibold text-[#0F1B3D]">
                    <span>{f.q}</span>
                    <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#2E6BB5]/10 text-[#2E6BB5] transition-transform ${isOpen ? "rotate-45" : ""}`}>
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                        <path d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6z" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-[#5a6a82]">{f.a}</p>
                </details>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA — cream */}
      <section className="relative py-24 px-8 bg-[#F7F6F2] max-md:py-16 max-md:px-5">
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight mb-4">
            The person you care for needs you.{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">Not on hold.</em>
          </h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.7] mb-8 max-md:mb-6">
            Download Elena and start sorting it in the next five minutes.
          </p>
          <div className="flex justify-center">
            <AppStoreBadge source="footer_cta" onClick={onDownloadClick} size="lg" />
          </div>
          <p className="mt-5 text-[0.78rem] text-[#5a6a82]/70">Free to download. 3-day free trial for paid features.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="relative z-10 pt-20 pb-10 px-8 text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.25)_0%,rgba(232,149,109,0.15)_25%,transparent_60%)]" />
        <div className="relative mx-auto max-w-[960px]">
          <div className="text-[clamp(3rem,8vw,5rem)] font-light tracking-tight text-white mb-2">elena</div>
          <p className="text-base font-light text-white/60 mb-12">Your healthcare assistant.</p>
          <div className="grid grid-cols-3 gap-8 mb-10 max-md:grid-cols-1 max-md:text-center">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Product</p>
              <div className="flex flex-col gap-2">
                <a href="#features" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Features</a>
                <a href="#pricing" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Pricing</a>
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => onDownloadClick("footer_link")} className="text-sm text-white/60 no-underline transition-colors hover:text-white">Download on iOS</a>
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Legal</p>
              <div className="flex flex-col gap-2">
                <a href="/terms-of-service" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Terms of Service</a>
                <a href="/privacy-policy" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Privacy Policy</a>
                <a href="/hipaa-authorization" className="text-sm text-white/60 no-underline transition-colors hover:text-white">HIPAA authorization</a>
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Connect</p>
              <div className="flex flex-col gap-2">
                <a href="/blog" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Blog</a>
                <a href="/research" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Research</a>
                <a href="/support" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Support</a>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-between items-center text-[0.78rem] text-white/30 max-md:flex-col max-md:gap-1.5 max-md:text-center">
            <span>&copy; 2026 Elena AI. All rights reserved.</span>
            <span>Made with love in NYC</span>
          </div>
          <div className="mt-4 text-[0.7rem] text-white/20 font-light text-center leading-relaxed">
            Elena helps you navigate healthcare logistics and costs. Not a substitute for medical advice.
          </div>
        </div>
      </footer>
    </div>
  );
}
