"use client";

import { useState, useRef, useCallback } from "react";
import { StepLayout } from "./step-layout";
import { OptionButton } from "./option-button";
import { SubStepWrapper } from "./sub-step-wrapper";
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
  { value: "fatigue", label: "I've been feeling tired even after a full night's sleep" },
  { value: "unexplained_weight", label: "I've noticed unexplained changes in my weight" },
  { value: "chest_discomfort", label: "I sometimes feel tightness or discomfort in my chest" },
  { value: "digestive", label: "I've had persistent digestive issues" },
  { value: "none_symptoms", label: "None of these apply to me" },
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
  const [subStep, setSubStep] = useState(0);
  const diagnosed = answers.diagnosedConditions;
  const symptoms = answers.recentSymptoms;

  const handleDiagnosedContinue = useCallback(() => {
    setSubStep(1);
  }, []);

  if (subStep === 0) {
    return (
      <SubStepWrapper stepKey={0}>
        <StepLayout
          question="Has a doctor ever told you that you have any of these?"
          ctaLabel="Continue"
          ctaEnabled={diagnosed.length > 0}
          onCta={handleDiagnosedContinue}
        >
          {DIAGNOSED.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={diagnosed.includes(opt.value)}
              onClick={() => onSubmit({ diagnosedConditions: toggleList(diagnosed, opt.value, "none_diagnosed") })}
            />
          ))}
        </StepLayout>
      </SubStepWrapper>
    );
  }

  return (
    <SubStepWrapper stepKey={1}>
      <StepLayout
        question="Do any of these sound like you?"
        subtitle="Select all that apply."
        ctaLabel="Continue"
        ctaEnabled={symptoms.length > 0}
        onCta={onAdvance}
      >
        {SYMPTOMS.map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            selected={symptoms.includes(opt.value)}
            onClick={() => onSubmit({ recentSymptoms: toggleList(symptoms, opt.value, "none_symptoms") })}
          />
        ))}
      </StepLayout>
    </SubStepWrapper>
  );
}
