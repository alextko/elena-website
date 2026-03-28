import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/lp/bills", destination: "/?ref=bills" },
      { source: "/lp/calls", destination: "/?ref=calls" },
      { source: "/lp/caregiver", destination: "/?ref=caregiver" },
    ];
  },
};

export default nextConfig;
