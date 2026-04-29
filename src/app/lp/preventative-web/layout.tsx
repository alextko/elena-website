import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preventive Care Planning From Bloodwork and Genetic Testing | Elena",
  description:
    "Upload bloodwork, genetic testing, and screening history to Elena. Get help figuring out which preventive follow-up panels, screenings, and next steps actually make sense.",
  openGraph: {
    title: "Preventive Care Planning From Bloodwork and Genetic Testing | Elena",
    description:
      "Turn bloodwork, genetic testing, and screening history into a clearer preventive-care plan with Elena.",
    type: "website",
    url: "https://elena-health.com/lp/preventative-web",
  },
  alternates: {
    canonical: "https://elena-health.com/lp/preventative-web",
  },
};

export default function PreventativeWebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
