export type ScanUrgency = "asap" | "soon" | "flexible";

export type ScanPricingPreview = {
  recommendation: string;
  rangeLabel: string;
  reportNote: string;
  contrastLabel: string;
  pricingPathLabel: string;
  insuranceLabel: string;
  urgencyLabel: string;
  nextStepLabel: string;
};

export type ScanPricingAnswers = {
  firstName: string;
  lastName: string;
  procedure: string;
  withContrast: boolean;
  withoutContrast: boolean;
  noInsuranceOrCashPay: boolean;
  useCustomInsuranceCompany: boolean;
  insuranceCompany: string;
  planName: string;
  planType: string;
  deductible: string;
  oopMax: string;
  healthcareSpendThisYear: string;
  expectsHighHealthcareSpend: boolean;
  location: string;
  urgency: ScanUrgency;
  email: string;
  anythingElse: string;
};

export function normalizeScanPricingAnswers(
  answers: ScanPricingAnswers,
): ScanPricingAnswers {
  return {
    firstName: answers.firstName.trim(),
    lastName: answers.lastName.trim(),
    procedure: answers.procedure.trim(),
    withContrast: answers.withContrast,
    withoutContrast: answers.withoutContrast,
    noInsuranceOrCashPay: answers.noInsuranceOrCashPay,
    useCustomInsuranceCompany: answers.useCustomInsuranceCompany,
    insuranceCompany: answers.insuranceCompany.trim(),
    planName: answers.planName.trim(),
    planType: answers.planType.trim(),
    deductible: answers.deductible.trim(),
    oopMax: answers.oopMax.trim(),
    healthcareSpendThisYear: answers.healthcareSpendThisYear.trim(),
    expectsHighHealthcareSpend: answers.expectsHighHealthcareSpend,
    location: answers.location.trim(),
    urgency: answers.urgency,
    email: answers.email.trim().toLowerCase(),
    anythingElse: answers.anythingElse.trim(),
  };
}

