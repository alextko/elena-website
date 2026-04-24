import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixtures: fake data returned by mocked API endpoints
// ---------------------------------------------------------------------------

const FAKE_SESSION = {
  access_token: "fake-access-token",
  refresh_token: "fake-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: "user-1",
    email: "test@example.com",
    app_metadata: { provider: "email" },
    user_metadata: { full_name: "Test User" },
    created_at: "2025-01-01T00:00:00Z",
  },
};

const SUPABASE_STORAGE_KEY = "sb-livbrrqqxnvnxhggguig-auth-token";

const SESSIONS = [
  { id: "s1", title: "Session One", preview: "Hello world", created_at: "2026-04-03T10:00:00Z", updated_at: "2026-04-03T10:00:00Z" },
  { id: "s2", title: "Session Two", preview: "Goodbye world", created_at: "2026-04-02T10:00:00Z", updated_at: "2026-04-02T10:00:00Z" },
  { id: "s3", title: "Session Three", preview: "Third convo", created_at: "2026-04-01T10:00:00Z", updated_at: "2026-04-01T10:00:00Z" },
];

function messagesFor(sessionId: string) {
  return [
    { role: "user", text: `User message in ${sessionId}`, created_at: "2026-04-03T10:00:00Z" },
    { role: "assistant", text: `Assistant reply in ${sessionId}`, created_at: "2026-04-03T10:00:01Z" },
  ];
}

const ME_RESPONSE = {
  auth_user_id: "user-1",
  profile_id: "profile-1",
  email: "test@example.com",
  has_profile: true,
  onboarding_completed: true,
  profiles: [{ id: "profile-1", label: "Test User", relationship: "self", first_name: "Test", last_name: "User", is_primary: true, is_linked: false }],
};

const WELCOME_RESPONSE = {
  message: "How can I help you today?",
  heading: "Hi, Test!",
  suggestions: ["Find a doctor", "Check my meds"],
  session_id: "new-session-id",
};

const API_BASE_LOCAL = process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010";
const API_BASE_PROD = "https://elena-backend-production-production.up.railway.app";

// Max time (ms) the user should ever be stuck on a loading/shimmer state
const MAX_LOADING_MS = 5000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Inject a fake Supabase auth session into localStorage before the app boots. */
async function injectAuth(page: Page) {
  await page.addInitScript(
    ({ key, session, me }) => {
      localStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem("elena_onboarding_done", "1");
      localStorage.setItem("elena_active_profile_id", "profile-1");
      sessionStorage.setItem("elena_me_cache", JSON.stringify(me));
    },
    { key: SUPABASE_STORAGE_KEY, session: FAKE_SESSION, me: ME_RESPONSE },
  );
}

/**
 * Set up route interception for all backend + Supabase API calls.
 * `messageDelay` adds artificial latency to the messages endpoint (in ms)
 * to widen the race condition window.
 */
async function mockApi(page: Page, messageDelay = 0) {
  const API_BASES = [API_BASE_LOCAL, API_BASE_PROD];
  const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";

  // Supabase auth — getSession / refreshSession
  await page.route(`${SUPABASE_URL}/auth/v1/token**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION) }),
  );
  await page.route(`${SUPABASE_URL}/auth/v1/user**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION.user) }),
  );

  for (const base of API_BASES) {
    // /auth/me
    await page.route(`${base}/auth/me**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ME_RESPONSE) }),
    );

    // /chat/sessions
    await page.route(`${base}/chat/sessions**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSIONS) }),
    );

    // /chat/{id}/messages — with optional delay
    await page.route(`${base}/chat/*/messages**`, async (route) => {
      const url = route.request().url();
      const match = url.match(/\/chat\/([^/]+)\/messages/);
      const sessionId = match?.[1] ?? "unknown";
      if (messageDelay > 0) {
        await new Promise((r) => setTimeout(r, messageDelay));
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(messagesFor(sessionId)),
      });
    });

    // /chat/welcome
    await page.route(`${base}/chat/welcome**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WELCOME_RESPONSE) }),
    );

    // /web/subscription
    await page.route(`${base}/web/subscription**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: "free", tier: "free", status: "active", cancel_at_period_end: false }) }),
    );

    // Catch-all for any other backend calls — return 200 empty
    await page.route(`${base}/**`, (route) => {
      if (!route.request().url().includes("/chat/") && !route.request().url().includes("/auth/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      return route.fallback();
    });
  }
}

/**
 * Assert that the chat area is NOT blank: it should show EITHER
 * a loading shimmer, messages, a welcome heading, or an error/retry.
 * Returns which state was found.
 */
