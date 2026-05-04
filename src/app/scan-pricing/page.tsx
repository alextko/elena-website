"use client";

import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import * as analytics from "@/lib/analytics";
import { trackViewContent } from "@/lib/tracking-events";
import { Intro } from "./components/intro";
import { QuizShell } from "../risk-assessment/components/quiz-shell";
import { StepLayout } from "../risk-assessment/components/step-layout";
import { OptionButton } from "../risk-assessment/components/option-button";
import { submitScanPricingRequest, type ScanPricingAnswers, type ScanUrgency } from "./lib/intake";
import { buildScanPricingPreview } from "./lib/shared";

type FunnelStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type FunnelState = {
  step: FunnelStep;
  answers: ScanPricingAnswers;
  direction: 1 | -1;
};

type FunnelAction =
  | { type: "SET_ANSWERS"; payload: Partial<ScanPricingAnswers> }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: FunnelStep };

const STORAGE_ANSWERS_KEY = "elena_scan_pricing_answers";
const STORAGE_STEP_KEY = "elena_scan_pricing_step";
const STORAGE_CONFIRMATION_PREVIEW_KEY = "elena_scan_pricing_confirmation_preview";

const INITIAL_ANSWERS: ScanPricingAnswers = {
  firstName: "",
  lastName: "",
  procedure: "",
  withContrast: false,
  withoutContrast: false,
  noInsuranceOrCashPay: false,
  useCustomInsuranceCompany: false,
  insuranceCompany: "",
  planName: "",
  planType: "",
  deductible: "",
  oopMax: "",
  healthcareSpendThisYear: "",
  expectsHighHealthcareSpend: false,
  location: "",
  urgency: "soon",
  email: "",
  anythingElse: "",
};

const URGENCY_OPTIONS: { value: ScanUrgency; label: string; sublabel: string }[] = [
  {
    value: "asap",
    label: "As soon as possible",
    sublabel: "I need the fastest low-cost option.",
  },
  {
    value: "soon",
    label: "Within the next few weeks",
    sublabel: "I can compare a few options, but timing still matters.",
  },
  {
    value: "flexible",
    label: "Flexible timing",
    sublabel: "I mainly want the cheapest sensible option.",
  },
];

const STAT_STEPS = new Set<FunnelStep>([2, 5]);

const INSURANCE_COMPANY_OPTIONS = [
  "Aetna",
  "Anthem Blue Cross Blue Shield",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Oscar",
  "UnitedHealthcare",
  "Other",
] as const;

const PLAN_TYPE_OPTIONS = [
  "HMO",
  "PPO",
  "EPO",
  "POS",
  "HDHP",
  "Indemnity",
  "Not sure",
] as const;

function reducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case "SET_ANSWERS":
      return {
        ...state,
        answers: { ...state.answers, ...action.payload },
      };
    case "NEXT_STEP":
      return {
        ...state,
        step: Math.min(state.step + 1, 9) as FunnelStep,
        direction: 1,
      };
    case "PREV_STEP":
      return {
        ...state,
        step: Math.max(state.step - 1, 0) as FunnelStep,
        direction: -1,
      };
    case "GO_TO_STEP":
      return {
        ...state,
        step: action.payload,
        direction: action.payload > state.step ? 1 : -1,
      };
    default:
      return state;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidZipCode(value: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(value.trim());
}

function isValidCurrencyLikeNumber(value: string): boolean {
  const normalized = value.replace(/[$,\s]/g, "");
  return normalized.length > 0 && /^\d+(\.\d{1,2})?$/.test(normalized);
}

function formatCurrencyInput(value: string): string {
  const normalized = value.replace(/[$,\s]/g, "").replace(/[^\d.]/g, "");
  if (!normalized) return "";

  const [rawWhole = "", rawDecimal = ""] = normalized.split(".");
  const whole = rawWhole.replace(/^0+(?=\d)/, "") || "0";
  const decimal = rawDecimal.slice(0, 2);
  const formattedWhole = Number.parseInt(whole, 10).toLocaleString("en-US");

  return decimal.length > 0
    ? `$${formattedWhole}.${decimal}`
    : `$${formattedWhole}`;
}

