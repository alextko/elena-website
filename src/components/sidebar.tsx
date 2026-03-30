"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, X } from "lucide-react";
import * as analytics from "@/lib/analytics";
import { ProfilePopover } from "@/components/profile-popover";
import { useAuth } from "@/lib/auth-context";
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
  const { user, profileData } = useAuth();

  const displayName =
    profileData?.firstName && profileData?.lastName
      ? `${profileData.firstName} ${profileData.lastName}`
      : user?.email?.split("@")[0] || "User";
  const initials = profileData?.firstName
    ? `${profileData.firstName[0]}${profileData.lastName?.[0] || ""}`.toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();
  const email = user?.email || "";

  return (
    <ProfilePopover onBookMessage={onBookMessage}>
      <button className="flex w-full items-center gap-2.5 border-t border-[#0F1B3D]/[0.06] px-5 py-4 text-left hover:opacity-80 transition-opacity">
        <div className="flex-shrink-0">
          {profileData?.profilePictureUrl ? (
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

export function Sidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onBookMessage,
  sessions,
  loadingSessions,
}: {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onBookMessage?: (msg: string) => void;
  sessions: ChatSessionItem[];
  loadingSessions: boolean;
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
    <div className="flex h-dvh w-64 flex-shrink-0 flex-col bg-[#f5f7fb]">
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
        <span className="text-lg font-extrabold text-[#0F1B3D]">elena</span>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex flex-col gap-2 px-4 pb-3">
        <button
          onClick={() => { analytics.track("New Chat Started"); onNewChat(); }}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04] py-2.5 text-sm font-medium text-[#0F1B3D]/70 shadow-[0_2px_8px_rgba(15,27,61,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[#0F1B3D]/[0.08]"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
        <div className="relative">
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
      </div>

      {/* History — scrollable, min-h-0 is the key flexbox scroll fix */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3">
        {loadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0F1B3D]/20 border-t-[#0F1B3D]/60" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-[#0F1B3D]/30">
            {searchQuery ? "No matching chats" : "No conversations yet"}
          </p>
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
      <div className="flex-shrink-0 pointer-events-none h-8 -mb-8 relative z-10 bg-gradient-to-t from-[#f5f7fb] to-transparent" />

      {/* Profile — pinned to bottom, never scrolls */}
      <div className="flex-shrink-0 relative z-10 shadow-[0_-4px_12px_rgba(15,27,61,0.06)]">
        <SidebarProfile onBookMessage={onBookMessage} />
      </div>
    </div>
  );
}
