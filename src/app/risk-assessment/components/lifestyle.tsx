"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { OptionButton } from "./option-button";
import { SubStepWrapper } from "./sub-step-wrapper";
import type { QuizAnswers } from "../lib/types";

interface LifestyleProps {
  answers: QuizAnswers;
  onSubmit: (data: Partial<QuizAnswers>) => void;
  onRegisterBack?: (fn: (() => boolean) | null) => void;
}

const QUESTIONS = [
  {
    key: "smokeVape" as const,
    question: "Do you smoke or vape?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "former", label: "I used to" },
    ],
  },
  {
    key: "alcohol" as const,
    question: "How often do you drink alcohol?",
    options: [
      { value: "none", label: "Never or rarely" },
      { value: "moderate", label: "Moderate", sublabel: "1-7 drinks per week" },
      { value: "heavy", label: "Frequently", sublabel: "8+ drinks per week" },
    ],
  },
  {
    key: "exercise" as const,
    question: "How often do you exercise?",
    options: [
      { value: "none", label: "Rarely or never" },
      { value: "1-2", label: "1-2 times per week" },
      { value: "3-4", label: "3-4 times per week" },
      { value: "5+", label: "5+ times per week" },
    ],
  },
  {
    key: "sleep" as const,
    question: "How would you rate your sleep?",
    options: [
      { value: "good", label: "Good", sublabel: "7-8 hours, feel rested" },
      { value: "okay", label: "Okay", sublabel: "Could be better" },
      { value: "poor", label: "Poor", sublabel: "Trouble sleeping or under 6 hours" },
    ],
  },
];

export function Lifestyle({ answers, onSubmit, onRegisterBack }: LifestyleProps) {
  const [subStep, setSubStep] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onRegisterBack?.(() => {
      if (subStep > 0) { setSubStep(s => s - 1); return true; }
      return false;
    });
    return () => onRegisterBack?.(null);
  }, [subStep, onRegisterBack]);
  const current = QUESTIONS[subStep];
  const selectedValue = answers[current.key];

  const handleSelect = useCallback((value: string) => {
    onSubmit({ [current.key]: value });

    // Clear any pending advance
    if (advanceTimer.current) clearTimeout(advanceTimer.current);

    if (subStep < QUESTIONS.length - 1) {
      // Advance to next sub-step after delay
      advanceTimer.current = setTimeout(() => setSubStep(s => s + 1), 350);
    } else {
      // Last sub-question -- parent handles advance via onSubmit detecting sleep
      // (handled in page.tsx)
    }
  }, [current.key, onSubmit, subStep]);

  return (
    <SubStepWrapper stepKey={subStep}>
      <div className="flex-1 flex flex-col px-6 pt-16 pb-6 max-w-lg mx-auto w-full">
        <div className="mb-2">
          <p className="text-[11px] font-semibold text-[#0F1B3D]/30 uppercase tracking-[2px] mb-1">
            {subStep + 1} of {QUESTIONS.length}
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-[clamp(1.4rem,5vw,1.75rem)] font-light text-[#0F1B3D] leading-tight tracking-tight">
            {current.question}
          </h2>
        </div>

        <div className="flex-1 flex flex-col gap-3 p-1 -m-1">
          {current.options.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              sublabel={"sublabel" in opt ? opt.sublabel : undefined}
              selected={selectedValue === opt.value}
              onClick={() => handleSelect(opt.value)}
            />
          ))}
        </div>
      </div>
    </SubStepWrapper>
  );
}