function ProcedureStep({
  value,
  withContrast,
  withoutContrast,
  onChange,
  onToggleContrast,
  onContinue,
}: {
  value: string;
  withContrast: boolean;
  withoutContrast: boolean;
  onChange: (value: string) => void;
  onToggleContrast: (field: "withContrast" | "withoutContrast") => void;
  onContinue: () => void;
}) {
  const canContinue = value.trim().length > 0;

  return (
    <StepLayout
      question="What scan or procedure do you need?"
      subtitle="We only need the simplest description that gets us pricing the right thing."
      ctaLabel="Continue"
      ctaEnabled={canContinue}
      centered
      onCta={onContinue}
    >
      <div className="rounded-[28px] border border-[#E5E5EA] bg-white px-5 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canContinue) onContinue();
          }}
          placeholder="Knee MRI"
          className="w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-3 rounded-full border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-3 text-[14px] text-[#0F1B3D] cursor-pointer">
            <input
              type="checkbox"
              checked={withContrast}
              onChange={() => onToggleContrast("withContrast")}
              className="h-4 w-4 accent-[#0F1B3D]"
            />
            <span>With contrast</span>
          </label>
          <label className="inline-flex items-center gap-3 rounded-full border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-3 text-[14px] text-[#0F1B3D] cursor-pointer">
            <input
              type="checkbox"
              checked={withoutContrast}
              onChange={() => onToggleContrast("withoutContrast")}
              className="h-4 w-4 accent-[#0F1B3D]"
            />
            <span>Without contrast</span>
          </label>
        </div>

        <p className="mt-3 text-[13px] text-[#8E8E93] leading-relaxed">
          Examples: MRI, CT scan, ultrasound, mammogram, colonoscopy, DEXA.
        </p>
      </div>
    </StepLayout>
  );
}

function TextFieldStep({
  question,
  subtitle,
  placeholder,
  value,
  onChange,
  ctaLabel,
  onContinue,
  helper,
  error,
  validate,
  inputMode,
  autoComplete,
}: {
  question: string;
  subtitle: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  ctaLabel: string;
  onContinue: () => void;
  helper?: string | null;
  error?: string | null;
  validate?: (value: string) => boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  const safeValue = value ?? "";
  const isValid = validate ? validate(safeValue) : safeValue.trim().length > 0;
  const canContinue = safeValue.trim().length > 0 && isValid;

  return (
    <StepLayout
      question={question}
      subtitle={subtitle}
      ctaLabel={ctaLabel}
      ctaEnabled={canContinue}
      centered
      onCta={onContinue}
    >
      <div className="rounded-[28px] border border-[#E5E5EA] bg-white px-5 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <input
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canContinue) onContinue();
          }}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
        />
        {helper ? (
          <p className="mt-3 text-[13px] text-[#8E8E93] leading-relaxed">{helper}</p>
        ) : null}
        {error && safeValue.trim().length > 0 && !isValid ? (
          <p className="mt-3 text-[13px] text-[#b42318] leading-relaxed">{error}</p>
        ) : null}
      </div>
    </StepLayout>
  );
}

