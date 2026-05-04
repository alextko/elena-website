"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScanSavingsConfirmationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/scan-pricing/confirmation");
  }, [router]);

  return null;
}
