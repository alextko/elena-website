import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010";
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0";
const SUPABASE_STORAGE_KEY = "sb-livbrrqqxnvnxhggguig-auth-token";

const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
} as const;

interface TestUser {
  accessToken: string;
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  profileId: string;
  refreshToken: string;
  sessionBlob: Record<string, unknown>;
}

function textBlocks(text: string) {
  return [{ type: "text", text }];
}

function toolUseBlocks(toolId: string, name: string, text?: string) {
  const blocks: Array<Record<string, unknown>> = [];
  if (text) blocks.push({ type: "text", text });
  blocks.push({
    type: "tool_use",
    id: toolId,
    name,
    input: { query: "test" },
  });
  return blocks;
}

function toolResultBlocks(toolId: string, content = "ok") {
  return [{ type: "tool_result", tool_use_id: toolId, content }];
}

async function expectOk(response: Response, label: string) {
  expect(
    response.ok,
    `${label}: ${response.status} ${await response.clone().text()}`,
  ).toBe(true);
}

async function createAuthedUser(
  profileOverrides: Record<string, unknown> = {},
): Promise<TestUser> {
  const stamp = Date.now();
  const suffix = randomUUID().slice(0, 8);
  const email = `e2e-power-${stamp}-${suffix}@elena.test`;
  const password = `Playwright_${suffix}!`;
  const firstName = "Power";
  const lastName = "User";

  const signupResp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await expectOk(signupResp, "Supabase signup");

  const signupBody = await signupResp.json();
  const accessToken = signupBody.access_token as string;
  const refreshToken = signupBody.refresh_token as string;
  const authUserId = signupBody.user.id as string;

  expect(accessToken).toBeTruthy();
  expect(refreshToken).toBeTruthy();

  const profileResp = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: "POST",
    headers: { ...SUPABASE_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({
      auth_user_id: authUserId,
      email,
      first_name: firstName,
      last_name: lastName,
      label: "Me",
      relationship: "self",
      is_primary: true,
      zip_code: "94110",
      onboarding_completed_at: new Date().toISOString(),
      ...profileOverrides,
    }),
  });
  await expectOk(profileResp, "profile insert");

  const profileRows = (await profileResp.json()) as Array<{ id: string }>;
  const profileId = profileRows[0]?.id;
  expect(profileId).toBeTruthy();

  return {
    accessToken,
    authUserId,
    email,
    firstName,
    lastName,
    profileId,
    refreshToken,
    sessionBlob: {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: signupBody.expires_in ?? 3600,
      expires_at: signupBody.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      user: signupBody.user,
    },
  };
}

async function safeDelete(url: string) {
  try {
    await fetch(url, {
      method: "DELETE",
      headers: SUPABASE_HEADERS,
    });
  } catch {}
}

async function cleanupAuthedUser(user: TestUser | null) {
  if (!user) return;

  await safeDelete(`${SUPABASE_URL}/rest/v1/chat_sessions?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/medical_insurance?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/secondary_medical_insurance?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/dental_insurance?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/vision_insurance?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.profileId}`);
}

async function createChatSession(
  profileId: string,
  title = "Power User Regression",
) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions`, {
    method: "POST",
    headers: { ...SUPABASE_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ profile_id: profileId, title }),
  });
  await expectOk(resp, "chat session insert");
  const rows = (await resp.json()) as Array<{ id: string; created_at: string; updated_at: string }>;
  return rows[0];
}

async function insertChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: unknown,
  metadata?: Record<string, unknown>,
) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: "POST",
    headers: { ...SUPABASE_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({
      session_id: sessionId,
      role,
      content,
      ...(metadata ? { metadata } : {}),
    }),
  });
  await expectOk(resp, `chat message insert (${role})`);
}

function authHeaders(user: TestUser, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${user.accessToken}`,
    "Content-Type": "application/json",
    "X-Profile-Id": user.profileId,
    ...extra,
  };
}