function StatStep({
  eyebrow,
  stat,
  body,
  sourceLabel,
  sourceHref,
  onContinue,
}: {
  eyebrow: string;
  stat: string;
  body: string;
  sourceLabel: string;
  sourceHref: string;
  onContinue: () => void;
}) {
  return (
    <StepLayout
      question=""
      ctaLabel="Continue"
      centered
      hideHeader
      onCta={onContinue}
    >
      <div className="rounded-[30px] border border-white/[0.14] bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_35%,#2E6BB5_100%)] px-6 py-7 shadow-[0_12px_40px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] md:px-8 md:py-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#F4B084]">
          {eyebrow}
        </p>
        <p className="mt-4 max-w-[16ch] text-[clamp(2rem,5vw,3rem)] font-light leading-[1.02] tracking-[-0.04em] text-white">
            {stat}
        </p>
        <p className="mt-4 max-w-[34ch] text-[15px] leading-7 text-white/76">
          {body}
        </p>
        <div className="mt-7">
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-[13px] font-medium text-white/62 underline decoration-[#F4B084]/45 underline-offset-4 hover:text-white"
          >
            Source: {sourceLabel}
          </a>
        </div>
      </div>
    </StepLayout>
  );
}

function InsuranceDetailsStep({
  noInsuranceOrCashPay,
  useCustomInsuranceCompany,
  insuranceCompany,
  planName,
  planType,
  onToggleNoInsuranceOrCashPay,
  onUseCustomInsuranceCompanyChange,
  onInsuranceCompanyChange,
  onPlanNameChange,
  onPlanTypeChange,
  onContinue,
}: {
  noInsuranceOrCashPay: boolean;
  useCustomInsuranceCompany: boolean;
  insuranceCompany: string;
  planName: string;
  planType: string;
  onToggleNoInsuranceOrCashPay: () => void;
  onUseCustomInsuranceCompanyChange: (value: boolean) => void;
  onInsuranceCompanyChange: (value: string) => void;
  onPlanNameChange: (value: string) => void;
  onPlanTypeChange: (value: string) => void;
  onContinue: () => void;
}) {
  const safeInsuranceCompany = insuranceCompany ?? "";
  const safePlanName = planName ?? "";
  const safePlanType = planType ?? "";
  const insuranceSelectValue = useCustomInsuranceCompany ? "Other" : safeInsuranceCompany;
  const canContinue =
    noInsuranceOrCashPay ||
    (safeInsuranceCompany.trim().length > 0 &&
      safePlanName.trim().length > 0 &&
      safePlanType.trim().length > 0);

  return (
    <StepLayout
      question="What insurance do you have?"
      subtitle="We always check cash pay options too, even if you have insurance."
      ctaLabel="Continue"
      ctaEnabled={canContinue}
      centered
      onCta={onContinue}
    >
      <div className="rounded-[28px] border border-[#E5E5EA] bg-white px-5 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="space-y-4">
          <label className="inline-flex items-start gap-3 rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[14px] text-[#0F1B3D] cursor-pointer">
            <input
              type="checkbox"
              checked={noInsuranceOrCashPay}
              onChange={onToggleNoInsuranceOrCashPay}
              className="mt-1 h-4 w-4 shrink-0 accent-[#0F1B3D]"
            />
            <span className="leading-6">
              No insurance / prefer cash pay
            </span>
          </label>

          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#0F1B3D]">
              Insurance company
            </label>
            <div className="relative">
              <select
                value={insuranceSelectValue}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  const isOther = nextValue === "Other";
                  onUseCustomInsuranceCompanyChange(isOther);
                  onInsuranceCompanyChange(isOther ? "" : nextValue);
                }}
                disabled={noInsuranceOrCashPay}
                className="w-full appearance-none rounded-2xl border border-[#D7DBE5] bg-[#F7F6F2] px-4 py-4 pr-12 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <option value="">Select insurance company</option>
                {INSURANCE_COMPANY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5A6A82]" />
            </div>
            {useCustomInsuranceCompany && !noInsuranceOrCashPay ? (
              <input
                value={safeInsuranceCompany}
                onChange={(e) => onInsuranceCompanyChange(e.target.value)}
                placeholder="Write in your insurance company"
                autoComplete="organization"
                className="mt-3 w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
              />
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#0F1B3D]">
              Plan name
            </label>
            <input
              value={safePlanName}
              onChange={(e) => onPlanNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) onContinue();
              }}
              placeholder="Oscar Bronze Simple"
              disabled={noInsuranceOrCashPay}
              autoComplete="off"
              className="w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30 disabled:cursor-not-allowed disabled:opacity-45"
            />
          </div>

          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#0F1B3D]">
              Plan type
            </label>
            <div className="relative">
              <select
                value={safePlanType}
                onChange={(e) => onPlanTypeChange(e.target.value)}
                disabled={noInsuranceOrCashPay}
                className="w-full appearance-none rounded-2xl border border-[#D7DBE5] bg-[#F7F6F2] px-4 py-4 pr-12 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <option value="">Select plan type</option>
                {PLAN_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5A6A82]" />
            </div>
          </div>

        </div>
      </div>
    </StepLayout>
  );
}