async function assertNotBlank(page: Page): Promise<string> {
  // The chat content area is the scrollable messages div
  const chatArea = page.locator(".chat-selectable");
  await expect(chatArea).toBeVisible({ timeout: 5000 });

  // Check each possible valid state
  const shimmer = chatArea.locator(".animate-pulse");
  const messages = chatArea.locator('[class*="rounded-2xl"][class*="px-5"]');
  const welcome = chatArea.locator("h2");
  const error = chatArea.locator('text="Retry"');

  const [hasShimmer, hasMessages, hasWelcome, hasError] = await Promise.all([
    shimmer.count().then((c) => c > 0),
    messages.count().then((c) => c > 0),
    welcome.count().then((c) => c > 0),
    error.count().then((c) => c > 0),
  ]);

  const state = hasShimmer ? "shimmer" : hasMessages ? "messages" : hasWelcome ? "welcome" : hasError ? "error" : "BLANK";

  expect(state, "Chat area should never be blank").not.toBe("BLANK");
  return state;
}

/**
 * Measure loading duration: time from `startMark` until the chat area
 * transitions from a loading state (shimmer / no messages) to a content
 * state (messages or welcome). Fails if it exceeds MAX_LOADING_MS.
 * Returns the measured duration in ms.
 */
async function measureLoadTime(
  page: Page,
  contentLocator: ReturnType<Page["locator"]>,
  label: string,
): Promise<number> {
  const start = Date.now();
  await expect(contentLocator).toBeVisible({ timeout: MAX_LOADING_MS });
  const elapsed = Date.now() - start;
  console.log(`  ⏱  ${label}: ${elapsed}ms`);
  return elapsed;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Chat area never shows blank screen", () => {

  test("1. First load auto-selects most recent session and shows messages", async ({ page }) => {
    await injectAuth(page);
    await mockApi(page);

    const navStart = Date.now();
    await page.goto("/chat");

    // Should eventually show messages for the first session (auto-selected)
    const chatArea = page.locator(".chat-selectable");
    await expect(chatArea).toBeVisible({ timeout: 10_000 });

    // Wait for either shimmer or messages — but never blank
    await expect(async () => {
      const state = await assertNotBlank(page);
      expect(["shimmer", "messages"]).toContain(state);
    }).toPass({ timeout: 10_000 });

    // Final state: messages should be visible within MAX_LOADING_MS of navigation
    const loadTime = await measureLoadTime(
      page,
      page.locator("text=Assistant reply in s1"),
      "First load (0ms API delay)",
    );
    const totalTime = Date.now() - navStart;
    console.log(`  ⏱  Total from navigation: ${totalTime}ms`);
    expect(totalTime, `First load should complete within ${MAX_LOADING_MS}ms`).toBeLessThan(MAX_LOADING_MS);
  });

  test("2. Switching conversations shows shimmer then messages, never blank", async ({ page }) => {
    await injectAuth(page);
    await mockApi(page, 500); // 500ms delay to make shimmer visible
    await page.goto("/chat");

    // Wait for initial load
    await expect(page.locator("text=Assistant reply in s1")).toBeVisible({ timeout: 10_000 });

    // Click second session in sidebar
    const switchStart = Date.now();
    await page.locator("text=Session Two").click();

    // Immediately after click: should show shimmer (not blank)
    await assertNotBlank(page);

    // Wait for messages to load — must be within MAX_LOADING_MS
    const loadTime = await measureLoadTime(
      page,
      page.locator("text=Assistant reply in s2"),
      "Switch session (500ms API delay)",
    );
    const switchTime = Date.now() - switchStart;
    console.log(`  ⏱  Total switch time: ${switchTime}ms`);
    expect(switchTime, `Session switch should complete within ${MAX_LOADING_MS}ms`).toBeLessThan(MAX_LOADING_MS);
  });

  test("3. Rapid session switching never shows blank screen", async ({ page }) => {
    await injectAuth(page);
    await mockApi(page, 300); // moderate delay
    await page.goto("/chat");

    // Wait for initial load
    await expect(page.locator("text=Assistant reply in s1")).toBeVisible({ timeout: 10_000 });

    // Rapidly click through all sessions, assert not blank after each
    await page.locator("text=Session Two").click();
    await page.waitForTimeout(50);
    await assertNotBlank(page);

    await page.locator("text=Session Three").click();
    await page.waitForTimeout(50);
    await assertNotBlank(page);

    await page.locator("text=Session One").click();
    await page.waitForTimeout(50);
    await assertNotBlank(page);

    // Back to Session Three — time the final settle
    const rapidStart = Date.now();
    await page.locator("text=Session Three").click();
    await page.waitForTimeout(50);
    await assertNotBlank(page);

    const loadTime = await measureLoadTime(
      page,
      page.locator("text=Assistant reply in s3"),
      "Rapid switch settle (300ms API delay)",
    );
    const settleTime = Date.now() - rapidStart;
    console.log(`  ⏱  Rapid switch settle time: ${settleTime}ms`);
    expect(settleTime, `Rapid switch should settle within ${MAX_LOADING_MS}ms`).toBeLessThan(MAX_LOADING_MS);
  });

  test("4. New chat shows welcome screen, not blank", async ({ page }) => {
    await injectAuth(page);
    await mockApi(page);
    await page.goto("/chat");

    // Wait for initial load
    await expect(page.locator("text=Assistant reply in s1")).toBeVisible({ timeout: 10_000 });

    // Click new chat button (the + icon)
    const newChatBtn = page.locator('button:has(svg.lucide-plus), button[aria-label*="new" i]').first();
    const plusBtn = page.locator("button").filter({ has: page.locator("svg") }).nth(1);

    const newChatStart = Date.now();
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
    } else {
      await plusBtn.click();
    }

    // Should show welcome state (not blank) within MAX_LOADING_MS
    await expect(async () => {
      const state = await assertNotBlank(page);
      expect(["shimmer", "welcome"]).toContain(state);
    }).toPass({ timeout: MAX_LOADING_MS });

    const welcomeTime = Date.now() - newChatStart;
    console.log(`  ⏱  New chat → welcome: ${welcomeTime}ms`);
    expect(welcomeTime, `New chat should show welcome within ${MAX_LOADING_MS}ms`).toBeLessThan(MAX_LOADING_MS);
  });

  test("5. Slow network: messages load after delay, shimmer shown meanwhile", async ({ page }) => {
    await injectAuth(page);
    await mockApi(page, 2000); // 2 second delay simulating slow network
    await page.goto("/chat");

    // Should show shimmer while waiting
    const chatArea = page.locator(".chat-selectable");
    await expect(chatArea).toBeVisible({ timeout: 10_000 });

    // During the delay, should show shimmer
    await expect(async () => {
      const state = await assertNotBlank(page);
      expect(state).toBe("shimmer");
    }).toPass({ timeout: 5_000 });

    // After delay, messages should appear — within MAX_LOADING_MS of page load
    const loadTime = await measureLoadTime(
      page,
      page.locator("text=Assistant reply in s1"),
      "Slow network load (2000ms API delay)",
    );
    // With a 2s mock delay, the total must still be < 5s
    expect(loadTime, `Slow network should resolve within ${MAX_LOADING_MS}ms`).toBeLessThan(MAX_LOADING_MS);
  });

  test("6. Switch conversation then immediately switch back — no blank", async ({ page }) => {
    await injectAuth(page);
    await mockApi(page, 400);
    await page.goto("/chat");

    await expect(page.locator("text=Assistant reply in s1")).toBeVisible({ timeout: 10_000 });

    // Click s2, then immediately click s1 again
    const bounceStart = Date.now();
    await page.locator("text=Session Two").click();
    await page.waitForTimeout(20);
    await assertNotBlank(page);

    await page.locator("text=Session One").click();
    await page.waitForTimeout(20);
    await assertNotBlank(page);

    // Should settle on s1 within MAX_LOADING_MS
    const loadTime = await measureLoadTime(
      page,
      page.locator("text=Assistant reply in s1"),
      "Bounce back settle (400ms API delay)",
    );
    const bounceTime = Date.now() - bounceStart;
    console.log(`  ⏱  Bounce total: ${bounceTime}ms`);
    expect(bounceTime, `Bounce should settle within ${MAX_LOADING_MS}ms`).toBeLessThan(MAX_LOADING_MS);

    // s2 should NOT be visible (stale response ignored)
    await expect(page.locator("text=Assistant reply in s2")).not.toBeVisible();
  });

  test("7. Loading state never persists beyond 5 seconds (stress test)", async ({ page }) => {
    // Run 10 rapid switches and verify each resolves within MAX_LOADING_MS
    await injectAuth(page);
    await mockApi(page, 200);
    await page.goto("/chat");

    await expect(page.locator("text=Assistant reply in s1")).toBeVisible({ timeout: 10_000 });

    const targets = ["Session Two", "Session Three", "Session One", "Session Two", "Session One",
                     "Session Three", "Session Two", "Session One", "Session Three", "Session One"];
    const expectedIds = ["s2", "s3", "s1", "s2", "s1", "s3", "s2", "s1", "s3", "s1"];
    const timings: { switch: string; ms: number }[] = [];

    for (let i = 0; i < targets.length; i++) {
      const start = Date.now();
      await page.locator(`text=${targets[i]}`).click();
      // Must never be blank
      await assertNotBlank(page);
      // Must resolve to actual messages within MAX_LOADING_MS
      await expect(page.locator(`text=Assistant reply in ${expectedIds[i]}`)).toBeVisible({ timeout: MAX_LOADING_MS });
      const elapsed = Date.now() - start;
      timings.push({ switch: `${targets[i]} (${expectedIds[i]})`, ms: elapsed });
      expect(elapsed, `Switch to ${targets[i]} took ${elapsed}ms — exceeds ${MAX_LOADING_MS}ms`).toBeLessThan(MAX_LOADING_MS);
    }

    console.log("\n  ⏱  Stress test timings:");
    for (const t of timings) {
      console.log(`     ${t.switch}: ${t.ms}ms`);
    }
    const avg = Math.round(timings.reduce((s, t) => s + t.ms, 0) / timings.length);
    const max = Math.max(...timings.map((t) => t.ms));
    console.log(`     avg: ${avg}ms | max: ${max}ms`);
  });
});
