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

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { WebOnboardingTour } from "@/components/web-onboarding-tour";
import type { PainAffirmation } from "@/components/onboarding-flushing-screen";
import { flushTourBuffer, type FlushStage } from "@/lib/tourBuffer";
import * as analytics from "@/lib/analytics";

// Pain-bucket labels mirrored from web-onboarding-tour. Duplicated (not
// imported) so this page stays cheap — the tour file is ~4k lines. Only
// the label is needed to phrase the post-flush affirmation.
const TIME_PAIN_LABEL: Record<string, string> = {
  lt1: "less than 1 hour a week",
  "1to3": "1 to 3 hours a week",
  "3to6": "3 to 6 hours a week",
  "6plus": "6 or more hours a week",
};
const MONEY_PAIN_LABEL: Record<string, string> = {
  lt500: "less than $500 a year",
  "500to2k": "$500 to $2,000 a year",
  "2kto5k": "$2,000 to $5,000 a year",
  "5kplus": "$5,000 or more a year",
};

const DEFAULT_AFFIRMATION: PainAffirmation = {
  headline: "You're all set.",
  subtitle: "Elena is ready to help you stay on top of everything.",
};

function deriveAffirmation(): PainAffirmation {
  if (typeof window === "undefined") return DEFAULT_AFFIRMATION;
  try {
    const raw =
      localStorage.getItem("elena_tour_state") ||
      sessionStorage.getItem("elena_tour_state");
    if (!raw) return DEFAULT_AFFIRMATION;
    const s = JSON.parse(raw) as {
      routerChoice?: string;
      painSelection?: string | null;
    };
    const isMoney = s.routerChoice === "money" || s.routerChoice === "medications";
    const id = s.painSelection;
    if (!id) return DEFAULT_AFFIRMATION;
    if (isMoney) {
      const label = MONEY_PAIN_LABEL[id];
      if (!label) return DEFAULT_AFFIRMATION;
      return {
        headline: "Ready to start bringing those costs down?",
        subtitle: `You said about ${label}. Elena's going to help you chip away at that.`,
      };
    }
    const label = TIME_PAIN_LABEL[id];
    if (!label) return DEFAULT_AFFIRMATION;
    return {
      headline: "Ready to start getting that time back?",
      subtitle: `You said about ${label}. Elena's going to help you take those hours back.`,
    };
  } catch {
    return DEFAULT_AFFIRMATION;
  }
}

export default function OnboardPage() {
  const router = useRouter();
  const { session, loading, refreshProfiles, switchProfile, completeOnboarding } = useAuth();
  const [isNavigatingToChat, startNavigatingToChat] = useTransition();

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
  const [continuePending, setContinuePending] = useState(false);
  const [flushStage, setFlushStage] = useState<FlushStage>("saving_profile");
  const [flushPercent, setFlushPercent] = useState(8);
  // Pain affirmation is snapshotted the moment the flush starts so it
  // survives any downstream clears of elena_tour_state (finishTour,
  // skipTour). Defaulted to generic copy; replaced with pain-targeted
  // copy in the flush effect below.
  const [affirmation, setAffirmation] = useState<PainAffirmation>(DEFAULT_AFFIRMATION);
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

  // Arm the post-seed paywall gate on every /onboard mount so direct
  // deep-links (paid ads that skip the landing hero) still trigger the
  // paywall at message #2 on /chat. Without this, cold /onboard entries
  // signed up via OAuth mid-tour land on /chat with the gate unset and
  // the paywall never fires — Meta's optimizer sees no StartTrial event.
  useEffect(() => {
    try { sessionStorage.setItem("elena_tour_post_seed_gate", "1"); } catch {}
  }, []);

  useEffect(() => {
    router.prefetch("/chat");
  }, [router]);

  // If an already-authenticated user lands here (refresh after signup,
  // bookmark, etc.), bounce them to /chat where their authed tour shell
  // lives. We don't want two different surfaces rendering the tour for
  // a signed-in user.
  useEffect(() => {
    if (loading) return;
    // Only bounce if this is a STANDING session (not a session that just
    // appeared because AuthModal completed). The pendingSignupRef flag
    // distinguishes the two.
    if (session && !pendingSignupRef.current && !continuePending) {
      router.replace("/chat");
    }
  }, [continuePending, loading, session, router]);

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
    setContinuePending(false);
    // Capture the pain-targeted affirmation now, while elena_tour_state is
    // still populated. The flushing screen shows it on the "ready" beat
    // after the progress bar hits 100%.
    setAffirmation(deriveAffirmation());
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
        console.log("[onboard] flush done, waiting on Continue");
      } catch (e) {
        console.error("[onboard] flushTourBuffer threw:", e);
      }
      // Intentionally NOT redirecting here anymore. The flushing screen
      // transitions to its "ready" state once stage=done + percent=100;
      // the user presses Continue, which fires handleFlushContinue below.
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
      {/* Flushing state flows INTO the tour modal as a phase, not as a
          separate overlay — same card, same backdrop, content morphs
          from auth → progress bar → pain-targeted affirmation →
          Continue. Driven by the flushingState prop below; the tour
          swaps its own AnimatePresence content when it's non-null. */}
      <WebOnboardingTour
        flushingState={
          flushingVisible
            ? {
                stage: flushStage,
                percent: flushPercent,
                affirmation,
                isNavigating: continuePending || isNavigatingToChat,
                onContinue: () => {
                  if (continuePending) return;
                  analytics.track("Onboard Flush Continue Clicked" as any);
                  setContinuePending(true);
                  pendingSignupRef.current = false;
                  try { sessionStorage.removeItem(PENDING_SIGNUP_KEY); } catch {}
                  startNavigatingToChat(() => {
                    router.replace("/chat");
                  });
                },
              }
            : null
        }
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
            // elena_tour_post_seed_gate is already armed at mount time
            // (see the mount effect near the top of this component).
          } catch {}
        }}
        onNeedsAuth={() => {
          analytics.track("Onboard Auth Gate Hit", { source: "elena_plan_continue" });
          pendingSignupRef.current = true;
          try { sessionStorage.setItem(PENDING_SIGNUP_KEY, "1"); } catch {}
          // Auth UI now renders inline as a tour phase ("auth"). The
          // tour component handles the transition via setPhase("auth")
          // right after firing this callback. AuthModal is kept mounted
          // below as a recovery affordance but not opened here — the
          // inline flow is the primary path.
        }}
      />

      {/* Previously an <AuthModal> lived here for the signup gate. That
          path moved inside the tour as phase="auth" — same shell, same
          animations — so the signup step doesn't read as a foreign
          modal. /onboard still owns the flush-on-session effect above
          because that part's surface-agnostic: as long as Supabase
          flips session truthy, the flush runs regardless of which UI
          collected the credentials. */}
    </div>
  );
}
