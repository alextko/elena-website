"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { UpgradeModal } from "@/components/upgrade-modal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Stethoscope,
  Calendar,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Star,
  Pill,
  Eye,
  SmilePlus,
  FileText,
  Plus,
  PlusCircle,
  Pencil,
  ArrowLeft,
  Phone,
  MapPin,
  X,
  Upload,
  Download,
  CheckSquare,
  CircleDot,
  Trash2,
  UserPlus,
  Link2,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
import { AddFamilyModal } from "@/components/add-family-modal";
import { AcceptInviteModal } from "@/components/accept-invite-modal";
import type { CareTodo, CareTodoCreate, CareVisit, DoctorItem, Habit, ProfileSummary } from "@/lib/types";
import { useRouter } from "next/navigation";
import type { InsuranceCard } from "@/lib/types";

type Tab = "health" | "visits" | "insurance";

// ─── Field label maps ───

const MEDICAL_FIELDS: [string, string][] = [
  ["provider", "Provider"],
  ["plan_name", "Plan Name"],
  ["plan_type", "Plan Type"],
  ["member_id", "Member ID"],
  ["group_number", "Group #"],
  ["member_deductible", "Deductible (Member)"],
  ["family_deductible", "Deductible (Family)"],
  ["member_oop_max", "OOP Max (Member)"],
  ["family_oop_max", "OOP Max (Family)"],
  ["copay_primary_care", "Copay (Primary Care)"],
  ["copay_specialist", "Copay (Specialist)"],
  ["copay_emergency", "Copay (ER)"],
  ["rx_copay", "Rx Copay"],
  ["coinsurance_rate", "Coinsurance Rate"],
];

const DENTAL_FIELDS: [string, string][] = [
  ["provider", "Provider"],
  ["plan_name", "Plan Name"],
  ["member_id", "Member ID"],
  ["group_number", "Group #"],
  ["deductible", "Deductible"],
  ["annual_maximum", "Annual Maximum"],
  ["preventive_coverage", "Preventive Coverage"],
  ["basic_coverage", "Basic Coverage"],
  ["major_coverage", "Major Coverage"],
  ["orthodontia_coverage", "Orthodontia Coverage"],
];

const VISION_FIELDS: [string, string][] = [
  ["provider", "Provider"],
  ["plan_name", "Plan Name"],
  ["member_id", "Member ID"],
  ["group_number", "Group #"],
  ["exam_copay", "Exam Copay"],
  ["lens_copay", "Lens Copay"],
  ["frame_allowance", "Frame Allowance"],
  ["contact_lens_allowance", "Contact Lens Allowance"],
];

// ─── Helpers ───

function TabPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-[18px] py-2.5 text-sm font-extrabold transition-colors"
      style={{
        backgroundColor: active ? "#0F1B3D" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#0F1B3D",
      }}
    >
      {label}
    </button>
  );
}

function specialtyIcon(specialty: string) {
  const s = specialty.toLowerCase();
  if (s.includes("dent")) return SmilePlus;
  if (s.includes("eye") || s.includes("optom") || s.includes("ophthal")) return Eye;
  if (s.includes("pharma")) return Pill;
  return Stethoscope;
}

function formatVisitDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Main component ───

