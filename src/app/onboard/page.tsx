"use client";

/**
 * Pre-auth onboarding surface.
 *
 * The tour historically ran inside /chat, which required auth — signup
 * was the gate to even *see* the tour. Under Plan A, the tour runs here
 * anonymously through every phase up to the building-plan step, which
 * shows a fake progress bar + pain-targeted affirmation BEFORE auth
 * (Cal-AI-style psychological staging). The auth step then fires; on
 * signup success, flushTourBuffer() replays every buffered write
 * against the authed backend while /onboard shows a minimal branded
 * "Preparing your tour…" splash. When flush completes we auto-redirect
 * to /chat.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { WebOnboardingTour } from "@/components/web-onboarding-tour";
import { flushTourBuffer } from "@/lib/tourBuffer";
import * as analytics from "@/lib/analytics";

export default function OnboardPage() {
  const router = useRouter();
  const { session, loading, refreshProfiles, switchProfile, completeOnboarding } = useAuth();

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
  // Display signal for the "Preparing your tour…" splash. The user has
  // already seen the celebratory pre-auth "All ready" beat, so this
  // post-auth moment is minimal and branded — not a full progress
  // modal — and auto-redirects when the flush completes.
  const [flushingVisible, setFlushingVisible] = useState(false);
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
      // OAuth fallback for the main user's name. Email signup populates
      // the buffer in the auth-step form handler; OAuth (Google/Apple)
      // skips that handler entirely but leaves name data on the
      // Supabase user_metadata. Merge it into the buffer here so
      // flushTourBuffer's completeOnboarding writes a real name to the
      // primary profile instead of saving it blank. Only patches the
      // fields we actually have — won't clobber email-signup values
      // with empty OAuth strings if the metadata is missing.
      try {
        const meta = (session.user?.user_metadata || {}) as Record<string, unknown>;
        const fullName =
          typeof meta.full_name === "string" ? meta.full_name :
          typeof meta.name === "string" ? meta.name : "";
        let firstName = typeof meta.given_name === "string" ? meta.given_name : "";
        let lastName = typeof meta.family_name === "string" ? meta.family_name : "";
        if (!firstName && !lastName && fullName) {
          const parts = fullName.trim().split(/\s+/);
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ") || "";
        }
        const patch: { first_name?: string; last_name?: string } = {};
        if (firstName) patch.first_name = firstName;
        if (lastName) patch.last_name = lastName;
        if (patch.first_name || patch.last_name) {
          const { setBufferedProfile } = await import("@/lib/tourBuffer");
          setBufferedProfile(patch);
          console.log("[onboard] populated main-user name from OAuth metadata", patch);
        }
      } catch (e) {
        console.warn("[onboard] OAuth name merge failed:", e);
      }
      try {
        const result = await flushTourBuffer({
          switchProfile: switchProfileRef.current,
          refreshProfiles: refreshProfilesRef.current,
          completeOnboarding: completeOnboardingRef.current,
        });
        analytics.track("Tour Buffer Flushed", {
          profile_saved: result.profile_saved,
          dependents_created: result.dependents_created,
          primary_dependent_created: !!result.primary_dependent_id,
          prewarmed_session: !!result.prewarmed_session_id,
          error_count: result.errors.length,
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
      // User already saw the pre-auth "All ready" beat inside the tour's
      // building-plan phase, so we don't need a post-flush Continue
      // button. Redirect straight to /chat the moment flush finishes.
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
          // Auth UI renders inline as a tour phase ("auth"). The tour
          // component handles the transition via setPhase after the
          // building-plan ready-state Continue button.
        }}
      />

      {/* Post-auth splash — renders on top of the tour while the real
          flush runs. Minimal and branded: the user has already seen
          the celebratory "All ready" beat pre-auth on building-plan,
          so this is just a polished transition, not a repeat of the
          full progress modal. Auto-redirects to /chat on flush complete. */}
      {flushingVisible && <PreparingTourSplash />}
    </div>
  );
}

// Branded post-auth transition. Elena wordmark with a subtle pulsing
// scale animation; "Preparing your tour…" copy with an animated 3-dot
// ellipsis. Sits above the tour at high z-index with a solid warm
// background so the auth card underneath doesn't show through.
function PreparingTourSplash() {
  return (
    <motion.div
      className="fixed inset-0 z-[100005] flex flex-col items-center justify-center gap-5 bg-[#F7F6F2] font-[family-name:var(--font-inter)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Slow radial bloom in the background to give the splash some
          motion without reading as a spinner. Expands + fades on a
          4s loop. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0.0 }}
        animate={{ opacity: [0, 0.35, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(46,107,181,0.18), rgba(46,107,181,0) 55%)",
        }}
      />

      {/* Elena wordmark, pulsing */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: [1, 1.03, 1], opacity: 1 }}
        transition={{
          scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 0.4 },
        }}
        className="text-[44px] font-extrabold tracking-tight text-[#0F1B3D]"
      >
        Elena
      </motion.div>

      <div className="flex items-baseline gap-1 text-[15px] text-[#0F1B3D]/70 font-medium">
        <span>Preparing your tour</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0.2 }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            >
              .
            </motion.span>
          ))}
        </span>
      </div>
    </motion.div>
  );
}
