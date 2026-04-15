"use client";

import { useEffect, useRef } from "react";

interface IntroProps {
  onStart: () => void;
}

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

const BLOB_SPEEDS = [0.04, -0.03, 0.025, -0.02];

const BLOBS = [
  "w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]",
  "w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]",
  "w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,110,0.4)_0%,transparent_70%)] top-[30%] right-[25%]",
  "w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(232,149,109,0.25)_0%,transparent_70%)] bottom-[10%] left-[5%]",
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

const carouselKeyframes = `@keyframes trusted-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes scroll-left{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`;

export function Intro({ onStart }: IntroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Set body background
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
      className="relative h-dvh min-h-dvh flex flex-col items-center overflow-hidden"
    >
      <style dangerouslySetInnerHTML={{ __html: carouselKeyframes }} />
      {/* Gradient bg */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
      </div>

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

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-[100] px-8 py-5 flex items-center justify-between max-md:px-4">
        <a
          href="/"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 max-md:px-4 max-md:py-2 max-md:h-10 max-md:flex max-md:items-center text-[1.35rem] max-md:text-[0.95rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          elena
        </a>
      </nav>

      {/* Content */}
      <div className="relative z-[4] text-center max-w-[800px] w-full px-6 mt-[20vh] max-md:mt-[15vh]">
        <h1 className="text-[clamp(2rem,4.5vw,3.2rem)] max-md:text-[1.7rem] font-light leading-[1.15] tracking-tight text-white">
          See what preventative care<br />
          <span className="font-extrabold">you could be getting for free.</span>
        </h1>

        <p className="text-[0.95rem] max-md:text-[0.8rem] font-light text-white/85 mt-4 tracking-wide max-w-[560px] mx-auto">
          Colon cancer, diabetes, heart disease, osteoporosis — screenings for these are covered at $0 under most plans. Find out which ones you're missing.
        </p>

        <p className="text-white/40 text-[13px] font-light mt-3">
          Based on USPSTF and CDC screening guidelines
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={onStart}
          className="mt-8 px-10 py-4 rounded-full bg-white/[0.12] backdrop-blur-[40px] border border-white/[0.2] border-t-white/30 text-white font-semibold text-base shadow-[0_4px_24px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/[0.2] hover:border-white/[0.35] transition-all"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          Start My Assessment
        </button>

        <p className="text-white/30 text-xs mt-5 font-light">
          Free. No signup required to start.
        </p>
      </div>

      {/* Testimonials */}
      <div className="absolute bottom-0 left-0 right-0 z-[2] w-full pb-3 max-md:pb-2" style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
      }}>
        <div className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 text-center mb-4">
          Real people. Real results.
        </div>
        {/* Testimonial cards */}
        <div className="overflow-hidden w-full">
          <div className="flex w-max animate-[scroll-left_100s_linear_infinite] max-md:animate-[scroll-left_60s_linear_infinite] will-change-transform [backface-visibility:hidden]">
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
        </div>
      </div>
    </section>
  );
}
