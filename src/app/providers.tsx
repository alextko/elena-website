"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { AppCtaProvider } from "@/lib/app-cta-context";
import { AppCtaModal } from "@/components/app-cta-modal";
import { DataAdditionTracker } from "@/components/data-addition-tracker";
import { captureAttribution } from "@/lib/attribution";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    captureAttribution();
  }, []);

  return (
    <AuthProvider>
      <AppCtaProvider>
        {children}
        <AppCtaModal />
        <DataAdditionTracker />
      </AppCtaProvider>
    </AuthProvider>
  );
}
