"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search } from "lucide-react";
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

function SidebarProfile() {
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
    <ProfilePopover>
      <button className="flex w-full items-center gap-2.5 border-t border-[#0F1B3D]/[0.06] px-5 py-4 text-left transition-colors hover:bg-[#0F1B3D]/[0.03]">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-[#0F1B3D]/[0.06] text-xs font-semibold text-[#0F1B3D]/50">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-[#0F1B3D]">{displayName}</p>
          </div>
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
  sessions,
  loadingSessions,
}: {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  sessions: ChatSessionItem[];
  loadingSessions: boolean;
}) {
  const grouped = groupByDate(sessions);
  const groupOrder = ["Today", "Yesterday", "Last week", "Older"];

  return (
    <div className="flex h-dvh w-64 flex-shrink-0 flex-col bg-[#f5f7fb]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-5 pt-5 pb-4">
        <img
          src="/images/elena-icon-cropped.png"
          alt="Elena"
          className="h-12 w-12 rounded-xl"
        />
        <span className="text-lg font-extrabold text-[#0F1B3D]">elena</span>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex flex-col gap-2 px-4 pb-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04] py-2.5 text-sm font-medium text-[#0F1B3D]/70 shadow-[0_2px_8px_rgba(15,27,61,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[#0F1B3D]/[0.08]"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
        <button className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0F1B3D]/10 bg-[#0F1B3D]/[0.04] py-2.5 text-sm font-medium text-[#0F1B3D]/70 shadow-[0_2px_8px_rgba(15,27,61,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[#0F1B3D]/[0.08]">
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      {/* History — scrollable, min-h-0 is the key flexbox scroll fix */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3">
        {loadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0F1B3D]/20 border-t-[#0F1B3D]/60" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-[#0F1B3D]/30">
            No conversations yet
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
                    onClick={() => onSelectSession(session.id)}
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

      {/* Profile — pinned to bottom, never scrolls */}
      <div className="flex-shrink-0">
        <SidebarProfile />
      </div>
    </div>
  );
}
