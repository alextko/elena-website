"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";

// Word-by-word "streamed" text — each word fades in with a small translate,
// staggered. Mimics the conversational reveal feel of the mobile app welcome.
// Space between words is a real text node so wrapping works naturally.
export function StreamingText({
  text,
  onDone,
  className,
  wordStagger = 0.075,
  startDelay = 0,
}: {
  text: string;
  onDone?: () => void;
  className?: string;
  wordStagger?: number;
  // Seconds to wait before the first word begins animating. Useful when the
  // surrounding modal is still fading in and we want the stream to play *after*
  // the card is fully visible, not during the fade-in.
  startDelay?: number;
}) {
  const words = useMemo(() => text.split(" "), [text]);

  // Keep onDone in a ref so we don't re-fire the timer when the parent
  // re-renders with a new callback identity.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // start delay + last word stagger offset + ~320ms for the word to animate.
    const totalMs =
      startDelay * 1000 +
      wordStagger * 1000 * Math.max(0, words.length - 1) +
      320;
    const timer = setTimeout(() => onDoneRef.current?.(), totalMs);
    return () => clearTimeout(timer);
  }, [text, wordStagger, words.length, startDelay]);

  return (
    <motion.span
      key={text}
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: wordStagger, delayChildren: 0.04 + startDelay } },
      }}
    >
      {words.map((word, i) => (
        <span key={i}>
          <motion.span
            variants={{
              hidden: { opacity: 0, y: 6 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
              },
            }}
            style={{ display: "inline-block" }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </motion.span>
  );
}
