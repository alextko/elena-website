"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScanSavingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/scan-pricing");
  }, [router]);

  return null;
}
