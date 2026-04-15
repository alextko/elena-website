import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/lp/bill-fighting", destination: "/?ref=bill_fighting" },
      { source: "/lp/calls", destination: "/?ref=calls" },
      { source: "/lp/caregiver", destination: "/?ref=caregiver" },
      { source: "/lp/meds", destination: "/?ref=meds" },
      { source: "/lp/fertility", destination: "/?ref=fertility" },
      { source: "/lp/chronic", destination: "/?ref=chronic" },
      { source: "/lp/insurance", destination: "/?ref=insurance" },
      { source: "/lp/care-now", destination: "/?ref=care_now" },
      { source: "/lp/price-transparency", destination: "/?ref=prices" },
      { source: "/lp/equipment", destination: "/dme" },
      { source: "/lp/quiz", destination: "/risk-assessment" },
    ];
  },
  async redirects() {
    return [
      {
        source: "/lp/bills",
        destination: "/lp/price-transparency",
        permanent: true,
      },
      {
        source: "/go/risk",
        destination: "/risk-assessment?utm_source=meta&utm_medium=paid&utm_campaign=meta_spring2026&utm_content=risk_assessment",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