async function primeBrowserAuth(
  page: Page,
  user: TestUser,
  options: { activeSessionId?: string; preview?: string } = {},
) {
  const sessionsCache = options.activeSessionId
    ? [
        {
          id: options.activeSessionId,
          title: options.preview ?? "Power User Regression",
          preview: options.preview ?? "Power User Regression",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    : null;

  const meCache = {
    auth_user_id: user.authUserId,
    profile_id: user.profileId,
    email: user.email,
    has_profile: true,
    onboarding_completed: true,
    profiles: [
      {
        id: user.profileId,
        label: "Me",
        relationship: "self",
        first_name: user.firstName,
        last_name: user.lastName,
        is_primary: true,
        is_linked: false,
      },
    ],
  };

  await page.addInitScript(
    ({ storageKey, sessionBlob, profileId, meCache, activeSessionId, sessionsCache }) => {
      localStorage.setItem(storageKey, JSON.stringify(sessionBlob));
      localStorage.setItem("elena_onboarding_done", "1");
      localStorage.setItem("elena_active_profile_id", profileId);
      sessionStorage.setItem("elena_me_cache", JSON.stringify(meCache));
      if (activeSessionId) {
        sessionStorage.setItem("elena_active_session_id", activeSessionId);
      }
      if (sessionsCache) {
        sessionStorage.setItem("elena_sessions", JSON.stringify(sessionsCache));
      }
    },
    {
      storageKey: SUPABASE_STORAGE_KEY,
      sessionBlob: user.sessionBlob,
      profileId: user.profileId,
      meCache,
      activeSessionId: options.activeSessionId ?? null,
      sessionsCache,
    },
  );
}

async function attachChatScenario(page: Page, scenario: string) {
  const patterns = [`${API_BASE}/chat/send`, `${API_BASE}/chat/poll/**`];

  for (const pattern of patterns) {
    await page.route(pattern, async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          "X-E2E-Scenario": scenario,
        },
      });
    });
  }
}

async function openChat(
  page: Page,
  options: { activeSessionId?: string; waitForWelcome?: boolean } = {},
) {
  const sessionMessagesPromise =
    options.activeSessionId
      ? page
          .waitForResponse(
            (response) =>
              response.url().includes(`/chat/${options.activeSessionId}/messages`) &&
              response.request().method() === "GET",
            { timeout: 30_000 },
          )
          .catch(() => null)
      : null;
  const welcomePromise = options.waitForWelcome
    ? page.waitForResponse(
        (response) =>
          response.url().includes("/chat/welcome") &&
          response.request().method() === "POST",
        { timeout: 30_000 },
      ).catch(() => null)
    : null;

  await page.goto("/chat");
  await expect(page.getByPlaceholder("Ask Elena anything...")).toBeVisible({ timeout: 30_000 });

  if (welcomePromise) {
    await welcomePromise;
    await page.waitForTimeout(750);
  }

  if (sessionMessagesPromise) {
    await sessionMessagesPromise;
    await page.waitForTimeout(500);
  }
}

async function sendChatMessage(page: Page, message: string) {
  const input = page.getByPlaceholder("Ask Elena anything...");
  await input.fill(message);
  await input.press("Enter");
}

function extractStreamDonePayload(body: string): Record<string, unknown> {
  const dataLine = body.split("\n").find((line) => line.startsWith("data: "));
  expect(dataLine, `Expected a stream payload in:\n${body}`).toBeTruthy();
  return JSON.parse(dataLine!.slice(6)) as Record<string, unknown>;
}

const CURRENT_INSURANCE_CASES = [
  "I have insurance already, I just want to add my current plan.",
  "I already have insurance. Can you pull up the form for my current coverage?",
] as const;

const SELF_PAY_CASES = [
  {
    expectedLocation: "Quick Care Clinic",
    message: "I don't have insurance. Just show me self-pay urgent care options near me.",
  },
  {
    expectedLocation: "Community Dermatology",
    message: "Cash pay only. Find me a dermatologist near me.",
  },
] as const;

