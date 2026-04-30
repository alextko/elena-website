"use client";

export const TOUR_STATE_KEY = "elena_tour_state";
export const PENDING_SIGNUP_KEY = "elena_onboard_signup_pending";

export type TourPhase =
  | "intro"
  | "care"
  | "care-ack"
  | "setup-for"
  | "router"
  | "pain"
  | "value"
  | "profile-form"
  | "situation"
  | "meds"
  | "care-plan"
  | "validation"
  | "elena-plan"
  | "social-proof"
  | "auth"
  | "flushing"
  | "joyride"
  | "profile"
  | "chat"
  | "done";

export type TourStateSnapshot = {
  phase?: TourPhase;
  profileStep?: number;
  [key: string]: unknown;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type StoragePair = {
  localStorage?: StorageLike | null;
  sessionStorage?: StorageLike | null;
};

function readRawTourState({
  localStorage,
  sessionStorage,
}: StoragePair): { raw: string; source: "local" | "session" } | null {
  const localRaw = localStorage?.getItem(TOUR_STATE_KEY);
  if (localRaw) return { raw: localRaw, source: "local" };
  const sessionRaw = sessionStorage?.getItem(TOUR_STATE_KEY);
  if (sessionRaw) return { raw: sessionRaw, source: "session" };
  return null;
}

export function getStoredTourState(storages: StoragePair): TourStateSnapshot | null {
  const stored = readRawTourState(storages);
  if (!stored) return null;
  try {
    return JSON.parse(stored.raw) as TourStateSnapshot;
  } catch {
    return null;
  }
}

export function getStoredTourPhase(storages: StoragePair): TourPhase | undefined {
  const state = getStoredTourState(storages);
  return state?.phase;
}

export function hasPendingSignup(sessionStorage?: StorageLike | null): boolean {
  return sessionStorage?.getItem(PENDING_SIGNUP_KEY) === "1";
}

export function isAuthHandoffPhase(phase: string | null | undefined): boolean {
  return phase === "social-proof" || phase === "auth" || phase === "flushing";
}

export function shouldRecoverAuthenticatedAuthHandoff({
  hasSession,
  phase,
  pendingSignup,
}: {
  hasSession: boolean;
  phase: string | null | undefined;
  pendingSignup: boolean;
}): boolean {
  return hasSession && (pendingSignup || isAuthHandoffPhase(phase));
}

export function promoteStoredTourStateToPostAuthResume(storages: StoragePair): boolean {
  const stored = getStoredTourState(storages);
  if (!stored) return false;
  const next: TourStateSnapshot = {
    ...stored,
    phase: "joyride",
    profileStep: 0,
  };
  const serialized = JSON.stringify(next);
  try {
    storages.localStorage?.setItem(TOUR_STATE_KEY, serialized);
    storages.sessionStorage?.setItem(TOUR_STATE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredTourState(storages: StoragePair) {
  try {
    storages.localStorage?.removeItem(TOUR_STATE_KEY);
    storages.sessionStorage?.removeItem(TOUR_STATE_KEY);
  } catch {}
}

export function normalizeRestoredTourPhase({
  phase,
  hasSession,
  surface,
  pendingSignup,
  needsOnboarding,
}: {
  phase: TourPhase | undefined;
  hasSession: boolean;
  surface: "onboard" | "chat";
  pendingSignup: boolean;
  needsOnboarding: boolean;
}): TourPhase | undefined {
  if (!phase || phase === "done") return undefined;

  if (surface === "onboard" && (phase === "joyride" || phase === "profile" || phase === "chat")) {
    return "auth";
  }

  if (surface === "chat" && hasSession && (phase === "auth" || phase === "social-proof")) {
    return needsOnboarding ? "profile-form" : undefined;
  }

  if (phase !== "flushing") return phase;
  if (pendingSignup) return "auth";
  return hasSession ? "joyride" : "auth";
}