function CostDetailsStep({
  deductible,
  oopMax,
  healthcareSpendThisYear,
  expectsHighHealthcareSpend,
  onDeductibleChange,
  onOopMaxChange,
  onHealthcareSpendThisYearChange,
  onToggleExpectsHighHealthcareSpend,
  onContinue,
}: {
  deductible: string;
  oopMax: string;
  healthcareSpendThisYear: string;
  expectsHighHealthcareSpend: boolean;
  onDeductibleChange: (value: string) => void;
  onOopMaxChange: (value: string) => void;
  onHealthcareSpendThisYearChange: (value: string) => void;
  onToggleExpectsHighHealthcareSpend: () => void;
  onContinue: () => void;
}) {
  const safeDeductible = deductible ?? "";
  const safeOopMax = oopMax ?? "";
  const safeHealthcareSpendThisYear = healthcareSpendThisYear ?? "";
  const canContinue =
    isValidCurrencyLikeNumber(safeDeductible) &&
    (safeOopMax.trim().length === 0 || isValidCurrencyLikeNumber(safeOopMax)) &&
    (safeHealthcareSpendThisYear.trim().length === 0 ||
      isValidCurrencyLikeNumber(safeHealthcareSpendThisYear));

  return (
    <StepLayout
      question="What does your coverage look like?"
      subtitle="Your best estimate is fine if you do not know the exact numbers."
      ctaLabel="Continue"
      ctaEnabled={canContinue}
      centered
      onCta={onContinue}
    >
      <div className="rounded-[28px] border border-[#E5E5EA] bg-white px-5 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#0F1B3D]">
              Deductible
            </label>
            <input
              value={safeDeductible}
              onChange={(e) => onDeductibleChange(formatCurrencyInput(e.target.value))}
              placeholder="$1,500"
              inputMode="decimal"
              className="w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
            />
            {safeDeductible.trim().length > 0 && !isValidCurrencyLikeNumber(safeDeductible) ? (
              <p className="mt-2 text-[13px] leading-relaxed text-[#b42318]">
                Enter numbers only.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#0F1B3D]">
              Out-of-pocket max
            </label>
            <input
              value={safeOopMax}
              onChange={(e) => onOopMaxChange(formatCurrencyInput(e.target.value))}
              placeholder="$4,500 (optional)"
              inputMode="decimal"
              className="w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
            />
            {safeOopMax.trim().length > 0 && !isValidCurrencyLikeNumber(safeOopMax) ? (
              <p className="mt-2 text-[13px] leading-relaxed text-[#b42318]">
                Enter numbers only.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#0F1B3D]">
              Healthcare spend this year
            </label>
            <input
              value={safeHealthcareSpendThisYear}
              onChange={(e) =>
                onHealthcareSpendThisYearChange(formatCurrencyInput(e.target.value))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) onContinue();
              }}
              placeholder="$750 spent so far (optional)"
              inputMode="decimal"
              className="w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
            />
            {safeHealthcareSpendThisYear.trim().length > 0 && !isValidCurrencyLikeNumber(safeHealthcareSpendThisYear) ? (
              <p className="mt-2 text-[13px] leading-relaxed text-[#b42318]">
                Enter numbers only.
              </p>
            ) : null}
          </div>

          <label className="inline-flex items-start gap-3 rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[14px] text-[#0F1B3D] cursor-pointer">
            <input
              type="checkbox"
              checked={expectsHighHealthcareSpend}
              onChange={onToggleExpectsHighHealthcareSpend}
              className="mt-1 h-4 w-4 shrink-0 accent-[#0F1B3D]"
            />
            <span className="leading-6">
              I expect to have high healthcare spending this year.
              <span className="block text-[13px] text-[#8E8E93]">
                This helps us decide whether to optimize for insurance or cash pay.
              </span>
            </span>
          </label>
        </div>
      </div>
    </StepLayout>
  );
}

function EmailStep({
  firstName,
  lastName,
  value,
  onFirstNameChange,
  onLastNameChange,
  onChange,
  onContinue,
}: {
  firstName: string;
  lastName: string;
  value: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onChange: (value: string) => void;
  onContinue: () => void;
}) {
  const hasFirstName = firstName.trim().length > 0;
  const isValid = isValidEmail(value);
  const canContinue = hasFirstName && value.trim().length > 0 && isValid;

  return (
    <StepLayout
      question="Where should we send the results?"
      subtitle="We’ll email your lowest-cost options and next steps within 48 hours."
      ctaLabel="Continue"
      ctaEnabled={canContinue}
      centered
      onCta={onContinue}
    >
      <div className="rounded-[28px] border border-[#E5E5EA] bg-white px-5 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <input
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          placeholder="First name"
          autoComplete="given-name"
          autoCapitalize="words"
          className="w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
        />
        <input
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          placeholder="Last name (optional)"
          autoComplete="family-name"
          autoCapitalize="words"
          className="mt-3 w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canContinue) onContinue();
          }}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          className="mt-3 w-full rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
        />
        <p className="mt-3 text-[13px] text-[#8E8E93] leading-relaxed">
          Our patient advocates will use this to send your options and stay in touch.
        </p>
        {value.trim().length > 0 && !isValid ? (
          <p className="mt-3 text-[13px] text-[#b42318] leading-relaxed">
            Enter a valid email address.
          </p>
        ) : null}
      </div>
    </StepLayout>
  );
}

