import { test, expect, type Page } from "@playwright/test";

/**
 * Most demo suggestion buttons should hand off to the real agent. The one
 * intentional exception covered here is Prior Auth Appeal → "Send it for me",
 * which continues the canned appeal demo chain.
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

function createMock() {
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
      await page.route(`${base}/chat/send**`, async (route) => {
        const request = route.request();
        try {
          capturedSendBodies.push(JSON.parse(request.postData() || "{}"));
        } catch {
          capturedSendBodies.push({});
        }
        sendCallCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ chat_request_id: `handoff-req-${sendCallCount}`, session_id: "demo-welcome-session" }),
        });
      });
      await page.route(`${base}/chat/poll/**`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            phase: "completed",
            elapsed_seconds: 2,
            result: {
              reply: "HANDOFF_OK: Following up on the analysis.",
              session_id: "demo-welcome-session",
              suggestions: [],
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

// ---------------------------------------------------------------------------
// Scenarios: every demo entry + every suggestion it produces
// ---------------------------------------------------------------------------

interface SuggestionScenario {
  demoName: string;
  initialQuery: string;
  initialDoc?: string;
  /** Text snippet to confirm the demo card rendered */
  demoSnippet: string;
  /** The exact suggestion button texts that should appear */
  suggestions: string[];
  firstSuggestionBehavior?: "handoff" | "demo_chain";
  firstSuggestionReplySnippet?: string;
}

const SCENARIOS: SuggestionScenario[] = [
  {
    demoName: "Bill Analysis",
    initialQuery: "I went to the ER after a car accident and they're saying I owe $21,000",
    initialDoc: "ItemizedBill_20250815.PDF",
    demoSnippet: "trauma activation",
    suggestions: [
      "What do I do next?",
      "Can you help me dispute this?",
      "Is there any way to get this reduced?",
    ],
  },
  {
    demoName: "Charity Care",
    initialQuery: "there's no way I can pay this. I work full time and only make like $52,000",
    initialDoc: "ItemizedBill_20250815.PDF",
    demoSnippet: "nonprofit hospital",
    suggestions: [
      "Help me apply to Geisinger's program",
      "What documents do I need?",
      "Can Elena call them for me?",
    ],
  },
  {
    demoName: "Financial Support",
    initialQuery: "I need surgery but my insurance said they're only covering part of it and the rest is like $18,000 out of pocket",
    demoSnippet: "offset most of that",
    suggestions: [
      "Help me apply to these",
      "Which one should I start with?",
      "Can Elena handle the applications?",
    ],
  },
  {
    demoName: "Prior Auth Appeal",
    initialQuery: "I just got a letter from UHC saying they won't cover my MRI. my doctor literally told me I need it",
    initialDoc: "insurance_denial_letter.pdf",
    demoSnippet: "82% of insurance appeals",
    firstSuggestionBehavior: "demo_chain",
    firstSuggestionReplySnippet: "submitted your appeal to UnitedHealthcare",
    suggestions: [
      "Send it for me",
      "Can I edit the letter first?",
      "What happens after I send it?",
    ],
  },
  {
    demoName: "Blood Test",
    initialQuery: "I haven't had bloodwork done in like 3 years and I know I should",
    initialDoc: "insurance_card.jpg",
    demoSnippet: "Quest",
    suggestions: [
      "Book at Quest Diagnostics",
      "What does a blood panel check for?",
      "Do I need to fast before?",
    ],
  },
  {
    demoName: "Colonoscopy",
    initialQuery: "my doctor told me I need to get a colonoscopy but I've been putting it off because it's expensive",
    initialDoc: "insurance_card.jpg",
    demoSnippet: "Bay Endoscopy",
    suggestions: [
      "Book the cheapest one",
      "Are any of these highly rated?",
      "What should I know before the procedure?",
    ],
  },
  {
    demoName: "Document Upload (bill fallback)",
    initialQuery: "Help me understand this bill",
    initialDoc: "ItemizedBill_20250815.PDF",
    demoSnippet: "trauma activation",
    suggestions: [
      "Request an itemized bill",
      "Can you help me dispute this?",
      "Is there any way to get this reduced?",
    ],
  },
];

