"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { ChatErrorBoundary } from "@/components/error-boundary";
import type { ChatSessionItem } from "@/lib/types";

export default function DemoChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-dvh">
        <div className="flex-1 flex flex-col animate-pulse">
          <div className="h-14 border-b border-[#0F1B3D]/[0.04]" />
          <div className="flex-1 flex flex-col gap-3 px-5 py-6 max-w-2xl mx-auto w-full">
            <div className="h-10 w-3/4 rounded-2xl bg-[#0F1B3D]/[0.04]" />
            <div className="h-10 w-1/2 rounded-2xl bg-[#0F1B3D]/[0.04]" />
          </div>
        </div>
      </div>
    }>
      <DemoChatInner />
    </Suspense>
  );
}

function DemoChatInner() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#FFFFFF");
    return () => { if (meta) meta.setAttribute("content", "#0F1B3D"); };
  }, []);

  const { session, loading, profileId } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isNewChat, setIsNewChat] = useState(true);
  const sessionsFetchedRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await apiFetch("/chat/sessions");
      if (res.ok) {
        const data: ChatSessionItem[] = await res.json();
        const seen = new Set<string>();
        setSessions(data.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        }));
      }
    } catch {}
    setLoadingSessions(false);
  }, []);

  useEffect(() => {
    if (!loading && session && !sessionsFetchedRef.current) {
      sessionsFetchedRef.current = true;
      fetchSessions();
    }
  }, [loading, session, fetchSessions]);

  useEffect(() => {
    if (!loading && !session) router.replace("/");
  }, [loading, session, router]);

  const handleSessionCreated = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsNewChat(false);
    setSessions((prev) => {
      if (prev.some((s) => s.id === sessionId)) return prev;
      return [{ id: sessionId, title: null, preview: "Demo session", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev];
    });
  }, []);

  if (loading || !session) return null;

  return (
    <div className="flex h-dvh overflow-hidden relative">
      <div
        className={`fixed inset-0 z-30 bg-black/20 md:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className={`max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 transition-all duration-300 ease-in-out ${sidebarOpen ? "md:w-64 max-md:translate-x-0" : "md:w-0 md:overflow-hidden max-md:-translate-x-full"}`}>
        <div className="w-64 h-full">
          <Sidebar
            activeSessionId={activeSessionId}
            onSelectSession={(id) => { setActiveSessionId(id); setIsNewChat(false); if (window.innerWidth < 768) setSidebarOpen(false); }}
            onNewChat={() => { setActiveSessionId(null); setIsNewChat(true); if (window.innerWidth < 768) setSidebarOpen(false); }}
            sessions={sessions}
            loadingSessions={loadingSessions}
          />
        </div>
      </div>
      <ChatErrorBoundary>
        <ChatArea
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          activeSessionId={activeSessionId}
          onSessionCreated={handleSessionCreated}
          isNewChat={isNewChat}
          demoMode={true}
        />
      </ChatErrorBoundary>
    </div>
  );
}