export function ProfilePopover({
  children,
  onBookMessage,
}: {
  children: React.ReactNode;
  onBookMessage?: (message: string) => void;
}) {
  const {
    user, profileId, profiles, switchProfile, profileData, doctors, careVisits,
    subscription, insuranceCards, todos, habits, habitCompletions,
    toggleHabit, toggleTodo, createTodo, updateTodo, deleteTodo,
    refreshTodos, refreshDoctors, refreshVisits, refreshInsurance, refreshHabits,
    profileDetailsLoaded, fetchProfileDetails, updateProfilePicture, signOut,
  } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("health");
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().slice(0, 10));
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<typeof doctors[number] | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<typeof careVisits[number] | null>(null);
  const [editingTodo, setEditingTodo] = useState<{ mode: "create" } | { mode: "edit"; todo: typeof todos[number] } | null>(null);
  const [addingProvider, setAddingProvider] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [addFamilyOpen, setAddFamilyOpen] = useState(false);
  const [acceptInviteOpen, setAcceptInviteOpen] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState<ProfileSummary | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close switcher dropdown on outside click
  useEffect(() => {
    if (!switcherOpen) return;
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [switcherOpen]);

  async function handleUnlink(profile: ProfileSummary) {
    setUnlinking(true);
    try {
      // Fetch family links to find the link_id for this profile
      const linksRes = await apiFetch("/family/links");
      if (!linksRes.ok) { setUnlinking(false); return; }
      const data = await linksRes.json();
      const link = data.links?.find((l: { profile_id: string }) => l.profile_id === profile.id);
      if (!link) { setUnlinking(false); return; }

      await apiFetch(`/family/links/${link.link_id}`, { method: "DELETE" });

      // If we were viewing the unlinked profile, switch back to primary
      if (profileId === profile.id) {
        const primary = profiles.find((p) => p.is_primary);
        if (primary) await switchProfile(primary.id);
      }

      // Reload to refresh the profiles list
      window.location.reload();
    } catch {
      // silent
    }
    setUnlinking(false);
    setConfirmUnlink(null);
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profileId) return;
    e.target.value = "";

    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await apiFetch(`/profile/${profileId}/picture`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        updateProfilePicture(data.profile_picture_url || null);
      }
    } catch {
      // Upload failed silently
    }
    setUploadingPhoto(false);
  }

  useEffect(() => {
    if (open && !profileDetailsLoaded) fetchProfileDetails();
    // Refresh ALL data every time the popover opens (agent may have created visits, todos, etc.)
    if (open && profileDetailsLoaded) {
      refreshTodos();
      refreshVisits();
      refreshDoctors();
      refreshInsurance();
      refreshHabits();
    }
  }, [open, profileDetailsLoaded, fetchProfileDetails, refreshTodos, refreshVisits, refreshDoctors, refreshInsurance, refreshHabits]);

  const visitsScrollRef = useRef<HTMLDivElement>(null);
  const [showTodayBtn, setShowTodayBtn] = useState(false);
  const todayOffsetRef = useRef(0);

  function scrollToToday(animated = true) {
    const container = visitsScrollRef.current;
    const todayEl = todayRef.current;
    if (!container || !todayEl) return;
    const offset = todayEl.offsetTop - container.offsetTop - 4;
    todayOffsetRef.current = offset;
    container.scrollTo({ top: Math.max(0, offset), behavior: animated ? "smooth" : "instant" });
  }

  // Auto-scroll visits so today is at the top of the visible area
  useEffect(() => {
    if (activeTab === "visits" && careVisits.length > 0) {
      // Wait for DOM to render
      const timer = setTimeout(() => scrollToToday(false), 80);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, careVisits]);

  function handleVisitsScroll() {
    const container = visitsScrollRef.current;
    if (!container) return;
    const todayEl = todayRef.current;
    if (!todayEl) { setShowTodayBtn(false); return; }
    const todayTop = todayEl.offsetTop - container.offsetTop;
    const nearToday = Math.abs(todayTop - container.scrollTop) < 80;
    setShowTodayBtn(!nearToday);
  }

  const displayName =
    profileData?.firstName && profileData?.lastName
      ? `${profileData.firstName} ${profileData.lastName}`
      : user?.email?.split("@")[0] || "User";
  const initials = profileData?.firstName
    ? `${profileData.firstName[0]}${profileData.lastName?.[0] || ""}`.toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();
  const email = user?.email || "";
  const hasProfile = !!profileId;

  // Sort visits ascending (past at top, future at bottom) — matches mobile
  const sortedVisits = [...careVisits].sort(
    (a, b) => (a.visit_date || "").localeCompare(b.visit_date || ""),
  );
  const uniqueDoctors = doctors.filter(
    (d, i, arr) => arr.findIndex((x) => x.name === d.name && x.specialty === d.specialty) === i,
  );

  const medicalCard = insuranceCards.find((c) => c.card_type === "medical");
  const dentalCard = insuranceCards.find((c) => c.card_type === "dental");
  const visionCard = insuranceCards.find((c) => c.card_type === "vision");
  const today = todayStr();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <>
    <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement}></DialogTrigger>
      <DialogContent
        showCloseButton
        className="w-[90vw] max-w-[36rem] rounded-2xl border-[#0F1B3D]/[0.08] bg-[#F7F6F2] p-0 shadow-xl"
      >
        <div ref={scrollRef} className="max-h-[65vh] overflow-y-auto">
          {/* ═══════════ PROVIDER DETAIL VIEW ═══════════ */}
          {selectedProvider && (
            <ProviderDetailPanel
              provider={selectedProvider}
              profileId={profileId}
              onClose={() => setSelectedProvider(null)}
              onUpdated={() => { setSelectedProvider(null); refreshDoctors(); }}
            />
          )}

          {/* ═══════════ VISIT DETAIL VIEW ═══════════ */}
          {selectedVisit && !selectedProvider && (
            <VisitDetailPanel
              visit={selectedVisit}
              onClose={() => setSelectedVisit(null)}
              onBookMessage={onBookMessage}
              onClosePopover={() => setOpen(false)}
              onUpdated={() => { setSelectedVisit(null); refreshVisits(); }}
            />
          )}

          {/* ═══════════ ADD PROVIDER ═══════════ */}
          {addingProvider && !selectedProvider && !selectedVisit && !editingTodo && (
            <AddProviderPanel
              profileId={profileId}
              onClose={() => setAddingProvider(false)}
              onSaved={() => {
                setAddingProvider(false);
                refreshDoctors();
              }}
            />
          )}

          {/* ═══════════ TODO EDITOR ═══════════ */}
          {editingTodo && !selectedProvider && !selectedVisit && !addingProvider && (
            <TodoEditorPanel
              editingTodo={editingTodo}
              onClose={() => setEditingTodo(null)}
              onCreate={createTodo}
              onUpdate={updateTodo}
              onDelete={deleteTodo}
            />
          )}

          {/* ═══════════ MAIN PROFILE CONTENT ═══════════ */}
          {!selectedProvider && !selectedVisit && !editingTodo && !addingProvider && (
          <div className="p-8 pb-10">
            {/* User header */}
            <div className="flex items-center gap-4 pb-4">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <button
                className="relative group flex-shrink-0"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || !hasProfile}
              >
                {profileData?.profilePictureUrl ? (
                  <img
                    src={profileData.profilePictureUrl}
                    alt={displayName}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-[#0F1B3D]/[0.06] text-base font-semibold text-[#0F1B3D]/50">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
                {hasProfile && !profileData?.profilePictureUrl && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] border border-[#0F1B3D]/[0.08] text-[#0F1B3D]/50 group-hover:text-[#0F1B3D] transition-colors">
                    {uploadingPhoto ? (
                      <div className="h-2.5 w-2.5 animate-spin rounded-full border border-[#0F1B3D]/30 border-t-transparent" />
                    ) : (
                      <Pencil className="h-2.5 w-2.5" />
                    )}
                  </span>
                )}
              </button>
              <div ref={switcherRef} className="min-w-0 flex-1 relative">
                <button
                  onClick={() => profiles.length > 1 && setSwitcherOpen(!switcherOpen)}
                  className={`flex items-center gap-1 ${profiles.length > 1 ? "hover:opacity-70 transition-opacity cursor-pointer" : ""}`}
                >
                  <p className="text-base font-extrabold text-[#0F1B3D]">{displayName}</p>
                  {profiles.length > 1 && (
                    <ChevronDown className={`h-3.5 w-3.5 text-[#0F1B3D]/30 flex-shrink-0 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
                  )}
                </button>
                <p className="truncate text-sm text-[#0F1B3D]/40">{email}</p>

                {/* Profile switcher dropdown */}
                {switcherOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 rounded-xl bg-white border border-[#0F1B3D]/[0.08] shadow-[0_8px_32px_rgba(15,27,61,0.15)] overflow-hidden z-50">
                    <div className="py-1.5">
                      {/* Unlink confirmation */}
                      {confirmUnlink && (
                        <div className="px-3 py-3">
                          <p className="text-[13px] font-semibold text-[#0F1B3D] mb-1">
                            Unlink {confirmUnlink.first_name}?
                          </p>
                          <p className="text-[12px] text-[#0F1B3D]/40 mb-3">
                            You will no longer be able to see {confirmUnlink.first_name}&apos;s data.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUnlink(confirmUnlink)}
                              disabled={unlinking}
                              className="flex-1 rounded-lg bg-red-500 py-1.5 text-[13px] font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {unlinking ? "Removing..." : "Unlink"}
                            </button>
                            <button
                              onClick={() => setConfirmUnlink(null)}
                              className="flex-1 rounded-lg border border-[#E5E5EA] py-1.5 text-[13px] font-semibold text-[#0F1B3D]/60 hover:bg-[#0F1B3D]/[0.04] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {!confirmUnlink && (
                        <>
                          {profiles.map((p) => {
                            const isActive = p.id === profileId;
                            const pName = `${p.first_name} ${p.last_name}`.trim() || p.label || "Profile";
                            const pInitials = p.first_name ? `${p.first_name[0]}${p.last_name?.[0] || ""}`.toUpperCase() : "?";
                            const badge = p.is_primary ? "Me" : p.is_linked ? "Linked" : "Managed";
                            const canUnlink = !p.is_primary;
                            return (
                              <div
                                key={p.id}
                                className={`flex w-full items-center gap-2.5 px-3 py-2 transition-colors hover:bg-[#0F1B3D]/[0.04] ${isActive ? "bg-[#0F1B3D]/[0.06]" : ""}`}
                              >
                                <button
                                  onClick={async () => {
                                    if (!isActive) await switchProfile(p.id);
                                    setSwitcherOpen(false);
                                  }}
                                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                                >
                                  {p.profile_picture_url ? (
                                    <img src={p.profile_picture_url} alt={pName} className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <Avatar className="h-7 w-7">
                                      <AvatarFallback className="bg-[#0F1B3D]/[0.06] text-[10px] font-semibold text-[#0F1B3D]/50">{pInitials}</AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[#0F1B3D] truncate">{pName}</p>
                                    <p className="text-[10px] text-[#0F1B3D]/30">{badge}</p>
                                  </div>
                                  {isActive && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#2E6BB5] flex-shrink-0" />
                                  )}
                                </button>
                                {canUnlink && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmUnlink(p); }}
                                    className="flex-shrink-0 p-1 rounded-md text-[#0F1B3D]/20 hover:text-red-400 hover:bg-red-50 transition-colors"
                                    title={`Unlink ${pName}`}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          <div className="border-t border-[#0F1B3D]/[0.06] mt-1 pt-1">
                            <button
                              onClick={() => { setSwitcherOpen(false); setOpen(false); setAddFamilyOpen(true); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#0F1B3D]/50 hover:bg-[#0F1B3D]/[0.04] transition-colors"
                            >
                              <UserPlus className="h-4 w-4" />
                              Add family member
                            </button>
                            <button
                              onClick={() => { setSwitcherOpen(false); setOpen(false); setAcceptInviteOpen(true); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#0F1B3D]/50 hover:bg-[#0F1B3D]/[0.04] transition-colors"
                            >
                              <Link2 className="h-4 w-4" />
                              Enter invite code
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tab pills */}
            <div className="flex gap-1.5 mt-1 mb-4">
              <TabPill label="Health" active={activeTab === "health"} onClick={() => setActiveTab("health")} />
              <TabPill label="Visits" active={activeTab === "visits"} onClick={() => setActiveTab("visits")} />
              <TabPill label="Insurance" active={activeTab === "insurance"} onClick={() => setActiveTab("insurance")} />
            </div>

            {/* ═══════════ HEALTH TAB ═══════════ */}
            {activeTab === "health" && (
              <div className="space-y-5">
                {/* ── Game Plan (salmon card) ── */}
                <div
                  className="rounded-[22px] pt-[18px] pb-2 overflow-hidden"
                  style={{ background: "#F4B084", boxShadow: "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)" }}
                >
                  {/* Title */}
                  <div className="px-6 mb-4">
                    <div className="text-[28px] font-extrabold" style={{ color: "#5C1A2A" }}>
                      Game Plan
                    </div>
                  </div>

                  {/* Calendar strip */}
                  {(() => {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const monday = new Date(now);
                    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
                    const todayKey = now.toISOString().slice(0, 10);
                    const days = Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(monday);
                      d.setDate(monday.getDate() + i);
                      const dateKey = d.toISOString().slice(0, 10);
                      const isToday = d.toDateString() === now.toDateString();
                      const isFuture = d > now && !isToday;
                      // Day is complete if all habits are done for that date
                      const dayCompletions = habitCompletions[dateKey];
                      const allDone = !isFuture && habits.length > 0 && dayCompletions
                        ? habits.every((h) => dayCompletions.has(h.id))
                        : false;
                      // Event dots: visits + non-daily todos (including recurring occurrences)
                      const visitDots = careVisits
                        .filter((v) => v.visit_date === dateKey)
                        .map(() => "#FFFFFF");
                      const todoDots = todos
                        .filter((t) => {
                          if (t.status === "dismissed" || t.frequency === "daily") return false;
                          if (!t.due_date) return false;
                          if (t.due_date === dateKey) return true;
                          if (t.frequency === "once") return false;
                          const start = new Date(t.due_date + "T00:00:00");
                          const cur = new Date(dateKey + "T00:00:00");
                          if (cur < start) return false;
                          const interval = t.recurrence_interval || 1;
                          if (t.frequency === "weekly") {
                            const daysDiff = Math.round((cur.getTime() - start.getTime()) / 86400000);
                            return daysDiff % (7 * interval) === 0;
                          }
                          if (t.frequency === "monthly") {
                            const monthsDiff = (cur.getFullYear() - start.getFullYear()) * 12 + (cur.getMonth() - start.getMonth());
                            return monthsDiff % interval === 0 && cur.getDate() === start.getDate();
                          }
                          return false;
                        })
                        .map((t) => t.color || "#FFFFFF");
                      const dots = [...visitDots, ...todoDots].slice(0, 3);
                      return { label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2), num: d.getDate(), isToday, isFuture, allDone, dots, dateKey };
                    });
                    return (
                      <div className="flex justify-center gap-[10px] px-6 pb-4">
                        {days.map((day) => {
                          const isSelected = day.dateKey === selectedDay;
                          return (
                            <button
                              key={day.label + day.num}
                              className="flex flex-col items-center gap-1 w-11 transition-opacity"
                              onClick={() => setSelectedDay(day.dateKey)}
                            >
                              <span
                                className="text-[11px] font-semibold uppercase"
                                style={{ color: day.isToday ? "#5C1A2A" : "#7A3040" }}
                              >
                                {day.label}
                              </span>
                              <span
                                className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold"
                                style={{
                                  color: isSelected ? "#FFFFFF" : day.isFuture ? "#7A3040" : "#5C1A2A",
                                  background: isSelected ? "#5C1A2A" : day.isToday ? "#FFFFFF" : "transparent",
                                  opacity: day.isFuture && !isSelected ? 0.5 : 1,
                                }}
                              >
                                {!day.isFuture && !isSelected && day.allDone ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C1A2A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  day.num
                                )}
                              </span>
                              {/* Event dots */}
                              <div className="flex gap-[3px] h-[7px]">
                                {day.dots.map((color, di) => (
                                  <div
                                    key={di}
                                    className="w-[6px] h-[6px] rounded-full"
                                    style={{
                                      background: day.isFuture ? "transparent" : color,
                                      border: day.isFuture ? `1.5px solid ${color}` : "none",
                                      opacity: day.isFuture ? 0.6 : 0.9,
                                    }}
                                  />
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* To Do section */}
                  <div className="px-6 pb-4">
                    {(() => {
                      const todayKey = new Date().toISOString().slice(0, 10);
                      const isViewingToday = selectedDay === todayKey;
                      const dayLabel = isViewingToday
                        ? "To Do"
                        : new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

                      return (
                        <div className="flex items-center justify-between px-2 mb-[10px]">
                          <span className="text-[15px] font-bold" style={{ color: "#5C1A2A" }}>{dayLabel}</span>
                          <div className="flex items-center gap-2">
                            {!isViewingToday && (
                              <button
                                onClick={() => setSelectedDay(todayKey)}
                                className="text-[13px] font-semibold transition-opacity hover:opacity-70"
                                style={{ color: "#5C1A2A" }}
                              >
                                Back to today
                              </button>
                            )}
                            <button
                              onClick={() => setEditingTodo({ mode: "create" })}
                              className="transition-opacity hover:opacity-70"
                            >
                              <Plus className="h-[22px] w-[22px]" style={{ color: "#5C1A2A" }} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const todayKey = new Date().toISOString().slice(0, 10);
                      const isViewingToday = selectedDay === todayKey;

                      // Merge visits, habits, and care todos into one list (matches mobile app)
                      type GamePlanItem =
                        | { type: "visit"; visit: CareVisit; sortOrder: number }
                        | { type: "habit"; id: string; title: string; subtitle: string; color: string; completed: boolean; sortOrder: number }
                        | { type: "todo"; todo: CareTodo; sortOrder: number };

                      // Visits for the selected day
                      const dayVisits: GamePlanItem[] = careVisits
                        .filter((v) => v.visit_date === selectedDay)
                        .map((v, i) => ({
                          type: "visit" as const,
                          visit: v,
                          sortOrder: -1000 + i, // visits first
                        }));

                      // Habits show every day (they're daily), completions are day-specific
                      const dayHabits: GamePlanItem[] = habits.map((h) => ({
                        type: "habit" as const,
                        id: h.id,
                        title: h.title,
                        subtitle: h.subtitle,
                        color: h.color,
                        completed: !!(habitCompletions[selectedDay]?.has(h.id)),
                        sortOrder: h.sort_order,
                      }));

                      // Care todos: match by due_date, no due_date (always visible), or recurring schedule
                      const dayTodos: GamePlanItem[] = todos
                        .filter((t) => {
                          if (t.status === "dismissed") return false;
                          if (!t.due_date) return true; // no due date = always visible
                          if (t.due_date === selectedDay) return true;
                          if (t.frequency === "once") return false;
                          // Recurring: check if selectedDay falls on a recurrence
                          const start = new Date(t.due_date + "T00:00:00");
                          const sel = new Date(selectedDay + "T00:00:00");
                          if (sel < start) return false;
                          const interval = t.recurrence_interval || 1;
                          if (t.frequency === "weekly") {
                            const daysDiff = Math.round((sel.getTime() - start.getTime()) / 86400000);
                            return daysDiff % (7 * interval) === 0;
                          }
                          if (t.frequency === "monthly") {
                            const monthsDiff = (sel.getFullYear() - start.getFullYear()) * 12 + (sel.getMonth() - start.getMonth());
                            return monthsDiff % interval === 0 && sel.getDate() === start.getDate();
                          }
                          return false;
                        })
                        .map((t) => ({
                          type: "todo" as const,
                          todo: t,
                          sortOrder: t.sort_order + 1000, // after habits
                        }));

                      const items: GamePlanItem[] = [...dayVisits, ...dayHabits, ...dayTodos];

                      // Sort: visits first, then uncompleted before completed, then by sort order
                      items.sort((a, b) => {
                        // Visits always first
                        if (a.type === "visit" && b.type !== "visit") return -1;
                        if (a.type !== "visit" && b.type === "visit") return 1;
                        const aCompleted = a.type === "habit" ? a.completed : a.type === "todo" ? a.todo.status === "completed" : false;
                        const bCompleted = b.type === "habit" ? b.completed : b.type === "todo" ? b.todo.status === "completed" : false;
                        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
                        return a.sortOrder - b.sortOrder;
                      });

                      if (items.length === 0 && profileDetailsLoaded) {
                        return (
                          <div className="rounded-[14px] px-[14px] py-8 text-center" style={{ background: "rgba(255,255,255,0.3)" }}>
                            <p className="text-[15px] font-semibold" style={{ color: "#5C1A2A" }}>All caught up!</p>
                            <p className="text-[13px] mt-1" style={{ color: "#7A3040" }}>Your health tasks will appear here.</p>
                          </div>
                        );
                      }

                      if (items.length === 0) return null;

                      return (
                        <div className="rounded-[14px] px-[14px] py-[10px]" style={{ background: "rgba(255,255,255,0.3)" }}>
                          {items.map((item, i) => {
                            if (item.type === "visit") {
                              const v = item.visit;
                              const visitTime = v.visit_date; // TODO: parse time if available
                              return (
                                <React.Fragment key={`visit-${v.id}`}>
                                  {i > 0 && (
                                    <div className="h-px mx-[14px]" style={{ background: "rgba(92,26,42,0.2)" }} />
                                  )}
                                  <button
                                    className="flex items-center gap-3 py-[10px] w-full text-left"
                                    onClick={() => setSelectedVisit(v)}
                                  >
                                    <div
                                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                                      style={{ background: "rgba(92,26,42,0.15)" }}
                                    >
                                      <Calendar className="h-4 w-4" style={{ color: "#5C1A2A" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[17px] font-semibold truncate" style={{ color: "#5C1A2A" }}>
                                        {v.visit_type}{v.doctor_name ? ` \u2014 ${v.doctor_name}` : ""}
                                      </div>
                                      {v.location && (
                                        <div className="text-[13px] mt-[1px] truncate" style={{ color: "#7A3040" }}>
                                          {v.location}
                                        </div>
                                      )}
                                    </div>
                                    <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "#7A3040" }} />
                                  </button>
                                </React.Fragment>
                              );
                            }

                            const isHabit = item.type === "habit";
                            const completed = isHabit ? item.completed : item.todo.status === "completed";
                            const title = isHabit ? item.title : item.todo.title;
                            const subtitle = isHabit ? item.subtitle : item.todo.subtitle;
                            const dueTime = isHabit ? null : item.todo.due_time;
                            const bookMsg = isHabit ? null : item.todo.book_message;
                            const itemId = isHabit ? item.id : item.todo.id;

                            return (
                              <React.Fragment key={itemId}>
                                {i > 0 && (
                                  <div className="h-px mx-[14px]" style={{ background: "rgba(92,26,42,0.2)" }} />
                                )}
                                <div className="flex items-center gap-3 py-[10px]">
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => isHabit ? toggleHabit(item.id) : toggleTodo(item.todo.id)}
                                    className="w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors duration-200"
                                    style={{
                                      borderColor: completed ? "#5C1A2A" : "#7A3040",
                                      background: completed ? "#5C1A2A" : "transparent",
                                    }}
                                  >
                                    {completed && (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </button>

                                  {/* Title + subtitle */}
                                  <button
                                    className="flex-1 min-w-0 text-left"
                                    onClick={!isHabit ? () => setEditingTodo({ mode: "edit", todo: item.todo }) : undefined}
                                  >
                                    <div
                                      className="text-[17px] font-semibold transition-all duration-200 truncate"
                                      style={{
                                        color: completed ? "#7A3040" : "#5C1A2A",
                                        textDecoration: completed ? "line-through" : "none",
                                      }}
                                    >
                                      {title}
                                    </div>
                                    {(subtitle || dueTime) && (
                                      <div className="text-[13px] mt-[1px] truncate" style={{ color: "#7A3040" }}>
                                        {dueTime && <span>{dueTime.replace(/^0/, "")} · </span>}
                                        {subtitle}
                                      </div>
                                    )}
                                  </button>

                                  {/* Book button */}
                                  {!completed && bookMsg && onBookMessage && (
                                    <button
                                      onClick={() => { onBookMessage(bookMsg); setOpen(false); }}
                                      className="shrink-0 rounded-full px-4 py-[7px] text-[13px] font-semibold text-white transition-colors"
                                      style={{ background: "#0F1B3D" }}
                                    >
                                      Book
                                    </button>
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Providers */}
                <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 pt-3.5 pb-1">
                    <h3 className="text-[15px] font-extrabold text-[#0F1B3D]">Providers</h3>
                    <button
                      onClick={() => setAddingProvider(true)}
                      className="transition-opacity hover:opacity-70"
                    >
                      <Plus className="h-[18px] w-[18px] text-[#0F1B3D]" />
                    </button>
                  </div>
                  {uniqueDoctors.length === 0 && profileDetailsLoaded && (
                    <div className="px-3.5 py-10 text-center">
                      <p className="text-[17px] font-bold text-[#1C1C1E]">No providers yet</p>
                      <p className="text-sm text-[#8E8E93] mt-1.5 leading-5">
                        Add your care team to keep everything in one place.
                      </p>
                    </div>
                  )}
                  {uniqueDoctors.map((provider, i) => {
                    const Icon = specialtyIcon(provider.specialty);
                    // Name line: show name, or practice_name if no name
                    const displayName = provider.name || provider.practice_name || provider.specialty;
                    // Detail line: credential · specialty (skip if same as name)
                    const detailParts = [provider.credential, provider.specialty].filter(Boolean);
                    const detail = detailParts.join(" · ");
                    return (
                      <React.Fragment key={provider.id || i}>
                        {i > 0 && <div className="h-px bg-[#E5E5EA] ml-[62px] mr-3.5" />}
                        <button
                          className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left hover:bg-[#0F1B3D]/[0.02] transition-colors"
                          onClick={() => setSelectedProvider(provider)}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F6F2]">
                            <Icon className="h-[18px] w-[18px] text-[#0F1B3D]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[16px] font-semibold text-[#1C1C1E] truncate">{displayName}</p>
                            {detail && detail !== displayName && (
                              <p className="text-[13px] text-[#8E8E93] mt-px truncate">{detail}</p>
                            )}
                          </div>
                          <ChevronRight className="h-[18px] w-[18px] text-[#0F1B3D] shrink-0" />
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Plan summary */}
                <div
                  className={`rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden ${(subscription?.tier || "free") === "free" ? "cursor-pointer hover:bg-[#F7F6F2] transition-colors" : ""}`}
                  onClick={(subscription?.tier || "free") === "free" ? () => { setOpen(false); setUpgradeOpen(true); } : undefined}
                >
                  <div className="flex items-center gap-3 px-3.5 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F6F2]">
                      <Sparkles className="h-[18px] w-[18px] text-[#0F1B3D]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold text-[#1C1C1E] capitalize">
                        {subscription?.tier || "Free"} Plan
                      </p>
                      <p className="text-[13px] text-[#8E8E93] mt-px">
                        {(subscription?.tier || "free") === "free"
                          ? "Tap to upgrade"
                          : subscription?.plan?.includes("annual") ? "Annual" : "Monthly"}
                      </p>
                    </div>
                    {(subscription?.tier || "free") === "free" && (
                      <ChevronRight className="h-[18px] w-[18px] text-[#0F1B3D] shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ VISITS TAB ═══════════ */}
            {activeTab === "visits" && (
              <div>
                {sortedVisits.length === 0 && profileDetailsLoaded && (
                  <div className="rounded-3xl bg-[#DBEAFE] p-6 text-center">
                    <Calendar className="h-10 w-10 text-[#93B5E1] mx-auto mb-3" />
                    <p className="text-[17px] font-bold text-[#0F1B3D]">No visits yet</p>
                    <p className="text-[13px] text-[#6B9BD2] mt-1">
                      Chat with Elena to find and book a visit
                    </p>
                  </div>
                )}
                {sortedVisits.length > 0 && (
                  <div className="rounded-3xl bg-[#DBEAFE] overflow-hidden">
                    {/* Fixed header above the scroll area */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <h3 className="text-[24px] font-extrabold text-[#0F1B3D]">Timeline</h3>
                      {showTodayBtn && (
                        <button
                          onClick={() => scrollToToday(true)}
                          className="text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                        >
                          Today
                        </button>
                      )}
                    </div>

                    {/* Scrollable timeline — fixed height, today scrolled to top */}
                    <div
                      ref={visitsScrollRef}
                      className="overflow-y-auto px-2 pb-64"
                      style={{ height: "320px" }}
                      onScroll={handleVisitsScroll}
                    >
                    {sortedVisits.map((visit, i) => {
                      const isFuture = visit.visit_date > today;
                      const isToday = visit.visit_date === today;
                      const isFirst = i === 0;
                      const isLast = i === sortedVisits.length - 1;

                      // Month header
                      const prevDate = i > 0 ? sortedVisits[i - 1].visit_date : null;
                      const curMonth = visit.visit_date.slice(0, 7);
                      const prevMonth = prevDate ? prevDate.slice(0, 7) : null;
                      const showMonth = curMonth !== prevMonth;
                      const curYear = visit.visit_date.slice(0, 4);
                      const prevYear = prevDate ? prevDate.slice(0, 4) : null;
                      const showYear = curYear !== prevYear;

                      // Today marker: show if this is first today entry, or if today falls between prev and this
                      const showTodayBefore =
                        !isToday &&
                        isFuture &&
                        (i === 0 || sortedVisits[i - 1].visit_date < today);

                      return (
                        <React.Fragment key={visit.id}>
                          {/* Today marker between entries */}
                          {showTodayBefore && (
                            <div ref={todayRef} className="flex items-center gap-0 ml-1 my-2">
                              <div className="flex flex-col items-center w-6 shrink-0">
                                {!isFirst && <div className="w-0.5 h-3 bg-[#93B5E1]" />}
                                <div className="w-3 h-3 rounded-full bg-[#4A7AB5] shrink-0" />
                                <div className="w-0.5 h-3 bg-[#93B5E1]" />
                              </div>
                              <div className="flex items-center gap-1.5 ml-2.5">
                                <span className="text-[16px] font-bold text-[#4A7AB5]">Today</span>
                                <span className="text-[13px] font-medium text-[#6B9BD2]">
                                  {formatVisitDate(today)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Month/year header */}
                          {showMonth && (
                            <div className="flex items-center gap-0 ml-1 my-2">
                              <div className="flex flex-col items-center w-6 shrink-0">
                                <div className="w-0.5 h-2 bg-[#93B5E1]" />
                                <div className="w-2.5 h-0.5 rounded-sm bg-[#6B9BD2]" />
                                <div className="w-0.5 h-2 bg-[#93B5E1]" />
                              </div>
                              <div className="ml-2.5">
                                {showYear && (
                                  <span className="text-[18px] font-extrabold text-[#4A7AB5] tracking-wide mr-2">
                                    {curYear}
                                  </span>
                                )}
                                <span className="text-[15px] font-bold text-[#4A7AB5]">
                                  {new Date(visit.visit_date + "T00:00:00").toLocaleDateString("en-US", { month: "long" })}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Visit entry */}
                          <div className="flex gap-0 ml-1">
                            {/* Rail */}
                            <div className="flex flex-col items-center w-6 shrink-0">
                              {!isFirst && !showMonth && !showTodayBefore && (
                                <div className="w-0.5 flex-1 bg-[#93B5E1]" />
                              )}
                              {(isFirst || showMonth || showTodayBefore) && (
                                <div className="w-0.5 h-2 bg-[#93B5E1]" />
                              )}
                              <div
                                ref={isToday ? todayRef : undefined}
                                className="w-3 h-3 rounded-full shrink-0 my-0.5"
                                style={{
                                  backgroundColor: isFuture && !isToday ? "transparent" : "#2563EB",
                                  border: isFuture && !isToday ? "2px solid #2563EB" : "none",
                                }}
                              />
                              {!isLast && <div className="w-0.5 flex-1 bg-[#93B5E1]" />}
                            </div>

                            {/* Card */}
                            <button
                              className="flex-1 min-w-0 bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-3.5 py-3 mb-3 ml-2.5 text-left hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer"
                              onClick={() => setSelectedVisit(visit)}
                            >
                              {/* Date + file icon */}
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-[#6B9BD2]">
                                  {isToday ? "Today" : formatVisitDate(visit.visit_date)}
                                </p>
                                {visit.documents && visit.documents.length > 0 && (
                                  <FileText className="h-4 w-4 text-[#34C759]" />
                                )}
                              </div>
                              {/* Visit type */}
                              <p className="text-[16px] font-bold text-[#0F1B3D] mt-0.5 truncate">
                                {visit.visit_type}
                              </p>
                              {/* Doctor */}
                              {visit.doctor_name && (
                                <p className="text-[13px] text-[#8E8E93] mt-px truncate">{visit.doctor_name}</p>
                              )}
                              {/* Location */}
                              {visit.location && (
                                <p className="text-xs text-[#AEAEB2] mt-px truncate">{visit.location}</p>
                              )}
                              {/* Summary */}
                              {visit.summary &&
                                visit.summary !== "past visit" &&
                                visit.summary !== "upcoming visit" && (
                                  <p className="text-[13px] text-[#8E8E93] mt-1 line-clamp-2 leading-[18px]">
                                    {visit.summary}
                                  </p>
                                )}
                            </button>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Today marker at end + no upcoming visits placeholder */}
                    {/* Today marker at end if all visits are in the past (none today) */}
                    {sortedVisits.length > 0 &&
                      sortedVisits.every((v) => v.visit_date < today) && (
                        <div ref={todayRef} className="flex items-center gap-0 ml-1 my-2">
                          <div className="flex flex-col items-center w-6 shrink-0">
                            <div className="w-0.5 h-3 bg-[#93B5E1]" />
                            <div className="w-3 h-3 rounded-full bg-[#4A7AB5] shrink-0" />
                            <div className="w-0.5 h-3 bg-[#93B5E1]" />
                          </div>
                          <div className="flex items-center gap-1.5 ml-2.5">
                            <span className="text-[16px] font-bold text-[#4A7AB5]">Today</span>
                            <span className="text-[13px] font-medium text-[#6B9BD2]">
                              {formatVisitDate(today)}
                            </span>
                          </div>
                        </div>
                      )}

                    {/* No upcoming visits placeholder — shown when no visits are after today */}
                    {sortedVisits.length > 0 &&
                      !sortedVisits.some((v) => v.visit_date > today) && (
                        <div className="flex gap-0 ml-1">
                          <div className="flex flex-col items-center w-6 shrink-0">
                            <div className="w-0.5 h-2 bg-[#93B5E1]" />
                            <div className="w-3 h-3 rounded-full shrink-0 my-0.5 border-2 border-dashed border-[#93B5E1]" />
                          </div>
                          <div className="flex-1 min-w-0 bg-white/60 rounded-[14px] border border-dashed border-[#93B5E1]/40 px-3.5 py-3 mb-3 ml-2.5">
                            <p className="text-[15px] font-semibold text-[#6B9BD2]">No upcoming visits</p>
                            <p className="text-[13px] text-[#93B5E1] mt-0.5">Chat with Elena to find and book your next visit</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ INSURANCE TAB ═══════════ */}
            {activeTab === "insurance" && (
              <div className="space-y-0 pb-2">
                {/* Insurance cards carousel-style display */}
                <div className="flex gap-3 overflow-x-auto pb-6 -mx-2 px-2 pt-1 snap-x snap-mandatory scrollbar-hide">
                  <InsuranceCardDisplay card={medicalCard} label="Medical" dark onTapEmpty={() => setExpandedCard("medical")} />
                  <InsuranceCardDisplay card={dentalCard} label="Dental" dark={false} onTapEmpty={() => setExpandedCard("dental")} />
                  <InsuranceCardDisplay card={visionCard} label="Vision" dark onTapEmpty={() => setExpandedCard("vision")} />
                </div>

                {/* Expandable detail sections */}
                <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden mt-3">
                  <InsuranceDetailRow
                    icon={Pill} label="Medical" card={medicalCard} cardType="medical" fields={MEDICAL_FIELDS}
                    expanded={expandedCard === "medical"}
                    onToggle={() => setExpandedCard(expandedCard === "medical" ? null : "medical")}
                    onRefresh={refreshInsurance}
                  />
                  <div className="h-px bg-[#E5E5EA] ml-[62px] mr-3.5" />
                  <InsuranceDetailRow
                    icon={SmilePlus} label="Dental" card={dentalCard} cardType="dental" fields={DENTAL_FIELDS}
                    expanded={expandedCard === "dental"}
                    onToggle={() => setExpandedCard(expandedCard === "dental" ? null : "dental")}
                    onRefresh={refreshInsurance}
                  />
                  <div className="h-px bg-[#E5E5EA] ml-[62px] mr-3.5" />
                  <InsuranceDetailRow
                    icon={Eye} label="Vision" card={visionCard} cardType="vision" fields={VISION_FIELDS}
                    expanded={expandedCard === "vision"}
                    onToggle={() => setExpandedCard(expandedCard === "vision" ? null : "vision")}
                    onRefresh={refreshInsurance}
                  />
                </div>
              </div>
            )}

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 pt-6 pb-4 text-sm text-[#0F1B3D]/40 transition-colors hover:text-[#0F1B3D]/60"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>

            {/* Delete account */}
            {!confirmDeleteAccount ? (
              <button
                onClick={() => setConfirmDeleteAccount(true)}
                className="flex w-full items-center gap-2 pb-2 text-sm text-red-300 transition-colors hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-2">
                <p className="text-[13px] font-semibold text-red-600 mb-1">Delete your account?</p>
                <p className="text-[12px] text-red-400 mb-3">This permanently deletes all your data. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await apiFetch("/account", { method: "DELETE" });
                      localStorage.removeItem("elena_onboarding_done");
                      await signOut();
                      router.push("/");
                    }}
                    className="flex-1 rounded-lg bg-red-500 py-2 text-[13px] font-semibold text-white hover:bg-red-600 transition-colors"
                  >
                    Delete permanently
                  </button>
                  <button
                    onClick={() => setConfirmDeleteAccount(false)}
                    className="flex-1 rounded-lg border border-[#E5E5EA] py-2 text-[13px] font-semibold text-[#0F1B3D]/60 hover:bg-[#0F1B3D]/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AddFamilyModal
      open={addFamilyOpen}
      onOpenChange={setAddFamilyOpen}
      onProfileCreated={async (newId) => {
        await switchProfile(newId);
        window.location.reload();
      }}
    />
    <AcceptInviteModal
      open={acceptInviteOpen}
      onOpenChange={setAcceptInviteOpen}
      onAccepted={() => window.location.reload()}
    />
    </>
  );
}

// ═══════════════════════════════════════════════════
//  Insurance card visual (carousel-style)
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  Todo Editor Panel (create / edit)
// ═══════════════════════════════════════════════════

const TODO_COLORS = [
  "#0F1B3D", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444",
  "#F59E0B", "#10B981", "#06B6D4", "#6366F1",
];

const FREQUENCY_OPTIONS = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// ═══════════════════════════════════════════════════
//  Visit Detail Panel (full view with notes, docs, rating)
// ═══════════════════════════════════════════════════

interface VisitNote {
  id: string;
  description: string;
  key_points: { text?: string; point?: string }[];
  action_items: { text?: string; item?: string }[];
  duration_seconds: number;
  is_personal_note: boolean;
  visit_id?: string | null;
}

interface StructuredDocument {
  id: string;
  filename: string;
  doc_type: string;
  doc_title: string;
  content_type: string;
  download_url?: string | null;
}

function VisitDetailPanel({
  visit,
  onClose,
  onBookMessage,
  onClosePopover,
  onUpdated,
}: {
  visit: CareVisit;
  onClose: () => void;
  onBookMessage?: (msg: string) => void;
  onClosePopover: () => void;
  onUpdated: () => void;
}) {
  const { profileId } = useAuth();
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [docs, setDocs] = useState<StructuredDocument[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [rating, setRating] = useState(visit.rating || 0);
  const [review, setReview] = useState(visit.review || "");
  const [savingReview, setSavingReview] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState(visit.visit_type);
  const [editDoctor, setEditDoctor] = useState(visit.doctor_name || "");
  const [editLocation, setEditLocation] = useState(visit.location || "");
  const [editDate, setEditDate] = useState(visit.visit_date);
  const [editSummary, setEditSummary] = useState(visit.summary || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isPast = visit.visit_date <= new Date().toISOString().slice(0, 10);

  async function handleSaveEdit() {
    setSavingEdit(true);
    try {
      await apiFetch(`/care-visits/${visit.id}`, {
        method: "PUT",
        body: JSON.stringify({
          visit_type: editType.trim(),
          doctor_name: editDoctor.trim() || null,
          location: editLocation.trim() || null,
          visit_date: editDate,
          summary: editSummary.trim(),
        }),
      });
      onUpdated();
    } catch {}
    setSavingEdit(false);
  }

  async function handleDeleteVisit() {
    try {
      await apiFetch(`/care-visits/${visit.id}`, { method: "DELETE" });
      onUpdated();
    } catch {}
  }

  // Fetch notes and documents for this visit
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingExtra(true);
      const promises: Promise<void>[] = [];

      // Notes
      promises.push(
        apiFetch("/notes")
          .then(async (res) => {
            if (!res.ok || cancelled) return;
            const allNotes: VisitNote[] = await res.json();
            setNotes(allNotes.filter((n) => n.visit_id === visit.id));
          })
          .catch(() => {}),
      );

      // Structured documents
      promises.push(
        apiFetch(`/structured-documents?care_visit_id=${visit.id}`)
          .then(async (res) => {
            if (!res.ok || cancelled) return;
            const data: StructuredDocument[] = await res.json();
            setDocs(data);
          })
          .catch(() => {}),
      );

      await Promise.all(promises);
      if (!cancelled) setLoadingExtra(false);
    }
    load();
    return () => { cancelled = true; };
  }, [visit.id]);

  async function handleSaveReview() {
    if (!rating) return;
    setSavingReview(true);
    try {
      await apiFetch(`/care-visits/${visit.id}`, {
        method: "PUT",
        body: JSON.stringify({ rating, review: review.trim() || null }),
      });
    } catch {}
    setSavingReview(false);
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profileId) return;
    e.target.value = "";
    setUploadingDoc(true);
    try {
      // 1. Get presigned URL
      const urlRes = await apiFetch("/documents/upload-url", {
        method: "POST",
        body: JSON.stringify({ session_id: visit.id, filename: file.name }),
      });
      if (!urlRes.ok) { setUploadingDoc(false); return; }
      const { upload_url, key, content_type, required_headers } = await urlRes.json();

      // 2. Upload to S3
      const headers: Record<string, string> = { "Content-Type": content_type, ...required_headers };
      await fetch(upload_url, { method: "PUT", body: file, headers });

      // 3. Process via structured documents
      const processRes = await apiFetch("/structured-documents/upload", {
        method: "POST",
        body: JSON.stringify({
          s3_key: key,
          filename: file.name,
          content_type: content_type,
          care_visit_id: visit.id,
        }),
      });
      if (processRes.ok) {
        const data = await processRes.json();
        if (data.document) {
          setDocs((prev) => [data.document, ...prev]);
        }
      }
    } catch {}
    setUploadingDoc(false);
  }

  function handleScheduleAgain() {
    if (onBookMessage && visit.doctor_name) {
      onBookMessage(`Schedule a follow-up with ${visit.doctor_name}`);
      onClosePopover();
    }
  }

  return (
    <div className="p-6 pb-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={editing ? () => setEditing(false) : onClose}
          className="flex items-center gap-1.5 text-sm font-medium text-[#0F1B3D]/50 hover:text-[#0F1B3D] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {editing ? "Cancel" : "Back"}
        </button>
        {!editing && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="text-[#0F1B3D]/40 hover:text-[#0F1B3D] transition-colors">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setConfirmDelete(true)} className="text-[#0F1B3D]/40 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4">
          <p className="text-[14px] font-semibold text-red-600 mb-2">Delete this visit?</p>
          <div className="flex gap-2">
            <button onClick={handleDeleteVisit} className="flex-1 rounded-xl bg-red-500 py-2 text-[13px] font-semibold text-white hover:bg-red-600 transition-colors">Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-xl border border-[#E5E5EA] py-2 text-[13px] font-semibold text-[#0F1B3D]/60 hover:bg-[#0F1B3D]/[0.04] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {editing ? (
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Visit Type</label>
            <input type="text" value={editType} onChange={(e) => setEditType(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30" />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Doctor</label>
            <input type="text" value={editDoctor} onChange={(e) => setEditDoctor(e.target.value)} placeholder="Optional"
              className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30" />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Location</label>
            <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Optional"
              className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30" />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Date</label>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30" />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Summary</label>
            <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} placeholder="Visit notes..."
              className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 resize-none" />
          </div>
          <button onClick={handleSaveEdit} disabled={!editType.trim() || savingEdit}
            className="w-full rounded-2xl bg-[#0F1B3D] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors">
            {savingEdit ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : (
        <>
          {/* Visit header */}
          <div className="mb-5">
            <p className="text-[22px] font-extrabold text-[#0F1B3D]">{visit.visit_type}</p>
            <p className="text-[14px] text-[#8E8E93] mt-1">
              {formatVisitDate(visit.visit_date)}
              {visit.doctor_name ? ` · ${visit.doctor_name}` : ""}
            </p>
            {visit.location && (
              <p className="text-[13px] text-[#AEAEB2] mt-0.5">{visit.location}</p>
            )}
          </div>
        </>
      )}

      {!editing && (<>
      {/* Schedule again */}
      {visit.doctor_name && onBookMessage && (
        <button
          onClick={handleScheduleAgain}
          className="mb-4 flex items-center justify-center gap-2 w-full rounded-2xl border border-[#0F1B3D]/10 bg-white px-4 py-2.5 text-[14px] font-semibold text-[#0F1B3D]/70 hover:bg-[#0F1B3D]/[0.04] transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Schedule again
        </button>
      )}

      {/* Summary */}
      {visit.summary &&
        visit.summary !== "past visit" &&
        visit.summary !== "upcoming visit" && (
        <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4 mb-3">
          <h4 className="text-[13px] font-bold text-[#0F1B3D]/40 uppercase tracking-wider mb-2">Summary</h4>
          <p className="text-[14px] leading-relaxed text-[#1C1C1E]">{visit.summary}</p>
        </div>
      )}

      {/* Visit Notes */}
      {notes.length > 0 && (
        <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4 mb-3">
          <h4 className="text-[13px] font-bold text-[#0F1B3D]/40 uppercase tracking-wider mb-3">Visit Notes</h4>
          {notes.map((note) => (
            <div key={note.id} className="mb-3 last:mb-0">
              {note.description && (
                <p className="text-[14px] font-semibold text-[#0F1B3D] mb-1.5">{note.description}</p>
              )}
              {note.duration_seconds > 0 && (
                <p className="text-[12px] text-[#AEAEB2] mb-2">
                  {Math.round(note.duration_seconds / 60)} min recording
                </p>
              )}
              {/* Key Points */}
              {note.key_points && note.key_points.length > 0 && (
                <div className="mb-2">
                  <p className="text-[12px] font-bold text-[#0F1B3D]/30 uppercase tracking-wider mb-1">Key Points</p>
                  <ul className="space-y-1">
                    {note.key_points.map((kp, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] text-[#1C1C1E] leading-relaxed">
                        <CircleDot className="h-3 w-3 mt-1.5 shrink-0 text-[#0F1B3D]/30" />
                        {kp.text || kp.point || ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Action Items */}
              {note.action_items && note.action_items.length > 0 && (
                <div>
                  <p className="text-[12px] font-bold text-[#0F1B3D]/30 uppercase tracking-wider mb-1">Action Items</p>
                  <ul className="space-y-1">
                    {note.action_items.map((ai, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] text-[#1C1C1E] leading-relaxed">
                        <CheckSquare className="h-3.5 w-3.5 mt-1 shrink-0 text-[#0F1B3D]/30" />
                        {ai.text || ai.item || ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Labs */}
      {visit.labs && visit.labs.length > 0 && (
        <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden mb-3">
          <div className="px-4 pt-4 pb-2">
            <h4 className="text-[13px] font-bold text-[#0F1B3D]/40 uppercase tracking-wider">Lab Results</h4>
          </div>
          {visit.labs.map((lab, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="h-px bg-[#E5E5EA] mx-4" />}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[14px] text-[#1C1C1E]">{lab.name}</span>
                <span className={`text-[14px] font-semibold ${
                  lab.flag === "high" ? "text-orange-500" :
                  lab.flag === "low" ? "text-red-500" :
                  "text-[#0F1B3D]"
                }`}>
                  {lab.value}
                  {lab.flag && lab.flag !== "normal" && (
                    <span className="ml-1.5 text-[11px] font-bold uppercase">{lab.flag}</span>
                  )}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Documents */}
      <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden mb-3">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h4 className="text-[13px] font-bold text-[#0F1B3D]/40 uppercase tracking-wider">Documents</h4>
          <input
            ref={docInputRef}
            type="file"
            accept="image/*,.pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
            className="hidden"
            onChange={handleDocUpload}
          />
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploadingDoc}
            className="transition-opacity hover:opacity-70"
          >
            {uploadingDoc ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F1B3D]/30 border-t-transparent" />
            ) : (
              <Upload className="h-4 w-4 text-[#0F1B3D]/40" />
            )}
          </button>
        </div>

        {loadingExtra && docs.length === 0 && (
          <div className="px-4 py-4 text-center">
            <div className="h-4 w-4 mx-auto animate-spin rounded-full border-2 border-[#0F1B3D]/20 border-t-[#0F1B3D]/60" />
          </div>
        )}

        {!loadingExtra && docs.length === 0 && (
          <div className="px-4 py-4 text-center">
            <p className="text-[13px] text-[#AEAEB2]">No documents yet. Tap + to upload.</p>
          </div>
        )}

        {docs.map((doc, i) => (
          <React.Fragment key={doc.id}>
            {i > 0 && <div className="h-px bg-[#E5E5EA] mx-4" />}
            <div className="flex items-center gap-3 px-4 py-3">
              <FileText className="h-4 w-4 text-[#34C759] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[#1C1C1E] truncate">{doc.doc_title || doc.filename}</p>
                <p className="text-[12px] text-[#AEAEB2] capitalize">{doc.doc_type.replace(/_/g, " ")}</p>
              </div>
              {doc.download_url && (
                <a
                  href={doc.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[#0F1B3D]/30 hover:text-[#0F1B3D] transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Rating & Review (past visits only) */}
      {isPast && (
        <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4 mb-3">
          <h4 className="text-[13px] font-bold text-[#0F1B3D]/40 uppercase tracking-wider mb-2">
            Rate {visit.doctor_name || "this visit"}
          </h4>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className="h-7 w-7"
                  fill={s <= rating ? "#F5A623" : "none"}
                  stroke={s <= rating ? "#F5A623" : "#D1D5DB"}
                />
              </button>
            ))}
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="How was your experience?"
            rows={3}
            className="w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[14px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 resize-none"
          />
          {rating > 0 && (
            <button
              onClick={handleSaveReview}
              disabled={savingReview}
              className="mt-2 w-full rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors"
            >
              {savingReview ? "Saving..." : "Save Review"}
            </button>
          )}
        </div>
      )}

      {/* Call provider */}
      {visit.doctor_phone && (
        <a
          href={`tel:${visit.doctor_phone}`}
          className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#0F1B3D] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 transition-colors"
        >
          <Phone className="h-4 w-4" />
          Call {visit.doctor_name || "Provider"}
        </a>
      )}
      </>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  Add Provider Panel
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  Provider Detail Panel (view / edit / delete)
// ═══════════════════════════════════════════════════

function ProviderDetailPanel({
  provider,
  profileId,
  onClose,
  onUpdated,
}: {
  provider: DoctorItem;
  profileId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(provider.name || "");
  const [specialty, setSpecialty] = useState(provider.specialty || "Primary Care");
  const [credential, setCredential] = useState(provider.credential || "");
  const [practiceName, setPracticeName] = useState(provider.practice_name || "");
  const [phone, setPhone] = useState(provider.phone || "");
  const [address, setAddress] = useState(provider.address || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    if (!profileId || !provider.id) return;
    setSaving(true);
    try {
      await apiFetch(`/profile/${profileId}/doctors/${provider.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          specialty,
          credential: credential || undefined,
          practice_name: practiceName.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });
      onUpdated();
    } catch {}
    setSaving(false);
  }

  async function handleDelete() {
    if (!profileId || !provider.id) return;
    try {
      await apiFetch(`/profile/${profileId}/doctors/${provider.id}`, { method: "DELETE" });
      onUpdated();
    } catch {}
  }

  const Icon = specialtyIcon(provider.specialty);

  if (!editing) {
    return (
      <div className="p-6 pb-8 animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium text-[#0F1B3D]/50 hover:text-[#0F1B3D] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="text-[#0F1B3D]/40 hover:text-[#0F1B3D] transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[#0F1B3D]/40 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4">
            <p className="text-[14px] font-semibold text-red-600 mb-2">Delete this provider?</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-500 py-2 text-[13px] font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl border border-[#E5E5EA] py-2 text-[13px] font-semibold text-[#0F1B3D]/60 hover:bg-[#0F1B3D]/[0.04] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0F1B3D]/[0.06]">
            <Icon className="h-5 w-5 text-[#0F1B3D]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-extrabold text-[#0F1B3D]">
              {provider.name || provider.specialty}
            </p>
            {provider.credential && (
              <p className="text-[13px] text-[#8E8E93]">{provider.credential}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden">
          {[
            { label: "Specialty", value: provider.specialty },
            { label: "Practice", value: provider.practice_name },
            { label: "Phone", value: provider.phone },
            { label: "Address", value: provider.address },
          ].filter(r => r.value).map((row, i, arr) => (
            <React.Fragment key={row.label}>
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-[14px] text-[#8E8E93]">{row.label}</span>
                {row.label === "Phone" ? (
                  <a href={`tel:${row.value}`} className="text-[14px] font-medium text-[#2563EB]">{row.value}</a>
                ) : (
                  <span className="text-[14px] font-medium text-[#0F1B3D] text-right max-w-[60%] truncate">{row.value}</span>
                )}
              </div>
              {i < arr.length - 1 && <div className="h-px bg-[#E5E5EA] mx-4" />}
            </React.Fragment>
          ))}
        </div>

        {provider.phone && (
          <a href={`tel:${provider.phone}`} className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#0F1B3D] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 transition-colors">
            <Phone className="h-4 w-4" /> Call Office
          </a>
        )}
        {provider.address && (
          <a href={`https://maps.apple.com/?q=${encodeURIComponent(provider.address)}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-[#0F1B3D]/10 bg-white px-4 py-3 text-[15px] font-semibold text-[#0F1B3D]/70 hover:bg-[#0F1B3D]/[0.04] transition-colors">
            <MapPin className="h-4 w-4" /> Get Directions
          </a>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="p-6 pb-8 animate-in fade-in duration-200">
      <button
        onClick={() => setEditing(false)}
        className="flex items-center gap-1.5 text-sm font-medium text-[#0F1B3D]/50 hover:text-[#0F1B3D] transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Cancel
      </button>

      <h3 className="text-[20px] font-extrabold text-[#0F1B3D] mb-5">Edit Provider</h3>

      <div className="space-y-4">
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30" />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Specialty</label>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30">
            {SPECIALTY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Credential</label>
          <div className="flex gap-2 mt-1">
            {["MD/DO", "PA", "NP", "Other"].map((c) => (
              <button key={c} onClick={() => setCredential(credential === c ? "" : c)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${credential === c ? "bg-[#0F1B3D] text-white" : "bg-white border border-[#E5E5EA] text-[#0F1B3D]/60"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Practice</label>
          <input type="text" value={practiceName} onChange={(e) => setPracticeName(e.target.value)} placeholder="Optional"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30" />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30" />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30" />
        </div>
      </div>

      <button onClick={handleSave} disabled={!name.trim() || saving}
        className="mt-6 w-full rounded-2xl bg-[#0F1B3D] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors">
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  Add Provider Panel
// ═══════════════════════════════════════════════════

const SPECIALTY_OPTIONS = [
  "Primary Care", "Dentist", "Eye Doctor", "OB/GYN", "Dermatologist",
  "Cardiologist", "Orthopedic", "Neurologist", "Psychiatrist", "Allergist",
  "ENT", "Urologist", "Gastroenterologist", "Pulmonologist", "Endocrinologist",
  "Oncologist", "Rheumatologist", "Pediatrician", "Chiropractor",
  "Physical Therapy", "Podiatrist", "Pharmacy", "Other",
];

function AddProviderPanel({
  profileId,
  onClose,
  onSaved,
}: {
  profileId: string | null;
  onClose: () => void;
  onSaved: (doc: DoctorItem) => void;
}) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("Primary Care");
  const [practiceName, setPracticeName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !profileId) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/profile/${profileId}/doctors/add`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          specialty,
          practice_name: practiceName.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSaved(data.doctor || { name: name.trim(), specialty });
      }
    } catch {
      // silent
    }
    setSaving(false);
  }

  return (
    <div className="p-6 pb-8 animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 text-sm font-medium text-[#0F1B3D]/50 hover:text-[#0F1B3D] transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h3 className="text-[20px] font-extrabold text-[#0F1B3D] mb-5">Add Provider</h3>

      <div className="space-y-4">
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Sarah Smith"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30"
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Specialty</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30"
          >
            {SPECIALTY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Practice</label>
          <input
            type="text"
            value={practiceName}
            onChange={(e) => setPracticeName(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30"
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30"
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        className="mt-6 w-full rounded-2xl bg-[#0F1B3D] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors"
      >
        {saving ? "Saving..." : "Add Provider"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  Todo Editor Panel (create / edit)
// ═══════════════════════════════════════════════════

function TodoEditorPanel({
  editingTodo,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  editingTodo: { mode: "create" } | { mode: "edit"; todo: CareTodo };
  onClose: () => void;
  onCreate: (data: CareTodoCreate) => Promise<CareTodo | null>;
  onUpdate: (id: string, data: Partial<CareTodoCreate> & { status?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const isEdit = editingTodo.mode === "edit";
  const existing = isEdit ? editingTodo.todo : null;

  const [title, setTitle] = useState(existing?.title || "");
  const [subtitle, setSubtitle] = useState(existing?.subtitle || "");
  const [color, setColor] = useState(existing?.color || "#0F1B3D");
  const [frequency, setFrequency] = useState<string>(existing?.frequency || "once");
  const [dueDate, setDueDate] = useState(existing?.due_date || "");
  const [dueTime, setDueTime] = useState(existing?.due_time || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const data: CareTodoCreate = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      frequency,
      due_date: dueDate || null,
      due_time: dueTime || null,
    };
    if (isEdit && existing) {
      await onUpdate(existing.id, data);
    } else {
      await onCreate(data);
    }
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!isEdit || !existing) return;
    await onDelete(existing.id);
    onClose();
  }

  return (
    <div className="p-6 pb-8 animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 text-sm font-medium text-[#0F1B3D]/50 hover:text-[#0F1B3D] transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h3 className="text-[20px] font-extrabold text-[#0F1B3D] mb-5">
        {isEdit ? "Edit Task" : "New Task"}
      </h3>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Schedule annual physical"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Description</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Optional details"
            className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30"
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Frequency</label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFrequency(opt.value)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  frequency === opt.value
                    ? "bg-[#0F1B3D] text-white"
                    : "bg-white border border-[#E5E5EA] text-[#0F1B3D]/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30"
            />
          </div>
          <div className="flex-1">
            <label className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">Time</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={handleSave}
        disabled={!title.trim() || saving}
        className="mt-6 w-full rounded-2xl bg-[#0F1B3D] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors"
      >
        {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Task"}
      </button>

      {isEdit && (
        <button
          onClick={handleDelete}
          className="mt-2 w-full rounded-2xl border border-red-200 px-4 py-3 text-[15px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
        >
          Delete Task
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  Insurance card visual (carousel-style)
// ═══════════════════════════════════════════════════

function InsuranceCardDisplay({
  card,
  label,
  dark,
  onTapEmpty,
}: {
  card: InsuranceCard | undefined;
  label: string;
  dark: boolean;
  onTapEmpty?: () => void;
}) {
  const hasData = card && Object.values(card.structured_data).some((v) => v);
  const d = card?.structured_data;

  const primary = dark ? "#FFFFFF" : "#0F1B3D";
  const secondary = dark ? "rgba(255,255,255,0.7)" : "#8E8E93";
  const muted = dark ? "rgba(255,255,255,0.5)" : "#AEAEB2";
  const bg = dark ? "#0F1B3D" : "rgba(255,255,255,0.55)";
  const borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <div
      className="shrink-0 snap-center rounded-3xl overflow-hidden relative"
      style={{
        width: "min(280px, 75vw)",
        aspectRatio: "1.6",
        background: bg,
        border: `1px solid ${borderColor}`,
        boxShadow: "0 8px 16px rgba(0,0,0,0.18)",
      }}
    >
      {/* Gloss overlay */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.02) 100%)",
        }}
      />

      {hasData ? (
        <div className="relative h-full flex flex-col justify-between p-5">
          {/* Top: type label */}
          <div>
            <p style={{ color: primary, fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>
              {label}
            </p>
          </div>

          {/* Plan info */}
          <div>
            {d?.plan_name && (
              <p style={{ color: primary, fontSize: 15, fontWeight: 700 }} className="truncate">
                {d.plan_name}
              </p>
            )}
            {d?.provider && (
              <p style={{ color: secondary, fontSize: 11, fontWeight: 600 }} className="mt-px truncate">
                {d.provider}
              </p>
            )}
          </div>

          {/* ID row */}
          <div className="flex gap-7">
            {d?.member_id && (
              <div>
                <p style={{ color: muted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Member ID
                </p>
                <p style={{ color: primary, fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }} className="mt-px">
                  {d.member_id}
                </p>
              </div>
            )}
            {d?.group_number && (
              <div>
                <p style={{ color: muted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Group #
                </p>
                <p style={{ color: primary, fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }} className="mt-px">
                  {d.group_number}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Placeholder */
        <button
          onClick={onTapEmpty}
          className="h-full w-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#ECECED] transition-colors"
          style={{ background: "#F4F4F5" }}
        >
          <PlusCircle className="h-10 w-10 text-[#AEAEB2]" />
          <p className="text-[18px] font-bold text-[#0F1B3D] mt-3">Add {label} Insurance</p>
          <p className="text-[13px] text-[#AEAEB2] mt-1 text-center px-6">
            Upload your card or type in your info
          </p>
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  Insurance expandable detail row
// ═══════════════════════════════════════════════════

function InsuranceDetailRow({
  icon: Icon,
  label,
  card,
  cardType,
  fields,
  expanded,
  onToggle,
  onRefresh,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  card: InsuranceCard | undefined;
  cardType: string;
  fields: [string, string][];
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const hasData = card && Object.values(card.structured_data).some((v) => v);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cardFileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Init edit values when entering edit mode
  function startEditing() {
    if (!card) return;
    const vals: Record<string, string> = {};
    for (const [key] of fields) {
      vals[key] = card.structured_data[key] || "";
    }
    setEditValues(vals);
    setEditing(true);
  }

  function handleFieldChange(key: string, value: string) {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveFields() {
    if (!card?.id) return;
    setSaving(true);
    try {
      const updates: Record<string, string | null> = {};
      for (const [key, val] of Object.entries(editValues)) {
        updates[key] = val.trim() || null;
      }
      await apiFetch(`/insurance/cards/${cardType}/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      });
      setEditing(false);
      onRefresh();
    } catch {}
    setSaving(false);
  }

  async function handleDelete() {
    if (!card?.id) return;
    try {
      await apiFetch(`/insurance/cards/${cardType}/${card.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      onRefresh();
    } catch {}
  }

  async function handleCardUpload(e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("card_type", cardType);
      form.append("side", side);
      await apiFetch("/insurance/ocr", {
        method: "POST",
        body: form,
      });
      onRefresh();
    } catch {}
    setUploading(false);
  }

  return (
    <>
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full px-3.5 py-3.5 text-left hover:bg-[#F7F6F2]/50 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F6F2]">
          <Icon className="h-[18px] w-[18px] text-[#0F1B3D]" />
        </div>
        <p className="text-[16px] font-semibold text-[#1C1C1E] flex-1">{label}</p>
        <ChevronRight
          className="h-[18px] w-[18px] text-[#0F1B3D] shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}
        />
      </button>

      {expanded && (
        <div className="px-3.5 pb-4">
          {/* Action buttons */}
          {hasData && (
            <div className="flex gap-2 mb-3">
              {!editing ? (
                <button onClick={startEditing} className="flex items-center gap-1.5 text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              ) : (
                <button onClick={() => setEditing(false)} className="text-[13px] font-medium text-[#8E8E93]">Cancel</button>
              )}
              <span className="text-[#E5E5EA]">|</span>
              <button onClick={() => setConfirmDelete(true)} className="text-[13px] font-medium text-red-400 hover:text-red-500 transition-colors">
                Delete
              </button>
            </div>
          )}

          {confirmDelete && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-3">
              <p className="text-[13px] font-semibold text-red-600 mb-2">Delete {label.toLowerCase()} insurance?</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="flex-1 rounded-lg bg-red-500 py-1.5 text-[12px] font-semibold text-white">Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-lg border border-[#E5E5EA] py-1.5 text-[12px] font-semibold text-[#0F1B3D]/60">Cancel</button>
              </div>
            </div>
          )}

          {/* Card images + upload */}
          <div className="flex gap-2 mb-3">
            <input ref={cardFileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleCardUpload(e, "front")} />
            {card?.front_url ? (
              <div className="flex-1 h-[120px] rounded-[10px] bg-[#F7F6F2] overflow-hidden relative group cursor-pointer"
                onClick={() => cardFileRef.current?.click()}>
                <img src={card.front_url} alt="Front" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="h-5 w-5 text-white" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => cardFileRef.current?.click()}
                className="flex-1 h-[120px] rounded-[10px] border-2 border-dashed border-[#E5E5EA] flex flex-col items-center justify-center gap-1 text-[#AEAEB2] hover:border-[#0F1B3D]/20 hover:text-[#0F1B3D]/40 transition-colors"
              >
                {uploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#AEAEB2] border-t-transparent" />
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Upload front</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Fields */}
          {editing ? (
            <>
              {fields.map(([key, fieldLabel]) => (
                <div key={key} className="mb-2.5">
                  <p className="text-[13px] font-medium text-[#8E8E93] mb-1 ml-1">{fieldLabel}</p>
                  <input
                    type="text"
                    value={editValues[key] || ""}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="w-full bg-white rounded-xl border border-[#E5E5EA] px-3.5 py-3 text-[15px] text-[#1C1C1E] outline-none focus:border-[#0F1B3D]/30"
                  />
                </div>
              ))}
              <button onClick={handleSaveFields} disabled={saving}
                className="w-full rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors mt-1">
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : hasData ? (
            fields.map(([key, fieldLabel]) => {
              const value = card!.structured_data[key];
              if (!value) return null;
              return (
                <div key={key} className="mb-2.5">
                  <p className="text-[13px] font-medium text-[#8E8E93] mb-1 ml-1">{fieldLabel}</p>
                  <div className="bg-white rounded-xl border border-[#E5E5EA] px-3.5 py-3.5">
                    <p className="text-[16px] text-[#1C1C1E]">{value}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-2">
              <p className="text-[13px] text-[#AEAEB2]">
                Upload your {label.toLowerCase()} card to see details here.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
