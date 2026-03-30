"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function AuthModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) analytics.track("Auth Modal Opened");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    analytics.track("Auth Method Selected", { method: "email", mode });

    const result =
      mode === "signin" ? await signIn(email, password) : await signUp(email, password);

    setSubmitting(false);

    if (result.error) {
      analytics.track("Auth Error", { method: "email", mode, error_type: result.error });
      setError(result.error);
    } else {
      onOpenChange(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    analytics.track("Auth Method Selected", { method: "google" });
    const result = await signInWithGoogle();
    if (result.error) {
      analytics.track("Auth Error", { method: "google", error_type: result.error });
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 border-0 overflow-hidden rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.25)] font-[family-name:var(--font-inter)]">
        {/* Gradient background matching hero */}
        <div
          className="relative px-10 py-10 max-sm:px-6 max-sm:py-8"
          style={{
            background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)",
          }}
        >
          {/* Warm radial overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 85% 130%, #F4B084 0%, #E8956D 25%, rgba(46,107,181,0) 60%)",
            }}
          />
          {/* Sheen / gloss highlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 30% -20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 110%, rgba(255,255,255,0.06) 0%, transparent 40%)",
            }}
          />

          <div className="relative z-10 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-extrabold tracking-tight text-white">
                {mode === "signin" ? "Sign in to chat" : "Create an account"}
              </DialogTitle>
              <DialogDescription className="text-center text-white/60 text-sm font-light">
                {mode === "signin"
                  ? "Sign in to start chatting with Elena"
                  : "Sign up to get started with Elena"}
              </DialogDescription>
            </DialogHeader>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white/95 py-4 text-sm font-semibold text-[#0F1B3D] transition-all hover:bg-white shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/15" />
              <span className="text-xs text-white/30">or</span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl bg-white/10 backdrop-blur-[20px] border border-white/[0.15] px-5 py-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
                  style={{ WebkitBackdropFilter: "blur(20px)" }}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl bg-white/10 backdrop-blur-[20px] border border-white/[0.15] px-5 py-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
                  style={{ WebkitBackdropFilter: "blur(20px)" }}
                  placeholder="Your password"
                  minLength={6}
                />
              </div>

              {error && (
                <p className="rounded-2xl bg-red-500/20 border border-red-400/20 px-4 py-3 text-sm text-red-200">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-white/95 py-4 text-sm font-semibold text-[#0F1B3D] transition-all hover:bg-white disabled:opacity-50 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
              >
                {submitting ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
              </button>
            </form>

            <p className="text-center text-sm text-white/35">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => { setMode("signup"); setError(null); }}
                    className="text-white/60 underline hover:text-white transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => { setMode("signin"); setError(null); }}
                    className="text-white/60 underline hover:text-white transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            <p className="text-center text-[11px] leading-4 text-white/30 mt-1">
              By continuing you agree to our{" "}
              <a href="/terms-of-service" target="_blank" className="underline text-white/50 hover:text-white/70 transition-colors">
                Terms of Service
              </a>
              {" "}and{" "}
              <a href="/privacy-policy" target="_blank" className="underline text-white/50 hover:text-white/70 transition-colors">
                Privacy Policy
              </a>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
