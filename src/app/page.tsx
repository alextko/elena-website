"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { trackViewContent } from "@/lib/tracking-events";
import * as analytics from "@/lib/analytics";
import { AuthModal } from "@/components/auth-modal";
import Spotlights from "@/components/landing/spotlights";
import "./landing.css";

const STATS = [
  { value: 86, suffix: "%", label: "have delayed care due to cost uncertainty" },
  { value: 76, suffix: "%", label: "received a surprise medical bill" },
  { value: 95, suffix: "%", label: "want a price transparency tool" },
  { value: 90, suffix: "%", label: "want help navigating the system" },
];

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

function StatsBar() {
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
          {STATS.map((stat, i) => {
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

const SUGGESTIONS = [
  { label: "Compare Prices", text: "Compare MRI prices near me" },
  { label: "Dispute a Bill", text: "I want to dispute a medical bill" },
  { label: "Find a Doctor", text: "Find an in-network doctor near me" },
  { label: "Manage Family Care", text: "Help me manage my parents' healthcare from my phone" },
  { label: "Find Insurance", text: "Help me find the right insurance plan" },
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

const HERO_COPY: Record<string, { headline: [string, string]; subtitle: string; prefill: string }> = {
  bills: {
    headline: ["Never get a", "surprise bill again."],
    subtitle: "Elena helps you compare prices using real, insurance-negotiated rates. Never overpay again.",
    prefill: "find the cheapest MRI near me",
  },
  calls: {
    headline: ["Elena calls your", "insurance for you."],
    subtitle: "No more hold music. No more transfers. Elena sits on hold, talks to your insurer, and reports back.",
    prefill: "Call my insurance company for me",
  },
  caregiver: {
    headline: ["Manage their health", "from your phone."],
    subtitle: "Insurance, doctors, meds, and bills for the people you care for — all in one place.",
    prefill: "Help me manage my parents' healthcare from my phone",
  },
  risk_assessment: {
    headline: ["Know your risk", "before it's too late."],
    subtitle: "Take our assessment, learn your risks, and get the right tests on the way.",
    prefill: "I want to understand my health risks based on my family history",
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
  bills: {
    segments: [
      { type: "text", value: "I need a " },
      { type: "blank", value: "", placeholder: "procedure" },
      { type: "text", value: " done. Find me the cheapest option near " },
      { type: "blank", value: "", placeholder: "zip code" },
      { type: "text", value: "." },
    ],
  },
  calls: {
    segments: [
      { type: "text", value: "Call " },
      { type: "blank", value: "", placeholder: "insurer" },
      { type: "text", value: " and ask about " },
      { type: "blank", value: "", placeholder: "claim or issue" },
      { type: "text", value: "." },
    ],
  },
};

const ROTATING_QUERIES: Record<string, string[]> = {
  bills: [
    "compare cataract surgery prices near me",
    "what options do i have for a hip replacement with Medicare?",
    "find the cheapest MRI near me",
    "what are the cheapest prices for a knee replacement in-network?",
    "compare colonoscopy prices near me",
    "compare affordable physical therapy prices near me",
    "what are ultrasound costs at freestanding clinics nearby?",
  ],
  calls: [
    "call UnitedHealthcare about my denied claim",
    "call my insurance and ask why my referral was rejected",
    "call Aetna and dispute this $800 charge",
    "call Blue Cross and check if my MRI is covered",
    "call my provider and negotiate my outstanding balance",
    "call Cigna and get my prior authorization status",
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

  // Support both ?ref=bills (direct) and /lp/bills (rewrite).
  // Rewrites keep the browser URL as /lp/bills but serve /?ref=bills internally.
  // useSearchParams reads the browser URL, so we also extract ref from the path.
  const LP_PATH_MAP: Record<string, string> = {
    "/lp/bills": "bills",
    "/lp/calls": "calls",
    "/lp/caregiver": "caregiver",
  };
  const ref = searchParams.get("ref") || searchParams.get("utm_content") || LP_PATH_MAP[pathname] || null;
  const hero = (ref && HERO_COPY[ref]) || null;
  const queries = ref ? ROTATING_QUERIES[ref] : undefined;
  const [userHasEdited, setUserHasEdited] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const { displayed: rotatingText, fullQuery } = useRotatingQuery(queries, userHasEdited || inputFocused);
  const [manualInput, setManualInput] = useState("");
  const madlib = ref ? MADLIB_TEMPLATES[ref] : undefined;
  const input = userHasEdited ? manualInput : (queries ? rotatingText : (hero?.prefill || ""));
  // When sending mid-animation, use the full target query instead of partial text
  const madlibRef = useRef<HTMLDivElement>(null);
  const getMadlibText = () => madlibRef.current?.innerText?.replace(/\n/g, " ").trim() || "";
  const sendQuery = madlib
    ? getMadlibText()
    : (userHasEdited ? manualInput : (queries ? fullQuery : (hero?.prefill || "")));
  const setInput = useCallback((val: string) => { setUserHasEdited(true); setManualInput(val); }, []);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  const hasTrackedPageView = useRef(false);

  // Authenticated → go to /chat
  useEffect(() => {
    if (!loading && session) {
      router.replace("/chat");
    }
  }, [loading, session, router]);

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

  const handleSend = useCallback(() => {
    // Use full query even if animation is mid-typewriter
    const query = sendQuery.trim();
    if (query) {
      analytics.track("Hero Input Submitted", { query_length: query.length });
      analytics.track("Message Sent", {
        is_first_message: true,
        has_attachment: false,
        message_length: query.length,
        authenticated: false,
        source: "landing_page",
        landing_variant: ref || "homepage",
      });
      localStorage.setItem("elena_pending_query", query);
    }
    setAuthModalOpen(true);
  }, [sendQuery, ref]);

  const handleChipClick = useCallback((text: string) => {
    analytics.track("Suggested Prompt Clicked", { prompt_label: text });
    setUserHasEdited(true);
    setManualInput(text);
    inputRef.current?.focus();
  }, []);

  if (loading || session) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F1B3D] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="font-[family-name:var(--font-inter)]">
      {/* NAV */}
      <nav className="absolute top-0 left-0 right-0 z-[100] px-8 py-5 flex items-center justify-between max-md:px-4">
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
          onClick={() => { analytics.track("Login Button Clicked"); setAuthModalOpen(true); }}
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
        <div className="min-h-[80dvh] flex flex-col items-center justify-center w-full shrink-0">
        <div className="relative z-[4] text-center max-w-[700px] w-full px-6">
          <h1 className="text-[clamp(2.5rem,5vw,3.8rem)] max-md:text-[1.9rem] font-light leading-[1.15] tracking-tight text-white">
            {hero ? (
              <>{hero.headline[0]}<br />{hero.headline[1]}</>
            ) : (
              <>What can I help you<br />with <em className="italic font-normal font-[family-name:var(--font-dm-serif)]">today?</em></>
            )}
          </h1>
          <p className="text-[0.95rem] max-md:text-[0.8rem] font-light text-white/85 mt-4 tracking-wide">
            {hero ? hero.subtitle : (<>
              <span className="hidden md:inline">Elena is your personal health assistant. She&apos;s like ChatGPT, but she can make calls and is an expert in navigating the healthcare system.</span>
              <span className="md:hidden">Elena is your personal health assistant. She&apos;s like ChatGPT, but she can make calls and navigate the healthcare system.</span>
            </>)}
          </p>

          {/* Chat input bar */}
          <div className="flex flex-col bg-white/95 rounded-[20px] border border-white/30 max-w-[680px] w-full mx-auto mt-8 shadow-[0_4px_24px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="px-5 pt-[18px] pb-3 relative">
              {madlib ? (
                <div
                  ref={madlibRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="text-base max-md:text-[0.9rem] text-[#1C1C1E] leading-[2.2] outline-none min-h-[3rem] max-h-[6rem] overflow-y-auto text-left"
                  style={{ wordBreak: "break-word" }}
                >
                  {madlib.segments.map((seg, i) =>
                    seg.type === "text" ? (
                      <span key={i}>{seg.value}</span>
                    ) : (
                      <span
                        key={i}
                        data-placeholder={seg.placeholder}
                        className="inline-block border border-[#D1D1D6] rounded-lg px-3 py-0.5 mx-0.5 text-base max-md:text-[0.9rem] text-[#1C1C1E] font-medium text-center bg-[#F9F9F9] min-w-[4rem] empty:before:content-[attr(data-placeholder)] empty:before:text-[#C7C7CC] empty:before:font-normal focus-within:border-[#0F1B3D]/40 focus-within:shadow-[0_0_0_3px_rgba(15,27,61,0.06)] transition-all"
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
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[#AEAEB2] hover:text-[#8E8E93] hover:bg-black/[0.04] transition-all" aria-label="Attach document">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button
                onClick={handleSend}
                className="w-10 h-10 rounded-full bg-[#0F1B3D] flex items-center justify-center cursor-pointer transition-colors hover:bg-[#1A3A6E]"
                aria-label="Send"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
                  <path d="M10 16V4M4 10l6-6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/40 text-center mt-7 mb-3.5">
            Common problems Elena can solve
          </div>
          <div className="flex gap-2.5 justify-center flex-nowrap px-3 max-md:overflow-x-auto max-md:justify-start max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden max-md:[mask-image:linear-gradient(to_right,black_80%,transparent_100%)]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => handleChipClick(s.text)}
                className="bg-white/10 border border-white/20 rounded-[22px] px-[18px] py-2.5 max-md:px-3.5 max-md:py-2 text-sm max-md:text-xs font-normal text-white/90 whitespace-nowrap cursor-pointer transition-all hover:bg-white/[0.18] hover:border-white/[0.35] active:scale-[0.97]"
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
                  {TESTIMONIALS.map((card) => (
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
      <StatsBar />

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
          <div className="shrink-0 flex flex-col items-center gap-4">
            <img
              src="/images/elena-icon.png"
              alt="Elena"
              className="w-[280px] h-[280px] rounded-[56px] shadow-[0_16px_48px_rgba(0,0,0,0.12)] bg-[#0F1B3D]"
            />
            <p className="text-[0.7rem] font-light text-[#AEAEB2] text-center">App coming soon</p>
          </div>
        </div>
      </section>

      {/* SPOTLIGHTS */}
      <Spotlights />

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

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
