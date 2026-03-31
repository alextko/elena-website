"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          redirect_to: `${window.location.origin}/reset-password`,
        }),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
      } else {
        setSent(true);
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
        <a
          href="/login"
          className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-full px-7 py-3 text-white/90 text-[0.9rem] font-normal no-underline transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/15 hover:text-white hover:border-white/25"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
        >
          Back to login
        </a>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center px-4 pt-12 pb-20">
        <div className="w-full max-w-md">
          {sent ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-light text-white leading-tight mb-3 text-center">
                Check your email
              </h1>
              <p className="text-[0.95rem] font-light text-white/60 mb-8 leading-relaxed text-center">
                We sent a password reset link to{" "}
                <span className="text-white/90 font-medium">{email.trim()}</span>
              </p>
              <a
                href="/login"
                className="block w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#0F1B3D] text-center transition-all hover:bg-white/90"
              >
                Back to login
              </a>
            </>
          ) : (
            <>
              <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-light text-white leading-tight mb-3">
                Reset your password
              </h1>
              <p className="text-[0.95rem] font-light text-white/60 mb-8 leading-relaxed">
                Enter your email and we'll send you a link to reset your password.
              </p>

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

                {error && (
                  <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#0F1B3D] transition-all hover:bg-white/90 disabled:opacity-50"
                >
                  {submitting ? "..." : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
