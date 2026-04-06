export type Sex = "female" | "male" | "prefer_not_to_say";
export type AgeBucket = "18-29" | "30-39" | "40-49" | "50-64" | "65+";
export type Frequency = "< 1 year" | "1-2 years" | "3+ years" | "never";
export type HealthRating = "great" | "good" | "okay" | "poor";

export interface QuizAnswers {
  // Step 1: Demographics
  age?: AgeBucket;
  sex?: Sex;
  zip?: string;
  // Step 2: Family History
  familyHistory: string[];
  // Step 3: Lifestyle
  smokeVape?: "yes" | "no" | "former";
  alcohol?: "none" | "moderate" | "heavy";
  exercise?: "none" | "1-2" | "3-4" | "5+";
  sleep?: "poor" | "okay" | "good";
  // Step 4: Conditions & Signals
  diagnosedConditions: string[];
  recentSymptoms: string[];
  // Step 5: Care Gaps
  lastPhysical?: Frequency;
  lastBloodwork?: Frequency;
  lastScreening?: Frequency;
  hasPCP?: "yes" | "no";
  // Step 6: Gender-specific
  lastPap?: Frequency;
  lastMammogram?: Frequency;
  lastProstate?: Frequency;
  // Step 7: Self-rating
  selfRating?: HealthRating;
}

export interface Recommendation {
  id: string;
  category: "screening" | "lifestyle" | "risk" | "care_gap";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  ctaLabel: string;
  source: string;
  sourceUrl: string;
}

export type QuizStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const INITIAL_ANSWERS: QuizAnswers = {
  familyHistory: [],
  diagnosedConditions: [],
  recentSymptoms: [],
};
