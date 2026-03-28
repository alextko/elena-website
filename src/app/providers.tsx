"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { captureAttribution } from "@/lib/attribution";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    captureAttribution();
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
