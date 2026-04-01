"use client";

import { useEffect, useState } from "react";

/**
 * Intermediary page for mobile password resets.
 *
 * Supabase redirects here with tokens in the hash fragment:
 *   /auth/reset-redirect#access_token=...&refresh_token=...&type=recovery
 *
 * Or with a token_hash query param (from our custom flow):
 *   /auth/reset-redirect?token_hash=...&type=recovery
 *
 * This page tries to open the app via deep link. If the app doesn't
 * open (not installed), falls back to the web reset page.
 */
export default function ResetRedirectPage() {
  const [status, setStatus] = useState("Opening Elena...");

  useEffect(() => {
    // Collect tokens from hash fragment or query params
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const tokenHash = queryParams.get("token_hash") || hashParams.get("token_hash");

    // Build the app deep link with all available tokens
    const deepLinkParams = new URLSearchParams();
    if (accessToken) deepLinkParams.set("access_token", accessToken);
    if (refreshToken) deepLinkParams.set("refresh_token", refreshToken);
    if (tokenHash) deepLinkParams.set("token_hash", tokenHash);
    deepLinkParams.set("type", "recovery");

    const paramString = deepLinkParams.toString();

    if (!accessToken && !refreshToken && !tokenHash) {
      // No tokens at all -- redirect to home
      setStatus("Invalid reset link. Redirecting...");
      setTimeout(() => { window.location.href = "/"; }, 1500);
      return;
    }

    // Try opening the app
    const deepLink = `elenaapp://reset-password?${paramString}`;
    window.location.href = deepLink;

    // If the app doesn't open in 1.5s, fall back to web reset page
    const timeout = setTimeout(() => {
      setStatus("App not found. Opening web reset...");
      // Pass tokens to the web reset page
      if (tokenHash) {
        window.location.href = `/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
      } else if (accessToken && refreshToken) {
        // Pass via hash fragment (web reset page handles this via Supabase)
        window.location.href = `/reset-password#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=recovery`;
      } else {
        window.location.href = "/";
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center font-[family-name:var(--font-inter)]"
      style={{
        background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)",
      }}
    >
      <p className="text-white/60 text-sm">{status}</p>
    </div>
  );
}
