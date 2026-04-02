"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let settled = false;

    const markReady = () => {
      if (settled) return;
      settled = true;
      setReady(true);
    };

    const markExpired = () => {
      if (settled) return;
      settled = true;
      setExpired(true);
    };

    // Listen for PASSWORD_RECOVERY event (normal web flow via Supabase redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        markReady();
      }
    });

    // Check for token_hash in query params (mobile fallback via /auth/reset-redirect)
    const tokenHash = searchParams.get("token_hash");
    if (tokenHash) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error: err }) => {
        if (!err) markReady();
        else markExpired();
      });
    }

    // Check for error params in URL (Supabase redirects with these on failure)
    const hash = window.location.hash;
    if (searchParams.get("error") || hash.includes("error=")) {
      markExpired();
    }

    // Timeout: if nothing settles within 3 seconds, mark expired
    const timeout = setTimeout(() => {
      markExpired();
    }, 3000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else {
      await supabase.auth.signOut();
      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-[family-name:var(--font-inter)]">
      {/* Gradient bg — matches hero */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
      </div>

      {/* Blobs — matches hero */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        <div className="absolute rounded-full blur-[80px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]" />
        <div className="absolute rounded-full blur-[80px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]" />
        <div className="absolute rounded-full blur-[80px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,110,0.4)_0%,transparent_70%)] top-[30%] right-[25%]" />
        <div className="absolute rounded-full blur-[80px] w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(232,149,109,0.25)_0%,transparent_70%)] bottom-[10%] left-[5%]" />
      </div>

      {/* Content */}
      <div className="relative z-[4] w-full max-w-md px-6 space-y-8">
        <div className="text-center">
          <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-light leading-[1.15] tracking-tight text-white">
            Reset your{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">
              password
            </em>
          </h1>
          <p className="text-[1.05rem] font-light text-white/85 mt-3 tracking-wide">
            Choose a new password for your account.
          </p>
        </div>

        <div className="rounded-3xl bg-white/[0.08] border border-white/[0.12] p-8 space-y-5">
          {success ? (
            <p className="rounded-2xl bg-green-500/20 border border-green-400/20 px-4 py-3 text-sm text-green-200 text-center">
              Password updated! Redirecting to sign in...
            </p>
          ) : expired ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-white/70">
                This reset link has expired or has already been used.
              </p>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/");
                }}
                className="text-sm text-white/50 underline hover:text-white/80 transition-colors"
              >
                Go back and request a new link
              </button>
            </div>
          ) : !ready ? (
            <p className="text-center text-sm text-white/50">
              Verifying your reset link...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">New password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl bg-white/10 border border-white/[0.15] px-5 py-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
                  placeholder="New password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-2xl bg-white/10 border border-white/[0.15] px-5 py-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
                  placeholder="Confirm password"
                  minLength={6}
                />
              </div>

              {error && (
                <p className="rounded-2xl bg-red-500/20 border border-red-400/20 px-4 py-3 text-sm text-red-200">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-white/95 py-4 text-sm font-semibold text-[#0F1B3D] transition-colors hover:bg-white disabled:opacity-50 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
              >
                {submitting ? "..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordInner />
    </Suspense>
  );
}
