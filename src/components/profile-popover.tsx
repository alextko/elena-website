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
  Sparkles,
  Star,
  Pill,
  Eye,
  SmilePlus,
  FileText,
  PlusCircle,
  Pencil,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
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

export function ProfilePopover({ children }: { children: React.ReactNode }) {
  const {
    user, profileId, profileData, doctors, careVisits,
    credits, subscription, insuranceCards,
    profileDetailsLoaded, fetchProfileDetails, updateProfilePicture, signOut,
  } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("health");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [open, profileDetailsLoaded, fetchProfileDetails]);

  const visitsScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll visits so today is at the top of the visible area
  useEffect(() => {
    if (activeTab === "visits" && todayRef.current && visitsScrollRef.current) {
      requestAnimationFrame(() => {
        const container = visitsScrollRef.current;
        const todayEl = todayRef.current;
        if (!container || !todayEl) return;
        // Scroll so today marker is ~4px from the top of the container
        const offset = todayEl.offsetTop - container.offsetTop - 4;
        container.scrollTop = Math.max(0, offset);
      });
    }
  }, [activeTab, careVisits]);

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
        className="w-full max-w-md rounded-2xl border-[#0F1B3D]/[0.08] bg-[#F7F6F2] p-0 shadow-xl"
      >
        <div ref={scrollRef} className="max-h-[80vh] overflow-y-auto">
          <div className="p-6">
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
                {hasProfile && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] border border-[#0F1B3D]/[0.08] text-[#0F1B3D]/50 group-hover:text-[#0F1B3D] transition-colors">
                    {uploadingPhoto ? (
                      <div className="h-2.5 w-2.5 animate-spin rounded-full border border-[#0F1B3D]/30 border-t-transparent" />
                    ) : (
                      <Pencil className="h-2.5 w-2.5" />
                    )}
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-[#0F1B3D]">{displayName}</p>
                <p className="truncate text-sm text-[#0F1B3D]/40">{email}</p>
              </div>
            </div>

            {/* Tab pills */}
            <div className="flex gap-1.5 mt-1 mb-2">
              <TabPill label="Health" active={activeTab === "health"} onClick={() => setActiveTab("health")} />
              <TabPill label="Visits" active={activeTab === "visits"} onClick={() => setActiveTab("visits")} />
              <TabPill label="Insurance" active={activeTab === "insurance"} onClick={() => setActiveTab("insurance")} />
            </div>

            <div className="h-px bg-[#E5E5EA] mb-3" />

            {/* ═══════════ HEALTH TAB ═══════════ */}
            {activeTab === "health" && (
              <div className="space-y-3">
                {/* Providers */}
                <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="px-3.5 pt-3.5 pb-1">
                    <h3 className="text-[15px] font-extrabold text-[#0F1B3D]">Providers</h3>
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
                        <div className="flex items-center gap-3 px-3.5 py-3.5">
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
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Credits summary */}
                <div
                  className={`rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden ${subscription?.plan !== "pro" ? "cursor-pointer hover:bg-[#F7F6F2] transition-colors" : ""}`}
                  onClick={subscription?.plan !== "pro" ? () => { setOpen(false); setUpgradeOpen(true); } : undefined}
                >
                  <div className="flex items-center gap-3 px-3.5 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F6F2]">
                      <Sparkles className="h-[18px] w-[18px] text-[#0F1B3D]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold text-[#1C1C1E]">
                        {credits !== null ? `${credits} credits` : "Loading..."}
                      </p>
                      <p className="text-[13px] text-[#8E8E93] mt-px capitalize">
                        {subscription?.plan || "Free"} plan
                      </p>
                    </div>
                    {subscription?.plan !== "pro" && (
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
                    <div className="px-4 pt-4 pb-2">
                      <h3 className="text-[24px] font-extrabold text-[#0F1B3D]">Timeline</h3>
                    </div>

                    {/* Scrollable timeline — fixed height, today scrolled to top */}
                    <div
                      ref={visitsScrollRef}
                      className="overflow-y-auto px-2 pb-4"
                      style={{ height: "320px" }}
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
                            <div className="flex-1 min-w-0 bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] px-3.5 py-3 mb-3 ml-2.5">
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
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Today marker at end if all visits are in the past */}
                    {sortedVisits.length > 0 &&
                      sortedVisits.every((v) => v.visit_date < today) && (
                        <div ref={todayRef} className="flex items-center gap-0 ml-1 my-2">
                          <div className="flex flex-col items-center w-6 shrink-0">
                            <div className="w-0.5 h-3 bg-[#93B5E1]" />
                            <div className="w-3 h-3 rounded-full bg-[#4A7AB5] shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 ml-2.5">
                            <span className="text-[16px] font-bold text-[#4A7AB5]">Today</span>
                            <span className="text-[13px] font-medium text-[#6B9BD2]">
                              {formatVisitDate(today)}
                            </span>
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
              <div className="space-y-0">
                {/* Insurance cards carousel-style display */}
                <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
                  <InsuranceCardDisplay card={medicalCard} label="Medical" dark />
                  <InsuranceCardDisplay card={dentalCard} label="Dental" dark={false} />
                  <InsuranceCardDisplay card={visionCard} label="Vision" dark />
                </div>

                {/* Expandable detail sections */}
                <div className="rounded-2xl bg-[#FEFEFB] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden mt-3">
                  <InsuranceDetailRow
                    icon={Pill} label="Medical" card={medicalCard} fields={MEDICAL_FIELDS}
                    expanded={expandedCard === "medical"}
                    onToggle={() => setExpandedCard(expandedCard === "medical" ? null : "medical")}
                  />
                  <div className="h-px bg-[#E5E5EA] ml-[62px] mr-3.5" />
                  <InsuranceDetailRow
                    icon={SmilePlus} label="Dental" card={dentalCard} fields={DENTAL_FIELDS}
                    expanded={expandedCard === "dental"}
                    onToggle={() => setExpandedCard(expandedCard === "dental" ? null : "dental")}
                  />
                  <div className="h-px bg-[#E5E5EA] ml-[62px] mr-3.5" />
                  <InsuranceDetailRow
                    icon={Eye} label="Vision" card={visionCard} fields={VISION_FIELDS}
                    expanded={expandedCard === "vision"}
                    onToggle={() => setExpandedCard(expandedCard === "vision" ? null : "vision")}
                  />
                </div>
              </div>
            )}

            <div className="h-px bg-[#E5E5EA] mt-4" />

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 py-4 text-sm text-[#0F1B3D]/40 transition-colors hover:text-[#0F1B3D]/60"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════
//  Insurance card visual (carousel-style)
// ═══════════════════════════════════════════════════

function InsuranceCardDisplay({
  card,
  label,
  dark,
}: {
  card: InsuranceCard | undefined;
  label: string;
  dark: boolean;
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
        <div className="h-full flex flex-col items-center justify-center" style={{ background: "#F4F4F5" }}>
          <PlusCircle className="h-10 w-10 text-[#AEAEB2]" />
          <p className="text-[18px] font-bold text-[#0F1B3D] mt-3">Add {label} Insurance</p>
          <p className="text-[13px] text-[#AEAEB2] mt-1 text-center px-6">
            Upload your card to see plan details here
          </p>
        </div>
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
  fields,
  expanded,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  card: InsuranceCard | undefined;
  fields: [string, string][];
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasData = card && Object.values(card.structured_data).some((v) => v);

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

      {expanded && hasData && (
        <div className="px-3.5 pb-4">
          {/* Card images */}
          {(card!.front_url || card!.back_url) && (
            <div className="flex gap-2 mb-3">
              {card!.front_url && (
                <div className="flex-1 h-[120px] rounded-[10px] bg-[#F7F6F2] overflow-hidden">
                  <img src={card!.front_url} alt="Front" className="w-full h-full object-cover" />
                </div>
              )}
              {card!.back_url && (
                <div className="flex-1 h-[120px] rounded-[10px] bg-[#F7F6F2] overflow-hidden">
                  <img src={card!.back_url} alt="Back" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* Fields */}
          {fields.map(([key, fieldLabel]) => {
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
          })}
        </div>
      )}

      {expanded && !hasData && (
        <div className="px-3.5 pb-4 text-center">
          <p className="text-[13px] text-[#AEAEB2]">
            Upload your {label.toLowerCase()} card in the app to see details here.
          </p>
        </div>
      )}
    </>
  );
}
