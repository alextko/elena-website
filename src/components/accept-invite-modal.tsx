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

interface AcceptInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted?: () => void;
}

interface InvitePreview {
  inviter_name: string;
  relationship: string;
}

export function AcceptInviteModal({
  open,
  onOpenChange,
  onAccepted,
}: AcceptInviteModalProps) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCode("");
    setPreview(null);
    setLoading(false);
    setResponding(false);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/family/invite/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Invalid or expired invite code.");
      }
      const data: InvitePreview = await res.json();
      setPreview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setResponding(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/family/invite/${encodeURIComponent(code.trim())}/accept`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Failed to accept invite.");
      }
      onAccepted?.();
      handleOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResponding(false);
    }
  }

  async function handleDecline() {
    setResponding(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/family/invite/${encodeURIComponent(code.trim())}/decline`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Failed to decline invite.");
      }
      handleOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResponding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#0F1B3D]">
            Accept a Family Invite
          </DialogTitle>
          <DialogDescription className="text-[#0F1B3D]/60">
            Enter the invite code you received to connect with a family member.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <form onSubmit={handleLookup} className="mt-4 flex flex-col gap-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Invite code"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#0F1B3D] placeholder:text-gray-400 outline-none focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5]"
            />

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] px-6 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            >
              {loading ? "Looking up..." : "Look Up Invite"}
            </button>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-[#0F1B3D]">
                <span className="font-semibold">{preview.inviter_name}</span>{" "}
                wants to connect as your{" "}
                <span className="font-semibold">{preview.relationship}</span>
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDecline}
                disabled={responding}
                className="flex-1 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-[#0F1B3D] transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={responding}
                className="flex-1 rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] px-6 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              >
                {responding ? "Processing..." : "Accept"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
