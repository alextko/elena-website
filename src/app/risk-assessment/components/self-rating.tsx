"use client";

import { OptionButton } from "./option-button";
import type { QuizAnswers, HealthRating } from "../lib/types";

interface SelfRatingProps {
  answers: QuizAnswers;
  onSubmit: (data: Partial<QuizAnswers>) => void;
}

const OPTIONS: { value: HealthRating; label: string; emoji: string }[] = [
  { value: "great", emoji: "💪", label: "Great" },
  { value: "good", emoji: "👍", label: "Good" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "poor", emoji: "😟", label: "Poor" },
];

export function SelfRating({ answers, onSubmit }: SelfRatingProps) {
  return (
    <div className="flex-1 flex flex-col px-6 pt-16 pb-6 max-w-lg mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-[clamp(1.4rem,5vw,1.75rem)] font-light text-[#0F1B3D] leading-tight tracking-tight">
          Last question. How would you rate your overall health?
        </h2>
        <p className="text-[15px] text-[#8E8E93] mt-2 font-light">Be honest with yourself. We'll compare this to what your answers actually suggest.</p>
      </div>

      <div className="flex-1 flex flex-col gap-3 p-1 -m-1">
        {OPTIONS.map((opt) => (
          <OptionButton
            key={opt.value}
            label={`${opt.emoji}  ${opt.label}`}
            selected={answers.selfRating === opt.value}
            onClick={() => onSubmit({ selfRating: opt.value })}
          />
        ))}
      </div>
    </div>
  );
}
