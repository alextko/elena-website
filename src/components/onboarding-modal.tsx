"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import * as analytics from "@/lib/analytics";

export function OnboardingModal() {
  const { needsOnboarding, completeOnboarding, profileData } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync from profileData when it arrives. Names come from Google OAuth.
  // DOB + zip can be pre-filled from quiz/DME funnel data surfaced via /auth/me
  // — so users who already gave us those fields on the website don't retype them.
  useEffect(() => {
    if (profileData?.firstName && !firstName) setFirstName(profileData.firstName);
    if (profileData?.lastName && !lastName) setLastName(profileData.lastName);
    if (profileData?.dob && !dob) setDob(profileData.dob);
    if (profileData?.zipCode && !zipCode) setZipCode(profileData.zipCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.firstName, profileData?.lastName, profileData?.dob, profileData?.zipCode]);

  const hasName = !!(profileData?.firstName);

  useEffect(() => {
    if (needsOnboarding) analytics.track("Onboarding Modal Shown");
  }, [needsOnboarding]);

  async function handleSubmit() {
    setSaving(true);
    analytics.track("Onboarding Completed", {
      fields_filled: [
        firstName.trim() && "first_name",
        lastName.trim() && "last_name",
        dob && "dob",
        zipCode.trim() && "zip_code",
      ].filter(Boolean),
    });
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    await completeOnboarding({
      first_name: cap(firstName.trim()),
      last_name: cap(lastName.trim()),
      date_of_birth: dob,
      home_address: zipCode.trim(),
    });
    setSaving(false);
  }

  async function handleSkip() {
    setSaving(true);
    analytics.track("Onboarding Completed", { fields_filled: [], skipped: true });
    analytics.track("Onboarding Skipped");
    // Still save the Google name if we have it
    await completeOnboarding({
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
    });
    setSaving(false);
  }

  if (!needsOnboarding) return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="w-[90vw] max-w-md rounded-2xl bg-white p-0 shadow-xl"
      >
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-3xl mb-3">👋</div>
            <h2 className="text-[22px] font-extrabold text-[#0F1B3D]">
              {hasName ? `Hey ${profileData.firstName}!` : "Welcome to Elena"}
            </h2>
            <p className="text-[14px] text-[#8E8E93] mt-1.5 leading-relaxed">
              Help us personalize your experience.
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {!hasName && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    autoCapitalize="words"
                    className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors capitalize"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    autoCapitalize="words"
                    className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors capitalize"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                Date of birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none focus:border-[#0F1B3D]/30 transition-colors"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                Zip code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="10001"
                className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="mt-5 w-full rounded-2xl bg-[#0F1B3D] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 disabled:opacity-40 transition-colors"
          >
            {saving ? "Setting up..." : "Get started"}
          </button>
          <button
            onClick={handleSkip}
            disabled={saving}
            className="mt-2 w-full rounded-2xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:text-[#0F1B3D] transition-colors"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
