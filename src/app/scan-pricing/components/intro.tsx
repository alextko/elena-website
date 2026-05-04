"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface IntroProps {
  onStart: () => void;
}

const BLOB_SPEEDS = [0.04, -0.03, 0.025, -0.02];

const BLOBS = [
  "w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]",
  "w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]",
  "w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,110,0.4)_0%,transparent_70%)] top-[30%] right-[25%]",
  "w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(232,149,109,0.25)_0%,transparent_70%)] bottom-[10%] left-[5%]",
];

const TESTIMONIALS = [
  {
    name: "Ryan",
    text: (
      <>
        <span className="font-bold">Ryan</span> found an in-network MRI for{" "}
        <span className="font-bold">$350</span>, down from{" "}
        <span className="font-bold">$1,200</span>.
      </>
    ),
    logo: "/images/insurers/uhc.svg",
    logoAlt: "UnitedHealthcare",
  },
  {
    name: "Andrew",
    text: (
      <>
        <span className="font-bold">Andrew</span> compared rates at{" "}
        <span className="font-bold">3 facilities</span> before booking his knee
        MRI.
      </>
    ),
    logo: "/images/insurers/anthem.svg",
    logoAlt: "Anthem",
  },
  {
    name: "Alex",
    text: (
      <>
        <span className="font-bold">Alex</span> saved{" "}
        <span className="font-bold">$650</span> on a CT scan before the
        appointment.
      </>
    ),
    logo: "/images/insurers/oscar.svg",
    logoAlt: "Oscar",
  },
  {
    name: "Sarah",
    text: (
      <>
        <span className="font-bold">Sarah</span> found a breast MRI for{" "}
        <span className="font-bold">$400</span>, down from{" "}
        <span className="font-bold">$2,500</span>.
      </>
    ),
    logo: "/images/insurers/cigna.svg",
    logoAlt: "Cigna",
  },
];

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Tell us what MRI you need",
    body: "Tell us the body part, whether it needs contrast, your insurance, your location, and how urgent it is.",
  },
  {
    number: "02",
    title: "We compare real MRI options",
    body: "Our patient advocates call, price-check, and negotiate when MRI pricing is unclear.",
  },
  {
    number: "03",
    title: "You book with clarity",
    body: "We send the best MRI options, help schedule the appointment, and stay available for questions.",
  },
];

const carouselKeyframes =
  "@keyframes trusted-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes scroll-left{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}";

const responsiveHeroStyles = `
  @media (min-width: 768px) {
    .scan-pricing-hero-main {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 56rem;
      padding-top: 5.5rem;
      padding-bottom: 2.25rem;
    }

    .scan-pricing-hero-title {
      font-size: clamp(2.9rem, min(4.1vw, 7.2vh), 4.1rem);
      line-height: 1;
    }

    .scan-pricing-hero-subtitle {
      font-size: clamp(0.96rem, min(1.08vw, 1.95vh), 1.04rem);
      line-height: 1.6;
      max-width: 37rem;
    }

    .scan-pricing-hero-process {
      margin-top: clamp(1.25rem, 2vh, 1.9rem);
      max-width: 56rem;
    }

    .scan-pricing-hero-step {
      padding: clamp(1.1rem, 1.8vh, 1.35rem);
    }

    .scan-pricing-hero-step-title {
      font-size: clamp(1.02rem, min(1.24vw, 2.2vh), 1.18rem);
      line-height: 1.04;
    }

    .scan-pricing-hero-step-body {
      font-size: clamp(0.88rem, min(0.92vw, 1.65vh), 0.95rem);
      line-height: 1.58;
    }

    .scan-pricing-hero-cta {
      margin-top: clamp(1.1rem, 1.8vh, 1.55rem);
    }

    .scan-pricing-hero-marquee {
      display: none;
    }
  }

  @media (min-width: 1440px) and (min-height: 980px) {
    .scan-pricing-hero-main {
      min-height: calc(100dvh - 8rem);
      padding-bottom: clamp(5.5rem, 10vh, 8rem);
    }

    .scan-pricing-hero-marquee {
      display: block;
    }
  }

  @media (min-width: 768px) and (max-height: 820px) {
    .scan-pricing-hero-title {
      font-size: clamp(2.65rem, min(3.7vw, 6.4vh), 3.45rem);
    }

    .scan-pricing-hero-process {
      margin-top: 1rem;
    }

    .scan-pricing-hero-step-body {
      line-height: 1.48;
    }
  }
`;

