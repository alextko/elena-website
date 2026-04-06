"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SubStepWrapperProps {
  stepKey: number;
  children: ReactNode;
}

const variants = {
  enter: {
    x: 80,
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: {
    x: -80,
    opacity: 0,
  },
};

export function SubStepWrapper({ stepKey, children }: SubStepWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
