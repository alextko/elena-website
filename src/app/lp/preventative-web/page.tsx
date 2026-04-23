"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";
import { trackViewContent } from "@/lib/tracking-events";
import { AuthModal } from "@/components/auth-modal";
import { postPendingMessage } from "@/lib/pendingMessage";
import "../../landing.css";

const LP_VARIANT = "preventative";
const DEFAULT_PREFILL = "I want to make sure I'm getting the right screenings. Where should I start?";

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

// Pulled from the homepage TESTIMONIALS array (already live on the current site).
const SHOWN_TESTIMONIALS: Testimonial[] = [
  { name: "Ryan", text: <><span className="font-semibold">Ryan</span> found an in-network MRI for <span className="font-semibold">$350</span> instead of the <span className="font-semibold">$1,200</span> quoted.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  { name: "Doriam", text: <><span className="font-semibold">Doriam</span> found the best price for her blood work and cardiology appointments.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  { name: "Andy", text: <><span className="font-semibold">Andy</span> figured out the best insurance plan for him and his family.</>, logo: "/images/insurers/medicare.svg", logoAlt: "Medicare" },
];

type Step = { title: string; body: string };
const STEPS: Step[] = [
  {
    title: "Tell Elena about you",
    body: "Your age, your family history, anything you're already tracking. Takes a couple of minutes.",
  },
  {
    title: "She builds your screening plan",
    body: "What you should screen for, when, and who to see. Tailored to your age, history, and insurance.",
  },
  {
    title: "She books it and follows up",
    body: "Elena confirms your insurance covers each visit, books the appointments, and reads the results back in plain English.",
  },
];

type Benefit = { title: string; body: string; icon: string };
const BENEFITS: Benefit[] = [
  {
    title: "She builds the right plan for you",
    body: "Colonoscopy at 45. Mammogram timing tied to family history. Skin checks if you had a lot of sun as a kid. Elena lines up the screenings your body should actually be getting.",
    icon: "plan",
  },
  {
    title: "She books the appointments",
    body: "In network, accepting new patients, close enough to drive to. Elena calls around and puts the visit on your calendar.",
    icon: "calendar",
  },
  {
    title: "She confirms it's covered",
    body: "Most preventive visits are free under the ACA, but the fine print trips people up. Elena calls your insurer before you go so you don't get a surprise bill.",
    icon: "shield",
  },
  {
    title: "She explains your results",
    body: "Labs, imaging reports, screening letters. Elena turns the jargon into a plain-English summary and tells you what, if anything, needs a follow-up.",
    icon: "note",
  },
];

const INCLUDED: string[] = [
  "Building a screening plan based on your age, sex, and family history",
  "Finding in-network providers who are taking new patients",
  "Booking annual physicals, labs, imaging, and specialty screenings",
  "Calling your insurer to confirm preventive-care coverage",
  "Summarizing lab and imaging reports in plain English",
  "Reminders for follow-ups, labs, and annual visits",
  "Flagging family-history risks to bring up with your doctor",
  "Comparing prices for tests that aren't fully covered",
];

const NOT_INCLUDED: string[] = [
  "Diagnosing conditions or replacing your doctor",
  "Interpreting imaging like a radiologist would",
  "Prescribing, dispensing, or adjusting medications",
  "Emergency response (call 911 if it's urgent)",
];

type Guarantee = { title: string; body: string };
const GUARANTEES: Guarantee[] = [
  {
    title: "Private and encrypted",
    body: "Your health information is encrypted at rest and in transit. You sign a HIPAA authorization to let Elena represent you with insurers and providers, and you control who else has access.",
  },
  {
    title: "We never sell your data",
    body: "No ads, no data brokers, no insurance companies buying your records. Your data is yours.",
  },
  {
    title: "Cancel anytime",
    body: "Start with a 3-day free trial. No charge until the trial ends. One tap to cancel, no retention calls.",
  },
];

type Faq = { q: string; a: string };
const FAQ: Faq[] = [
  {
    q: "What screenings should I actually be getting?",
    a: "It depends on your age, sex, family history, and risk factors. Elena pulls from USPSTF guidelines and your personal profile to tell you which screenings apply to you right now, which are coming up, and which can wait.",
  },
  {
    q: "Will my insurance cover preventive visits?",
    a: "Under the ACA, most preventive visits and screenings are covered at 100% when you see an in-network provider. Elena calls your insurer before every visit to confirm what's covered and flags anything that might generate a bill, so you're never surprised.",
  },
  {
    q: "Is this medical advice?",
    a: "No. Elena is an administrative assistant for the healthcare system. She helps you act on existing guidelines and connects you with the right doctors, but she doesn't diagnose, prescribe, or replace medical professionals.",
  },
  {
    q: "What if I have a family history of cancer or heart disease?",
    a: "Family history changes screening timing and which tests make sense. Elena factors it in and writes a plan that accounts for it, then helps you bring it up with your doctor at your next visit.",
  },
  {
    q: "What does Elena cost?",
    a: "Start with a 3-day free trial. After that, $6.99 per week or $179.99 per year. Cancel anytime from settings.",
  },
  {
    q: "I already have a primary care doctor. Does this still help?",
    a: "Yes. Elena works alongside your PCP. She handles the scheduling, insurance calls, and follow-ups that your doctor's office doesn't have time for, and makes sure nothing falls through the cracks between visits.",
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
    case "plan":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M5 3h10l4 4v14H5V3zm9 1.5V8h3.5L14 4.5zM8 13h8v1.5H8V13zm0 3h8v1.5H8V16zm0-6h5v1.5H8V10z" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M7 2v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2V2h-2v2H9V2H7zm-2 8h14v10H5V10z" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3zm-1 13.5l5.3-5.3-1.4-1.4L11 12.7l-2-2-1.4 1.4 3.4 3.4z" />
        </svg>
      );
    case "note":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
          <path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h16v2H4v-2z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function PreventativeWebLandingPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const hasTrackedPageView = useRef(false);
  const heroRef = useRef<HTMLElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => { router.prefetch("/onboard"); }, [router]);
  useEffect(() => { router.prefetch("/risk-assessment"); }, [router]);
  useEffect(() => { trackViewContent("landing_page", "preventative_web"); }, []);

  useEffect(() => {
    if (!loading && !session && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      analytics.track("Landing Page Viewed", { landing_variant: "preventative_web" });
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

  const startOnboarding = useCallback(
    (query: string, source: string) => {
      analytics.track("Hero Input Submitted", { query_length: query.length });
      analytics.track("Message Sent", {
        is_first_message: true,
        has_attachment: false,
        message_length: query.length,
        authenticated: !!session,
        source,
        landing_variant: "preventative_web",
        used_default: true,
      });

      try {
        localStorage.setItem("elena_pending_query", query);
        localStorage.setItem("elena_lp_variant", LP_VARIANT);
      } catch {}

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

      if (!lateSignupFlag) {
        void postPendingMessage({
          content: query,
          source: "landing_hero",
          landing_variant: "preventative_web",
          pending_doc_name: null,
        });
        setAuthModalOpen(true);
        return;
      }

      try { sessionStorage.setItem("elena_tour_post_seed_gate", "1"); } catch {}
      analytics.track("Onboard Route Entered", {
        source,
        landing_variant: "preventative_web",
      });
      router.push("/onboard");
    },
    [router, session],
  );

  const handlePrimaryCta = useCallback(
    (source: string) => startOnboarding(DEFAULT_PREFILL, source),
    [startOnboarding],
  );

  const goToQuiz = useCallback((source: string) => {
    analytics.track("Quiz Get Started Clicked", { source, landing_variant: "preventative_web" });
    router.push("/risk-assessment");
  }, [router]);

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
          <a href="#how" className="text-white/80 no-underline text-[0.9rem] px-6 py-2 rounded-full transition-all hover:text-white hover:bg-white/10">How it works</a>
          <a href="#features" className="text-white/80 no-underline text-[0.9rem] px-6 py-2 rounded-full transition-all hover:text-white hover:bg-white/10">Features</a>
          <a href="#pricing" className="text-white/80 no-underline text-[0.9rem] px-6 py-2 rounded-full transition-all hover:text-white hover:bg-white/10">Pricing</a>
        </div>
        <button
          onClick={() => { analytics.track("Login Button Clicked"); setAuthModalOpen(true); }}
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-full px-7 py-3 max-md:px-5 max-md:py-2 max-md:h-10 text-white/90 text-[0.9rem] max-md:text-[0.8rem] cursor-pointer transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/15 hover:text-white hover:border-white/25"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          Log in
        </button>
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

        <div className="min-h-[80dvh] flex flex-col items-center justify-center w-full shrink-0 pb-8" style={{ paddingTop: "max(6rem, 12vh)" }}>
          <div className="relative z-[4] text-center max-w-[700px] md:max-w-[880px] w-full px-6 max-md:px-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] backdrop-blur px-4 py-1.5 text-[0.75rem] font-medium text-white/80 mb-7">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F4B084]" />
              Preventative health, done right
            </div>
            <h1 className="text-[clamp(2.5rem,5vw,3.8rem)] max-md:text-[2.15rem] font-light leading-[1.15] tracking-tight text-white">
              Are you getting{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">the screenings you need?</em>
            </h1>
            <p className="text-[0.95rem] max-md:text-[0.85rem] font-light text-white/85 mt-5 max-md:mt-3 tracking-wide max-w-[620px] mx-auto leading-relaxed">
              Elena builds a preventative health plan based on your age, family history, and risks. She books the appointments, confirms your insurance covers them, and explains your results in plain English.
            </p>

            <div className="mt-8 max-md:mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handlePrimaryCta("hero_primary")}
                className="cta-shimmer inline-flex items-center justify-center h-14 max-md:h-12 px-10 max-md:px-8 rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_45%,#2E6BB5_100%)] text-white text-[1rem] font-semibold shadow-[0_10px_30px_rgba(15,27,61,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] border border-white/15 hover:shadow-[0_14px_38px_rgba(15,27,61,0.45)] hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span className="relative z-[2]">Start your plan</span>
              </button>
              <button
                onClick={() => goToQuiz("hero_secondary")}
                className="inline-flex items-center justify-center h-14 max-md:h-12 px-8 rounded-full bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.2] text-white/90 text-[0.95rem] font-medium hover:bg-white/15 hover:text-white transition-all"
                style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
              >
                Or take the 2-minute quiz
              </button>
            </div>
            <p className="mt-5 text-[0.75rem] text-white/50">
              3-day free trial. No credit card for chat. Private and encrypted.
            </p>
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
            {[0, 1, 2, 3].map((set) => (
              <div key={set} className="flex gap-3 pr-3 shrink-0">
                {SHOWN_TESTIMONIALS.map((card) => (
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

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[1040px]">
          <div className="max-w-[640px] mb-16 max-md:mb-12">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">How it works</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
              From guesswork to a clear plan{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">in one afternoon.</em>
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="text-[3rem] font-light leading-none text-[#2E6BB5]/20 font-[family-name:var(--font-dm-serif)] mb-3">
                  0{i + 1}
                </div>
                <h3 className="text-[1.25rem] font-semibold text-[#0F1B3D] mb-3 tracking-tight">{s.title}</h3>
                <p className="text-[0.98rem] text-[#5a6a82] leading-[1.7]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="features" className="relative py-[120px] px-8 overflow-hidden max-md:py-20 max-md:px-5">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,#0F1B3D_0%,#1A3A6E_60%,#0F1B3D_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(244,176,132,0.18)_0%,transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_100%,rgba(46,107,181,0.35)_0%,transparent_55%)]" />
        </div>
        <div className="relative z-[2] mx-auto max-w-[1040px]">
          <div className="max-w-[640px] mb-16 max-md:mb-12">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-4">What she handles</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-tight text-white leading-tight">
              Everything between{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">you and the screening.</em>
            </h2>
            <p className="mt-5 text-[1rem] text-white/70 leading-relaxed">
              The screenings exist. The coverage exists. The doctors exist. Getting from here to the appointment is where most people get stuck. Elena does that part.
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
        </div>
      </section>

      {/* FEATURED STORIES */}
      <section className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[1040px]">
          <div className="max-w-[640px] mb-14 max-md:mb-10">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">Real wins</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
              What it looks like when{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">someone does the work for you.</em>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {SHOWN_TESTIMONIALS.map((t) => (
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

      {/* QUALIFICATION */}
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

      {/* PRICING */}
      <section id="pricing" className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[960px]">
          <div className="text-center max-w-[640px] mx-auto mb-14 max-md:mb-10">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">Pricing</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
              Start free.{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">Upgrade when you need her hands.</em>
            </h2>
            <p className="mt-4 text-[0.98rem] text-[#5a6a82] leading-relaxed">
              Chat is free. The paid plan lets Elena book visits, call insurance, and track your screenings. Start with a 3-day trial.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 max-w-[720px] mx-auto">
            <div className="bg-white border border-[#0F1B3D]/10 rounded-3xl p-8 shadow-[0_4px_24px_rgba(15,27,61,0.06)]">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-2">Weekly</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[2.75rem] font-semibold tracking-tight text-[#0F1B3D]">$6.99</span>
                <span className="text-[0.95rem] text-[#5a6a82]">/ week</span>
              </div>
              <div className="text-[0.85rem] text-[#5a6a82]/80 mb-6">3-day free trial. Cancel anytime.</div>
              <button
                onClick={() => startOnboarding(DEFAULT_PREFILL, "pricing_weekly")}
                className="w-full h-12 rounded-full border border-[#0F1B3D]/15 bg-white text-[#0F1B3D] font-semibold text-[0.95rem] hover:border-[#2E6BB5] hover:text-[#2E6BB5] transition-all"
              >
                Start free trial
              </button>
            </div>
            <div className="relative bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_45%,#2E6BB5_100%)] text-white rounded-3xl p-8 shadow-[0_12px_40px_rgba(15,27,61,0.22)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_90%_110%,rgba(244,176,132,0.25)_0%,transparent_55%)]" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084]">Annual</span>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[1.5px] bg-[#F4B084]/20 border border-[#F4B084]/40 text-[#F4B084] rounded-full px-2 py-0.5">Save 50%</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[2.75rem] font-semibold tracking-tight text-white">$3.46</span>
                  <span className="text-[0.95rem] text-white/70">/ week</span>
                </div>
                <div className="text-[0.85rem] text-white/60 mb-6">Billed $179.99 once a year. 3-day free trial.</div>
                <button
                  onClick={() => startOnboarding(DEFAULT_PREFILL, "pricing_annual")}
                  className="cta-shimmer w-full h-12 rounded-full bg-white text-[#0F1B3D] font-semibold text-[0.95rem] hover:scale-[1.02] transition-all shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
                >
                  <span className="relative z-[2]">Start free trial</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GUARANTEES */}
      <section className="relative py-[120px] px-8 overflow-hidden max-md:py-20 max-md:px-5">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_45%,#0F1B3D_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_100%,rgba(244,176,132,0.2)_0%,transparent_55%)]" />
        </div>
        <div className="relative z-[2] mx-auto max-w-[1040px]">
          <div className="text-center max-w-[640px] mx-auto mb-14 max-md:mb-10">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-4">Built on trust</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-tight text-white leading-tight">
              Your health data stays{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">yours.</em>
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

      {/* FAQ */}
      <section className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[760px]">
          <div className="text-center mb-12">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">FAQ</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
              Questions people{" "}
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

      {/* FINAL CTA */}
      <section className="relative py-24 px-8 bg-[#F7F6F2] max-md:py-16 max-md:px-5">
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight mb-4">
            You don&apos;t need another health app.{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">You need someone doing the work.</em>
          </h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.7] mb-8 max-md:mb-6">
            Tell Elena about yourself and she&apos;ll have your first appointment booked by the weekend.
          </p>
          <button
            onClick={() => handlePrimaryCta("footer_cta")}
            className="cta-shimmer inline-flex items-center justify-center h-14 max-md:h-12 px-12 max-md:px-10 rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_45%,#2E6BB5_100%)] text-white text-[1.05rem] max-md:text-[0.95rem] font-semibold shadow-[0_10px_30px_rgba(15,27,61,0.28)] hover:shadow-[0_14px_38px_rgba(15,27,61,0.38)] hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="relative z-[2]">Start your plan</span>
          </button>
          <p className="mt-4 text-[0.78rem] text-[#5a6a82]/70">3-day free trial. Cancel anytime.</p>
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
                <a href="#how" className="text-sm text-white/60 no-underline transition-colors hover:text-white">How it works</a>
                <a href="#features" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Features</a>
                <a href="#pricing" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Pricing</a>
                <a href="/risk-assessment" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Risk quiz</a>
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

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultMode="signup"
      />
    </div>
  );
}
