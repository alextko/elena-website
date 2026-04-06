"use client";

import { StepLayout } from "./step-layout";
import { OptionButton } from "./option-button";
import type { QuizAnswers } from "../lib/types";

interface ConditionsProps {
  answers: QuizAnswers;
  onSubmit: (data: Partial<QuizAnswers>) => void;
  onAdvance: () => void;
}

const DIAGNOSED = [
  { value: "high_bp", label: "High blood pressure" },
  { value: "high_cholesterol", label: "High cholesterol" },
  { value: "prediabetes", label: "Prediabetes or diabetes" },
  { value: "none_diagnosed", label: "None of these" },
];

const SYMPTOMS = [
  { value: "fatigue", label: "Persistent fatigue" },
  { value: "unexplained_weight", label: "Unexplained weight changes" },
  { value: "chest_discomfort", label: "Chest discomfort" },
  { value: "digestive", label: "Digestive issues" },
  { value: "none_symptoms", label: "None of these" },
];

function toggleList(list: string[], value: string, noneValue: string): string[] {
  if (value === noneValue) {
    return list.includes(noneValue) ? [] : [noneValue];
  }
  const without = list.filter(s => s !== noneValue);
  return without.includes(value)
    ? without.filter(s => s !== value)
    : [...without, value];
}

export function Conditions({ answers, onSubmit, onAdvance }: ConditionsProps) {
  const diagnosed = answers.diagnosedConditions;
  const symptoms = answers.recentSymptoms;

  return (
    <StepLayout
      question="A few questions about your health."
      ctaLabel="Continue"
      ctaEnabled={diagnosed.length > 0 && symptoms.length > 0}
      onCta={onAdvance}
    >
      <p className="text-[11px] font-semibold text-[#0F1B3D]/30 uppercase tracking-[2px] mb-2">
        Have you ever been told you have...
      </p>
      {DIAGNOSED.map((opt) => (
        <OptionButton
          key={opt.value}
          label={opt.label}
          selected={diagnosed.includes(opt.value)}
          onClick={() => onSubmit({ diagnosedConditions: toggleList(diagnosed, opt.value, "none_diagnosed") })}
        />
      ))}

      <p className="text-[11px] font-semibold text-[#0F1B3D]/30 uppercase tracking-[2px] mb-2 mt-6">
        Have you noticed recently...
      </p>
      {SYMPTOMS.map((opt) => (
        <OptionButton
          key={opt.value}
          label={opt.label}
          selected={symptoms.includes(opt.value)}
          onClick={() => onSubmit({ recentSymptoms: toggleList(symptoms, opt.value, "none_symptoms") })}
        />
      ))}
    </StepLayout>
  );
}
