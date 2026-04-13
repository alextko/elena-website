"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, X, Bell } from "lucide-react";
import * as analytics from "@/lib/analytics";
import { ProfilePopover } from "@/components/profile-popover";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
import type { ChatSessionItem } from "@/lib/types";

function groupByDate(sessions: ChatSessionItem[]): Record<string, ChatSessionItem[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const lastWeekStart = new Date(todayStart.getTime() - 7 * 86400000);

  const groups: Record<string, ChatSessionItem[]> = {};

  for (const s of sessions) {
    const d = new Date(s.updated_at || s.created_at);
    let label: string;
    if (d >= todayStart) label = "Today";
    else if (d >= yesterdayStart) label = "Yesterday";
    else if (d >= lastWeekStart) label = "Last week";
    else label = "Older";

    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }

  return groups;
}

function SidebarProfile({ onBookMessage }: { onBookMessage?: (msg: string) => void }) {
  const { user, profileData, profileChecked } = useAuth();

  // Show skeleton while profile is loading
  if (!profileChecked || !profileData) {
    return (
      <div className="flex w-full items-center gap-2.5 border-t border-[#0F1B3D]/[0.06] px-5 py-4">
        <div className="h-8 w-8 rounded-full bg-[#0F1B3D]/[0.06] animate-pulse flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-[#0F1B3D]/[0.06] animate-pulse" />
          <div className="h-2.5 w-32 rounded bg-[#0F1B3D]/[0.04] animate-pulse" />
        </div>
      </div>
    );
  }

  const displayName =
    profileData.firstName && profileData.lastName
      ? `${profileData.firstName} ${profileData.lastName}`
      : user?.email?.split("@")[0] || "User";
  const initials = profileData.firstName
    ? `${profileData.firstName[0]}${profileData.lastName?.[0] || ""}`.toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();
  const email = user?.email || "";

  return (
    <ProfilePopover onBookMessage={onBookMessage}>
      <button className="flex w-full items-center gap-2.5 border-t border-[#0F1B3D]/[0.06] px-5 py-4 text-left hover:opacity-80 transition-opacity">
        <div className="flex-shrink-0">
          {profileData.profilePictureUrl ? (
            <img
              src={profileData.profilePictureUrl}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#0F1B3D]/[0.06] text-xs font-semibold text-[#0F1B3D]/50">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0F1B3D] truncate">{displayName}</p>
          <p className="truncate text-xs text-[#0F1B3D]/40">{email}</p>
        </div>
      </button>
    </ProfilePopover>
  );
}

function NotificationBell() {
  const { profileId } = useAuth();
  const [notifications, setNotifications] = useState<{ id: string; message: string; status: string; created_at: string }[]>([]);
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string>("");

  const [notifLoaded, setNotifLoaded] = useState(false);
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("/chat/notifications");
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.notifications || []);
        setNotifications(items);
        if (data?.last_seen_at) setLastSeenAt(data.last_seen_at);
      }
    } catch {}
    setNotifLoaded(true);
  }, []);

  // Re-fetch when profile changes and on interval
  useEffect(() => {
    setNotifications([]);
    setNotifLoaded(false);
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, profileId]);

  // Close on outside click and mark as seen
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        markSeen();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unseenCount = notifications.filter((n) => !lastSeenAt || n.created_at > lastSeenAt).length;

  function markSeen() {
    if (notifications.length > 0) {
      const newest = notifications[0].created_at;
      setLastSeenAt(newest);
      apiFetch("/chat/notifications/seen", { method: "POST" }).catch(() => {});
    }
  }

  return (
    <div ref={bellRef} className="relative flex-shrink-0">
      <button
        onClick={() => { if (!open) { markSeen(); } setOpen(!open); }}
        className="relative flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#0F1B3D]/[0.06] transition-colors"
      >
        <Bell className="h-4 w-4 text-[#0F1B3D]/40" />
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-[#E5E5EA] shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden z-[999]">
          <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
            <p className="text-[13px] font-bold text-[#0F1B3D]">Notifications</p>
            <button onClick={() => { markSeen(); setOpen(false); }} className="text-[#AEAEB2] hover:text-[#0F1B3D] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[50vh] md:max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px] text-[#8E8E93]">{notifLoaded ? "No notifications" : "Loading..."}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-[#E5E5EA] last:border-b-0">
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${n.status === "confirmed" ? "bg-emerald-500" : n.status === "failed" ? "bg-red-400" : n.status === "linked" ? "bg-indigo-500" : "bg-blue-400"}`}>
                      {n.status === "confirmed" ? "✓" : n.status === "failed" ? "✕" : n.status === "linked" ? "🔗" : "ℹ"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[#1C1C1E] leading-[1.4]">{n.message}</p>
                      <p className="text-[11px] text-[#AEAEB2] mt-1">
                        {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onBookMessage,
  sessions,
  loadingSessions,
  showProfileTooltip,
  onDismissProfileTooltip,
}: {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onBookMessage?: (msg: string) => void;
  sessions: ChatSessionItem[];
  loadingSessions: boolean;
  showProfileTooltip?: boolean;
  onDismissProfileTooltip?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.preview && s.preview.toLowerCase().includes(q))
        );
      })
    : sessions;

  const grouped = groupByDate(filteredSessions);
  const groupOrder = ["Today", "Yesterday", "Last week", "Older"];

  return (
    <div className="flex h-dvh w-64 flex-shrink-0 flex-col bg-[#f5f7fb] max-md:bg-white">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="h-12 w-12 rounded-xl overflow-hidden bg-[#0F1B3D] shrink-0">
          <img
            src="/images/elena-icon-cropped.png"
            alt="Elena"
            className="h-full w-full object-cover"
            style={{ transform: "scale(1.1)" }}
          />
        </div>
        <span className="text-lg font-extrabold text-[#0F1B3D] flex-1">elena</span>
        <NotificationBell />
      </div>

      {/* Search + New Chat */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 pb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0F1B3D]/30 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => { if (searchQuery.trim()) analytics.track("Session Search Used", { query_length: searchQuery.length }); }}
            placeholder="Search chats..."
            className="w-full rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04] py-2.5 pl-8 pr-8 text-sm text-[#0F1B3D]/70 placeholder:text-[#0F1B3D]/30 outline-none focus:border-[#0F1B3D]/20 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#0F1B3D]/30 hover:text-[#0F1B3D]/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => { analytics.track("New Chat Started"); onNewChat(); }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04] text-[#0F1B3D]/60 shadow-[0_2px_8px_rgba(15,27,61,0.04)] transition-all hover:bg-[#0F1B3D]/[0.08]"
          title="New Chat"
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* History — scrollable, min-h-0 is the key flexbox scroll fix */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3">
        {loadingSessions ? (
          <div className="space-y-2 px-3 py-4 animate-pulse">
            <div className="h-8 w-full rounded-xl bg-[#0F1B3D]/[0.06]" />
            <div className="h-8 w-3/4 rounded-xl bg-[#0F1B3D]/[0.04]" />
            <div className="h-8 w-5/6 rounded-xl bg-[#0F1B3D]/[0.04]" />
          </div>
        ) : filteredSessions.length === 0 && searchQuery ? (
          <p className="px-3 py-8 text-center text-xs text-[#0F1B3D]/30">
            No matching chats
          </p>
        ) : filteredSessions.length === 0 ? (
          <div className="space-y-2 px-3 py-4 animate-pulse">
            <div className="h-8 w-full rounded-xl bg-[#0F1B3D]/[0.06]" />
            <div className="h-8 w-3/4 rounded-xl bg-[#0F1B3D]/[0.04]" />
          </div>
        ) : (
          groupOrder.map((label) => {
            const items = grouped[label];
            if (!items || items.length === 0) return null;
            return (
              <div key={label}>
                <p className="px-3 pt-4 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[#0F1B3D]/30">
                  {label}
                </p>
                {items.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => { analytics.track("Session Switched", { session_id: session.id }); onSelectSession(session.id); }}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-[0.8rem] transition-colors hover:bg-[#0F1B3D]/[0.06] ${
                      session.id === activeSessionId
                        ? "bg-[#0F1B3D]/[0.06] font-medium text-[#0F1B3D]"
                        : "text-[#0F1B3D]/60"
                    }`}
                  >
                    <span className="truncate">
                      {session.title || session.preview || "Untitled"}
                    </span>
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Fade-out gradient above profile */}
      <div className="flex-shrink-0 pointer-events-none h-8 -mb-8 relative z-10 bg-gradient-to-t from-[#f5f7fb] max-md:from-white to-transparent" />

      {/* Profile tooltip */}
      {showProfileTooltip && (
        <div className="flex-shrink-0 relative z-20 px-3">
          <div
            className="relative bg-[#0F1B3D] text-white rounded-xl px-4 py-3 mb-2 shadow-[0_4px_16px_rgba(15,27,61,0.25)] cursor-pointer animate-[elena-card-reveal_0.4s_ease-out_forwards]"
            onClick={onDismissProfileTooltip}
          >
            <p className="text-[13px] font-medium leading-snug">
              Tap your profile to see your health data. It gets smarter as you use Elena.
            </p>
            <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-[#0F1B3D] rotate-45" />
          </div>
        </div>
      )}

      {/* Profile — pinned to bottom, never scrolls */}
      <div className="flex-shrink-0 relative z-10 shadow-[0_-4px_12px_rgba(15,27,61,0.06)] bg-[#f5f7fb] max-md:bg-white" data-tour="profile-button">
        <SidebarProfile onBookMessage={onBookMessage} />
      </div>
    </div>
  );
}