function OpenResponseStep({
  value,
  onChange,
  isSubmitting,
  onContinue,
}: {
  value: string;
  onChange: (value: string) => void;
  isSubmitting: boolean;
  onContinue: () => void;
}) {
  return (
    <StepLayout
      question="Anything else we can help with?"
      subtitle="Our patient advocates can help with any care navigation question. Drop it here and we’ll do our best to help."
      ctaLabel={isSubmitting ? "Submitting Request..." : "Submit Request"}
      ctaLoading={isSubmitting}
      centered
      onCta={onContinue}
    >
      <div className="rounded-[28px] border border-[#E5E5EA] bg-white px-5 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Drop your question here."
          rows={6}
          className="w-full resize-none rounded-2xl border border-[#E5E5EA] bg-[#F7F6F2] px-4 py-4 text-[16px] text-[#0F1B3D] outline-none transition focus:border-[#0F1B3D]/30"
        />
      </div>
    </StepLayout>
  );
}

function UrgencyStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: ScanUrgency;
  onSelect: (value: ScanUrgency) => void;
  onContinue: () => void;
}) {
  return (
    <StepLayout
      question="How urgent is this?"
      subtitle="We’ll balance cost against how quickly you need it done."
      ctaLabel="Continue"
      centered
      onCta={onContinue}
    >
      {URGENCY_OPTIONS.map((option) => (
        <OptionButton
          key={option.value}
          label={option.label}
          sublabel={option.sublabel}
          selected={selected === option.value}
          onClick={() => onSelect(option.value)}
        />
      ))}
    </StepLayout>
  );
}

