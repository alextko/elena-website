import test from "node:test";
import assert from "node:assert/strict";

import {
  type FlushStage,
  flushBufferedTourData,
  type StorageLike,
  type TourBuffer,
} from "./tourBuffer.ts";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

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

function baseBuffer(): TourBuffer {
  return {
    profile: {
      first_name: "Alex",
      last_name: "Caregiver",
      zip_code: "60601",
    },
    dependents: [],
    conditions: [],
    medications: [],
    todos: [],
    seed_query: "Help me manage my parent's asthma.",
    created_at: "2026-04-28T12:00:00.000Z",
  };
}

test("flushBufferedTourData creates the primary profile before dependents and writes health data to the created dependent", async () => {
  const callOrder: string[] = [];
  let mainProfileCreated = false;
  const progress: FlushStage[] = [];
  const sessionStorage = createMemoryStorage();
  const localStorage = createMemoryStorage({
    elena_tour_state: JSON.stringify({ phase: "elena-plan", profileStep: 3 }),
  });

  const result = await flushBufferedTourData(
    {
      ...baseBuffer(),
      dependents: [
        {
          first_name: "Sam",
          last_name: "Dependent",
          relationship: "parent",
          label: "parent",
          date_of_birth: "1955-05-05",
          zip_code: "60601",
          is_primary_dependent: true,
        },
      ],
      conditions: [{ name: "Asthma", status: "active" }],
    },
    {
      apiFetch: async (path, options) => {
        const key = `${options?.method || "GET"} ${path}`;
        callOrder.push(key);

        if (path === "/profiles" && options?.method === "POST") {
          assert.equal(
            mainProfileCreated,
            true,
            "dependent creation must not start before the main profile exists",
          );
          return jsonResponse({ id: "dep-1" });
        }

        if (path === "/profile/dep-1/conditions/add" && options?.method === "POST") {
          return jsonResponse({});
        }

        if (path === "/chat/welcome" && options?.method === "POST") {
          return jsonResponse({ session_id: "chat-session-1", heading: "Hi", message: "Welcome" });
        }

        if (path === "/auth/me") {
          return jsonResponse({ profile_id: "main-profile" });
        }

        assert.fail(`unexpected apiFetch call: ${key}`);
      },
      completeOnboarding: async () => {
        callOrder.push("completeOnboarding");
        mainProfileCreated = true;
      },
      refreshProfiles: async () => {
        callOrder.push("refreshProfiles");
      },
      switchProfile: async (id) => {
        callOrder.push(`switchProfile:${id}`);
      },
      onProgress: (stage) => {
        progress.push(stage);
      },
      localStorage,
      sessionStorage,
    },
  );

  assert.equal(result.profile_saved, true);
  assert.equal(result.primary_dependent_id, "dep-1");
  assert.equal(result.errors.length, 0);
  assert.deepEqual(progress, [
    "saving_profile",
    "creating_family",
    "switching_profile",
    "saving_health_data",
    "loading_chat",
    "done",
  ]);

  const onboardingIndex = callOrder.indexOf("completeOnboarding");
  const dependentIndex = callOrder.indexOf("POST /profiles");
  const switchIndex = callOrder.indexOf("switchProfile:dep-1");
  const conditionIndex = callOrder.indexOf("POST /profile/dep-1/conditions/add");

  assert.ok(onboardingIndex >= 0);
  assert.ok(dependentIndex > onboardingIndex);
  assert.ok(switchIndex > dependentIndex);
  assert.ok(conditionIndex > dependentIndex);
  assert.equal(callOrder.includes("GET /auth/me"), false, "dependent flows should not fall back to /auth/me");
  assert.equal(sessionStorage.getItem("elena_active_session_id"), "chat-session-1");

  const updatedTourState = JSON.parse(localStorage.getItem("elena_tour_state") || "{}");
  assert.equal(updatedTourState.phase, "joyride");
  assert.equal(updatedTourState.profileStep, 0);
});

test("flushBufferedTourData falls back to /auth/me for self setup when no dependent was created", async () => {
  const callOrder: string[] = [];

  const result = await flushBufferedTourData(
    {
      ...baseBuffer(),
      conditions: [{ name: "Hypertension" }],
    },
    {
      apiFetch: async (path, options) => {
        const key = `${options?.method || "GET"} ${path}`;
        callOrder.push(key);

        if (path === "/auth/me") {
          return jsonResponse({ profile_id: "main-profile" });
        }

        if (path === "/profile/main-profile/conditions/add" && options?.method === "POST") {
          return jsonResponse({});
        }

        if (path === "/chat/welcome" && options?.method === "POST") {
          return jsonResponse({ session_id: "chat-session-2" });
        }

        assert.fail(`unexpected apiFetch call: ${key}`);
      },
      completeOnboarding: async () => {
        callOrder.push("completeOnboarding");
      },
      refreshProfiles: async () => {
        callOrder.push("refreshProfiles");
      },
      switchProfile: async () => {
        callOrder.push("switchProfile");
      },
    },
  );

  assert.equal(result.profile_saved, true);
  assert.equal(result.primary_dependent_id, null);
  assert.equal(result.errors.length, 0);
  assert.equal(callOrder.includes("GET /auth/me"), true);
  assert.equal(callOrder.includes("POST /profile/main-profile/conditions/add"), true);
  assert.equal(callOrder.includes("switchProfile"), false);
});

test("flushBufferedTourData clears the buffer after partial failures so the fragile setup work does not replay later", async () => {
  let cleared = false;

  const result = await flushBufferedTourData(
    {
      ...baseBuffer(),
      dependents: [
        {
          first_name: "Sam",
          relationship: "parent",
          is_primary_dependent: true,
        },
      ],
    },
    {
      apiFetch: async (path, options) => {
        if (path === "/profiles" && options?.method === "POST") {
          return new Response("boom", { status: 500 });
        }

        if (path === "/chat/welcome" && options?.method === "POST") {
          return jsonResponse({ session_id: "chat-session-3" });
        }

        if (path === "/auth/me") {
          return jsonResponse({ profile_id: "main-profile" });
        }

        return jsonResponse({});
      },
      completeOnboarding: async () => {},
      refreshProfiles: async () => {},
      switchProfile: async () => {},
      clearBuffer: () => {
        cleared = true;
      },
    },
  );

  assert.equal(result.profile_saved, true);
  assert.equal(result.dependents_created, 0);
  assert.ok(result.errors.some((error) => error.includes("dependent Sam POST 500")));
  assert.equal(cleared, true);
});
