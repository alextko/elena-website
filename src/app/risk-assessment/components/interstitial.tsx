"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

interface InterstitialProps {
  headline: string;
  detail: string;
  source: string;
  sourceUrl: string;
  onContinue: () => void;
  onBack?: () => void;
}

export function Interstitial({ headline, detail, source, sourceUrl, onContinue, onBack }: InterstitialProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 min-h-dvh relative"
      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.2)_0%,rgba(232,149,109,0.1)_25%,transparent_60%)] pointer-events-none" />

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-6 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors z-20"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md text-center"
      >
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-[clamp(1.6rem,5vw,2.2rem)] font-light text-white leading-[1.2] tracking-tight"
        >
          {headline}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-white/50 text-[15px] font-light mt-4 leading-relaxed"
        >
          {detail}
        </motion.p>

        <motion.a
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/25 text-[11px] mt-4 inline-block hover:text-white/40 transition-colors"
        >
          Source: {source} ↗
        </motion.a>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <button
            type="button"
            onClick={onContinue}
            className="mt-8 px-10 py-4 rounded-full bg-white/[0.12] backdrop-blur-[40px] border border-white/[0.2] border-t-white/30 text-white font-semibold text-base shadow-[0_4px_24px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/[0.2] hover:border-white/[0.35] transition-all"
            style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
          >
            Continue
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
