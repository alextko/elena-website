"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { ChatErrorBoundary } from "@/components/error-boundary";
import type { ChatSessionItem } from "@/lib/types";

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
  const { session, loading, refreshSubscription } = useAuth();
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
  useEffect(() => {
    const q = localStorage.getItem("elena_pending_query");
    if (q) {
      setPendingQuery(q);
      setIsNewChat(true);
    }
  }, []);

  // Handle Stripe checkout redirect
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setCheckoutSuccess(true);
      refreshSubscription();
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

  // Auto-open most recent session, or start a new chat if none exist
  useEffect(() => {
    if (loadingSessions || activeSessionId !== null || pendingQuery || isNewChat) return;

    if (sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    } else {
      // No sessions exist (new user, or all deleted) — start a new chat
      // so the user sees the welcome screen instead of a blank page.
      setIsNewChat(true);
    }
  }, [loadingSessions, sessions, activeSessionId, pendingQuery, isNewChat]);

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setIsNewChat(false);
      fetchSessions();
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
