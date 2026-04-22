"use client";

/**
 * Pre-auth onboarding surface.
 *
 * The tour historically ran inside /chat, which required auth — signup
 * was the gate to even *see* the tour. Under Plan A, the tour runs here
 * anonymously through every phase up to elena-plan; AuthModal only fires
 * on elena-plan's Continue. On signup success, flushTourBuffer() replays
 * every buffered write against the authed backend and the user lands on
 * /chat with the seed message ready to auto-send.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { WebOnboardingTour } from "@/components/web-onboarding-tour";
import { AuthModal } from "@/components/auth-modal";
import { OnboardingFlushingScreen } from "@/components/onboarding-flushing-screen";
import { flushTourBuffer, type FlushStage } from "@/lib/tourBuffer";
import * as analytics from "@/lib/analytics";

export default function OnboardPage() {
  const router = useRouter();
  const { session, loading, refreshProfiles, switchProfile, completeOnboarding } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  // Flipped true when the tour has reached elena-plan Continue. Controls
  // whether the session-becoming-truthy effect should flush + redirect,
  // vs just let the authed user through (e.g. they signed in mid-tour
  // via a second tab, which shouldn't strand the tour state).
  //
  // Mirrored into sessionStorage because OAuth redirects unmount this
  // page — React refs don't survive the redirect round-trip, but
  // sessionStorage does. On remount we rehydrate the ref from storage
  // so the flush effect still fires when the user comes back with a
  // fresh session from Google / Apple.
  const PENDING_SIGNUP_KEY = "elena_onboard_signup_pending";
  const pendingSignupRef = useRef(
    typeof window !== "undefined" && sessionStorage.getItem(PENDING_SIGNUP_KEY) === "1",
  );
  // flushingRef instead of state — prevents the flush effect from
  // re-firing when React batches state updates during signup. (State
  // would trigger re-render + effect re-run; ref just sets in place.)
  const flushingRef = useRef(false);
  // Separate state to force a re-render when flush starts — purely for
  // showing the branded loading screen. The ref above is the functional
  // gate; this is the display signal.
  const [flushingVisible, setFlushingVisible] = useState(false);
  const [flushStage, setFlushStage] = useState<FlushStage>("saving_profile");
  const [flushPercent, setFlushPercent] = useState(8);
  // Mirror the latest auth functions in refs so the flush effect can
  // depend ONLY on `session` without re-running whenever useAuth
  // recreates its callbacks. Without this, completeOnboarding's
  // setNeedsOnboarding(false) inside the flush bounces the effect
  // back while still flushing.
  const refreshProfilesRef = useRef(refreshProfiles);
  const switchProfileRef = useRef(switchProfile);
  const completeOnboardingRef = useRef(completeOnboarding);
  refreshProfilesRef.current = refreshProfiles;
  switchProfileRef.current = switchProfile;
  completeOnboardingRef.current = completeOnboarding;

  // If an already-authenticated user lands here (refresh after signup,
  // bookmark, etc.), bounce them to /chat where their authed tour shell
  // lives. We don't want two different surfaces rendering the tour for
  // a signed-in user.
  useEffect(() => {
    if (loading) return;
    // Only bounce if this is a STANDING session (not a session that just
    // appeared because AuthModal completed). The pendingSignupRef flag
    // distinguishes the two.
    if (session && !pendingSignupRef.current) {
      router.replace("/chat");
    }
  }, [loading, session, router]);

  // Session appeared while the signup gate is pending → run the flush,
  // then navigate to /chat. Depends only on `session` so re-renders
  // from auth-context (setNeedsOnboarding, setProfileData, etc. that
  // fire during and after flush) don't bounce the effect. Auth funcs
  // are called via refs so their identity changes don't re-trigger.
  useEffect(() => {
    console.log("[onboard] flush gate eval", {
      has_session: !!session,
      pending_signup: pendingSignupRef.current,
      flushing: flushingRef.current,
      storage_pending: typeof window !== "undefined" && sessionStorage.getItem(PENDING_SIGNUP_KEY) === "1",
    });
    if (!session || !pendingSignupRef.current || flushingRef.current) return;
    console.log("[onboard] flush starting");
    flushingRef.current = true;
    setFlushingVisible(true);
    (async () => {
      try {
        const result = await flushTourBuffer({
          switchProfile: switchProfileRef.current,
          refreshProfiles: refreshProfilesRef.current,
          completeOnboarding: completeOnboardingRef.current,
          onProgress: (stage, percent) => {
            setFlushStage(stage);
            setFlushPercent(percent);
          },
        });
        analytics.track("Tour Buffer Flushed", {
          profile_saved: result.profile_saved,
          dependents_created: result.dependents_created,
          primary_dependent_created: !!result.primary_dependent_id,
          prewarmed_session: !!result.prewarmed_session_id,
          error_count: result.errors.length,
          // Full error strings on the event so Mixpanel can surface the
          // exact failure reason on a per-user basis, not just a count.
          errors: result.errors,
          duration_total_ms: result.duration_total_ms,
          stage_timings_ms: result.stage_timings_ms,
        });
        if (result.errors.length > 0) {
          console.warn("[onboard] flushTourBuffer partial errors:", result.errors);
        }
        console.log("[onboard] flush done, redirecting to /chat");
      } catch (e) {
        console.error("[onboard] flushTourBuffer threw:", e);
      }
      pendingSignupRef.current = false;
      try { sessionStorage.removeItem(PENDING_SIGNUP_KEY); } catch {}
      router.replace("/chat");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (loading || (session && !pendingSignupRef.current && !flushingRef.current)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F7F6F2]">
        <div className="h-10 w-10 rounded-full border-2 border-[#0F1B3D]/20 border-t-[#0F1B3D] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-dvh bg-[#F7F6F2]">
      {/* Loading screen during flush — stays up from signup success
          through the redirect to /chat. Under Plan A the flush runs
          several authenticated writes in sequence (profile, dependents,
          conditions, meds, todos, chat welcome pre-warm); without this
          the user would stare at a frozen elena-plan card for 1-3s.
          The branded layout + progress bar gives the wait a clear
          narrative — "we're setting things up FOR YOU" — which reads
          better than the visual dead-stop of a spinner. */}
      {flushingVisible && (
        <OnboardingFlushingScreen stage={flushStage} percent={flushPercent} />
      )}
      <WebOnboardingTour
        onComplete={() => {
          // Anonymous tour's onComplete is a no-op — the real completion
          // pathway is onNeedsAuth → signup → flush → /chat. This fires
          // only if the tour's internal finishTour runs, which it won't
          // for anonymous users (advanceFromElenaPlan early-returns).
        }}
        onShowPaywall={() => {
          // Paywall is a post-signup concept. Shouldn't fire on the
          // anonymous surface.
        }}
        onProfilePopover={() => {
          // Profile-popover steps are the joyride phase, which runs
          // post-signup against /chat's DOM. No-op here.
        }}
        onSidebar={() => {
          // Sidebar is a /chat concept. No-op here.
        }}
        onSeedQuery={(msg) => {
          // Anonymous tour may also stash the seed directly; flushTourBuffer
          // handles the authed write. Duplicate localStorage write here
          // is belt-and-suspenders for the case where AuthModal is closed
          // mid-flush — user still lands on /chat with the seed ready.
          try {
            localStorage.setItem("elena_pending_query", msg);
            sessionStorage.setItem("elena_tour_post_seed_gate", "1");
          } catch {}
        }}
        onNeedsAuth={() => {
          analytics.track("Onboard Auth Gate Hit", { source: "elena_plan_continue" });
          pendingSignupRef.current = true;
          try { sessionStorage.setItem(PENDING_SIGNUP_KEY, "1"); } catch {}
          setAuthOpen(true);
        }}
      />

      <AuthModal
        open={authOpen}
        onOpenChange={(v) => {
          setAuthOpen(v);
          // Intentionally NOT clearing pendingSignupRef here even if
          // (!v && !session). AuthModal fires onOpenChange(false) right
          // after a successful signup, but the session state from
          // Supabase hasn't propagated to this callback's closure yet,
          // so !session reads true and we'd clobber the pending-signup
          // flag. The flush effect wouldn't fire and the user would be
          // stranded on elena-plan. Instead: pendingSignupRef is
          // cleared only at the end of a completed flush (in the
          // session-becomes-truthy effect above). If the user truly
          // dismisses without signing up, they stay on elena-plan and
          // re-clicking Continue re-opens the modal via onNeedsAuth.
        }}
        defaultMode="signup"
        // Keep the OAuth flow on /onboard so it can detect the returning
        // session and run flushTourBuffer. /chat would skip the flush.
        oauthRedirectTo={typeof window !== "undefined" ? `${window.location.origin}/onboard` : undefined}
        // Tour shell sits at z-[99999]; without this flag the modal
        // renders behind it and only the backdrop is visible.
        elevateAboveHighZIndex
      />
    </div>
  );
}
