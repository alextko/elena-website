"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = password.length >= 6 && password === confirmPassword;

  // Supabase auto-detects the recovery token from the URL hash
  // (detectSessionInUrl: true is configured in supabase.ts)
  useEffect(() => {
    console.log("[RESET] Page loaded, hash:", window.location.hash?.substring(0, 80));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[RESET] Auth event:", event, "session:", !!session);
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      } else if (event === "SIGNED_IN" && session) {
        // PASSWORD_RECOVERY may arrive as SIGNED_IN in some Supabase versions
        setReady(true);
      }
    });

    // Also check if we already have a session (page might have loaded with tokens)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[RESET] getSession:", !!session);
      if (session) setReady(true);
    });

    // Also try manually extracting tokens from the hash if Supabase doesn't auto-detect
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        console.log("[RESET] Manually setting session from hash tokens");
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: err }) => {
            if (!err) setReady(true);
            else console.error("[RESET] setSession error:", err.message);
          });
      }
    }

    // Timeout: if no recovery event after 10 seconds, link is likely invalid
    const timeout = setTimeout(() => {
      setReady((prev) => {
        if (!prev) setError("This reset link has expired or is invalid. Please request a new one.");
        return prev;
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen font-[family-name:var(--font-inter)]">
      {/* Hero gradient background */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 px-8 py-5 flex items-center justify-between">
        <a
          href="/"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 text-[1.35rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          elena
        </a>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center px-4 pt-12 pb-20">
        <div className="w-full max-w-md">
          {success ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7A9E8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-light text-white leading-tight mb-3 text-center">
                Password updated
              </h1>
              <p className="text-[0.95rem] font-light text-white/60 mb-8 leading-relaxed text-center">
                Your password has been reset. You can now log in with your new password.
              </p>
              <a
                href="/login"
                className="block w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#0F1B3D] text-center transition-all hover:bg-white/90"
              >
                Go to login
              </a>
            </>
          ) : error && !ready ? (
            <>
              <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-light text-white leading-tight mb-3 text-center">
                Reset password
              </h1>
              <p className="text-[0.95rem] font-light text-red-300/80 mb-8 leading-relaxed text-center">
                {error}
              </p>
              <a
                href="/forgot-password"
                className="block w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#0F1B3D] text-center transition-all hover:bg-white/90"
              >
                Request new link
              </a>
            </>
          ) : !ready ? (
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent mb-4" />
              <p className="text-white/60 text-sm">Verifying reset link...</p>
            </div>
          ) : (
            <>
              <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-light text-white leading-tight mb-3">
                Set new password
              </h1>
              <p className="text-[0.95rem] font-light text-white/60 mb-8 leading-relaxed">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-normal text-white/50">New password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-full px-5 py-3.5 text-sm text-white outline-none transition-all placeholder:text-white/30"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      backdropFilter: "blur(40px)",
                      WebkitBackdropFilter: "blur(40px)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                    placeholder="At least 6 characters"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-normal text-white/50">Confirm password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-full px-5 py-3.5 text-sm text-white outline-none transition-all placeholder:text-white/30"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      backdropFilter: "blur(40px)",
                      WebkitBackdropFilter: "blur(40px)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                    placeholder="Confirm your password"
                    minLength={6}
                  />
                </div>

                {password.length > 0 && password.length < 6 && (
                  <p className="text-xs text-white/40">Password must be at least 6 characters</p>
                )}
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-xs text-red-300/80">Passwords do not match</p>
                )}

                {error && (
                  <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#0F1B3D] transition-all hover:bg-white/90 disabled:opacity-50"
                >
                  {submitting ? "..." : "Reset password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
