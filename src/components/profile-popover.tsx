"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Stethoscope, Calendar, CreditCard, LogOut, ChevronRight } from "lucide-react";

// Mock data — will be fetched from API later
const MOCK_USER = {
  name: "Alex Reinhart",
  email: "alex@example.com",
  initials: "AR",
  hasAppAccount: true,
  credits: 5,
};

const MOCK_DOCUMENTS = [
  { id: "1", title: "After Visit Summary - Dec 2024", type: "medical_record", date: "2024-12-19" },
  { id: "2", title: "Byrd EOB Office Visit", type: "eob", date: "2026-02-19" },
  { id: "3", title: "HPP ODED 1500 SoB", type: "bill", date: "2026-03-22" },
];

const MOCK_PROVIDERS = [
  { name: "Dr. Justine Kramer", specialty: "Orthopedics", practice: "NYC Ortho" },
  { name: "Dr. Anthony Bittar", specialty: "Primary Care", practice: "City Health Partners" },
  { name: "Dr. Sarah Chen", specialty: "Dentist", practice: "Bright Smile Dental" },
];

const MOCK_VISITS = [
  { type: "Primary Care", doctor: "Dr. Anthony Bittar", date: "Apr 2, 2026" },
  { type: "Orthopedics", doctor: "Dr. Justine Kramer", date: "Apr 30, 2026" },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-1 pb-1.5 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[#0F1B3D]/30 first:pt-0">
      {children}
    </h3>
  );
}

export function ProfilePopover({ children }: { children: React.ReactNode }) {
  const user = MOCK_USER;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-72 rounded-xl border-[#0F1B3D]/[0.08] bg-[#f5f7fb] p-0 shadow-lg"
      >
        <ScrollArea className="max-h-[420px]">
          <div className="p-4">
            {/* User header */}
            <div className="flex items-center gap-3 pb-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[#0F1B3D]/[0.06] text-sm font-semibold text-[#0F1B3D]/50">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#0F1B3D]">{user.name}</p>
                <p className="truncate text-xs text-[#0F1B3D]/40">{user.email}</p>
              </div>
            </div>

            <div className="h-px bg-[#0F1B3D]/[0.06]" />

            {/* Documents */}
            <SectionHeader>Documents</SectionHeader>
            <div className="space-y-1">
              {MOCK_DOCUMENTS.map((doc) => (
                <button
                  key={doc.id}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#0F1B3D]/[0.04]"
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[#0F1B3D]/30" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.78rem] text-[#0F1B3D]/70">{doc.title}</p>
                  </div>
                  <span className="text-[0.6rem] text-[#0F1B3D]/25">{doc.date}</span>
                </button>
              ))}
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[0.78rem] text-[#0F1B3D]/40 transition-colors hover:text-[#0F1B3D]/60">
                Upload document
              </button>
            </div>

            {/* Providers — only for app users */}
            {user.hasAppAccount && (
              <>
                <div className="mt-2 h-px bg-[#0F1B3D]/[0.06]" />
                <SectionHeader>Your Providers</SectionHeader>
                <div className="space-y-1">
                  {MOCK_PROVIDERS.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                    >
                      <Stethoscope className="h-3.5 w-3.5 flex-shrink-0 text-[#0F1B3D]/30" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.78rem] text-[#0F1B3D]/70">{doc.name}</p>
                        <p className="truncate text-[0.65rem] text-[#0F1B3D]/30">{doc.specialty} · {doc.practice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Upcoming visits — only for app users */}
            {user.hasAppAccount && MOCK_VISITS.length > 0 && (
              <>
                <div className="mt-2 h-px bg-[#0F1B3D]/[0.06]" />
                <SectionHeader>Upcoming Visits</SectionHeader>
                <div className="space-y-1">
                  {MOCK_VISITS.map((visit, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                    >
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-[#0F1B3D]/30" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.78rem] text-[#0F1B3D]/70">{visit.type} — {visit.doctor}</p>
                        <p className="text-[0.65rem] text-[#0F1B3D]/30">{visit.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-2 h-px bg-[#0F1B3D]/[0.06]" />

            {/* Credits + upgrade */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-[#0F1B3D]/30" />
                <span className="text-[0.78rem] text-[#0F1B3D]/50">{user.credits} credits</span>
              </div>
              <button className="flex items-center gap-0.5 text-[0.75rem] font-semibold text-[#0F1B3D]/60 transition-colors hover:text-[#0F1B3D]">
                Upgrade
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="h-px bg-[#0F1B3D]/[0.06]" />

            {/* Sign out */}
            <button className="flex w-full items-center gap-2 py-3 text-[0.78rem] text-[#0F1B3D]/40 transition-colors hover:text-[#0F1B3D]/60">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
