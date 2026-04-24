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
  session_id: "demo-welcome-session",
};

const API_BASE_LOCAL = process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010";
const API_BASE_PROD = "https://elena-backend-production-production.up.railway.app";
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function injectAuthAndDemoMode(page: Page) {
  await page.addInitScript(
    ({ key, session, me }) => {
      localStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem("elena_onboarding_done", "1");
      localStorage.setItem("elena_active_profile_id", "profile-1");
      sessionStorage.setItem("elena_me_cache", JSON.stringify(me));
      sessionStorage.setItem("elena_demo_mode", "true");
    },
    { key: SUPABASE_STORAGE_KEY, session: FAKE_SESSION, me: ME_RESPONSE },
  );
}

async function setPendingQueryAndDoc(page: Page, query: string, docName?: string) {
  await page.addInitScript(
    ({ q, doc }) => {
      localStorage.setItem("elena_pending_query", q);
      if (doc) localStorage.setItem("elena_pending_doc", doc);
    },
    { q: query, doc: docName },
  );
}

async function mockApi(page: Page) {
  const API_BASES = [API_BASE_LOCAL, API_BASE_PROD];

  // Supabase auth
  await page.route(`${SUPABASE_URL}/auth/v1/token**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION) }),
  );
  await page.route(`${SUPABASE_URL}/auth/v1/user**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION.user) }),
  );
  // Intercept Supabase REST inserts (demo persistence)
  await page.route(`${SUPABASE_URL}/rest/v1/chat_messages**`, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    }
    return route.fallback();
  });

  for (const base of API_BASES) {
    await page.route(`${base}/auth/me**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ME_RESPONSE) }),
    );
    await page.route(`${base}/chat/sessions**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
    );
    await page.route(`${base}/chat/welcome**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WELCOME_RESPONSE) }),
    );
    await page.route(`${base}/web/subscription**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: "free", tier: "free", status: "active", cancel_at_period_end: false }) }),
    );
    await page.route(`${base}/chat/send**`, (route) => {
      console.error("BUG: /chat/send was called in demo mode!");
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Should not reach real backend in demo mode" }) });
    });
    await page.route(`${base}/chat/poll/**`, (route) => {
      console.error("BUG: /chat/poll was called in demo mode!");
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Should not reach real backend in demo mode" }) });
    });
    await page.route(`${base}/**`, (route) => route.fallback());
  }
}

