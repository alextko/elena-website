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
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F1B3D] border-t-transparent" />
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const { session, loading, profileId, refreshSubscription, onboardingJustCompleted, needsOnboarding, profileChecked } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [bookMessage, setBookMessage] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(false);
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
      setSessions(data);
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
      // Then fetch real data (may take a moment for DB to persist)
      setTimeout(() => fetchSessions(), 2000);
      // Fetch again after title generation completes (Haiku call takes a few seconds)
      setTimeout(() => fetchSessions(), 6000);
    },
    [fetchSessions],
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
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F1B3D] border-t-transparent" />
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
      {sidebarOpen && (
        <Sidebar
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onBookMessage={(msg) => setBookMessage(msg)}
          sessions={sessions}
          loadingSessions={loadingSessions}
        />
      )}
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
