"use client";

import { useState, useRef, useCallback } from "react";
import { OptionButton } from "./option-button";
import { SubStepWrapper } from "./sub-step-wrapper";
import type { QuizAnswers, Frequency } from "../lib/types";

interface CareGapsProps {
  answers: QuizAnswers;
  onSubmit: (data: Partial<QuizAnswers>) => void;
}

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "< 1 year", label: "Less than a year ago" },
  { value: "1-2 years", label: "1-2 years ago" },
  { value: "3+ years", label: "3+ years ago" },
  { value: "never", label: "Never" },
];

const QUESTIONS = [
  { key: "lastPhysical" as const, question: "When did you last see a doctor for a checkup?" },
  { key: "lastBloodwork" as const, question: "When did you last get bloodwork done?" },
  { key: "lastScreening" as const, question: "When was your last preventive screening?" },
];

export function CareGaps({ answers, onSubmit }: CareGapsProps) {
  const [subStep, setSubStep] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFrequencyStep = subStep < QUESTIONS.length;

  const handleFrequencySelect = useCallback((key: string, value: string) => {
    onSubmit({ [key]: value });
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => setSubStep(s => s + 1), 350);
  }, [onSubmit]);

  if (isFrequencyStep) {
    const current = QUESTIONS[subStep];
    const selectedValue = answers[current.key];

    return (
      <SubStepWrapper stepKey={subStep}>
        <div className="flex-1 flex flex-col px-6 pt-16 pb-6 max-w-lg mx-auto w-full">
          <div className="mb-2">
            <p className="text-[11px] font-semibold text-[#0F1B3D]/30 uppercase tracking-[2px] mb-1">
              {subStep + 1} of {QUESTIONS.length + 1}
            </p>
          </div>
          <div className="mb-8">
            <h2 className="text-[clamp(1.4rem,5vw,1.75rem)] font-light text-[#0F1B3D] leading-tight tracking-tight">
              {current.question}
            </h2>
          </div>
          <div className="flex-1 flex flex-col gap-3 p-1 -m-1">
            {FREQUENCY_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={selectedValue === opt.value}
                onClick={() => handleFrequencySelect(current.key, opt.value)}
              />
            ))}
          </div>
        </div>
      </SubStepWrapper>
    );
  }

  // PCP question
  return (
    <SubStepWrapper stepKey={QUESTIONS.length}>
      <div className="flex-1 flex flex-col px-6 pt-16 pb-6 max-w-lg mx-auto w-full">
        <div className="mb-2">
          <p className="text-[11px] font-semibold text-[#0F1B3D]/30 uppercase tracking-[2px] mb-1">
            {QUESTIONS.length + 1} of {QUESTIONS.length + 1}
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-[clamp(1.4rem,5vw,1.75rem)] font-light text-[#0F1B3D] leading-tight tracking-tight">
            Do you have a primary care doctor?
          </h2>
        </div>
        <div className="flex-1 flex flex-col gap-3 p-1 -m-1">
          <OptionButton label="Yes" selected={answers.hasPCP === "yes"} onClick={() => onSubmit({ hasPCP: "yes" })} />
          <OptionButton label="No" selected={answers.hasPCP === "no"} onClick={() => onSubmit({ hasPCP: "no" })} />
        </div>
      </div>
    </SubStepWrapper>
  );
}
