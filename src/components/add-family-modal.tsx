"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";

interface AddFamilyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileCreated?: (profileId: string) => void;
}

type Tab = "manage" | "invite";

const RELATIONSHIP_OPTIONS = [
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
];

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#0F1B3D] placeholder:text-gray-400 outline-none focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5] transition-colors";

const selectClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5] transition-colors appearance-none bg-white";

const gradientButtonClassName =
  "w-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] text-white rounded-full py-2.5 px-4 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

export function AddFamilyModal({
  open,
  onOpenChange,
  onProfileCreated,
}: AddFamilyModalProps) {
  const { profileData } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("manage");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manage profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Invite fields
  const [inviteeName, setInviteeName] = useState("");
  const [inviteRelationship, setInviteRelationship] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setRelationship("");
    setDateOfBirth("");
    setZipCode("");
    setInviteeName("");
    setInviteRelationship("");
    setInviteCode(null);
    setCopied(false);
    setError(null);
    setLoading(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetForm();
      setActiveTab("manage");
    }
    onOpenChange(next);
  }

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/profiles", {
        method: "POST",
        body: JSON.stringify({
          label: relationship,
          relationship,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth || undefined,
          home_address: zipCode || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to create profile");
      }

      const data = await res.json();
      onProfileCreated?.(data.id || data.profile_id);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/family/invite", {
        method: "POST",
        body: JSON.stringify({
          invitee_name: inviteeName,
          relationship: inviteRelationship,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to send invite");
      }

      const data = await res.json();
      setInviteCode(data.invite_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteCode) return;
    const userName = profileData?.firstName || "";
    const shareUrl = `https://elena-health.com/invite/${inviteCode}?from=${encodeURIComponent(userName)}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#0F1B3D]">
            Add family member
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Create a profile you manage or invite someone to connect.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="mt-4 flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("manage");
              setError(null);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              activeTab === "manage"
                ? "bg-white text-[#0F1B3D] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Manage their profile
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("invite");
              setError(null);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              activeTab === "invite"
                ? "bg-white text-[#0F1B3D] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Invite to connect
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Manage profile form */}
        {activeTab === "manage" && (
          <form onSubmit={handleCreateProfile} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">
                  First name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">
                  Last name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">
                Relationship
              </label>
              <select
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className={selectClassName}
              >
                <option value="" disabled>
                  Select relationship
                </option>
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">
                Date of birth{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">
                Zip code{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="e.g. 02139"
                inputMode="numeric"
                pattern="[0-9]{5}"
                className={inputClassName}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !firstName || !lastName || !relationship}
              className={gradientButtonClassName}
            >
              {loading ? "Adding..." : "Add family member"}
            </button>
          </form>
        )}

        {/* Invite form */}
        {activeTab === "invite" && (
          <>
            {inviteCode ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-[#0F1B3D]/70">
                  Send this link to your family member so they can connect with you on Elena:
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-[#F5F7FB] px-4 py-3">
                  <span className="flex-1 text-sm text-[#0F1B3D]/60 truncate">
                    elena-health.com/invite/{inviteCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#0F1B3D] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        Copy link
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className={gradientButtonClassName}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteeName}
                    onChange={(e) => setInviteeName(e.target.value)}
                    placeholder="Their name"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0F1B3D]">
                    Relationship
                  </label>
                  <select
                    required
                    value={inviteRelationship}
                    onChange={(e) => setInviteRelationship(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>
                      Select relationship
                    </option>
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !inviteeName || !inviteRelationship}
                  className={gradientButtonClassName}
                >
                  {loading ? "Sending..." : "Send invite"}
                </button>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