async function mockPaidSubscription(page: Page) {
  for (const base of [API_BASE_LOCAL, API_BASE_PROD]) {
    await page.route(`${base}/web/subscription**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plan: "pro", tier: "pro", status: "active", cancel_at_period_end: false }),
      }),
    );
  }
}

// Max time to wait for demo response to appear
const DEMO_TIMEOUT = 15_000;

// ---------------------------------------------------------------------------
// Demo flow test cases
// ---------------------------------------------------------------------------

interface DemoScenario {
  name: string;
  query: string;
  docName?: string;
  /** Unique text from the demo reply that proves the right response was matched */
  expectedReplySnippet: string;
  /** Card-specific text to verify the correct UI card rendered */
  expectedCardText: string;
  /** Must NOT see this text (proves we didn't get the generic fallback) */
  mustNotSee: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    name: "1. Bill Analysis (ER bill)",
    query: "I went to the ER after a car accident and they're saying I owe $21,000",
    docName: "ItemizedBill_20250815.PDF",
    expectedReplySnippet: "trauma activation",
    expectedCardText: "Bill Analysis",
    mustNotSee: "Could you tell me a bit more",
  },
  {
    name: "2. Charity Care",
    query: "there's no way I can pay this. I work full time and only make like $52,000",
    docName: "ItemizedBill_20250815.PDF",
    expectedReplySnippet: "Geisinger is a nonprofit hospital",
    expectedCardText: "Geisinger Medical Center",
    mustNotSee: "Could you tell me a bit more",
  },
  {
    name: "3. Financial Support (surgery)",
    query: "I need surgery but my insurance said they're only covering part of it and the rest is like $18,000 out of pocket",
    expectedReplySnippet: "offset most of that $18,000",
    expectedCardText: "Patient Advocate Foundation",
    mustNotSee: "Could you tell me a bit more",
  },
  {
    name: "4a. Prior Auth Appeal (won't cover MRI)",
    query: "I just got a letter from UHC saying they won't cover my MRI. my doctor literally told me I need it",
    docName: "insurance_denial_letter.pdf",
    expectedReplySnippet: "82% of insurance appeals",
    expectedCardText: "Denial Received",
    mustNotSee: "Could you tell me a bit more",
  },
  {
    name: "4b. Prior Auth Appeal (insurance said no MRI)",
    query: "my insurance said no to the MRI my doctor ordered",
    docName: "insurance_denial_letter.pdf",
    expectedReplySnippet: "82% of insurance appeals",
    expectedCardText: "Denial Received",
    mustNotSee: "Could you tell me a bit more",
  },
  {
    name: "5. Blood Test (price comparison)",
    query: "I haven't had bloodwork done in like 3 years and I know I should",
    docName: "insurance_card.jpg",
    expectedReplySnippet: "Quest",
    expectedCardText: "Quest Diagnostics",
    mustNotSee: "Could you tell me a bit more",
  },
  {
    name: "6. Colonoscopy (price comparison)",
    query: "my doctor told me I need to get a colonoscopy but I've been putting it off because it's expensive",
    docName: "insurance_card.jpg",
    expectedReplySnippet: "Bay Endoscopy",
    expectedCardText: "Bay Endoscopy Center",
    mustNotSee: "Could you tell me a bit more",
  },
  {
    name: "7. Document upload only (no text match → bill analysis fallback)",
    query: "Help me understand this bill",
    docName: "ItemizedBill_20250815.PDF",
    expectedReplySnippet: "trauma activation",
    expectedCardText: "Bill Analysis",
    mustNotSee: "Could you tell me a bit more",
  },
];

test.describe("Demo mode: all hardcoded flows", () => {
  for (const scenario of DEMO_SCENARIOS) {
    test(scenario.name, async ({ page }) => {
      // Set up auth, demo mode, and API mocks
      await injectAuthAndDemoMode(page);
      await setPendingQueryAndDoc(page, scenario.query, scenario.docName);
      await mockApi(page);

      // Monitor for real backend calls (should never happen)
      let hitRealBackend = false;
      page.on("request", (req) => {
        const url = req.url();
        if (url.includes("/chat/send") || url.includes("/chat/poll/")) {
          hitRealBackend = true;
        }
      });

      // Navigate to chat (simulating the landing page redirect)
      await page.goto("/chat");

      // Wait for chat area to be visible
      await expect(page.locator(".chat-selectable")).toBeVisible({ timeout: 10_000 });

      // Wait for the demo reply to appear (the unique snippet from the expected response)
      const replyLocator = page.locator(`text=${scenario.expectedReplySnippet}`).first();
      await expect(replyLocator).toBeVisible({ timeout: DEMO_TIMEOUT });

      // Verify the correct card rendered
      const cardLocator = page.locator(`text=${scenario.expectedCardText}`).first();
      await expect(cardLocator).toBeVisible({ timeout: 5_000 });

      // Verify we did NOT get the generic fallback
      const fallbackCount = await page.locator(`text=${scenario.mustNotSee}`).count();
      expect(fallbackCount, `Should NOT see generic fallback: "${scenario.mustNotSee}"`).toBe(0);

      // Verify no real backend calls were made
      expect(hitRealBackend, "Demo mode should never call /chat/send or /chat/poll").toBe(false);
    });
  }
});

test.describe("Demo mode: appeal multi-turn chain", () => {
  test("Appeal → Send → Deny → Timeline (3-turn chain)", async ({ page }) => {
    await injectAuthAndDemoMode(page);
    await setPendingQueryAndDoc(
      page,
      "I just got a letter from UHC saying they won't cover my MRI. my doctor literally told me I need it",
      "insurance_denial_letter.pdf",
    );
    await mockApi(page);
    await mockPaidSubscription(page);

    await page.goto("/chat");
    await expect(page.locator(".chat-selectable")).toBeVisible({ timeout: 10_000 });

    // Step 1: Initial appeal draft
    await expect(page.locator("text=82% of insurance appeals").first()).toBeVisible({ timeout: DEMO_TIMEOUT });
    await expect(page.locator("text=Denial Received").first()).toBeVisible({ timeout: 5_000 });

    // Step 2: Click "Send it for me"
    const sendBtn = page.locator("button").filter({ hasText: "Send it for me" });
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
    await sendBtn.click();

    // Verify submission confirmation + updated tracker
    await expect(page.locator("text=submitted your appeal to UnitedHealthcare").first()).toBeVisible({ timeout: DEMO_TIMEOUT });
    await expect(page.locator("text=Appeal Submitted").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Sent via Elena").first()).toBeVisible({ timeout: 5_000 });

    // Step 3: Click "What happens if they deny it again?"
    const denyBtn = page.locator("button").filter({ hasText: "What happens if they deny it again?" });
    await expect(denyBtn).toBeVisible({ timeout: 10_000 });
    await denyBtn.click();

    // Verify external review explanation
    await expect(page.locator("text=external review").first()).toBeVisible({ timeout: DEMO_TIMEOUT });
    await expect(page.locator("text=40-60%").first()).toBeVisible({ timeout: 5_000 });

    // Step 4: Click "How long does external review take?" → triggers timeline entry
    const howLongBtn = page.locator("button").filter({ hasText: "How long" }).first();
    await expect(howLongBtn).toBeVisible({ timeout: 10_000 });
    await howLongBtn.click();

    // Verify timeline response
    await expect(page.locator("text=30 days from today").first()).toBeVisible({ timeout: DEMO_TIMEOUT });
    await expect(page.locator("text=May 9th").first()).toBeVisible({ timeout: 5_000 });
  });
});
