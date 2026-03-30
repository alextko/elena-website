"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";

export function OnboardingModal() {
  const { needsOnboarding, completeOnboarding } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    await completeOnboarding({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dob,
      home_address: address.trim(),
    });
    setSaving(false);
  }

  async function handleSkip() {
    setSaving(true);
    await completeOnboarding({});
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
              Welcome to Elena
            </h2>
            <p className="text-[14px] text-[#8E8E93] mt-1.5 leading-relaxed">
              Help us personalize your experience. All fields are optional.
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
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
                  className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
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
                  className="mt-1 w-full rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#0F1B3D]/30 transition-colors"
                />
              </div>
            </div>

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
                Home address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
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
