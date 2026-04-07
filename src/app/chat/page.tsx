"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
import * as analytics from "@/lib/analytics";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { ChatErrorBoundary } from "@/components/error-boundary";
import { OnboardingModal } from "@/components/onboarding-modal";
import type { ChatSessionItem } from "@/lib/types";
import { trackSubscription } from "@/lib/tracking-events";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      // Don't restore if there's a pending query (e.g. quiz → chat redirect)
      if (localStorage.getItem("elena_pending_query")) return null;
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
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [bookMessage, setBookMessage] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const sessionsFetchedRef = useRef(false);

  // Read pending query from landing page (set before auth redirect)
  // Start the chat immediately so it processes in the background during onboarding
  useEffect(() => {
    const q = localStorage.getItem("elena_pending_query");
    if (q) {
      setPendingQuery(q);
      setIsNewChat(true);
    }
  }, []);

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
      refreshSubscription();
      // Fire conversion events to Mixpanel, TikTok, Reddit
      trackSubscription('pro', 0, 'USD'); // value filled by backend via Stripe webhook
      // Clean URL without reload
      window.history.replaceState({}, "", "/chat");
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setCheckoutSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refreshSubscription]);

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

  // Re-fetch sessions when profile switches (sessions are profile-scoped)
  const prevProfileId = useRef(profileId);
  useEffect(() => {
    if (profileId && prevProfileId.current && profileId !== prevProfileId.current) {
      setActiveSessionId(null);
      setIsNewChat(true);
      fetchSessions();
    }
    // When profile is first created (null → value), don't reset chat or re-fetch
    // immediately — the optimistic session from handleSessionCreated is enough.
    // The delayed fetch in handleSessionCreated (4s) will pick it up.
    prevProfileId.current = profileId;
  }, [profileId, fetchSessions]);

  // Auto-open most recent session, or start a new chat if none exist
  // Wait for profileChecked to avoid racing with onboarding detection
  useEffect(() => {
    if (!loadingSessions && profileChecked && activeSessionId === null && !pendingQuery && !isNewChat && !needsOnboarding) {
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      } else {
        // No conversations -- start a new chat so the page isn't blank
        setIsNewChat(true);
      }
    }
  }, [loadingSessions, sessions, activeSessionId, pendingQuery, isNewChat, needsOnboarding, profileChecked]);

  // After onboarding completes, start a new chat only if there isn't one already
  useEffect(() => {
    if (onboardingJustCompleted && !isNewChat && !activeSessionId) {
      setIsNewChat(true);
    }
  }, [onboardingJustCompleted, isNewChat, activeSessionId]);

  // Show profile tooltip after onboarding, auto-dismiss after 8 seconds
  useEffect(() => {
    if (onboardingJustCompleted) {
      const showTimer = setTimeout(() => setShowProfileTooltip(true), 1500);
      const hideTimer = setTimeout(() => setShowProfileTooltip(false), 9500);
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
    }
  }, [onboardingJustCompleted]);

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
      <OnboardingModal />
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
          bookMessage={bookMessage}
          onBookMessageConsumed={() => setBookMessage(null)}
          isNewChat={isNewChat}
        />
      </ChatErrorBoundary>
    </div>
  );
}
