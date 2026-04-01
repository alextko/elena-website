"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResetRedirectInner() {
  const searchParams = useSearchParams();
  const [fallback, setFallback] = useState(false);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "recovery";

  useEffect(() => {
    if (!tokenHash) {
      setFallback(true);
      return;
    }

    // Try to open the app via deep link
    const deepLink = `elenaapp://reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
    window.location.href = deepLink;

    // If the app doesn't open within 1.5 seconds, fall back to the web reset page
    const timeout = setTimeout(() => {
      setFallback(true);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [tokenHash, type]);

  if (fallback) {
    // Redirect to web reset page with the token
    if (typeof window !== "undefined" && tokenHash) {
      window.location.href = `/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
    } else if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center font-[family-name:var(--font-inter)]"
      style={{
        background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)",
      }}
    >
      <p className="text-white/60 text-sm">Opening Elena...</p>
    </div>
  );
}

export default function ResetRedirectPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)",
          }}
        >
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      }
    >
      <ResetRedirectInner />
    </Suspense>
  );
}
