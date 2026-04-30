"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/apiFetch";
import { AuthModal } from "@/components/auth-modal";

interface InvitePreview {
  invite_id: string;
  invite_code: string;
  inviter_name: string;
  inviter_profile_picture_url: string | null;
  relationship: string;
  status: string;
  expired: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://elena-backend-production-production.up.railway.app";

export default function InviteClient({ code, fromName }: { code: string; fromName: string | null }) {
  const router = useRouter();
  const { session, loading: authLoading, profileId } = useAuth();

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultMode, setAuthDefaultMode] = useState<"signin" | "signup">("signup");

  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const autoAcceptAttempted = useRef(false);

  // Fetch invite preview (plain fetch, no auth needed)
  useEffect(() => {
    let cancelled = false;
    async function fetchInvite() {
      try {
        const url = `${API_BASE}/family/invite/${code}`;
        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (!cancelled) setFetchError(data?.detail || "This invite link is not valid.");
          if (!cancelled) setLoadingInvite(false);
          return;
        }
        const data: InvitePreview = await res.json();
        if (!cancelled) {
          setInvite(data);
          setLoadingInvite(false);
        }
      } catch {
        if (!cancelled) {
          setFetchError("Could not load invite. Please check your connection and try again.");
          setLoadingInvite(false);
        }
      }
    }
    fetchInvite();
    return () => { cancelled = true; };
  }, [code]);

  // Auto-accept after signup/login if pending invite matches
  // Wait for profileId — new signups won't have a profile until onboarding completes
  useEffect(() => {
    if (authLoading || !session || !profileId || !invite || autoAcceptAttempted.current) return;
    if (invite.status !== "pending" || invite.expired) return;

    const pendingCode = localStorage.getItem("elena_pending_invite");
    if (pendingCode === code) {
      autoAcceptAttempted.current = true;
      handleAccept();
    }
  }, [authLoading, session, profileId, invite, code]);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    setActionResult(null);
    try {
      const res = await apiFetch(`/family/invite/${code}/accept`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionResult({ type: "error", message: data?.detail || "Failed to accept invite." });
        setAccepting(false);
        return;
      }
      localStorage.removeItem("elena_pending_invite");
      setActionResult({ type: "success", message: "You are now connected! Redirecting..." });
      // Clear any stale pending query and set an invite-related first message
      localStorage.removeItem("elena_pending_query");
      localStorage.setItem("elena_pending_query", `I just connected with ${inviterDisplay} on Elena. How do I switch to their profile to help manage their health?`);
      setTimeout(() => { window.location.href = "/chat"; }, 1500);
    } catch {
      setActionResult({ type: "error", message: "Network error. Please try again." });
      setAccepting(false);
    }
  }, [code, router]);

  function handleDecline() {
    setDeclining(true);
    setActionResult(null);
    apiFetch(`/family/invite/${code}/decline`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setActionResult({ type: "error", message: data?.detail || "Failed to decline invite." });
        } else {
          setActionResult({ type: "success", message: "Invite declined." });
        }
      })
      .catch(() => {
        setActionResult({ type: "error", message: "Network error. Please try again." });
      })
      .finally(() => setDeclining(false));
  }

  function openAuthModal(mode: "signin" | "signup") {
    localStorage.setItem("elena_pending_invite", code);
    setAuthDefaultMode(mode);
    setAuthModalOpen(true);
  }

  const isLoading = loadingInvite || authLoading;
  const isExpiredOrUsed = invite && (invite.status !== "pending" || invite.expired);
  const isLoggedIn = !!session;
  const hasProfile = !!profileId;

  useEffect(() => {
    if (!invite) return;
    if (invite.status !== "pending" || invite.expired) {
      localStorage.removeItem("elena_pending_invite");
    }
  }, [invite]);

  // New signup without a profile: redirect to /chat for onboarding
  // The pending invite in localStorage will auto-accept after profile creation
  useEffect(() => {
    if (isLoggedIn && !hasProfile && !authLoading) {
      localStorage.setItem("elena_pending_invite", code);
      window.location.href = "/chat";
    }
  }, [isLoggedIn, hasProfile, authLoading, code]);

  const inviterDisplay = invite?.inviter_name || fromName || "Someone";
  const relationshipDisplay = invite?.relationship
    ? invite.relationship.charAt(0).toUpperCase() + invite.relationship.slice(1)
    : null;

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 font-[family-name:var(--font-inter)]"
      style={{
        background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)",
      }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 85% 130%, #F4B084 0%, #E8956D 25%, rgba(46,107,181,0) 60%)" }} />

      <div className="relative z-10 mb-8">
        <a href="/" className="text-white text-2xl font-extrabold tracking-tight">elena</a>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div
          className="rounded-3xl border border-white/[0.12] p-8 max-sm:p-6 backdrop-blur-xl"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
          }}
        >
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 w-16 rounded-full bg-white/10 mx-auto" />
              <div className="h-6 w-3/4 rounded-full bg-white/10 mx-auto" />
              <div className="h-4 w-1/2 rounded-full bg-white/10 mx-auto" />
              <div className="h-12 rounded-full bg-white/10 mt-6" />
            </div>
          )}

          {!isLoading && fetchError && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-300"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              </div>
              <h2 className="text-xl font-bold text-white">Invalid Invite</h2>
              <p className="text-white/50 text-sm">{fetchError}</p>
              <a href="/" className="inline-block mt-4 rounded-full bg-white/95 px-6 py-3 text-sm font-semibold text-[#0F1B3D] hover:bg-white transition-colors">Go to Elena</a>
            </div>
          )}

          {!isLoading && !fetchError && isExpiredOrUsed && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <h2 className="text-xl font-bold text-white">
                {invite!.status === "accepted" ? "Invite Already Accepted" : invite!.status === "declined" ? "Invite Declined" : "Invite Expired"}
              </h2>
              <p className="text-white/50 text-sm">
                {invite!.status === "accepted" ? "This invite has already been accepted." : invite!.status === "declined" ? "This invite was declined." : "This invite is no longer valid."}
              </p>
              <a href="/" className="inline-block mt-4 rounded-full bg-white/95 px-6 py-3 text-sm font-semibold text-[#0F1B3D] hover:bg-white transition-colors">Go to Elena</a>
            </div>
          )}

          {!isLoading && !fetchError && invite && invite.status === "pending" && !invite.expired && !isLoggedIn && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F4B084] to-[#E8956D] flex items-center justify-center mx-auto text-white text-2xl font-bold">
                {inviterDisplay.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{inviterDisplay} invited you</h2>
                {relationshipDisplay && <p className="text-white/50 text-sm mt-1">Relationship: {relationshipDisplay}</p>}
                <p className="text-white/40 text-sm mt-3">Connect on Elena to share health information and support each other.</p>
              </div>
              <div className="space-y-3 pt-2">
                <button onClick={() => openAuthModal("signup")} className="w-full rounded-full bg-white/95 py-3.5 text-sm font-semibold text-[#0F1B3D] hover:bg-white transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.1)]">Sign up to connect</button>
                <button onClick={() => openAuthModal("signin")} className="w-full rounded-full border border-white/20 bg-white/5 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">I already have an account</button>
              </div>
            </div>
          )}

          {!isLoading && !fetchError && invite && invite.status === "pending" && !invite.expired && isLoggedIn && !actionResult && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F4B084] to-[#E8956D] flex items-center justify-center mx-auto text-white text-2xl font-bold">
                {inviterDisplay.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{inviterDisplay} invited you</h2>
                {relationshipDisplay && <p className="text-white/50 text-sm mt-1">Relationship: {relationshipDisplay}</p>}
                <p className="text-white/40 text-sm mt-3">Accept this invite to connect on Elena and share health information.</p>
              </div>
              <div className="space-y-3 pt-2">
                <button onClick={handleAccept} disabled={accepting} className="w-full rounded-full bg-white/95 py-3.5 text-sm font-semibold text-[#0F1B3D] hover:bg-white transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.1)] disabled:opacity-50">{accepting ? "Accepting..." : "Accept invite"}</button>
                <button onClick={handleDecline} disabled={declining} className="w-full rounded-full border border-white/20 bg-white/5 py-3.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50">{declining ? "Declining..." : "Decline"}</button>
              </div>
            </div>
          )}

          {actionResult && (
            <div className="text-center space-y-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${actionResult.type === "success" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                {actionResult.type === "success" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-300"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-300"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-white">{actionResult.type === "success" ? "Connected!" : "Something went wrong"}</h2>
              <p className="text-white/50 text-sm">{actionResult.message}</p>
              {actionResult.type === "success" && (
                <p className="text-white/30 text-xs leading-relaxed mt-2">
                  You can switch between profiles anytime by clicking your profile icon in the sidebar and selecting a linked profile.
                </p>
              )}
              {actionResult.type === "error" && (
                <button onClick={() => setActionResult(null)} className="inline-block mt-2 rounded-full bg-white/95 px-6 py-3 text-sm font-semibold text-[#0F1B3D] hover:bg-white transition-colors">Try again</button>
              )}
            </div>
          )}
        </div>
      </div>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultMode={authDefaultMode}
        oauthRedirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${code}`}
      />
    </div>
  );
}
