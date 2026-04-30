import test from "node:test";
import assert from "node:assert/strict";

import {
  PENDING_SIGNUP_KEY,
  TOUR_STATE_KEY,
  clearStoredTourState,
  getStoredTourPhase,
  getStoredTourState,
  hasPendingSignup,
  normalizeRestoredTourPhase,
  promoteStoredTourStateToPostAuthResume,
  shouldRecoverAuthenticatedAuthHandoff,
  type StorageLike,
} from "./authHandoff.ts";

function createMemoryStorage(seed: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

test("promoteStoredTourStateToPostAuthResume keeps existing payload and promotes phase to joyride", () => {
  const localStorage = createMemoryStorage({
    [TOUR_STATE_KEY]: JSON.stringify({
      phase: "auth",
      profileStep: 2,
      selectedSituation: "asthma",
    }),
  });
  const sessionStorage = createMemoryStorage();

  const changed = promoteStoredTourStateToPostAuthResume({ localStorage, sessionStorage });

  assert.equal(changed, true);
  assert.deepEqual(getStoredTourState({ localStorage, sessionStorage }), {
    phase: "joyride",
    profileStep: 0,
    selectedSituation: "asthma",
  });
  assert.equal(getStoredTourPhase({ localStorage, sessionStorage }), "joyride");
});

test("normalizeRestoredTourPhase sends authenticated chat restores away from auth", () => {
  assert.equal(
    normalizeRestoredTourPhase({
      phase: "auth",
      hasSession: true,
      surface: "chat",
      pendingSignup: false,
      needsOnboarding: true,
    }),
    "profile-form",
  );

  assert.equal(
    normalizeRestoredTourPhase({
      phase: "auth",
      hasSession: true,
      surface: "chat",
      pendingSignup: false,
      needsOnboarding: false,
    }),
    undefined,
  );
});

test("normalizeRestoredTourPhase keeps flushing on /onboard pinned to auth until flush restarts", () => {
  assert.equal(
    normalizeRestoredTourPhase({
      phase: "flushing",
      hasSession: true,
      surface: "onboard",
      pendingSignup: true,
      needsOnboarding: true,
    }),
    "auth",
  );
});

test("shouldRecoverAuthenticatedAuthHandoff only trips for authenticated auth handoff states", () => {
  assert.equal(
    shouldRecoverAuthenticatedAuthHandoff({
      hasSession: true,
      phase: "social-proof",
      pendingSignup: false,
    }),
    true,
  );
  assert.equal(
    shouldRecoverAuthenticatedAuthHandoff({
      hasSession: true,
      phase: "profile",
      pendingSignup: false,
    }),
    false,
  );
  assert.equal(
    shouldRecoverAuthenticatedAuthHandoff({
      hasSession: false,
      phase: "auth",
      pendingSignup: true,
    }),
    false,
  );
});

test("pending signup and stored state helpers share the same keys", () => {
  const localStorage = createMemoryStorage({
    [TOUR_STATE_KEY]: JSON.stringify({ phase: "auth" }),
  });
  const sessionStorage = createMemoryStorage({
    [PENDING_SIGNUP_KEY]: "1",
  });

  assert.equal(hasPendingSignup(sessionStorage), true);
  clearStoredTourState({ localStorage, sessionStorage });
  assert.equal(getStoredTourState({ localStorage, sessionStorage }), null);
  assert.equal(hasPendingSignup(sessionStorage), true);
});
