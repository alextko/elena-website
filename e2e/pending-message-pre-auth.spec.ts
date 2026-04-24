import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// Exercises the pre-auth message capture + claim flow end-to-end.
//
// Requirements for these tests to run:
//   1. elena-backend running locally (e.g. `python3.12 -m uvicorn src.api:app --port 8001`)
//   2. NEXT_PUBLIC_API_BASE pointed at that backend when starting `npm run dev`
//   3. Supabase reachable; backend has ANTHROPIC_API_KEY set (for variant 3)

const API_BASE = process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010";
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";
// Same anon key every browser client sees — intentionally public.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0";
const SUPABASE_STORAGE_KEY = "sb-livbrrqqxnvnxhggguig-auth-token";

const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
} as const;

interface PendingRow {
  id: string;
  anon_id: string;
  content: string;
  source: string;
  landing_variant: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  claimed_at: string | null;
  claimed_session_id: string | null;
  claimed_profile_id: string | null;
  created_at: string;
}

async function fetchPendingRow(api: APIRequestContext, pendingId: string): Promise<PendingRow | null> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/pending_messages?id=eq.${pendingId}&select=*`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok(), `Supabase read failed: ${resp.status()} ${await resp.text()}`).toBe(true);
  const rows = (await resp.json()) as PendingRow[];
  return rows[0] ?? null;
}

async function fetchPendingRowsByAnon(api: APIRequestContext, anonId: string): Promise<PendingRow[]> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/pending_messages?anon_id=eq.${anonId}&select=*&order=created_at.asc`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok()).toBe(true);
  return (await resp.json()) as PendingRow[];
}

async function deletePendingRow(api: APIRequestContext, pendingId: string): Promise<void> {
  await api.delete(`${SUPABASE_URL}/rest/v1/pending_messages?id=eq.${pendingId}`, {
    headers: SUPABASE_HEADERS,
  });
}

async function deletePendingRowsByAnon(api: APIRequestContext, anonId: string): Promise<void> {
  await api.delete(`${SUPABASE_URL}/rest/v1/pending_messages?anon_id=eq.${anonId}`, {
    headers: SUPABASE_HEADERS,
  });
}

async function deleteChatSession(api: APIRequestContext, sessionId: string): Promise<void> {
  await api.delete(`${SUPABASE_URL}/rest/v1/chat_sessions?id=eq.${sessionId}`, {
    headers: SUPABASE_HEADERS,
  });
}