export function buildScanPricingSummary(
  answers: ScanPricingAnswers,
): string {
  const contrastDetails =
    answers.withContrast && answers.withoutContrast
      ? "with and without contrast"
      : answers.withContrast
        ? "with contrast"
        : answers.withoutContrast
          ? "without contrast"
          : "";

  return [
    [answers.firstName, answers.lastName].filter(Boolean).length > 0
      ? `Contact name: ${[answers.firstName, answers.lastName].filter(Boolean).join(" ")}.`
      : "",
    `I need help finding the cheapest place to get ${answers.procedure}${contrastDetails ? ` (${contrastDetails})` : ""}.`,
    answers.noInsuranceOrCashPay
      ? "No insurance / prefers cash pay."
      : `Insurance company: ${answers.insuranceCompany}.`,
    answers.noInsuranceOrCashPay ? "" : `Plan name: ${answers.planName}.`,
    answers.noInsuranceOrCashPay || !answers.planType
      ? ""
      : `Plan type: ${answers.planType}.`,
    answers.deductible ? `Deductible: ${answers.deductible}.` : "",
    answers.oopMax ? `Out-of-pocket max: ${answers.oopMax}.` : "",
    answers.healthcareSpendThisYear
      ? `Healthcare spend this year: ${answers.healthcareSpendThisYear}.`
      : "",
    `Expects high healthcare spend this year: ${answers.expectsHighHealthcareSpend ? "Yes" : "No"}.`,
    `Location: ${answers.location}.`,
    `Urgency: ${answers.urgency}.`,
    `Email: ${answers.email}.`,
    answers.anythingElse
      ? `Anything else they need help with: ${answers.anythingElse}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function parseMoneyLike(value: string): number | null {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function getContrastLabel(answers: ScanPricingAnswers): string {
  if (answers.withContrast && answers.withoutContrast) {
    return "With and without contrast";
  }
  if (answers.withContrast) {
    return "With contrast";
  }
  if (answers.withoutContrast) {
    return "Without contrast";
  }
  return "Contrast not specified";
}

function getInsuranceLabel(answers: ScanPricingAnswers): string {
  if (answers.noInsuranceOrCashPay) {
    return "Cash pay";
  }

  const parts = [answers.insuranceCompany, answers.planName, answers.planType].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "Insurance on file";
}

function estimateScanRange(answers: ScanPricingAnswers): [number, number] {
  const procedure = answers.procedure.toLowerCase();
  const withContrast = answers.withContrast;
  const withoutContrast = answers.withoutContrast;
  const bothContrast = withContrast && withoutContrast;

  if (procedure.includes("mri")) {
    if (bothContrast) return [700, 1600];
    if (withContrast) return [500, 1200];
    return [300, 800];
  }

  if (procedure.includes("ct")) {
    if (bothContrast) return [600, 1300];
    if (withContrast) return [400, 1000];
    return [250, 700];
  }

  if (procedure.includes("ultrasound")) return [150, 500];
  if (procedure.includes("mammogram")) return [150, 450];
  if (procedure.includes("dexa")) return [100, 250];
  if (procedure.includes("colonoscopy")) return [1200, 3500];

  return [200, 1500];
}

export function buildScanPricingPreview(
  answers: ScanPricingAnswers,
): ScanPricingPreview {
  const deductible = parseMoneyLike(answers.deductible) ?? 0;
  const oopMax = parseMoneyLike(answers.oopMax) ?? 0;
  const spend = parseMoneyLike(answers.healthcareSpendThisYear) ?? 0;
  const [low, high] = estimateScanRange(answers);
  const contrastLabel = getContrastLabel(answers);
  const insuranceLabel = getInsuranceLabel(answers);
  const hasFinancialInputs =
    Boolean(answers.deductible.trim()) ||
    Boolean(answers.oopMax.trim()) ||
    Boolean(answers.healthcareSpendThisYear.trim()) ||
    answers.expectsHighHealthcareSpend;
  const urgencyLabel =
    answers.urgency === "asap"
      ? "We’ll bias toward fast-turnaround MRI options."
      : answers.urgency === "flexible"
        ? "We’ll bias toward the cheapest sensible MRI option."
        : "We’ll balance price and availability.";

  let recommendation =
    "We’ll compare both cash-pay and in-network pricing so you can see which path is actually cheaper.";
  let pricingPathLabel = "Compare cash pay and insurance";
  let nextStepLabel =
    "We’ll send the cheapest local MRI options, show the expected price spread, and call out the path we’d book.";

  if (answers.noInsuranceOrCashPay) {
    recommendation =
      "Since you said cash pay is on the table, we’ll prioritize self-pay pricing first and compare it against any obvious insured options.";
    pricingPathLabel = "Prioritize cash-pay MRI pricing";
  } else if (!hasFinancialInputs) {
    recommendation =
      "Since you skipped your deductible and spend details, we’ll compare both cash-pay and in-network MRI pricing side by side.";
    pricingPathLabel = "We need to compare both paths";
  } else if (deductible > 0 && spend < deductible * 0.5 && !answers.expectsHighHealthcareSpend) {
    recommendation =
      "Cash pay could be your cheapest option for this MRI.";
    pricingPathLabel = "Cash pay may win";
  } else if ((deductible > 0 && spend >= deductible) || answers.expectsHighHealthcareSpend || (oopMax > 0 && spend >= oopMax * 0.5)) {
    recommendation =
      "Based on your deductible and out-of-pocket max, in-network pricing may be competitive enough that we should compare both paths closely.";
    pricingPathLabel = "Insurance may be competitive";
  }

  if (answers.urgency === "asap") {
    nextStepLabel =
      "We’ll focus on MRI centers that can see you quickly, then flag the lowest-cost options among the fastest appointments.";
  } else if (answers.urgency === "flexible") {
    nextStepLabel =
      "We’ll lean into the cheapest MRI options first, even if the best price takes a little longer to schedule.";
  }

  return {
    recommendation,
    rangeLabel: `${formatUsd(low)}–${formatUsd(high)}`,
    reportNote:
      "Your final MRI report will show the cheapest local options, what looks best with insurance vs cash pay, and the next step we’d recommend.",
    contrastLabel,
    pricingPathLabel,
    insuranceLabel,
    urgencyLabel,
    nextStepLabel,
  };
}
