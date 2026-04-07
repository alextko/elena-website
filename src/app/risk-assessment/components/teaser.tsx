"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Activity, CalendarCheck } from "lucide-react";
import type { Recommendation } from "../lib/types";

interface TeaserProps {
  recommendations: Recommendation[];
  onSignup: () => void;
}

const CATEGORY_ICONS: Record<string, typeof ShieldAlert> = {
  risk: ShieldAlert,
  screening: Activity,
  care_gap: CalendarCheck,
  lifestyle: Activity,
};

export function Teaser({ recommendations, onSignup }: TeaserProps) {
  const [analyzing, setAnalyzing] = useState(true);
  const preview = recommendations.slice(0, 3);
  const moreCount = Math.max(0, recommendations.length - 3);

  useEffect(() => {
    const timer = setTimeout(() => setAnalyzing(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (analyzing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-dvh bg-[#F7F6F2]">
        <style dangerouslySetInnerHTML={{ __html: `@keyframes bounce-dot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-12px)}}` }} />
        <div className="flex gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-[#0F1B3D]"
              style={{ animation: "bounce-dot 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-[#8E8E93] text-sm font-light">Analyzing your responses...</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 min-h-dvh relative"
      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.2)_0%,rgba(232,149,109,0.1)_25%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full text-center py-10 sm:py-0"
      >
        <h2 className="text-[clamp(1.6rem,5vw,2.2rem)] font-light text-white leading-tight tracking-tight mb-2">
          We found{" "}
          <span className="font-extrabold text-[#F4B084]">
            {recommendations.length} {recommendations.length === 1 ? "thing" : "things"}
          </span>{" "}
          worth checking.
        </h2>
        <p className="text-white/50 text-sm mb-8">Based on your responses</p>

        {/* Blurred preview cards */}
        <div className="flex flex-col gap-3 mb-8">
          {preview.map((rec, i) => {
            const Icon = CATEGORY_ICONS[rec.category] ?? Activity;
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
                className="rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] p-4 text-left flex gap-3 items-start"
              >
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4.5 h-4.5 text-[#F4B084]" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-white">{rec.title}</p>
                  <p className="text-[13px] text-white/40 mt-1 blur-[4px] select-none pointer-events-none">
                    {rec.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {moreCount > 0 && (
          <p className="text-white/40 text-sm mb-6">
            + {moreCount} more {moreCount === 1 ? "recommendation" : "recommendations"}
          </p>
        )}

        <p className="text-white/70 text-sm mb-4">
          Create a free account to see your full results and action plan.
        </p>

        <button
          type="button"
          onClick={onSignup}
          className="w-full py-4 rounded-full bg-white text-[#0F1B3D] font-semibold text-base shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:bg-white/95 transition-all"
        >
          See My Results
        </button>

      </motion.div>
    </div>
  );
}
