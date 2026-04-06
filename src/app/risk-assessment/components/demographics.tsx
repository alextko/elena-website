"use client";

import { StepLayout } from "./step-layout";
import { OptionButton } from "./option-button";
import type { QuizAnswers, AgeBucket, Sex } from "../lib/types";

interface DemographicsProps {
  answers: QuizAnswers;
  onSubmit: (data: Partial<QuizAnswers>) => void;
  onAdvance: () => void;
}

const AGE_OPTIONS: { value: AgeBucket; label: string }[] = [
  { value: "18-29", label: "18-29" },
  { value: "30-39", label: "30-39" },
  { value: "40-49", label: "40-49" },
  { value: "50-64", label: "50-64" },
  { value: "65+", label: "65+" },
];

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function Demographics({ answers, onSubmit, onAdvance }: DemographicsProps) {
  const age = answers.age;
  const sex = answers.sex;

  return (
    <StepLayout
      question="Let's start with the basics."
      subtitle="This helps us personalize your results."
      ctaLabel="Continue"
      ctaEnabled={!!age && !!sex}
      onCta={onAdvance}
    >
      <div className="mb-2">
        <p className="text-[11px] font-semibold text-[#0F1B3D]/30 uppercase tracking-[2px] mb-3">Age</p>
        <div className="flex flex-wrap gap-2">
          {AGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSubmit({ age: opt.value })}
              className={`px-5 py-3 rounded-xl border text-[15px] font-medium transition-all ${
                age === opt.value
                  ? "bg-[#0F1B3D]/[0.06] border-[#0F1B3D] text-[#0F1B3D] shadow-[0_0_0_1px_#0F1B3D]"
                  : "bg-white border-[#E5E5EA] text-[#1C1C1E] hover:border-[#0F1B3D]/20 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 mt-4">
        <p className="text-[11px] font-semibold text-[#0F1B3D]/30 uppercase tracking-[2px] mb-3">Sex assigned at birth</p>
        <div className="flex flex-col gap-2">
          {SEX_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={sex === opt.value}
              onClick={() => onSubmit({ sex: opt.value })}
            />
          ))}
        </div>
      </div>
    </StepLayout>
  );
}
