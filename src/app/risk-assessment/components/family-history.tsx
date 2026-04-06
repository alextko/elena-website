"use client";

import { StepLayout } from "./step-layout";
import { OptionButton } from "./option-button";
import type { QuizAnswers } from "../lib/types";

interface FamilyHistoryProps {
  answers: QuizAnswers;
  onSubmit: (data: Partial<QuizAnswers>) => void;
  onAdvance: () => void;
}

const OPTIONS = [
  { value: "heart_disease", label: "Heart disease", sublabel: "Before age 60" },
  { value: "cancer", label: "Cancer", sublabel: "Breast, colon, or prostate" },
  { value: "diabetes", label: "Diabetes" },
  { value: "stroke", label: "Stroke" },
  { value: "none", label: "None of these" },
];

export function FamilyHistory({ answers, onSubmit, onAdvance }: FamilyHistoryProps) {
  const selected = answers.familyHistory;

  function toggle(value: string) {
    if (value === "none") {
      onSubmit({ familyHistory: selected.includes("none") ? [] : ["none"] });
      return;
    }
    const without = selected.filter(s => s !== "none");
    const next = without.includes(value)
      ? without.filter(s => s !== value)
      : [...without, value];
    onSubmit({ familyHistory: next });
  }

  return (
    <StepLayout
      question="Has anyone in your immediate family experienced any of these?"
      subtitle="Parents, siblings, or grandparents. Family history is one of the strongest predictors of your own health risks."
      ctaLabel="Continue"
      ctaEnabled={selected.length > 0}
      onCta={onAdvance}
    >
      {OPTIONS.map((opt) => (
        <OptionButton
          key={opt.value}
          label={opt.label}
          sublabel={opt.sublabel}
          selected={selected.includes(opt.value)}
          onClick={() => toggle(opt.value)}
        />
      ))}
    </StepLayout>
  );
}
