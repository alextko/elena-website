"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";
import { trackViewContent } from "@/lib/tracking-events";
import { AuthModal } from "@/components/auth-modal";
import { postPendingMessage } from "@/lib/pendingMessage";
import "../../landing.css";

const LP_VARIANT = "price_transparency";
const DEFAULT_PREFILL =
  "I need a procedure done. Compare prices at every provider near me and tell me the lowest-cost option that takes my insurance.";

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

const PRICE_TESTIMONIALS: Testimonial[] = [
  { name: "Alex", text: <><span className="font-semibold">Alex</span> saved <span className="font-semibold">$650</span> on a CT scan by comparing prices before the appointment.</>, logo: "/images/insurers/oscar.svg", logoAlt: "Oscar" },
  { name: "Ryan", text: <><span className="font-semibold">Ryan</span> found an in-network MRI for <span className="font-semibold">$350</span> instead of the <span className="font-semibold">$1,200</span> quoted.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  { name: "Doriam", text: <><span className="font-semibold">Doriam</span> found the best price for her blood work and cardiology appointments.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
  { name: "Maya", text: <><span className="font-semibold">Maya</span> moved her colonoscopy from a hospital to an outpatient center and cut the total bill by <span className="font-semibold">$1,900</span>.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
  { name: "Kevin", text: <><span className="font-semibold">Kevin</span> learned the cash price for his ultrasound was lower than his deductible and avoided an unnecessary surprise bill.</>, logo: "/images/insurers/cigna.svg", logoAlt: "Cigna" },
  { name: "Elena", text: <><span className="font-semibold">Elena</span> got a facility fee flagged before her procedure and picked a lower-cost site of care instead.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
  { name: "Priya", text: <><span className="font-semibold">Priya</span> found a lab that charged <span className="font-semibold">$48</span> for the same blood work another office quoted at <span className="font-semibold">$220</span>.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
  { name: "Andrew", text: <><span className="font-semibold">Andrew</span> used Elena to compare negotiated rates across 3 facilities before booking his knee MRI.</>, logo: "/images/insurers/anthem.svg", logoAlt: "Anthem" },
];

const FEATURED_TESTIMONIALS: Testimonial[] = PRICE_TESTIMONIALS.slice(0, 3);

type Step = { title: string; body: string };
const STEPS: Step[] = [
  {
    title: "Tell Elena what you need",
    body: "MRI, CT, colonoscopy, blood work, ultrasound, PT, outpatient surgery, or another test or procedure.",
  },
  {
    title: "She compares the real options",
    body: "Elena checks facility pricing, cash rates, negotiated rates, and insurance acceptance across providers near you.",
  },
  {
    title: "You book without guessing",
    body: "You see the cheapest sensible option before you go, instead of learning the price from a bill weeks later.",
  },
];

type Benefit = { title: string; body: string; icon: string };
const BENEFITS: Benefit[] = [
  {
    title: "She compares facilities side by side",
    body: "Hospitals, outpatient centers, imaging chains, labs, and urgent care can charge wildly different prices for the same service. Elena lines them up so you can see the spread.",
    icon: "map",
  },
  {
    title: "She checks what your insurance actually changes",
    body: "Sometimes the negotiated rate is better. Sometimes the cash price wins. Elena helps you compare both paths before you book.",
    icon: "shield",
  },
  {
    title: "She calls when the pricing is fuzzy",
    body: "If the file doesn&apos;t answer the real question, Elena can call to ask about facility fees, bundled pricing, and what they&apos;ll quote you directly.",
    icon: "phone",
  },
  {
    title: "She keeps the quote attached to the plan",
    body: "Once you pick an option, Elena keeps the location, timing, and expected cost in one place so the decision doesn&apos;t disappear into your notes app.",
    icon: "note",
  },
];

const INCLUDED: string[] = [
  "Comparing MRI, CT, ultrasound, colonoscopy, labs, and procedure pricing",
  "Checking cash-pay vs insurance-adjusted costs",
  "Finding lower-cost facilities near you",
  "Checking in-network status before you book",
  "Calling offices when the price files are incomplete",
  "Spotting facility-fee and site-of-care differences",
  "Keeping the selected option and expected cost organized",
  "Helping avoid surprise bills before the appointment happens",
];

const NOT_INCLUDED: string[] = [
  "Guaranteeing the final bill matches every estimate",
  "Diagnosing conditions or replacing a doctor",
  "Emergency response (call 911 if it&apos;s urgent)",
  "Signing financial agreements or paying providers for you",
];

type Guarantee = { title: string; body: string };
const GUARANTEES: Guarantee[] = [
  {
    title: "Private and encrypted",
    body: "Your healthcare searches, pricing comparisons, and uploaded information are encrypted at rest and in transit. You control what Elena stores and uses.",
  },
  {
    title: "We never sell your data",
    body: "No ads, no data brokers, no insurers buying your records. Your pricing questions and care history stay yours.",
  },
  {
    title: "Cancel anytime",
    body: "Start with a 3-day free trial. No charge until the trial ends. One tap to cancel, no retention calls.",
  },
];

type Faq = { q: string; a: string };
const FAQ: Faq[] = [
  {
    q: "What kinds of prices can Elena compare?",
    a: "Common imaging, labs, outpatient procedures, specialist visits, urgent care, physical therapy, and other shoppable healthcare services. MRI, CT, colonoscopy, ultrasound, blood work, and PT are common use cases.",
  },
  {
    q: "Does Elena show the insurance price or the cash price?",
    a: "Both when possible. Elena helps compare negotiated rates, facility pricing, and cash-pay options so you can choose the one that actually makes sense for your deductible and plan.",
  },
  {
    q: "Can Elena call places to confirm pricing?",
    a: "Yes. When a price file or estimate isn&apos;t enough, Elena can help call facilities to clarify what&apos;s included, whether there&apos;s a facility fee, and what they&apos;ll actually quote you.",
  },
  {
    q: "Will this prevent every surprise bill?",
    a: "No tool can guarantee every final bill, but Elena can dramatically reduce guessing by comparing options before you book and helping surface common pricing traps ahead of time.",
  },
  {
    q: "What does Elena cost?",
    a: "Start with a 3-day free trial. After that, $6.99 per week or $179.99 per year. Cancel anytime from settings.",
  },
  {
    q: "Is this medical advice?",
    a: "No. Elena is an administrative assistant for healthcare logistics and price transparency. She helps compare options and organize decisions, but she does not diagnose or replace your doctor.",
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

export default function PriceTransparencyWebLandingPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const hasTrackedPageView = useRef(false);
  const heroRef = useRef<HTMLElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => { router.prefetch("/onboard"); }, [router]);
  useEffect(() => { router.prefetch("/risk-assessment"); }, [router]);
  useEffect(() => { trackViewContent("landing_page", "price_transparency_web"); }, []);

  useEffect(() => {
    if (!loading && !session && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      analytics.track("Landing Page Viewed", { landing_variant: "price_transparency_web" });
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
        landing_variant: "price_transparency_web",
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
          landing_variant: "price_transparency_web",
          pending_doc_name: null,
        });
        setAuthModalOpen(true);
        return;
      }

      try { sessionStorage.setItem("elena_tour_post_seed_gate", "1"); } catch {}
      analytics.track("Onboard Route Entered", {
        source,
        landing_variant: "price_transparency_web",
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
    analytics.track("Quiz Get Started Clicked", { source, landing_variant: "price_transparency_web" });
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
      <nav className="absolute top-0 left-0 right-0 z-[100] px-8 py-5 flex items-center justify-between max-md:px-4">
        <Link
          href="/"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 max-md:px-4 max-md:py-2 max-md:h-10 max-md:flex max-md:items-center text-[1.35rem] max-md:text-[0.95rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          elena
        </Link>
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
              Real healthcare prices before you book
            </div>
            <h1 className="text-[clamp(2.5rem,5vw,3.8rem)] max-md:text-[2.15rem] font-light leading-[1.15] tracking-tight text-white">
              Never get a surprise bill again.{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">See prices before you go.</em>
            </h1>
            <p className="text-[0.95rem] max-md:text-[0.85rem] font-light text-white/85 mt-5 max-md:mt-3 tracking-wide max-w-[640px] mx-auto leading-relaxed">
              Elena shows you what care actually costs before you book, so there are no surprises.
            </p>

            <div className="mt-8 max-md:mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handlePrimaryCta("hero_primary")}
                className="cta-shimmer inline-flex items-center justify-center h-14 max-md:h-12 px-10 max-md:px-8 rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_45%,#2E6BB5_100%)] text-white text-[1rem] font-semibold shadow-[0_10px_30px_rgba(15,27,61,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] border border-white/15 hover:shadow-[0_14px_38px_rgba(15,27,61,0.45)] hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span className="relative z-[2]">Compare prices now</span>
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
                {FEATURED_TESTIMONIALS.map((card) => (
                  <div key={`${set}-${card.name}`} className="bg-white/[0.12] backdrop-blur-xl border border-white/[0.18] rounded-2xl px-6 pt-5 pb-4 w-[310px] h-[130px] shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col">
                    <p className="text-[0.88rem] text-white/90 leading-relaxed flex-1">{card.text}</p>
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
                      <img key={`${set}-${ins.alt}`} src={ins.src} alt={ins.alt} className="h-7 w-auto brightness-0 invert opacity-60 shrink-0" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="relative py-[120px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[1040px]">
          <div className="max-w-[640px] mb-16 max-md:mb-12">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">How it works</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
              From price confusion to a clear answer{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">before the appointment.</em>
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

      <section id="features" className="relative py-[120px] px-8 overflow-hidden max-md:py-20 max-md:px-5">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,#0F1B3D_0%,#1A3A6E_60%,#0F1B3D_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(244,176,132,0.18)_0%,transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_100%,rgba(46,107,181,0.35)_0%,transparent_55%)]" />
        </div>
        <div className="relative z-[2] mx-auto max-w-[1040px]">
          <div className="max-w-[640px] mb-16 max-md:mb-12">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-4">What she handles</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-tight text-white leading-tight">
              The pricing work most people can&apos;t get done{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">before they book.</em>
            </h2>
            <p className="mt-5 text-[1rem] text-white/70 leading-relaxed">
              The system hides prices until it&apos;s too late. Elena helps surface the cheapest reasonable option, compare insurance vs cash, and catch the details that turn into surprise bills.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.14] rounded-3xl p-7 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/10">
                  <BenefitIcon name={b.icon} />
                </div>
                <h3 className="text-[1.2rem] font-semibold text-white tracking-tight mb-3">{b.title}</h3>
                <p className="text-[0.95rem] text-white/70 leading-[1.8]">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-[110px] px-8 bg-[#F7F6F2] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[1040px] grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] bg-white p-8 md:p-10 shadow-[0_30px_80px_rgba(15,27,61,0.08)] border border-[#e8edf5]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">Included</p>
            <h2 className="text-[clamp(1.7rem,3vw,2.2rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight mb-8">
              What Elena can do for price transparency
            </h2>
            <div className="space-y-4">
              {INCLUDED.map((item) => (
                <div key={item} className="flex items-start gap-3 text-[#0F1B3D]">
                  <Check />
                  <p className="text-[0.98rem] leading-[1.7]">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] bg-[#0F1B3D] p-8 md:p-10 shadow-[0_30px_80px_rgba(15,27,61,0.18)] border border-white/10">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-4">Not included</p>
            <h2 className="text-[clamp(1.7rem,3vw,2.2rem)] font-semibold tracking-tight text-white leading-tight mb-8">
              What still stays uncertain
            </h2>
            <div className="space-y-4">
              {NOT_INCLUDED.map((item) => (
                <div key={item} className="flex items-start gap-3 text-white/75">
                  <XMark />
                  <p className="text-[0.98rem] leading-[1.7]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative py-[120px] px-8 bg-[#FBFAF7] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[1040px]">
          <div className="max-w-[700px] mb-14">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-4">Trust</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-semibold tracking-tight text-[#0F1B3D] leading-tight">
              Built for one of the most broken parts of healthcare{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">without pretending it&apos;s simple.</em>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {GUARANTEES.map((g) => (
              <div key={g.title} className="rounded-[28px] border border-[#e6ebf3] bg-white p-7 shadow-[0_12px_36px_rgba(15,27,61,0.05)]">
                <h3 className="text-[1.05rem] font-semibold text-[#0F1B3D] tracking-tight mb-3">{g.title}</h3>
                <p className="text-[0.95rem] text-[#5a6a82] leading-[1.8]">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-[120px] px-8 bg-[#0F1B3D] max-md:py-20 max-md:px-5">
        <div className="mx-auto max-w-[920px]">
          <div className="text-center mb-14">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#F4B084] mb-4">FAQ</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-light tracking-tight text-white leading-tight">
              Questions people ask{" "}
              <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">before they trust a quote.</em>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <button
                  key={item.q}
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full text-left rounded-[24px] border border-white/10 bg-white/[0.04] px-6 py-5 backdrop-blur transition-all hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-5">
                    <h3 className="text-[1rem] font-medium text-white">{item.q}</h3>
                    <span className="text-[1.5rem] leading-none text-white/50">{open ? "−" : "+"}</span>
                  </div>
                  {open && (
                    <p className="mt-4 max-w-[760px] text-[0.95rem] leading-[1.8] text-white/70">
                      {item.a}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-8 py-[110px] bg-[linear-gradient(135deg,#F7F6F2_0%,#FBFAF7_100%)] max-md:px-5 max-md:py-20">
        <div className="mx-auto max-w-[920px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe3ef] bg-white px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[2px] text-[#2E6BB5] mb-6">
            <Star />
            Start now
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-[#0F1B3D] leading-[1.1] max-w-[820px] mx-auto">
            Find the cheapest reasonable option{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">before the bill exists.</em>
          </h2>
          <p className="mt-5 max-w-[640px] mx-auto text-[1rem] leading-[1.8] text-[#5a6a82]">
            Compare facilities, check cash vs insurance, and book with more confidence. Elena helps you make the cost decision before the system makes it for you.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handlePrimaryCta("final_cta")}
              className="cta-shimmer inline-flex items-center justify-center h-14 px-10 rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_45%,#2E6BB5_100%)] text-white text-[1rem] font-semibold shadow-[0_10px_30px_rgba(15,27,61,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#244a82] hover:scale-[1.02] transition-all"
            >
              Start comparing prices
            </button>
          </div>
          <p className="mt-5 text-[0.8rem] text-[#6b7c96]">
            3-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      <footer className="bg-[#0B1430] px-8 py-8 text-center text-[0.82rem] text-white/40 max-md:px-5">
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="/privacy-policy" className="hover:text-white/70">Privacy Policy</a>
          <a href="/terms-of-service" className="hover:text-white/70">Terms of Service</a>
          <a href="/support" className="hover:text-white/70">Support</a>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      />
    </div>
  );
}
