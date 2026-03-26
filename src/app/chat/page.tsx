"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import type { ChatSessionItem } from "@/lib/types";

export default function ChatPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const sessionsFetchedRef = useRef(false);

  // Read pending query from landing page (set before auth redirect)
  useEffect(() => {
    const q = localStorage.getItem("elena_pending_query");
    if (q) setPendingQuery(q);
  }, []);

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
        return;
      }
      const data: ChatSessionItem[] = await res.json();
      setSessions(data);
    } catch {
      // network error
    }
    setLoadingSessions(false);
  }, []);

  // Fetch sessions once when authenticated — not on every token refresh
  useEffect(() => {
    if (!loading && session && !sessionsFetchedRef.current) {
      sessionsFetchedRef.current = true;
      fetchSessions();
    }
  }, [loading, session, fetchSessions]);

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      fetchSessions();
    },
    [fetchSessions],
  );

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
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
    <div className="flex h-dvh overflow-hidden">
      {sidebarOpen && (
        <Sidebar
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          sessions={sessions}
          loadingSessions={loadingSessions}
        />
      )}
      <ChatArea
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        activeSessionId={activeSessionId}
        onSessionCreated={handleSessionCreated}
        initialQuery={pendingQuery}
      />
    </div>
  );
}