export function Intro({ onStart }: IntroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const mouse = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf: number;

    const onMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width - 0.5;
      mouse.y = (e.clientY - rect.top) / rect.height - 0.5;
    };

    const onScroll = () => {
      const progress = Math.min(1, window.scrollY / window.innerHeight);
      mouse.y = progress * 0.3 - 0.15;
      mouse.x = Math.sin(progress * 2) * 0.1;
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

  useEffect(() => {
    document.body.style.backgroundColor = "#0F1B3D";
    document.documentElement.style.backgroundColor = "#0F1B3D";
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-dvh flex-col items-center overflow-hidden md:h-dvh"
    >
      <style dangerouslySetInnerHTML={{ __html: `${carouselKeyframes}${responsiveHeroStyles}` }} />

      <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
      </div>

      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        {BLOBS.map((cls, i) => (
          <div
            key={i}
            ref={(el) => {
              blobRefs.current[i] = el;
            }}
            className={`absolute rounded-full blur-[80px] will-change-transform ${cls}`}
          />
        ))}
      </div>

      <nav className="absolute top-0 left-0 right-0 z-[100] px-8 py-5 flex items-center justify-between max-md:px-4">
        <Link
          href="/"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 max-md:px-4 max-md:py-2 max-md:h-10 max-md:flex max-md:items-center text-[1.35rem] max-md:text-[0.95rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          elena
        </Link>
      </nav>

      <div className="scan-pricing-hero-main relative z-[4] w-full max-w-[920px] px-6 pb-8 pt-[12vh] text-center max-md:px-5 max-md:pb-8 max-md:pt-[96px]">
        <h1 className="scan-pricing-hero-title text-[clamp(2.2rem,4.6vw,3.95rem)] font-light leading-[1.01] tracking-[-0.04em] text-white max-md:text-[2.35rem]">
          Find the cheapest place
          <br />
          <span className="font-extrabold text-white">to get your MRI done.</span>
        </h1>

        <p className="scan-pricing-hero-subtitle mx-auto mt-4 max-w-[640px] text-[0.98rem] font-light leading-relaxed tracking-[0.01em] text-white/82 max-md:max-w-[30ch] max-md:text-[0.98rem] max-md:leading-7">
          We compare real MRI options, call when pricing is unclear, and help you
          avoid overpaying before you book.
        </p>

        <div className="scan-pricing-hero-process mx-auto mt-7 max-w-[920px] text-left max-md:mt-7">
          <div className="overflow-hidden rounded-[30px] border border-white/[0.14] bg-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] max-md:rounded-[26px]">
            <div className="grid md:grid-cols-3">
              {PROCESS_STEPS.map((step, index) => (
                <div
                  key={step.number}
                  className={`scan-pricing-hero-step relative px-6 py-6 md:px-6 md:py-6 max-md:px-5 max-md:py-5 ${
                    index > 0 ? "border-t border-white/[0.1] md:border-t-0 md:border-l" : ""
                  } border-white/[0.1]`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-[3rem] leading-none text-[#F4B084] font-[family-name:var(--font-dm-serif)] italic max-md:text-[2.5rem]">
                      {step.number}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/25 to-transparent" />
                  </div>

                  <div className="scan-pricing-hero-step-title mt-4 text-[1.2rem] font-semibold leading-[1.08] tracking-[-0.02em] text-white max-md:text-[1.12rem]">
                    {step.title}
                  </div>

                  <p className="scan-pricing-hero-step-body mt-3 max-w-[24ch] text-[14px] leading-7 text-white/72 max-md:max-w-none max-md:text-[0.98rem] max-md:leading-7">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="scan-pricing-hero-cta mt-6 flex flex-col items-center gap-4 max-md:mt-6">
          <button
            type="button"
            onClick={onStart}
            className="min-w-[280px] rounded-full bg-white px-10 py-4 text-[1.02rem] font-semibold text-[#0F1B3D] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all hover:bg-white/95 max-md:min-w-0 max-md:w-full max-md:max-w-[320px]"
          >
            Start My MRI Request
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] font-medium tracking-[0.01em] text-white/42 max-md:max-w-[300px]">
            <span>Free</span>
            <span className="hidden sm:inline text-white/20">•</span>
            <span>No signup required</span>
            <span className="hidden sm:inline text-white/20">•</span>
            <span>Results in your inbox within 24 hours</span>
          </div>
        </div>

        <div className="mt-8 w-full md:hidden">
          <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[2px] text-white/30">
            Real patient examples.
          </div>
          <div className="space-y-3 text-left">
            {TESTIMONIALS.map((card) => (
              <div
                key={card.name}
                className="rounded-2xl border border-white/[0.18] bg-white/[0.12] px-5 pt-4 pb-4 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl"
              >
                <p className="text-[0.92rem] leading-relaxed text-white/90">
                  {card.text}
                </p>
                <Image
                  src={card.logo}
                  alt={card.logoAlt}
                  width={88}
                  height={24}
                  className="mt-3 h-6 w-auto brightness-0 invert opacity-60"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="scan-pricing-hero-marquee absolute bottom-0 left-0 right-0 z-[2] hidden w-full pb-3"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
        }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 text-center mb-4">
          Real patient examples.
        </div>
        <div className="overflow-hidden w-full">
          <div className="flex w-max animate-[scroll-left_80s_linear_infinite] max-md:animate-[scroll-left_55s_linear_infinite] will-change-transform [backface-visibility:hidden]">
            {[0, 1].map((set) => (
              <div key={set} className="flex gap-3 pr-3 shrink-0">
                {TESTIMONIALS.map((card) => (
                  <div
                    key={`${set}-${card.name}`}
                    className="bg-white/[0.12] backdrop-blur-xl border border-white/[0.18] rounded-2xl px-6 pt-5 pb-4 w-[320px] h-[132px] shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col"
                  >
                    <p className="text-[0.88rem] text-white/90 leading-relaxed flex-1">
                      {card.text}
                    </p>
                    <Image
                      src={card.logo}
                      alt={card.logoAlt}
                      width={88}
                      height={24}
                      className="h-6 w-auto mt-auto pt-2 self-start brightness-0 invert opacity-60"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
