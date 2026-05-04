export type ScanUrgency = "asap" | "soon" | "flexible";

export type ScanPricingAnswers = {
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
    `I need help finding the cheapest place to get ${answers.procedure}${contrastDetails ? ` (${contrastDetails})` : ""}.`,
    answers.noInsuranceOrCashPay
      ? "No insurance / prefers cash pay."
      : `Insurance company: ${answers.insuranceCompany}.`,
    answers.noInsuranceOrCashPay ? "" : `Plan name: ${answers.planName}.`,
    answers.noInsuranceOrCashPay || !answers.planType
      ? ""
      : `Plan type: ${answers.planType}.`,
    `Deductible: ${answers.deductible}.`,
    `Out-of-pocket max: ${answers.oopMax}.`,
    `Healthcare spend this year: ${answers.healthcareSpendThisYear}.`,
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
