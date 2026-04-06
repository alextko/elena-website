import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Health Risk Assessment | Elena",
  description: "Take a 2-minute assessment to discover your hidden health risks. Personalized insights based on real screening guidelines.",
};

export default function RiskAssessmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