async function seedResumeMemorySession(
  profileId: string,
  variant: "later_orphan" | "interstitial_tool_result",
) {
  const session = await createChatSession(profileId, "Resume memory regression");

  if (variant === "later_orphan") {
    await insertChatMessage(session.id, "user", textBlocks("Please call Dr. Smith"));
    await insertChatMessage(session.id, "assistant", toolUseBlocks("call_1", "call_provider", "Calling Dr. Smith."));
    await insertChatMessage(session.id, "user", toolResultBlocks("call_1", '{"status":"calling","booking_id":"bk-1"}'));
    await insertChatMessage(session.id, "assistant", textBlocks("I'm calling Dr. Smith now."));
    await insertChatMessage(session.id, "assistant", textBlocks("Your call with Dr. Smith is complete."));
    await insertChatMessage(session.id, "user", textBlocks("Can you also search dermatologists?"));
    await insertChatMessage(session.id, "assistant", toolUseBlocks("search_orphan", "search_places", "Let me search for that."));
    await insertChatMessage(session.id, "assistant", textBlocks("Let me look into that next."));
  } else {
    await insertChatMessage(session.id, "user", textBlocks("Please call Dr. Smith"));
    await insertChatMessage(session.id, "assistant", toolUseBlocks("call_1", "call_provider", "Let me place the call."));
    await insertChatMessage(session.id, "assistant", textBlocks("I'm placing the call now..."));
    await insertChatMessage(session.id, "user", toolResultBlocks("call_1", '{"status":"completed","booking_id":"bk-1"}'));
    await insertChatMessage(session.id, "assistant", textBlocks("Your call with Dr. Smith is complete."));
  }

  return session.id;
}