async function deleteUserProfile(api: APIRequestContext, profileId: string): Promise<void> {
  await api.delete(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profileId}`, {
    headers: SUPABASE_HEADERS,
  });
}

/**
 * Type a message into the landing hero and click send on the explicit
 * signup-first variant. The homepage defaults to the late-signup /onboard
 * funnel now, so /chat/pending only fires when we intentionally force the
 * legacy pre-auth capture path.
 *
 * Returns the pending row the backend created (read back from Supabase for
 * verification) and the anon_id the frontend generated.
 */
async function sendFromLandingHero(
  page: Page,
  request: APIRequestContext,
  content: string,
): Promise<{ pendingId: string; anonId: string; row: PendingRow }> {
  const pendingResponsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/chat/pending") &&
      !resp.url().includes("/chat/pending/claim") &&
      resp.request().method() === "POST",
    { timeout: 15_000 },
  );

  await page.goto("/?signup=first");
  const hero = page.getByPlaceholder("Ask Elena anything...").first();
  await expect(hero).toBeVisible({ timeout: 10_000 });
  await hero.click();
  await hero.fill(content);
  await page.getByRole("button", { name: "Send" }).first().click();

  const pendingResponse = await pendingResponsePromise;
  expect(pendingResponse.status()).toBe(200);
  const body = await pendingResponse.json();
  const pendingId = body.pending_id as string;
  const postData = pendingResponse.request().postDataJSON();
  const anonId = postData.anon_id as string;

  const row = await fetchPendingRow(request, pendingId);
  expect(row, "row should exist in Supabase after POST returned 200").not.toBeNull();
  return { pendingId, anonId, row: row! };
}

// ---------------------------------------------------------------------------
// Variant 0 (baseline): full-fidelity capture path verified end-to-end
// ---------------------------------------------------------------------------

test("pre-auth message from landing hero persists to Supabase", async ({ page, request }) => {
  const uniqueContent = `e2e-playwright-baseline-${Date.now()}`;
  let pendingId: string | null = null;
  try {
    const result = await sendFromLandingHero(page, request, uniqueContent);
    pendingId = result.pendingId;
    const r = result.row;

    expect(r.content).toBe(uniqueContent);
    expect(r.source).toBe("landing_hero");
    expect(r.landing_variant).toBe("homepage");
    expect(r.anon_id).toBe(result.anonId);
    expect(r.user_agent).not.toBeNull();
    expect(r.ip_hash).not.toBeNull();
    expect(r.claimed_at).toBeNull();
    expect(r.claimed_session_id).toBeNull();
    expect(r.claimed_profile_id).toBeNull();

    expect(await page.evaluate(() => localStorage.getItem("elena_pending_query"))).toBe(uniqueContent);
    expect(await page.evaluate(() => localStorage.getItem("elena_anon_id"))).toBe(result.anonId);

    await expect(page.getByText(/sign up|create account|continue with/i).first()).toBeVisible({ timeout: 5_000 });
  } finally {
    if (pendingId) await deletePendingRow(request, pendingId);
  }
});

// ---------------------------------------------------------------------------
// Variant 1: reload the page after sending — row + localStorage survive
// ---------------------------------------------------------------------------

test("pending message survives page reload", async ({ page, request }) => {
  const uniqueContent = `e2e-playwright-reload-${Date.now()}`;
  let pendingId: string | null = null;
  try {
    const result = await sendFromLandingHero(page, request, uniqueContent);
    pendingId = result.pendingId;

    // Reload the landing page (simulates the user closing the auth modal and
    // refreshing, or navigating back to the site later).
    await page.reload();

    // Supabase row is still there, still unclaimed.
    const row = await fetchPendingRow(request, pendingId);
    expect(row, "row must persist across reload").not.toBeNull();
    expect(row!.content).toBe(uniqueContent);
    expect(row!.claimed_at).toBeNull();

    // localStorage belt-and-suspenders also survives reload (same origin).
    expect(await page.evaluate(() => localStorage.getItem("elena_pending_query"))).toBe(uniqueContent);
    expect(await page.evaluate(() => localStorage.getItem("elena_anon_id"))).toBe(result.anonId);

    // Also verify the anon_id is stable: if the user sends a SECOND message
    // after reload, it reuses the same anon_id, so both rows are claimable together.
    const secondContent = `${uniqueContent}-followup`;
    const second = await sendFromLandingHero(page, request, secondContent);
    try {
      expect(second.anonId).toBe(result.anonId);
      const rows = await fetchPendingRowsByAnon(request, result.anonId);
      expect(rows.map((r) => r.content)).toEqual([uniqueContent, secondContent]);
      expect(rows.every((r) => r.claimed_at === null)).toBe(true);
    } finally {
      await deletePendingRow(request, second.pendingId);
    }
  } finally {
    if (pendingId) await deletePendingRow(request, pendingId);
  }
});

// ---------------------------------------------------------------------------
// Variant 2: visitor never authenticates — row stays unclaimed indefinitely
// ---------------------------------------------------------------------------

test("unauthenticated visitor leaves unclaimed row for funnel analysis", async ({ page, request }) => {
  const uniqueContent = `e2e-playwright-abandoned-${Date.now()}`;
  let pendingId: string | null = null;
  try {
    const result = await sendFromLandingHero(page, request, uniqueContent);
    pendingId = result.pendingId;

    // Auth modal is open but the user dismisses it (presses Escape) and walks away.
    await page.keyboard.press("Escape").catch(() => {});

    // Navigate away entirely — the visitor closes the tab / goes to another site.
    await page.goto("about:blank");

    // Wait a couple seconds to prove the row isn't purged / self-claimed by anything.
    await page.waitForTimeout(2_000);

    const row = await fetchPendingRow(request, pendingId);
    expect(row, "row must still exist after abandonment").not.toBeNull();
    expect(row!.content).toBe(uniqueContent);
    expect(row!.claimed_at).toBeNull();
    expect(row!.claimed_session_id).toBeNull();
    expect(row!.claimed_profile_id).toBeNull();

    // Funnel query: unclaimed rows are the "visitor bounced" data points.
    // Verify our row shows up in the unclaimed-by-anon-id listing.
    const rows = await fetchPendingRowsByAnon(request, result.anonId);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(pendingId);
  } finally {
    if (pendingId) await deletePendingRow(request, pendingId);
  }
});

// ---------------------------------------------------------------------------
// Variant 3: full authenticated flow — message is claimed, visible, and the
// first assistant reply arrives via the real backend.
// ---------------------------------------------------------------------------

test("authenticated user claims pending message and gets assistant reply", async ({ page, request }) => {
  const stamp = Date.now();
  const uniqueContent = `e2e-playwright-claim-${stamp}`;
  const anonId = crypto.randomUUID();
  const email = `e2e-pp-${stamp}@elena.test`;
  const password = `PlaywrightTest_${stamp}!`;

  let authUserId: string | null = null;
  let profileId: string | null = null;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let claimedSessionId: string | null = null;

  try {
    // 1. Seed a pending_messages row directly — simulates the visitor who
    //    already typed on the landing page before the auth modal opened.
    const postResp = await request.post(`${API_BASE}/chat/pending`, {
      data: {
        anon_id: anonId,
        content: uniqueContent,
        source: "landing_hero",
        landing_variant: "homepage",
      },
    });
    expect(postResp.ok(), `POST /chat/pending failed: ${postResp.status()} ${await postResp.text()}`).toBe(true);

    // 2. Sign the user up via Supabase GoTrue (what the frontend does internally).
    const signupResp = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email, password },
    });
    expect(signupResp.ok(), `signup failed: ${signupResp.status()} ${await signupResp.text()}`).toBe(true);
    const signupBody = await signupResp.json();
    authUserId = signupBody.user.id as string;
    accessToken = signupBody.access_token as string;
    refreshToken = signupBody.refresh_token as string;
    expect(accessToken).toBeTruthy();

    // 3. Pre-create a user_profiles row linked to the new auth user so the
    //    backend's /auth/me reports has_profile=true and skips onboarding.
    const profileResp = await request.post(`${SUPABASE_URL}/rest/v1/user_profiles`, {
      headers: { ...SUPABASE_HEADERS, Prefer: "return=representation" },
      data: {
        auth_user_id: authUserId,
        email,
        first_name: "E2ETest",
        last_name: "Claim",
      },
    });
    expect(profileResp.ok(), `profile insert failed: ${profileResp.status()} ${await profileResp.text()}`).toBe(true);
    const profileRows = (await profileResp.json()) as Array<{ id: string }>;
    profileId = profileRows[0].id;

    // 4. Inject the Supabase session + anon_id + active profile BEFORE navigating.
    //    The chat page will boot as a signed-in user, trigger claimPendingMessages(),
    //    and the backend will create a session for this profile and link the row.
    const sessionBlob = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: signupBody.expires_in ?? 3600,
      expires_at: signupBody.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      user: signupBody.user,
    };
    await page.addInitScript(
      ({ storageKey, sessionBlob, anonId, pId, content }) => {
        localStorage.setItem(storageKey, JSON.stringify(sessionBlob));
        localStorage.setItem("elena_anon_id", anonId);
        localStorage.setItem("elena_active_profile_id", pId);
        localStorage.setItem("elena_onboarding_done", "1");
        localStorage.setItem("elena_pending_query", content);
      },
      {
        storageKey: SUPABASE_STORAGE_KEY,
        sessionBlob,
        anonId,
        pId: profileId,
        content: uniqueContent,
      },
    );

    // 5. Watch for the claim request/response.
    const claimResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/chat/pending/claim") && resp.request().method() === "POST",
      { timeout: 20_000 },
    );

    await page.goto("/chat");

    const claimResponse = await claimResponsePromise;
    expect(claimResponse.status()).toBe(200);
    const claimBody = await claimResponse.json();
    expect(claimBody.claimed_count).toBe(1);
    expect(claimBody.session_id).toBeTruthy();
    expect(claimBody.messages).toHaveLength(1);
    expect(claimBody.messages[0].content).toBe(uniqueContent);
    claimedSessionId = claimBody.session_id as string;

    // 6. Supabase check: pending_messages row is now claimed with the real session.
    const pendingRows = await fetchPendingRowsByAnon(request, anonId);
    expect(pendingRows).toHaveLength(1);
    expect(pendingRows[0].claimed_at).not.toBeNull();
    expect(pendingRows[0].claimed_session_id).toBe(claimedSessionId);
    expect(pendingRows[0].claimed_profile_id).toBe(profileId);

    // 7. Web check: the user message shows up in the chat UI.
    const userMessageLocator = page.getByText(uniqueContent, { exact: false }).first();
    await expect(userMessageLocator).toBeVisible({ timeout: 20_000 });

    // 8. Web check: the first assistant reply appears (real Anthropic round-trip).
    //    Elena's reply will be non-empty text rendered inside the chat scroll area;
    //    wait for chat_messages to contain at least one assistant row for this session.
    await expect.poll(
      async () => {
        const resp = await request.get(
          `${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${claimedSessionId}&role=eq.assistant&select=id&limit=1`,
          { headers: SUPABASE_HEADERS },
        );
        if (!resp.ok()) return 0;
        const rows = (await resp.json()) as Array<{ id: string }>;
        return rows.length;
      },
      { timeout: 120_000, intervals: [1_000, 2_000, 3_000] },
    ).toBeGreaterThanOrEqual(1);

    // The user message also landed in chat_messages (persisted by /chat/send).
    const userMsgsResp = await request.get(
      `${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${claimedSessionId}&role=eq.user&select=content`,
      { headers: SUPABASE_HEADERS },
    );
    expect(userMsgsResp.ok()).toBe(true);
    const userMsgs = (await userMsgsResp.json()) as Array<{ content: unknown }>;
    expect(userMsgs.length).toBeGreaterThanOrEqual(1);
    const asString = (c: unknown): string => (typeof c === "string" ? c : JSON.stringify(c));
    expect(userMsgs.some((m) => asString(m.content).includes(uniqueContent))).toBe(true);
  } finally {
    // Cleanup: chat_messages cascade-delete when chat_sessions is removed.
    if (claimedSessionId) await deleteChatSession(request, claimedSessionId);
    await deletePendingRowsByAnon(request, anonId);
    if (profileId) await deleteUserProfile(request, profileId);
    // Auth user in Supabase auth.users is left in place (can't delete with anon key);
    // future cleanup can be a scheduled prune of e2e-pp-*@elena.test addresses.
  }
});