function ScanPricingContent() {
  const router = useRouter();
  const hasTrackedPageView = useRef(false);
  const restoredRef = useRef(false);
  const prevStepRef = useRef<FunnelStep>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [state, dispatch] = useReducer(reducer, {
    step: 0,
    answers: INITIAL_ANSWERS,
    direction: 1,
  });

  const { step, answers, direction } = state;

  useEffect(() => {
    if (hasTrackedPageView.current) return;
    hasTrackedPageView.current = true;
    analytics.track("Quiz Page Viewed", { quiz: "scan_pricing" });
    trackViewContent("landing_page", "scan_pricing");
  }, []);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const savedAnswers = sessionStorage.getItem(STORAGE_ANSWERS_KEY);
      const savedStep = sessionStorage.getItem(STORAGE_STEP_KEY);
      if (!savedAnswers) return;
      const parsed = JSON.parse(savedAnswers) as Partial<ScanPricingAnswers>;
      dispatch({
        type: "SET_ANSWERS",
        payload: { ...INITIAL_ANSWERS, ...parsed },
      });
      if (savedStep) {
        const parsedStep = Number(savedStep);
        if (parsedStep >= 0 && parsedStep <= 9) {
          dispatch({ type: "GO_TO_STEP", payload: parsedStep as FunnelStep });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (step === 0) return;
    sessionStorage.setItem(STORAGE_ANSWERS_KEY, JSON.stringify(answers));
    sessionStorage.setItem(STORAGE_STEP_KEY, String(step));
  }, [answers, step]);

  useEffect(() => {
    if (step === prevStepRef.current) return;
    const previous = prevStepRef.current;
    prevStepRef.current = step;

    if (step === 1 && previous === 0) {
      analytics.track("Quiz Started", { quiz: "scan_pricing" });
      return;
    }

    if (STAT_STEPS.has(step)) {
      analytics.track("Quiz Interstitial Viewed", {
        quiz: "scan_pricing",
        step,
      });
      return;
    }

    if (previous >= 1 && previous <= 8 && !STAT_STEPS.has(previous)) {
      analytics.track("Quiz Step Completed", {
        quiz: "scan_pricing",
        step: previous,
      });
    }
  }, [step]);

  const progressStep = useMemo(() => Math.max(step, 1), [step]);

  const setAnswers = useCallback((payload: Partial<ScanPricingAnswers>) => {
    setSubmitError(null);
    dispatch({ type: "SET_ANSWERS", payload });
  }, []);

  const next = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const back = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      analytics.track("Quiz Completed", { quiz: "scan_pricing" });
      await submitScanPricingRequest(answers, controller.signal);
      sessionStorage.setItem(
        STORAGE_CONFIRMATION_PREVIEW_KEY,
        JSON.stringify({
          procedure: answers.procedure,
          location: answers.location,
          ...buildScanPricingPreview(answers),
        }),
      );
      sessionStorage.removeItem(STORAGE_ANSWERS_KEY);
      sessionStorage.removeItem(STORAGE_STEP_KEY);
      router.push("/scan-pricing/confirmation");
    } catch (error) {
      console.error("[scan-pricing] submit failed", error);
      if (error instanceof DOMException && error.name === "AbortError") {
        setSubmitError("Saving your request is taking too long. Please try again.");
      } else {
        setSubmitError("We could not save your request. Please try again.");
      }
      setIsSubmitting(false);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [answers, isSubmitting, router]);

  function renderStep() {
    switch (step) {
      case 0:
        return <Intro onStart={() => dispatch({ type: "GO_TO_STEP", payload: 1 })} />;
      case 1:
        return (
          <ProcedureStep
            value={answers.procedure}
            withContrast={answers.withContrast}
            withoutContrast={answers.withoutContrast}
            onChange={(value) => setAnswers({ procedure: value })}
            onToggleContrast={(field) =>
              setAnswers({ [field]: !answers[field] })
            }
            onContinue={next}
          />
        );
      case 2:
        return (
          <StatStep
            eyebrow="Why This Matters"
            stat="For the same procedure, some hospitals charge 6.6x to 30.0x more than others."
            body="That is why shopping matters before you book."
            sourceLabel="Med Care, 2022"
            sourceHref="https://pmc.ncbi.nlm.nih.gov/articles/PMC9464687/"
            onContinue={next}
          />
        );
      case 3:
        return (
          <InsuranceDetailsStep
            noInsuranceOrCashPay={answers.noInsuranceOrCashPay}
            useCustomInsuranceCompany={answers.useCustomInsuranceCompany}
            insuranceCompany={answers.insuranceCompany}
            planName={answers.planName}
            planType={answers.planType}
            onToggleNoInsuranceOrCashPay={() =>
              setAnswers({
                noInsuranceOrCashPay: !answers.noInsuranceOrCashPay,
                ...(answers.noInsuranceOrCashPay
                  ? {}
                  : {
                      insuranceCompany: "",
                      planName: "",
                      planType: "",
                      useCustomInsuranceCompany: false,
                    }),
              })
            }
            onUseCustomInsuranceCompanyChange={(value) =>
              setAnswers({ useCustomInsuranceCompany: value })
            }
            onInsuranceCompanyChange={(value) =>
              setAnswers({ insuranceCompany: value })
            }
            onPlanNameChange={(value) => setAnswers({ planName: value })}
            onPlanTypeChange={(value) => setAnswers({ planType: value })}
            onContinue={next}
          />
        );
      case 4:
        return (
          <CostDetailsStep
            deductible={answers.deductible}
            oopMax={answers.oopMax}
            healthcareSpendThisYear={answers.healthcareSpendThisYear}
            expectsHighHealthcareSpend={answers.expectsHighHealthcareSpend}
            onDeductibleChange={(value) => setAnswers({ deductible: value })}
            onOopMaxChange={(value) => setAnswers({ oopMax: value })}
            onHealthcareSpendThisYearChange={(value) =>
              setAnswers({ healthcareSpendThisYear: value })
            }
            onToggleExpectsHighHealthcareSpend={() =>
              setAnswers({
                expectsHighHealthcareSpend: !answers.expectsHighHealthcareSpend,
              })
            }
            onContinue={next}
          />
        );
      case 5:
        return (
          <StatStep
            eyebrow="Cash Pay Can Win"
            stat="At 47% of hospitals studied, the cash price was lower than the median insurer-negotiated price."
            body="That is why we ask about your deductible and expected spend."
            sourceLabel="Health Affairs, 2023"
            sourceHref="https://pubmed.ncbi.nlm.nih.gov/37011313/"
            onContinue={next}
          />
        );
      case 6:
        return (
          <TextFieldStep
            question="What ZIP code should we search?"
            subtitle="Enter the ZIP code where you want us to compare options."
            placeholder="10001"
            value={answers.location}
            onChange={(value) => setAnswers({ location: value })}
            ctaLabel="Continue"
            onContinue={next}
            helper="We use your ZIP code to compare the best local options."
            error="Enter a valid ZIP code."
            validate={isValidZipCode}
            inputMode="numeric"
          />
        );
      case 7:
        return (
          <UrgencyStep
            selected={answers.urgency}
            onSelect={(value) => setAnswers({ urgency: value })}
            onContinue={next}
          />
        );
      case 8:
        return (
          <EmailStep
            firstName={answers.firstName}
            lastName={answers.lastName}
            value={answers.email}
            onFirstNameChange={(value) => setAnswers({ firstName: value })}
            onLastNameChange={(value) => setAnswers({ lastName: value })}
            onChange={(value) => setAnswers({ email: value })}
            onContinue={next}
          />
        );
      case 9:
        return (
          <div className="flex min-h-full flex-1 flex-col">
            <OpenResponseStep
              value={answers.anythingElse}
              onChange={(value) => setAnswers({ anythingElse: value })}
              isSubmitting={isSubmitting}
              onContinue={handleSubmit}
            />
            {submitError ? (
              <div className="max-w-lg mx-auto w-full px-6 pb-6">
                <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#991b1b]">
                  {submitError}
                </div>
              </div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <QuizShell
      step={step === 0 ? 0 : progressStep}
      direction={direction}
      onBack={step > 0 ? back : undefined}
      totalSteps={9}
      hiddenProgressSteps={[]}
    >
      {renderStep()}
    </QuizShell>
  );
}

export default function ScanPricingPage() {
  return (
    <Suspense fallback={null}>
      <ScanPricingContent />
    </Suspense>
  );
}
