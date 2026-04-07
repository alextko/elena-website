"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { OptionButton } from "./option-button";
import { SubStepWrapper } from "./sub-step-wrapper";
import type { QuizAnswers, Frequency } from "../lib/types";

interface GenderSpecificProps {
  answers: QuizAnswers;
  onSubmit: (data: Partial<QuizAnswers>) => void;
  onRegisterBack?: (fn: (() => boolean) | null) => void;
}

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "< 1 year", label: "Less than a year ago" },
  { value: "1-2 years", label: "1-2 years ago" },
  { value: "3+ years", label: "3+ years ago" },
  { value: "never", label: "Never" },
];

function parseAge(bucket?: string): number {
  const map: Record<string, number> = { "18-29": 24, "30-39": 35, "40-49": 45, "50-64": 57, "65+": 70 };
  return bucket ? map[bucket] ?? 30 : 30;
}

export function GenderSpecific({ answers, onSubmit, onRegisterBack }: GenderSpecificProps) {
  const age = parseAge(answers.age);
  const [subStep, setSubStep] = useState(0);

  // Build questions based on sex/age
  const questions: { key: keyof QuizAnswers; question: string }[] = [];

  if (answers.sex === "female") {
    if (age >= 21) {
      questions.push({ key: "lastPap", question: "When was your last Pap smear?" });
    }
    if (age >= 40) {
      questions.push({ key: "lastMammogram", question: "When was your last mammogram?" });
    }
  } else if (answers.sex === "male") {
    if (age >= 50) {
      questions.push({ key: "lastProstate", question: "Have you had a prostate screening?" });
    }
  }

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onRegisterBack?.(() => {
      if (subStep > 0) { setSubStep(s => s - 1); return true; }
      return false;
    });
    return () => onRegisterBack?.(null);
  }, [subStep, onRegisterBack]);

  const current = questions[subStep];
  const selectedValue = current ? (answers[current.key] as string | undefined) : undefined;

  const handleSelect = useCallback((key: string, value: string) => {
    onSubmit({ [key]: value });
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (subStep < questions.length - 1) {
      advanceTimer.current = setTimeout(() => setSubStep(s => s + 1), 350);
    }
  }, [onSubmit, subStep, questions.length]);

  // If no questions apply, this step shouldn't render (parent skips it)
  if (!current) return null;

  return (
    <SubStepWrapper stepKey={subStep}>
      <div className="flex-1 flex flex-col px-6 pt-16 pb-6 max-w-lg mx-auto w-full">
        {questions.length > 1 && (
          <div className="mb-2">
            <p className="text-[11px] font-semibold text-[#0F1B3D]/30 uppercase tracking-[2px] mb-1">
              {subStep + 1} of {questions.length}
            </p>
          </div>
        )}
        <div className="mb-8">
          <h2 className="text-[clamp(1.4rem,5vw,1.75rem)] font-light text-[#0F1B3D] leading-tight tracking-tight">
            {current.question}
          </h2>
          <p className="text-[15px] text-[#8E8E93] mt-2">
            This helps us check if you're up to date.
          </p>
        </div>
        <div className="flex-1 flex flex-col gap-3 p-1 -m-1">
          {FREQUENCY_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={selectedValue === opt.value}
              onClick={() => handleSelect(current.key, opt.value)}
            />
        ))}
        </div>
      </div>
    </SubStepWrapper>
  );
}

/** Check if this step should be skipped */
export function shouldSkipGenderStep(answers: QuizAnswers): boolean {
  const age = parseAge(answers.age);
  if (answers.sex === "prefer_not_to_say") return true;
  if (answers.sex === "female" && age < 21) return true;
  if (answers.sex === "male" && age < 50) return true;
  return false;
}
