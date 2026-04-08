"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DemoChatPage() {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.setItem("elena_demo_mode", "true");
    router.replace("/chat");
  }, [router]);

  return null;
}