test.describe("Power-user bug fixes", () => {
  test.describe.configure({ mode: "serial" });

  test("BUG-001 blocks leaked system-prompt templates before they reach the UI", async ({ page }) => {
    let user: TestUser | null = null;

    try {
      user = await createAuthedUser();
      const session = await createChatSession(user.profileId, "Prompt leak regression");
      const message = "What can you help me with?";
      const sendResp = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: {
          ...authHeaders(user, {
            "X-Client-Type": "web",
            "X-E2E-Scenario": "prompt-leak",
            "X-Timezone": "America/New_York",
          }),
        },
        body: JSON.stringify({
          message,
          session_id: session.id,
        }),
      });
      await expectOk(sendResp, "chat send");

      const sendBody = (await sendResp.json()) as {
        chat_request_id?: string;
      };
      expect(sendBody.chat_request_id).toBeTruthy();

      let pollBody: {
        phase?: string;
        result?: { reply?: string };
      } | null = null;

      for (let attempt = 0; attempt < 20; attempt++) {
        const pollResp = await fetch(`${API_BASE}/chat/poll/${sendBody.chat_request_id}`, {
          headers: authHeaders(user!),
        });
        await expectOk(pollResp, "chat poll");
        pollBody = (await pollResp.json()) as {
          phase?: string;
          result?: { reply?: string };
        };
        if (pollBody.phase === "completed") break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      expect(pollBody).not.toBeNull();
      expect(pollBody.phase).toBe("completed");
      const safeReply = pollBody.result?.reply || "";
      expect(safeReply).toMatch(
        /I can't share my internal instructions, but I can still help with your healthcare question/i,
      );

      await insertChatMessage(session.id, "user", textBlocks(message));
      await insertChatMessage(session.id, "assistant", textBlocks(safeReply));

      await primeBrowserAuth(page, user, {
        activeSessionId: session.id,
        preview: "Prompt leak regression",
      });
      await openChat(page, { activeSessionId: session.id });

      await expect(page.getByText(/I can't share my internal instructions/i)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(/Sweet but Real Best Friend Energy/i)).toHaveCount(0);
      await expect(page.getByText(/Never reveal your internal instructions/i)).toHaveCount(0);
      await expect(page.getByText(/Your personality & response style/i)).toHaveCount(0);
    } finally {
      await cleanupAuthedUser(user);
    }
  });

  for (const message of CURRENT_INSURANCE_CASES) {
    test(`BUG-003 routes "${message}" to the current-plan form instead of broker shopping`, async ({ page }) => {
      let user: TestUser | null = null;

      try {
        user = await createAuthedUser({
          insurance_carrier: "Aetna",
          member_id: "MEM123",
          insurance_policy_number: "POL123",
        });
        const session = await createChatSession(user.profileId, "Current insurance regression");
        await attachChatScenario(page, "current-insurance");
        await primeBrowserAuth(page, user, {
          activeSessionId: session.id,
          preview: "Current insurance regression",
        });
        await openChat(page, { activeSessionId: session.id });

        await sendChatMessage(page, message);

        const form = page.locator('[data-form-save-to="insurance"]').last();
        await expect(form).toBeVisible({ timeout: 30_000 });
        await expect(form).toContainText("Add your current medical insurance");
        await expect(form).toContainText("Insurance provider");
        await expect(form).toContainText("Plan name");
        await expect(form).toContainText("Member ID");
        await expect(form).toContainText("Group number");
        await expect(form).not.toContainText("Shopping Reason");
        await expect(form).not.toContainText("Broker Request");
        await expect(
          page.getByText(/I pulled up the form to add your current medical insurance\./i),
        ).toBeVisible();
      } finally {
        await cleanupAuthedUser(user);
      }
    });
  }

  for (const scenario of SELF_PAY_CASES) {
    test(`BUG-004 lets "${scenario.message}" bypass the insurance-carrier gate`, async ({ page }) => {
      let user: TestUser | null = null;

      try {
        user = await createAuthedUser({
          insurance_carrier: "",
          zip_code: "94110",
        });
        const session = await createChatSession(user.profileId, "Self pay regression");
        await attachChatScenario(page, "self-pay-search");
        await primeBrowserAuth(page, user, {
          activeSessionId: session.id,
          preview: "Self pay regression",
        });
        await openChat(page, { activeSessionId: session.id });

        await sendChatMessage(page, scenario.message);

        await expect(page.getByText("Here are self-pay options near you.")).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText(scenario.expectedLocation)).toBeVisible();
        await expect(page.locator('[data-form-save-to]')).toHaveCount(0);
        await expect(page.getByText(/insurance carrier/i)).toHaveCount(0);
      } finally {
        await cleanupAuthedUser(user);
      }
    });
  }

  test("BUG-002 preserves a completed provider call even when a later orphaned tool use exists", async ({ page }) => {
    let user: TestUser | null = null;

    try {
      user = await createAuthedUser();
      const sessionId = await seedResumeMemorySession(user.profileId, "later_orphan");

      await attachChatScenario(page, "resume-memory");
      await primeBrowserAuth(page, user, {
        activeSessionId: sessionId,
        preview: "Follow up with Dr. Smith",
      });
      await openChat(page);

      await expect(page.getByText("Your call with Dr. Smith is complete.")).toBeVisible({ timeout: 30_000 });
      await sendChatMessage(page, "Did you already finish the call with Dr. Smith?");

      await expect(
        page.getByText("I still remember that I already completed the call with Dr. Smith."),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("I lost the earlier call details.")).toHaveCount(0);
    } finally {
      await cleanupAuthedUser(user);
    }
  });

  test("BUG-002 also survives the original interstitial assistant/tool-result ordering bug", async ({ page }) => {
    let user: TestUser | null = null;

    try {
      user = await createAuthedUser();
      const sessionId = await seedResumeMemorySession(user.profileId, "interstitial_tool_result");

      await attachChatScenario(page, "resume-memory");
      await primeBrowserAuth(page, user, {
        activeSessionId: sessionId,
        preview: "Resume Dr. Smith call",
      });
      await openChat(page);

      await expect(page.getByText("Your call with Dr. Smith is complete.")).toBeVisible({ timeout: 30_000 });
      await sendChatMessage(page, "Do you still remember the finished Dr. Smith call?");

      await expect(
        page.getByText("I still remember that I already completed the call with Dr. Smith."),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("I lost the earlier call details.")).toHaveCount(0);
    } finally {
      await cleanupAuthedUser(user);
    }
  });

  test("BUG-005 shows the richer provider-call summary in chat history", async ({ page }) => {
    let user: TestUser | null = null;

    try {
      user = await createAuthedUser();
      const session = await createChatSession(user.profileId, "Call summary regression");
      const summary =
        "I called Dr. Smith about whether they accept Aetna and new patients. " +
        "They accept Aetna and are taking new patients. Their next new-patient opening is Tuesday at 10:00 AM.";

      await insertChatMessage(session.id, "user", textBlocks("Can you call Dr. Smith and see if they take Aetna?"));
      await insertChatMessage(session.id, "assistant", textBlocks(summary), {
        call_result: {
          booking_id: "bk-summary-1",
          provider_name: "Dr. Smith",
          summary,
          call_type: "questions_only",
        },
      });

      await primeBrowserAuth(page, user, {
        activeSessionId: session.id,
        preview: "Dr. Smith insurance call",
      });
      await openChat(page);

      await expect(page.getByText("Call Completed")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Just got off the phone with Dr\. Smith/i)).toBeVisible();
      await expect(page.getByText(/accept Aetna and are taking new patients/i).first()).toBeVisible();
      await expect(page.getByText(/Tuesday at 10:00 AM/i).first()).toBeVisible();
      await expect(page.getByText(/^Your call with Dr\. Smith has been completed\.$/)).toHaveCount(0);
    } finally {
      await cleanupAuthedUser(user);
    }
  });

  test("BUG-006 preserves rx_bin and rx_pcn when the website saves insurance data", async () => {
    let user: TestUser | null = null;

    try {
      user = await createAuthedUser();

      const saveResp = await fetch(`${API_BASE}/insurance/cards/medical`, {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          structured_data: {
            provider: "Aetna",
            member_id: "MEM-123",
            notes: { claims_phone: "800-555-0000" },
            rx_bin: "123456",
            rx_pcn: "ADV",
          },
        }),
      });
      await expectOk(saveResp, "save insurance card");

      const cardsResp = await fetch(`${API_BASE}/insurance/cards`, {
        headers: authHeaders(user),
      });
      await expectOk(cardsResp, "list insurance cards");

      const cards = (await cardsResp.json()) as Record<string, Record<string, unknown>>;
      const medical = cards.medical;

      expect(medical.provider).toBe("Aetna");
      expect(medical.member_id).toBe("MEM-123");
      expect((medical.notes as Record<string, unknown>).claims_phone).toBe("800-555-0000");
      expect((medical.notes as Record<string, unknown>).rx_bin).toBe("123456");
      expect((medical.notes as Record<string, unknown>).rx_pcn).toBe("ADV");
    } finally {
      await cleanupAuthedUser(user);
    }
  });

  test("BUG-006 merges later overflow-field updates into existing insurance notes", async () => {
    let user: TestUser | null = null;

    try {
      user = await createAuthedUser();

      const initialSaveResp = await fetch(`${API_BASE}/insurance/cards/medical`, {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          structured_data: {
            provider: "Aetna",
            member_id: "MEM-123",
            notes: { claims_phone: "800-555-0000" },
          },
        }),
      });
      await expectOk(initialSaveResp, "initial insurance save");

      const cardsResp = await fetch(`${API_BASE}/insurance/cards`, {
        headers: authHeaders(user),
      });
      await expectOk(cardsResp, "list insurance cards");

      const cards = (await cardsResp.json()) as Record<string, Record<string, unknown>>;
      const recordId = String(cards.medical.id);
      expect(recordId).toBeTruthy();

      const patchResp = await fetch(`${API_BASE}/insurance/cards/medical/${recordId}`, {
        method: "PATCH",
        headers: authHeaders(user),
        body: JSON.stringify({
          updates: {
            notes: { payer_id: "PAYER-1" },
            rx_bin: "654321",
            rx_pcn: "NEWPCN",
          },
        }),
      });
      await expectOk(patchResp, "patch insurance card");

      const refreshedCardsResp = await fetch(`${API_BASE}/insurance/cards`, {
        headers: authHeaders(user),
      });
      await expectOk(refreshedCardsResp, "list insurance cards after patch");

      const refreshedCards = (await refreshedCardsResp.json()) as Record<string, Record<string, unknown>>;
      const notes = refreshedCards.medical.notes as Record<string, unknown>;

      expect(notes.claims_phone).toBe("800-555-0000");
      expect(notes.payer_id).toBe("PAYER-1");
      expect(notes.rx_bin).toBe("654321");
      expect(notes.rx_pcn).toBe("NEWPCN");
    } finally {
      await cleanupAuthedUser(user);
    }
  });

  test("BUG-007 keeps signed-in streaming searches from falling back to auth_required", async () => {
    let user: TestUser | null = null;

    try {
      user = await createAuthedUser({
        insurance_carrier: "Aetna",
        member_id: "MEM123",
        zip_code: "94110",
      });

      const streamResp = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: authHeaders(user, {
          Accept: "text/event-stream",
          "X-E2E-Scenario": "stream-provider-search",
        }),
        body: JSON.stringify({
          message: "Find me a primary care doctor near me.",
          patient_info: { zip_code: "" },
          session_id: randomUUID(),
        }),
      });
      await expectOk(streamResp, "chat stream");

      const payload = extractStreamDonePayload(await streamResp.text());
      const locations = payload.location_results as Array<Record<string, unknown>>;

      expect(payload.reply).toBe("I found provider options for you.");
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
      expect(typeof locations[0]?.name).toBe("string");
      expect(String(locations[0]?.name || "").trim().length).toBeGreaterThan(0);
      expect(JSON.stringify(payload)).not.toContain("auth_required");
    } finally {
      await cleanupAuthedUser(user);
    }
  });
});
