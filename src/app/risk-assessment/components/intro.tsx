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

const carouselKeyframes = `@keyframes trusted-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`;

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
      className="relative h-dvh min-h-dvh flex flex-col items-center justify-center overflow-hidden"
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
      <div className="relative z-[4] text-center max-w-[700px] w-full px-6">
        <h1 className="text-[clamp(2rem,4.5vw,3.2rem)] max-md:text-[1.7rem] font-light leading-[1.15] tracking-tight text-white">
          Most people miss at least<br />
          <span className="font-extrabold">2 critical health risks.</span>
        </h1>

        <p className="text-[1.15rem] max-md:text-[0.85rem] font-light text-white/85 mt-4 tracking-wide max-w-[520px] mx-auto">
          Take our 60-second assessment to uncover yours, with personalized recommendations based on real screening guidelines.
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

      {/* Trusted by strip */}
      <div className="absolute bottom-5 max-md:bottom-8 left-0 right-0 z-[2] text-center">
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
          <div className="flex items-center animate-[trusted-scroll_30s_linear_infinite]">
            {[0, 1].map((set) => (
              <div key={set} className="flex items-center gap-10 pr-10 shrink-0">
                {INSURERS.map((ins) => (
                  <img
                    key={`${set}-${ins.alt}`}
                    src={ins.src}
                    alt={ins.alt}
                    className="h-7 w-auto brightness-0 invert opacity-30 shrink-0"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
