"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
import { claimPendingMessages } from "@/lib/pendingMessage";
import { clearAnonId } from "@/lib/anonId";
import * as analytics from "@/lib/analytics";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { ChatErrorBoundary } from "@/components/error-boundary";
import { WebOnboardingTour } from "@/components/web-onboarding-tour";
import { UpgradeModal } from "@/components/upgrade-modal";
import { TrialFlow } from "@/components/paywall/trial-flow";
import { useAppCta } from "@/lib/app-cta-context";
import type { ChatSessionItem } from "@/lib/types";
import { trackSubscription, trackStartTrial, trackActivation } from "@/lib/tracking-events";

// Plan price lookup for Subscribe fires. Mirrors the annual/weekly/monthly
// prices shown in upgrade-modal.tsx. StartTrial events don't use this (value=0).
const PLAN_PRICE_USD: Record<string, number> = {
  standard_weekly: 6.99,
  standard_monthly: 19.99,
  standard_annual: 179.99,
  premium_monthly: 39.99,
  premium_annual: 299.99,
};

function getPlanPriceUSD(plan: string): number {
  return PLAN_PRICE_USD[plan] ?? 0;
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-dvh">
        <div className="w-64 bg-[#f5f7fb] flex-shrink-0 animate-pulse max-md:hidden">
          <div className="px-5 pt-5 pb-4"><div className="h-12 w-12 rounded-xl bg-[#0F1B3D]/[0.06]" /></div>
          <div className="px-4 space-y-2"><div className="h-10 rounded-full bg-[#0F1B3D]/[0.04]" /><div className="h-10 rounded-full bg-[#0F1B3D]/[0.04]" /></div>
        </div>
        <div className="flex-1 flex flex-col animate-pulse">
          <div className="h-14 border-b border-[#0F1B3D]/[0.04]" />
          <div className="flex-1 flex flex-col gap-3 px-5 py-6 max-w-2xl mx-auto w-full">
            <div className="h-10 w-3/4 rounded-2xl bg-[#0F1B3D]/[0.04]" />
            <div className="h-10 w-1/2 rounded-2xl bg-[#0F1B3D]/[0.04]" />
            <div className="h-10 w-2/3 rounded-2xl bg-[#0F1B3D]/[0.04]" />
          </div>
        </div>
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  // Set browser chrome to white for chat page
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#FFFFFF");
    return () => { if (meta) meta.setAttribute("content", "#0F1B3D"); };
  }, []);


  const { session, loading, profileId, refreshSubscription, onboardingJustCompleted, needsOnboarding, profileChecked } = useAuth();
  const { showAppCta } = useAppCta();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [postIntakeSubmitKind] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const flag = localStorage.getItem("elena_post_intake_submit");
    if (flag) localStorage.removeItem("elena_post_intake_submit");
    return flag;
  });
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      // Don't restore if there's a pending query (e.g. quiz → chat redirect)
      if (localStorage.getItem("elena_pending_query")) return null;
      // Don't restore if the user just finished a post-auth intake funnel —
      // we want a fresh intake-aware welcome session rather than an existing chat.
      if (postIntakeSubmitKind) return null;
      return sessionStorage.getItem("elena_active_session_id");
    }
    return null;
  });
  const [sessions, setSessions] = useState<ChatSessionItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("elena_sessions");
        if (cached) return JSON.parse(cached) as ChatSessionItem[];
      } catch {}
    }
    return [];
  });
  // If we have cached sessions, don't block on network fetch
  const [loadingSessions, setLoadingSessions] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("elena_sessions");
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [pendingDocName, setPendingDocName] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const doc = localStorage.getItem("elena_pending_doc");
      if (doc) {
        localStorage.removeItem("elena_pending_doc");
        return doc;
      }
    }
    return null;
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [inviteAccepted, setInviteAccepted] = useState(false);
  const [bookMessage, setBookMessage] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(() => {
    if (typeof window !== "undefined") {
      return !!postIntakeSubmitKind;
    }
    return false;
  });
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [demoMode] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("elena_demo_mode") === "true"
  );
  const sessionsFetchedRef = useRef(false);

  // Check if an invite was just accepted
  useEffect(() => {
    const accepted = localStorage.getItem("elena_invite_accepted");
    if (accepted) {
      localStorage.removeItem("elena_invite_accepted");
      setInviteAccepted(true);
      setTimeout(() => setInviteAccepted(false), 6000);
    }
  }, []);

  // Post-auth intake funnel bootstrapping is handled inline in the useState
  // initializers above (activeSessionId + isNewChat both read the flag on mount).
  // No follow-up effect needed — avoids a render round-trip that would double-fire
  // the welcome under StrictMode.

  // Claim any pre-auth pending messages this visitor sent before signing up.
  // Backend creates a chat_sessions row and marks pending_messages rows as claimed,
  // then we funnel the message text into the existing auto-send path so the
  // normal /chat/send flow inserts the user message + generates the assistant reply.
  // Falls back to the localStorage-only path if claim fails or returns nothing.
  //
  // claimSettled gates the "no sessions → start new chat" auto-decision below,
  // so we don't race-create an orphan welcome session before the claim resolves.
  const pendingClaimAttempted = useRef(false);
  const [claimSettled, setClaimSettled] = useState(false);
  useEffect(() => {
    if (loading || !session || pendingClaimAttempted.current) return;
    pendingClaimAttempted.current = true;

    // Note: no `cancelled` flag / cleanup — pendingClaimAttempted already
    // prevents re-runs, and React 18+ tolerates setState on unmounted
    // components. Adding a cancelled flag breaks dev mode because StrictMode
    // double-invokes effects: the first run starts the async claim, cleanup
    // sets cancelled=true, the second run short-circuits on
    // pendingClaimAttempted, and the in-flight claim then drops its response.
    (async () => {
      const localQ = localStorage.getItem("elena_pending_query");
      try {
        const claim = await claimPendingMessages();
        if (claim && claim.claimed_count > 0 && claim.session_id && claim.messages.length > 0) {
          const firstMessage = claim.messages[0].content;
          const hasServerWelcome = !!claim.welcome_message && claim.welcome_message.length > 0;

          setActiveSessionId(claim.session_id);
          setIsNewChat(false);
          // When the backend already generated + persisted an onboarding welcome
          // (quiz funnel path), the welcome message lives in chat_messages and
          // sufficiently addresses the user's intent — skip the synthetic resend
          // so we don't append a redundant user turn right after the welcome.
          // Otherwise (legacy landing-hero path), keep the auto-send behavior.
          if (!hasServerWelcome) {
            setPendingQuery(firstMessage);
          }
          setSessions((prev) => {
            if (prev.some((s) => s.id === claim.session_id)) return prev;
            return [{
              id: claim.session_id!,
              title: null,
              preview: hasServerWelcome ? (claim.welcome_message ?? firstMessage) : firstMessage,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, ...prev];
          });
          localStorage.removeItem("elena_pending_query");
          clearAnonId();
          if (session?.user?.id) {
            trackActivation(session.user.id);
          }
          return;
        }
      } catch {
        // Swallow and fall through to localStorage fallback
      } finally {
        setClaimSettled(true);
      }
      if (localQ) {
        setPendingQuery(localQ);
        setIsNewChat(true);
      }
    })();
  }, [loading, session]);

  // Track app load
  const hasTrackedAppLoad = useRef(false);
  useEffect(() => {
    if (!loading && session && !hasTrackedAppLoad.current && !loadingSessions) {
      hasTrackedAppLoad.current = true;
      analytics.track("App Loaded", {
        is_returning_user: !pendingQuery,
        session_count: sessions.length,
      });
    }
  }, [loading, session, loadingSessions, pendingQuery, sessions.length]);

  // Handle Stripe checkout redirect
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      analytics.track("Checkout Completed");
      setCheckoutSuccess(true);
      // Verify subscription is real before firing ad pixel events.
      // Route by sub.status:
      //   "trialing" → StartTrial (value=0). The user clicked "Start free
      //                trial" and Stripe created a trialing subscription; no
      //                money moved yet. Firing Subscribe here would tell Meta
      //                a $179.99 conversion happened when it didn't.
      //   "active"   → Subscribe with the real plan price. Either a direct-
      //                paid plan (no trial) or the trial→paid transition
      //                landed while the page was still open (rare).
      // Both fires pass the server-issued meta event_id so Meta dedups with
      // the matching backend CAPI fire from the Stripe webhook.
      // Poll /web/subscription until the Stripe webhook has flipped tier off
      // "free" — webhook latency is usually 1-3s but can spike to 10s+. Without
      // polling, both the FB pixel fires get skipped AND the profile UI stays
      // on "Upgrade to Pro" until the user navigates again.
      (async () => {
        let sub: { tier?: string; status?: string; plan?: string; meta_start_trial_event_id?: string; meta_subscribe_event_id?: string } | null = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            const res = await apiFetch("/web/subscription");
            if (res.ok) {
              sub = await res.json();
              if (sub && sub.tier && sub.tier !== "free") break;
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 1000));
        }
        // Push the latest into auth-context state + Mixpanel plan_type, even
        // if we timed out — refreshSubscription is idempotent.
        await refreshSubscription();
        if (!sub || !sub.tier || sub.tier === "free") return;
        const planKey: string = sub.plan || sub.tier;
        if (sub.status === "trialing") {
          trackStartTrial(planKey, "USD", sub.meta_start_trial_event_id);
        } else if (sub.status === "active") {
          trackSubscription(planKey, getPlanPriceUSD(planKey), "USD", sub.meta_subscribe_event_id);
        }
      })();
      // Clean URL without reload
      window.history.replaceState({}, "", "/chat");
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setCheckoutSuccess(false), 4000);
      // Peak-commitment moment → nudge app download. The one-shot
      // elena_app_cta_done flag means if this fires, the data-added
      // and feedback triggers won't re-fire the modal.
      const ctaTimer = setTimeout(() => showAppCta("upgrade"), 1500);
      return () => { clearTimeout(timer); clearTimeout(ctaTimer); };
    }
  }, [searchParams, refreshSubscription, showAppCta]);

  useEffect(() => {
    if (!loading && !session) {
      try {
        sessionStorage.removeItem("elena_sessions");
        sessionStorage.removeItem("elena_active_session_id");
      } catch {}
      router.replace("/");
    }
  }, [loading, session, router]);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await apiFetch("/chat/sessions");
      if (!res.ok) {
        setLoadingSessions(false);
        // Sessions failed but page is still usable — allow new chat
        setIsNewChat(true);
        return;
      }
      const data: ChatSessionItem[] = await res.json();
      // Deduplicate by ID (backend may return sessions created by welcome + chat)
      const seen = new Set<string>();
      const deduped = data.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      setSessions(deduped);
      try { sessionStorage.setItem("elena_sessions", JSON.stringify(deduped)); } catch {}
    } catch {
      // Network error — still allow the user to start a new chat
      setIsNewChat(true);
    }
    setLoadingSessions(false);
  }, []);

  // Fetch sessions once when authenticated — not on every token refresh
  useEffect(() => {
    if (!loading && session && !sessionsFetchedRef.current) {
      sessionsFetchedRef.current = true;
      fetchSessions().then(() => {});
    }
  }, [loading, session, fetchSessions]);

  // Re-fetch sessions when profile SWITCHES (not on initial load — that's handled above)
  const prevProfileId = useRef(profileId);
  useEffect(() => {
    if (profileId && profileId !== prevProfileId.current) {
      if (prevProfileId.current) {
        // Explicit switch — reset active session and re-fetch
        setActiveSessionId(null);
        setIsNewChat(true);
        fetchSessions();
      }
      // Initial null → value: skip — the session fetch above already handles it
    }
    prevProfileId.current = profileId;
  }, [profileId, fetchSessions]);

  // Auto-open most recent session, or start a new chat if none exist.
  // Wait for profileChecked to avoid racing with onboarding detection,
  // AND for claimSettled so we don't create an orphan welcome session
  // before the pending-message claim resolves (the claim may itself
  // produce a session_id we want to land on).
  useEffect(() => {
    if (!loadingSessions && profileChecked && claimSettled && activeSessionId === null && !pendingQuery && !isNewChat && !needsOnboarding) {
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      } else {
        // No conversations -- start a new chat so the page isn't blank
        setIsNewChat(true);
      }
    }
  }, [loadingSessions, sessions, activeSessionId, pendingQuery, isNewChat, needsOnboarding, profileChecked, claimSettled]);

  // After onboarding completes, start a new chat only if there isn't one already
  useEffect(() => {
    if (onboardingJustCompleted && !isNewChat && !activeSessionId) {
      setIsNewChat(true);
    }
  }, [onboardingJustCompleted, isNewChat, activeSessionId]);

  const [tourPopoverOpen, setTourPopoverOpen] = useState(false);
  const [tourPopoverShowSwitcher, setTourPopoverShowSwitcher] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  // Tour-end paywall: launches the 4-screen trial flow (Cal-AI-style). Replaces
  // the legacy upgrade-modal route for the post-onboarding entry point.
  const [tourTrialStep, setTourTrialStep] = useState<1 | 2 | 3 | null>(null);
  const [tourPopoverTab, setTourPopoverTab] = useState<"health" | "visits" | "insurance">("health");

  // Tour handles onboarding end-to-end now — profile form (name/DOB/zip) is a
  // phase inside the tour, so the tour mounts *when* needsOnboarding is true,
  // not after. It stays mounted through completion (onboardingJustCompleted
  // becomes true mid-tour but the tour doesn't unmount on that transition).
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    const forceTour = searchParams.get("tour") === "1";
    const shouldShow = forceTour || needsOnboarding || onboardingJustCompleted;
    if (!shouldShow) return;
    // Reset the "tour done" flag so a fresh signup always sees the tour.
    if (onboardingJustCompleted || needsOnboarding) localStorage.removeItem("elena_web_tour_done");
    if (forceTour) localStorage.removeItem("elena_web_tour_done");
    // Small delay so the /chat page's initial paint settles before the tour
    // fades in. StreamingText's own startDelay covers the rest.
    const timer = setTimeout(() => setShowTour(true), 220);
    return () => clearTimeout(timer);
  }, [onboardingJustCompleted, searchParams, needsOnboarding]);

  // Persist active session so refresh/navigation restores it
  useEffect(() => {
    if (activeSessionId) {
      try { sessionStorage.setItem("elena_active_session_id", activeSessionId); } catch {}
    } else {
      try { sessionStorage.removeItem("elena_active_session_id"); } catch {}
    }
  }, [activeSessionId]);

  const handleSessionCreated = useCallback(
    (sessionId: string, firstMessage?: string) => {
      setActiveSessionId(sessionId);
      setIsNewChat(false);
      // Add optimistic session immediately so sidebar isn't empty
      setSessions((prev) => {
        if (prev.some((s) => s.id === sessionId)) return prev;
        return [{
          id: sessionId,
          title: null,
          preview: firstMessage || "New conversation",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, ...prev];
      });
    },
    [],
  );

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setIsNewChat(true);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsNewChat(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-dvh">
        <div className="w-64 bg-[#f5f7fb] flex-shrink-0 animate-pulse max-md:hidden">
          <div className="px-5 pt-5 pb-4"><div className="h-12 w-12 rounded-xl bg-[#0F1B3D]/[0.06]" /></div>
          <div className="px-4 space-y-2"><div className="h-10 rounded-full bg-[#0F1B3D]/[0.04]" /><div className="h-10 rounded-full bg-[#0F1B3D]/[0.04]" /></div>
        </div>
        <div className="flex-1 flex flex-col animate-pulse">
          <div className="h-14 border-b border-[#0F1B3D]/[0.04]" />
          <div className="flex-1 flex flex-col gap-3 px-5 py-6 max-w-2xl mx-auto w-full">
            <div className="h-10 w-3/4 rounded-2xl bg-[#0F1B3D]/[0.04]" />
            <div className="h-10 w-1/2 rounded-2xl bg-[#0F1B3D]/[0.04]" />
            <div className="h-10 w-2/3 rounded-2xl bg-[#0F1B3D]/[0.04]" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-dvh overflow-hidden relative">
      <UpgradeModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} reason="soft" />
      <TrialFlow step={tourTrialStep} onStepChange={setTourTrialStep} reason="post_onboarding" />
      {showTour && (
        <WebOnboardingTour
          onComplete={() => { setShowTour(false); setTourPopoverOpen(false); }}
          onShowPaywall={() => setTourTrialStep(1)}
          onProfilePopover={(open, tab, showSwitcher) => { setTourPopoverOpen(open); if (tab) setTourPopoverTab(tab); setTourPopoverShowSwitcher(!!showSwitcher); }}
          onSidebar={(open) => setSidebarOpen(open)}
          onSeedQuery={(msg) => {
            // Tour finished with user-picked actions. Seed the chat
            // directly — localStorage wouldn't work here because the
            // chat page's one-time pending-query pickup has already
            // run, so force-tour users would never see it.
            //
            // We deliberately do NOT call setIsNewChat(true) here.
            // By the time the tour finishes, chat-area has already
            // established a session (fetchWelcome ran when the active
            // profile settled). Flipping isNewChat would re-trigger
            // chat-area's session effect, reset sessionIdRef to null,
            // and strand the auto-send effect waiting for a session
            // that never gets re-created in time. The initialQuery
            // prop change (via pendingQuery) is already in the
            // auto-send effect's deps, so the seed flows through
            // without tearing down the live session.
            setPendingQuery(msg);
            try { localStorage.removeItem("elena_pending_query"); } catch {}
          }}
        />
      )}
      {/* Checkout success banner */}
      {checkoutSuccess && (
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white animate-in slide-in-from-top duration-300">
          Welcome to Pro! Your account has been upgraded.
          <button
            onClick={() => setCheckoutSuccess(false)}
            className="ml-3 text-white/70 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Invite accepted banner */}
      {inviteAccepted && (
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center bg-[#0F1B3D] px-4 py-3 text-sm text-white">
          <span>Account linked! Click your name in the sidebar to switch profiles.</span>
          <button
            onClick={() => setInviteAccepted(false)}
            className="ml-3 text-white/50 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Backdrop overlay on mobile */}
      <div
        className={`fixed inset-0 z-30 bg-black/20 md:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Sidebar — always mounted, slides in/out */}
      <div className={`max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 transition-all duration-300 ease-in-out ${sidebarOpen ? "md:w-64 max-md:translate-x-0" : "md:w-0 md:overflow-hidden max-md:-translate-x-full"}`}>
        <div className="w-64 h-full">
          <Sidebar
            activeSessionId={activeSessionId}
            onSelectSession={(id) => {
              handleSelectSession(id);
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            onNewChat={() => {
              handleNewChat();
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            onBookMessage={(msg) => setBookMessage(msg)}
            sessions={sessions}
            loadingSessions={loadingSessions}
            showProfileTooltip={showProfileTooltip}
            onDismissProfileTooltip={() => setShowProfileTooltip(false)}
            profilePopoverOpen={tourPopoverOpen || undefined}
            onProfilePopoverChange={(open) => { if (!showTour) setTourPopoverOpen(open); }}
            profilePopoverTab={tourPopoverTab}
            profileShowSwitcher={tourPopoverShowSwitcher}
          />
        </div>
      </div>
      <ChatErrorBoundary>
        <ChatArea
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          activeSessionId={activeSessionId}
          onSessionCreated={handleSessionCreated}
          initialQuery={pendingQuery}
          initialDocName={pendingDocName}
          bookMessage={bookMessage}
          onBookMessageConsumed={() => setBookMessage(null)}
          isNewChat={isNewChat}
          postIntakeSubmitKind={postIntakeSubmitKind}
          demoMode={demoMode}
          autoShowHipaa={searchParams.get("hipaa") === "1"}
        />
      </ChatErrorBoundary>
    </div>
  );
}
