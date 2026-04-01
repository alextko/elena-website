"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase automatically handles the token from the URL hash
    // and establishes a session via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
      setSuccess(true);
      setTimeout(() => router.push("/chat"), 2000);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 font-[family-name:var(--font-inter)]"
      style={{
        background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)",
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-[20px] border border-white/[0.15] p-8 space-y-6">
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
          Reset your password
        </h1>

        {success ? (
          <p className="rounded-2xl bg-green-500/20 border border-green-400/20 px-4 py-3 text-sm text-green-200 text-center">
            Password updated! Redirecting to chat...
          </p>
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
                className="w-full rounded-2xl bg-white/10 backdrop-blur-[20px] border border-white/[0.15] px-5 py-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
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
                className="w-full rounded-2xl bg-white/10 backdrop-blur-[20px] border border-white/[0.15] px-5 py-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
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
  );
}