// ---------------------------------------------------------------------------
// Tests: one per scenario, clicks FIRST suggestion and verifies the intended path
// ---------------------------------------------------------------------------

test.describe("Demo suggestions: first suggestion follows the intended path", () => {
  for (const scenario of SCENARIOS) {
    test(`${scenario.demoName}: "${scenario.suggestions[0]}"`, async ({ page }) => {
      const mock = createMock();
      await injectAuthAndDemoMode(page);
      await setPendingQueryAndDoc(page, scenario.initialQuery, scenario.initialDoc);
      await mock.setup(page);

      await page.goto("/chat");
      await expect(page.locator(".chat-selectable")).toBeVisible({ timeout: 10_000 });

      // Wait for demo response
      await expect(page.locator(`text=${scenario.demoSnippet}`).first()).toBeVisible({ timeout: 15_000 });

      // Wait for suggestion buttons to appear
      const suggestionBtn = page.locator(`button`).filter({ hasText: scenario.suggestions[0] });
      await expect(suggestionBtn).toBeVisible({ timeout: 10_000 });

      // Click the first suggestion
      await suggestionBtn.click();

      if (scenario.firstSuggestionBehavior === "demo_chain") {
        await expect(page.locator(`text=${scenario.firstSuggestionReplySnippet}`).first()).toBeVisible({ timeout: 15_000 });
        expect(mock.sendCallCount, "Intentional demo-chain suggestions should not call /chat/send").toBe(0);
      } else {
        // Verify agent reply appears (NOT a demo re-trigger, NOT an error)
        await expect(page.locator("text=HANDOFF_OK").first()).toBeVisible({ timeout: 15_000 });

        // Verify /chat/send was called with the clean suggestion text
        expect(mock.sendCallCount, "Should call /chat/send").toBeGreaterThan(0);
        const sent = mock.lastSendBody!;
        expect(sent.message).toBe(scenario.suggestions[0]);
      }

      // Should NOT see error
      expect(await page.locator("text=something went wrong").count()).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Tests: verify ALL suggestions for each scenario follow the intended path
// ---------------------------------------------------------------------------

test.describe("Demo suggestions: each suggestion follows the intended path", () => {
  for (const scenario of SCENARIOS) {
    for (const suggestion of scenario.suggestions) {
      const isIntentionalDemoChain =
        scenario.firstSuggestionBehavior === "demo_chain" && suggestion === scenario.suggestions[0];
      const expectationLabel = isIntentionalDemoChain ? "stays in demo chain" : "hands off";

      test(`${scenario.demoName}: "${suggestion}" ${expectationLabel}`, async ({ page }) => {
        const mock = createMock();
        await injectAuthAndDemoMode(page);
        await setPendingQueryAndDoc(page, scenario.initialQuery, scenario.initialDoc);
        await mock.setup(page);

        await page.goto("/chat");
        await expect(page.locator(".chat-selectable")).toBeVisible({ timeout: 10_000 });

        // Wait for demo response
        await expect(page.locator(`text=${scenario.demoSnippet}`).first()).toBeVisible({ timeout: 15_000 });

        // Wait for suggestion buttons
        const suggestionBtn = page.locator(`button`).filter({ hasText: suggestion });
        await expect(suggestionBtn).toBeVisible({ timeout: 10_000 });

        // Click the suggestion
        await suggestionBtn.click();

        if (isIntentionalDemoChain) {
          await expect(page.locator(`text=${scenario.firstSuggestionReplySnippet}`).first()).toBeVisible({ timeout: 15_000 });
          expect(mock.sendCallCount, `"${suggestion}" is an intentional demo-chain follow-up and should stay in demo mode`).toBe(0);
        } else {
          // Verify handoff happens (agent reply, not a re-triggered demo response)
          await expect(page.locator("text=HANDOFF_OK").first()).toBeVisible({ timeout: 15_000 });

          // Verify backend was actually called (proves it wasn't intercepted by demo mode)
          expect(mock.sendCallCount, `"${suggestion}" should trigger handoff, not demo re-match`).toBeGreaterThan(0);
        }
      });
    }
  }
});
