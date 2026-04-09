import { test, expect, type Page } from "@playwright/test";

/**
 * Tests that after a demo response, followup messages pass through to the
 * real backend (no more demo interception) and the agent receives them.
 */

// ---------------------------------------------------------------------------
// Fixtures
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
  session_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
};

const API_BASE_LOCAL = "http://localhost:8000";
const API_BASE_PROD = "https://elena-backend-production-production.up.railway.app";
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";

const DEMO_TIMEOUT = 15_000;
const HANDOFF_TIMEOUT = 15_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function injectAuthAndDemoMode(page: Page) {
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem("elena_onboarding_done", "1");
      localStorage.setItem("elena_active_profile_id", "profile-1");
      sessionStorage.setItem("elena_demo_mode", "true");
    },
    { key: SUPABASE_STORAGE_KEY, session: FAKE_SESSION },
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

function createHandoffMock() {
  let capturedSendBodies: Record<string, unknown>[] = [];
  let sendCallCount = 0;

  async function setup(page: Page) {
    const API_BASES = [API_BASE_LOCAL, API_BASE_PROD];

    await page.route(`${SUPABASE_URL}/auth/v1/token**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION) }),
    );
    await page.route(`${SUPABASE_URL}/auth/v1/user**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION.user) }),
    );
    // Intercept Supabase REST inserts (demo persistence) — let them succeed
    await page.route(`${SUPABASE_URL}/rest/v1/chat_messages**`, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      }
      return route.fallback();
    });

    for (const base of API_BASES) {
      await page.route(`${base}/auth/me`, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ME_RESPONSE) }),
      );
      await page.route(`${base}/chat/sessions`, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
      );
      await page.route(`${base}/chat/welcome**`, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WELCOME_RESPONSE) }),
      );
      await page.route(`${base}/web/subscription`, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: "free", tier: "free", status: "active", cancel_at_period_end: false }) }),
      );

      // /chat/send — capture request body and return success
      await page.route(`${base}/chat/send`, async (route) => {
        try {
          capturedSendBodies.push(JSON.parse(route.request().postData() || "{}"));
        } catch {
          capturedSendBodies.push({});
        }
        sendCallCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ chat_request_id: `handoff-req-${sendCallCount}`, session_id: WELCOME_RESPONSE.session_id }),
        });
      });

      // /chat/poll — return completed immediately
      await page.route(`${base}/chat/poll/**`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            phase: "completed",
            elapsed_seconds: 2,
            result: {
              reply: "AGENT_FOLLOWUP: I understand the context from our earlier analysis and can help with that.",
              session_id: WELCOME_RESPONSE.session_id,
              suggestions: ["Tell me more", "What else can I do?"],
            },
          }),
        });
      });

      await page.route(`${base}/**`, (route) => route.fallback());
    }
  }

  return {
    setup,
    get capturedSendBodies() { return capturedSendBodies; },
    get sendCallCount() { return sendCallCount; },
    get lastSendBody() { return capturedSendBodies[capturedSendBodies.length - 1] ?? null; },
  };
}

async function sendFollowup(page: Page, text: string) {
  const textarea = page.locator("textarea").first();
  await expect(textarea).toBeVisible({ timeout: 10_000 });
  await textarea.fill(text);
  await textarea.press("Enter");
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

interface HandoffScenario {
  name: string;
  initialQuery: string;
  initialDoc?: string;
  demoReplySnippet: string;
  followupMessage: string;
}

const HANDOFF_SCENARIOS: HandoffScenario[] = [
  {
    name: "Bill Analysis → followup",
    initialQuery: "I went to the ER after a car accident and they're saying I owe $21,000",
    initialDoc: "ItemizedBill_20250815.PDF",
    demoReplySnippet: "trauma activation",
    followupMessage: "Can you request an itemized bill on my behalf?",
  },
  {
    name: "Charity Care → followup",
    initialQuery: "there's no way I can pay this. I work full time and only make like $52,000",
    initialDoc: "ItemizedBill_20250815.PDF",
    demoReplySnippet: "nonprofit hospital",
    followupMessage: "How do I start the application for Geisinger's program?",
  },
  {
    name: "Financial Support → followup",
    initialQuery: "I need surgery but my insurance said they're only covering part of it and the rest is like $18,000 out of pocket",
    demoReplySnippet: "offset most of that",
    followupMessage: "Which of these programs should I apply to first?",
  },
  {
    name: "Prior Auth Appeal → followup",
    initialQuery: "I just got a letter from UHC saying they won't cover my MRI. my doctor literally told me I need it",
    initialDoc: "insurance_denial_letter.pdf",
    demoReplySnippet: "82% of insurance appeals",
    followupMessage: "Yes, please send the appeal letter for me",
  },
  {
    name: "Blood Test → followup",
    initialQuery: "I haven't had bloodwork done in like 3 years and I know I should",
    initialDoc: "insurance_card.jpg",
    demoReplySnippet: "Quest",
    followupMessage: "Book me in at Quest Diagnostics please",
  },
  {
    name: "Colonoscopy → followup",
    initialQuery: "my doctor told me I need to get a colonoscopy but I've been putting it off because it's expensive",
    initialDoc: "insurance_card.jpg",
    demoReplySnippet: "Bay Endoscopy",
    followupMessage: "Tell me more about the cheapest option",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Demo handoff: followup passes through to real agent", () => {
  for (const scenario of HANDOFF_SCENARIOS) {
    test(scenario.name, async ({ page }) => {
      const mock = createHandoffMock();
      await injectAuthAndDemoMode(page);
      await setPendingQueryAndDoc(page, scenario.initialQuery, scenario.initialDoc);
      await mock.setup(page);

      await page.goto("/chat");
      await expect(page.locator(".chat-selectable")).toBeVisible({ timeout: 10_000 });

      // Step 1: Demo response renders
      await expect(page.locator(`text=${scenario.demoReplySnippet}`).first()).toBeVisible({ timeout: DEMO_TIMEOUT });
      expect(mock.sendCallCount, "Demo response should not call /chat/send").toBe(0);

      // Step 2: Send followup
      await sendFollowup(page, scenario.followupMessage);

      // Step 3: Agent reply appears (proves the real backend was called)
      await expect(page.locator("text=AGENT_FOLLOWUP").first()).toBeVisible({ timeout: HANDOFF_TIMEOUT });

      // Step 4: Backend was called with the clean followup message (no injected context)
      expect(mock.sendCallCount, "Followup should call /chat/send").toBeGreaterThan(0);
      const sent = mock.lastSendBody!;
      expect(sent.message, "Message should be the clean followup text").toBe(scenario.followupMessage);

      // Step 5: No errors visible
      expect(await page.locator("text=something went wrong").count()).toBe(0);
    });
  }
});
