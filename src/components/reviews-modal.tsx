"use client";

import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const REVIEWS = [
  {
    name: "Sarah",
    role: "Mom of 2",
    parts: [
      { text: "Elena showed me that if I cash paid for my CT scan, I would pay " },
      { text: "$250", highlight: true },
      { text: " rather than the " },
      { text: "$900", highlight: true },
      { text: " I was quoted with insurance." },
    ],
  },
  {
    name: "Maria",
    role: "Mom and caregiver",
    parts: [
      { text: "Elena has taken SO much work off my plate. I love having all the information in one place." },
    ],
  },
];

interface ReviewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

export function ReviewsModal({ open, onOpenChange, onContinue }: ReviewsModalProps) {
  const motionEase = [0.4, 0, 0.2, 1] as const;
  const springEase = [0.34, 1.56, 0.64, 1] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] max-w-[22rem] sm:w-full sm:max-w-md max-h-[calc(100svh-1rem)] overflow-y-auto overflow-x-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_24px_80px_rgba(15,27,61,0.25)]">
        <DialogHeader className="sr-only">
          <DialogTitle>What people are saying</DialogTitle>
          <DialogDescription>Testimonials from Elena users</DialogDescription>
        </DialogHeader>
        <div className="p-5 sm:p-7 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: springEase, delay: 0.05 }}
            className="text-center"
          >
            <h2 className="text-[24px] font-extrabold text-[#0F1B3D] leading-tight mb-1.5 text-balance">
              What people are saying
            </h2>
            <p className="text-[14px] text-[#2E6BB5] font-semibold">Real users, real results</p>
          </motion.div>
          <div className="flex flex-col gap-3">
            {REVIEWS.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, x: i === 0 ? -32 : 32, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: springEase, delay: 0.35 + i * 0.18 }}
                className="rounded-2xl border border-[#E5E5EA] bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-[0_2px_10px_rgba(15,27,61,0.05)]"
              >
                <p className="text-[18px] tracking-[2px] text-[#F5A623] mb-2 leading-none" aria-label="5 out of 5 stars">
                  {"\u2605\u2605\u2605\u2605\u2605"}
                </p>
                <p className="text-[14px] sm:text-[15px] text-[#0F1B3D] leading-relaxed mb-3">
                  {"\u201C"}
                  {r.parts.map((p, idx) => (
                    p.highlight
                      ? <span key={idx} className="text-[#2E6BB5] font-semibold">{p.text}</span>
                      : <span key={idx}>{p.text}</span>
                  ))}
                  {"\u201D"}
                </p>
                <p className="text-[13px] font-bold text-[#0F1B3D] leading-tight">{r.name}</p>
                <p className="text-[12px] text-[#8E8E93] leading-tight">{r.role}</p>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: motionEase, delay: 0.35 + REVIEWS.length * 0.18 + 0.1 }}
          >
            <button
              onClick={onContinue}
              className="w-full py-3.5 rounded-full text-white font-semibold font-sans text-[15px] transition-opacity hover:opacity-90 shadow-[0_4px_14px_rgba(15,27,61,0.25)]"
              style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%)" }}
            >
              Continue
            </button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
