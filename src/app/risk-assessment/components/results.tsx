"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Recommendation, QuizAnswers, HealthRating } from "../lib/types";

interface ResultsProps {
  recommendations: Recommendation[];
  answers: QuizAnswers;
}

const SEVERITY_STYLES: Record<string, { dot: string; label: string; badge: string }> = {
  high: { dot: "bg-red-500", label: "text-red-600", badge: "bg-red-50 text-red-700 border-red-100" },
  medium: { dot: "bg-amber-500", label: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-100" },
  low: { dot: "bg-blue-500", label: "text-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-100" },
};

const RATING_LABELS: Record<HealthRating, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  poor: "Poor",
};

function buildPendingQuery(recommendations: Recommendation[]): string {
  const screenings = recommendations.filter(r => r.category === "screening");
  const careGaps = recommendations.filter(r => r.category === "care_gap");

  const parts: string[] = [
    "I just took the health risk assessment. Here's what came up:"
  ];

  if (screenings.length > 0) {
    parts.push(`I need to: ${screenings.map(r => r.title.toLowerCase()).join(", ")}.`);
  }
  if (careGaps.length > 0) {
    parts.push(`I also need to: ${careGaps.map(r => r.title.toLowerCase()).join(", ")}.`);
  }

  parts.push("Can you help me get started with the most important ones? I'd like to find the best prices and get these scheduled.");

  return parts.join(" ");
}

const BLOBS = [
  "w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]",
  "w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]",
  "w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,110,0.4)_0%,transparent_70%)] top-[30%] right-[25%]",
];

export function Results({ recommendations, answers }: ResultsProps) {
  const router = useRouter();
  const highCount = recommendations.filter(r => r.severity === "high").length;
  const totalCount = recommendations.length;
  const selfRating = answers.selfRating;

  // Set body bg to match hero
  useEffect(() => {
    document.body.style.backgroundColor = "#0F1B3D";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  const handleActionClick = useCallback((rec: Recommendation) => {
    const query = `Based on my health risk assessment, I need to: ${rec.title.toLowerCase()}. ${rec.description} Can you help me get this done?`;
    localStorage.setItem("elena_pending_query", query);
    router.push("/chat");
  }, [router]);

  const handleGetStarted = useCallback(() => {
    const query = buildPendingQuery(recommendations);
    localStorage.setItem("elena_pending_query", query);
    router.push("/chat");
  }, [recommendations, router]);

  return (
    <div className="min-h-dvh font-[family-name:var(--font-inter)]">
      {/* Hero header */}
      <section className="relative px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.2)_0%,rgba(232,149,109,0.1)_25%,transparent_60%)]" />
        </div>

        {/* Blobs */}
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          {BLOBS.map((cls, i) => (
            <div key={i} className={`absolute rounded-full blur-[80px] ${cls}`} />
          ))}
        </div>

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 z-[100] px-8 py-5 flex items-center justify-between max-md:px-4">
          <a
            href="/"
            className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 max-md:px-4 max-md:py-2 text-[1.35rem] max-md:text-[0.95rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
            style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
          >
            elena
          </a>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <h1 className="text-[clamp(2rem,5vw,3rem)] font-light leading-[1.15] tracking-tight text-white">
            We found{" "}
            <span className="font-extrabold">{totalCount} {totalCount === 1 ? "recommendation" : "recommendations"}</span>{" "}
            for{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">you.</em>
          </h1>

          {selfRating && (selfRating === "great" || selfRating === "good") && highCount > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-white/60 text-[1.05rem] font-light mt-5 max-w-lg mx-auto leading-relaxed"
            >
              You rated your health as "{RATING_LABELS[selfRating]}" -- but we found{" "}
              {highCount} high-priority {highCount === 1 ? "item" : "items"} that may need your attention.
            </motion.p>
          )}

          {/* Summary pills */}
          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            {[
              { label: "Screenings due", value: recommendations.filter(r => r.category === "screening").length },
              { label: "Care gaps", value: recommendations.filter(r => r.category === "care_gap").length },
              { label: "Lifestyle", value: recommendations.filter(r => r.category === "lifestyle").length },
            ].filter(s => s.value > 0).map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                className="bg-white/[0.1] backdrop-blur-sm border border-white/[0.15] rounded-full px-5 py-2 flex items-center gap-2.5"
              >
                <span className="text-[22px] font-extrabold text-white">{stat.value}</span>
                <span className="text-[12px] text-white/50 font-medium uppercase tracking-wide">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Recommendations */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#0F1B3D]/30 mb-8">
            Your personalized plan
          </p>

          <div className="flex flex-col gap-5">
            {recommendations.map((rec, i) => {
              const styles = SEVERITY_STYLES[rec.severity];

              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.5 }}
                  className="rounded-2xl border border-[#E5E5EA]/80 p-6 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow"
                >
                  <div className="flex items-start justify-between gap-5 max-md:flex-col max-md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${styles.badge}`}>
                          {rec.severity} priority
                        </span>
                      </div>
                      <h3 className="text-[17px] font-bold text-[#0F1B3D] leading-snug">{rec.title}</h3>
                      <p className="text-[14px] text-[#5a6a82] font-light leading-[1.7] mt-2">{rec.description}</p>
                      <a
                        href={rec.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#AEAEB2] hover:text-[#8E8E93] transition-colors mt-3 inline-block"
                      >
                        Source: {rec.source} ↗
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleActionClick(rec)}
                      className="flex-shrink-0 max-md:w-full px-6 py-3 rounded-full bg-[#0F1B3D] text-white text-[13px] font-semibold hover:bg-[#1A3A6E] transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      {rec.ctaLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {recommendations.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[#E5E5EA] p-10 text-center"
            >
              <div className="text-[40px] mb-4">🎉</div>
              <h3 className="text-[20px] font-bold text-[#0F1B3D]">Looking good!</h3>
              <p className="text-[15px] text-[#5a6a82] font-light mt-2 max-w-sm mx-auto leading-relaxed">
                Based on your responses, you're on track. Keep up the good work and stay consistent with your checkups.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.2)_0%,rgba(232,149,109,0.1)_25%,transparent_60%)]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-lg mx-auto text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 mb-4">Did you know?</p>
          <h2 className="text-[clamp(1.6rem,4.5vw,2.2rem)] font-light text-white leading-tight tracking-tight">
            Most people{" "}
            <span className="font-extrabold">overpay 3-5x</span>{" "}
            for these screenings.
          </h2>
          <p className="text-white/50 text-[1rem] font-light mt-4 max-w-md mx-auto leading-relaxed">
            Elena finds the best prices, books your appointments, and handles the insurance calls -- so you don't have to.
          </p>

          <button
            type="button"
            onClick={handleGetStarted}
            className="mt-8 px-10 py-4 rounded-full bg-white text-[#0F1B3D] font-semibold text-base shadow-[0_4px_24px_rgba(0,0,0,0.15)] hover:bg-white/95 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all"
          >
            Get Started with Elena
          </button>

          <p className="text-white/20 text-xs mt-5 font-light">
            Free to use. No credit card required.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
