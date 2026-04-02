import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/lp/bills", destination: "/?ref=bills" },
      { source: "/lp/calls", destination: "/?ref=calls" },
      { source: "/lp/caregiver", destination: "/?ref=caregiver" },
    ];
  },
  async redirects() {
    return [
      {
        source: "/go/risk",
        destination: "/?utm_source=meta&utm_medium=paid&utm_campaign=meta_spring2026&utm_content=risk_assessment",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
