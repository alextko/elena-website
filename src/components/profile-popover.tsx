"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Stethoscope, Calendar, CreditCard, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-1 pb-1.5 pt-4 text-[0.65rem] font-semibold uppercase tracking-wider text-[#0F1B3D]/30 first:pt-0">
      {children}
    </h3>
  );
}

export function ProfilePopover({ children }: { children: React.ReactNode }) {
  const {
    user,
    profileId,
    profileData,
    doctors,
    appointments,
    credits,
    profileDetailsLoaded,
    fetchProfileDetails,
    signOut,
  } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Fetch profile details lazily on first open — cached in auth context
  useEffect(() => {
    if (open && !profileDetailsLoaded) {
      fetchProfileDetails();
    }
  }, [open, profileDetailsLoaded, fetchProfileDetails]);

  const displayName =
    profileData?.firstName && profileData?.lastName
      ? `${profileData.firstName} ${profileData.lastName}`
      : user?.email?.split("@")[0] || "User";
  const initials = profileData?.firstName
    ? `${profileData.firstName[0]}${profileData.lastName?.[0] || ""}`.toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();
  const email = user?.email || "";
  const hasProfile = !!profileId;

  // Dedupe
  const uniqueAppointments = appointments.filter(
    (v, i, arr) => arr.findIndex((a) => a.booking_id === v.booking_id) === i,
  );
  const uniqueDoctors = doctors.filter(
    (d, i, arr) => arr.findIndex((x) => x.name === d.name && x.specialty === d.specialty) === i,
  );

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement}></DialogTrigger>
      <DialogContent
        showCloseButton
        className="w-full max-w-md rounded-2xl border-[#0F1B3D]/[0.08] bg-[#f5f7fb] p-0 shadow-xl"
      >
        <div className="max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            {/* User header */}
            <div className="flex items-center gap-4 pb-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-[#0F1B3D]/[0.06] text-base font-semibold text-[#0F1B3D]/50">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-[#0F1B3D]">{displayName}</p>
                <p className="truncate text-sm text-[#0F1B3D]/40">{email}</p>
              </div>
            </div>

            <div className="h-px bg-[#0F1B3D]/[0.06]" />

            {/* Providers */}
            {hasProfile && (
              <>
                <SectionHeader>Your Providers</SectionHeader>
                <div className="space-y-1">
                  {uniqueDoctors.length === 0 && profileDetailsLoaded && (
                    <p className="px-2 py-2 text-sm text-[#0F1B3D]/30">No providers added yet</p>
                  )}
                  {uniqueDoctors.map((provider, i) => (
                    <div
                      key={provider.id || i}
                      className="flex items-center gap-3 rounded-lg px-2 py-2"
                    >
                      <Stethoscope className="h-4 w-4 flex-shrink-0 text-[#0F1B3D]/30" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#0F1B3D]/70">{provider.name}</p>
                        <p className="truncate text-xs text-[#0F1B3D]/30">
                          {provider.specialty}
                          {provider.practice_name ? ` · ${provider.practice_name}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Upcoming appointments */}
            {hasProfile && uniqueAppointments.length > 0 && (
              <>
                <div className="mt-2 h-px bg-[#0F1B3D]/[0.06]" />
                <SectionHeader>Upcoming Visits</SectionHeader>
                <div className="space-y-1">
                  {uniqueAppointments.map((visit) => (
                    <div
                      key={visit.booking_id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2"
                    >
                      <Calendar className="h-4 w-4 flex-shrink-0 text-[#0F1B3D]/30" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#0F1B3D]/70">
                          {visit.provider_specialty || "Visit"} — {visit.provider_name}
                        </p>
                        <p className="text-xs text-[#0F1B3D]/30">
                          {visit.confirmed_date}
                          {visit.confirmed_time ? ` at ${visit.confirmed_time}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-3 h-px bg-[#0F1B3D]/[0.06]" />

            {/* Credits + upgrade */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#0F1B3D]/30" />
                <span className="text-sm text-[#0F1B3D]/50">
                  {credits !== null ? `${credits} credits` : "Loading..."}
                </span>
              </div>
              <button className="flex items-center gap-0.5 text-sm font-semibold text-[#0F1B3D]/60 transition-colors hover:text-[#0F1B3D]">
                Upgrade
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-px bg-[#0F1B3D]/[0.06]" />

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
  );
}
