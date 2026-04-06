"use client";

import { motion } from "framer-motion";

interface InterstitialProps {
  stat: string;
  context: string;
  source: string;
  sourceUrl: string;
  onContinue: () => void;
}

export function Interstitial({ stat, context, source, sourceUrl, onContinue }: InterstitialProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 min-h-dvh relative"
      style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.2)_0%,rgba(232,149,109,0.1)_25%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-[clamp(2.5rem,8vw,4rem)] font-extrabold text-white leading-none tracking-tight"
        >
          {stat}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-white/70 text-[1.05rem] font-light mt-5 leading-relaxed"
        >
          {context}
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
