"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  oauthRedirectTo,
  defaultMode = "signin",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oauthRedirectTo?: string;
  defaultMode?: "signin" | "signup";
}) {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);

  // Sync mode when defaultMode changes (e.g. login button vs chat input)
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Reset the confirm field when switching between sign-in/sign-up
  useEffect(() => {
    setConfirmPassword("");
  }, [mode]);

  // Keep browser chrome navy when auth modal is open on mobile
  useEffect(() => {
    if (!open || typeof window === "undefined" || window.innerWidth >= 768) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#0F1B3D");
  }, [open]);

  useEffect(() => {
    if (open) analytics.track("Auth Modal Opened");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

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

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await resetPassword(email);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setResetSent(true);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    analytics.track("Auth Method Selected", { method: "google" });
    const result = await signInWithGoogle(oauthRedirectTo);
    if (result.error) {
      analytics.track("Auth Error", { method: "google", error_type: result.error });
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Bump overlay z-index on mobile to cover the nav; soften the backdrop
          (less blur, less tint) so the chat preview behind reads through.
          Scoped to `open` so other dialogs keep their default backdrop. */}
      {open && (
        <style>{`
          [data-slot="dialog-overlay"] {
            background-color: rgba(0, 0, 0, 0.12) !important;
            backdrop-filter: blur(3px) !important;
            -webkit-backdrop-filter: blur(3px) !important;
          }
          @media (max-width: 767px) { [data-slot="dialog-overlay"] { z-index: 199 !important; } }
        `}</style>
      )}
      <DialogContent className="max-sm:w-[75vw] w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto p-0 border-0 rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.25)] font-[family-name:var(--font-inter)] [&_[data-slot=dialog-close]]:text-white/70 [&_[data-slot=dialog-close]:hover]:text-white [&_[data-slot=dialog-close]:hover]:bg-white/10 max-md:!fixed max-md:!inset-0 max-md:!top-0 max-md:!left-0 max-md:!translate-x-0 max-md:!translate-y-0 max-md:!w-full max-md:!max-w-none max-md:!max-h-none max-md:!h-full max-md:!rounded-none max-md:!shadow-none max-md:!border-0 max-md:!z-[200]">
        {/* Gradient background matching hero */}
        <div
          className="relative px-10 py-10 max-sm:px-6 max-sm:py-5 max-md:min-h-full max-md:flex max-md:flex-col max-md:justify-center"
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

          <div className="relative z-10 space-y-6 max-sm:space-y-4">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl max-sm:text-xl font-extrabold tracking-tight text-white">
                {mode === "signin" ? "Sign in to chat" : "Create an account"}
              </DialogTitle>
              <DialogDescription className="text-center text-white/60 text-sm max-sm:text-xs font-light">
                {mode === "signin"
                  ? "Sign in to start chatting with Elena"
                  : "Sign up to get started with Elena"}
              </DialogDescription>
            </DialogHeader>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white/95 py-4 max-sm:py-3 text-sm max-sm:text-xs font-semibold text-[#0F1B3D] transition-colors hover:bg-white shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
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
                  className="w-full rounded-2xl bg-white/10 border border-white/[0.15] px-5 py-4 max-sm:px-4 max-sm:py-3 text-sm max-sm:text-xs text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl bg-white/10 border border-white/[0.15] pl-5 pr-12 py-4 max-sm:pl-4 max-sm:pr-11 max-sm:py-3 text-sm max-sm:text-xs text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
                    placeholder="Your password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 max-sm:right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl bg-white/10 border border-white/[0.15] pl-5 pr-12 py-4 max-sm:pl-4 max-sm:pr-11 max-sm:py-3 text-sm max-sm:text-xs text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/15"
                      placeholder="Re-enter your password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 max-sm:right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "signin" && !resetSent && (
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {resetSent && (
                <p className="rounded-2xl bg-green-500/20 border border-green-400/20 px-4 py-3 text-sm text-green-200">
                  Check your email for a password reset link.
                </p>
              )}

              {error && (
                <p className="rounded-2xl bg-red-500/20 border border-red-400/20 px-4 py-3 text-sm text-red-200">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-white/95 py-4 max-sm:py-3 text-sm max-sm:text-xs font-semibold text-[#0F1B3D] transition-colors hover:bg-white disabled:opacity-50 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
              >
                {submitting ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
              </button>
            </form>

            <p className="text-center text-sm text-white/35">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => { setMode("signup"); setError(null); setResetSent(false); }}
                    className="text-white/60 underline hover:text-white transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => { setMode("signin"); setError(null); setResetSent(false); }}
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
