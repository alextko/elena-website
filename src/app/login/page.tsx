"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";

export default function LoginPage() {
  const { session, loading, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasTrackedPageView = useRef(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace("/chat");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!loading && !session && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      analytics.track("Login Page Viewed");
    }
  }, [loading, session]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (session) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    analytics.track("Auth Method Selected", { method: "email", mode: "signin" });
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      analytics.track("Auth Error", { method: "email", mode: "signin", error_type: result.error });
      setError(result.error);
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
        <a
          href="/"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-full px-7 py-3 text-white/90 text-[0.9rem] font-normal no-underline transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/15 hover:text-white hover:border-white/25"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          Back to home
        </a>
      </nav>

      {/* Auth form */}
      <div className="relative z-10 flex items-center justify-center px-4 pt-12 pb-20">
        <div className="w-full max-w-md">
          <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-light text-white leading-tight mb-3">
            Upload your <em className="italic font-normal font-[family-name:var(--font-dm-serif)]">documents</em>
          </h1>
          <p className="text-[0.95rem] font-light text-white/60 mb-8 leading-relaxed">
            Sign in to upload medical documents, EOBs, lab results, and more to your Elena account.
          </p>

          {/* Google OAuth */}
          <button
            onClick={() => { analytics.track("Auth Method Selected", { method: "google" }); signInWithGoogle(); }}
            className="flex w-full items-center justify-center gap-3 rounded-full py-4 text-base font-medium text-white transition-all mb-3"
            style={{
              background: "rgba(66, 133, 244, 0.7)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(66, 133, 244, 0.4)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#fff"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#fff"/>
              <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#fff"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#fff"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-xs text-white/40">or email</span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          {/* Email/Password */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-normal text-white/50">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full px-5 py-3.5 text-sm text-white outline-none transition-all placeholder:text-white/30"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(40px)",
                  WebkitBackdropFilter: "blur(40px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-normal text-white/50">Password</label>
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
                placeholder="Your password"
                minLength={6}
              />
            </div>

            <div className="flex justify-end -mt-2">
              <a href="/forgot-password" className="text-xs text-white/50 hover:text-white/80 transition-colors">
                Forgot password?
              </a>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#0F1B3D] transition-all hover:bg-white/90 disabled:opacity-50"
            >
              {submitting ? "..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
