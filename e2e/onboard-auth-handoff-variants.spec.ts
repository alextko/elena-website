import { expect, test, type Page, type Route } from "@playwright/test";

const API_BASE_LOCAL = process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010";
const API_BASE_PROD = "https://elena-backend-production-production.up.railway.app";
const API_BASES = [API_BASE_LOCAL, API_BASE_PROD];
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";
const SUPABASE_STORAGE_KEY = "sb-livbrrqqxnvnxhggguig-auth-token";

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
    last_sign_in_at: "2025-01-01T00:00:00Z",
  },
};

type Variant = "self" | "dependent";

type MockCalls = {
  completeOnboardingBodies: Array<Record<string, unknown>>;
  dependentCreateBodies: Array<Record<string, unknown>>;
  switchTargets: string[];
  conditionWrites: Array<{ profileId: string; body: Record<string, unknown> }>;
};

async function mockSupabaseAuth(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/token**`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION) }),
  );
  await page.route(`${SUPABASE_URL}/auth/v1/user**`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE_SESSION.user) }),
  );
}

async function injectAuthedHandoffState(page: Page, variant: Variant) {
  const meCache = {
    auth_user_id: "user-1",
    profile_id: "main-profile",
    email: "test@example.com",
    has_profile: true,
    onboarding_completed: true,
    profiles: [
      {
        id: "main-profile",
        label: "Me",
        relationship: "self",
        first_name: "Test",
        last_name: "User",
        is_primary: true,
        is_linked: false,
      },
    ],
  };

  const tourBuffer =
    variant === "self"
      ? {
          profile: {
            first_name: "Test",
            last_name: "User",
            date_of_birth: "1990-01-01",
            zip_code: "60601",
          },
          dependents: [],
          conditions: [{ name: "Asthma", status: "active" }],
          medications: [],
          todos: [],
          seed_query: "Help me manage my asthma.",
          created_at: new Date().toISOString(),
        }
      : {
          profile: {
            first_name: "Test",
            last_name: "User",
            date_of_birth: "1990-01-01",
            zip_code: "60601",
          },
          dependents: [
            {
              first_name: "Linda",
              last_name: "Care",
              relationship: "parent",
              label: "Mom",
              date_of_birth: "1955-05-05",
              zip_code: "60601",
              is_primary_dependent: true,
            },
          ],
          conditions: [{ name: "Arthritis", status: "active" }],
          medications: [],
          todos: [],
          seed_query: "Help Linda manage her arthritis.",
          created_at: new Date().toISOString(),
        };

  const tourState =
    variant === "self"
      ? {
          phase: "auth",
          routerChoice: "condition",
          painSelection: "1to3",
          setupForCareId: "myself",
          firstName: "Test",
          lastName: "User",
        }
      : {
          phase: "auth",
          routerChoice: "condition",
          painSelection: "1to3",
          setupForCareId: "parent",
          firstName: "Test",
          lastName: "User",
          dependentFirstName: "Linda",
          dependentLastName: "Care",
        };

  await page.addInitScript(
    ({ storageKey, session, me, buffer, state }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
      localStorage.setItem("elena_onboarding_done", "1");
      localStorage.setItem("elena_active_profile_id", "main-profile");
      localStorage.setItem("elena_tour_state", JSON.stringify(state));
      sessionStorage.setItem("elena_me_cache", JSON.stringify(me));
      sessionStorage.setItem("elena_onboard_signup_pending", "1");
      sessionStorage.setItem("elena_tour_post_seed_gate", "1");
      sessionStorage.setItem("elena_tour_buffer", JSON.stringify(buffer));
    },
    {
      storageKey: SUPABASE_STORAGE_KEY,
      session: FAKE_SESSION,
      me: meCache,
      buffer: tourBuffer,
      state: tourState,
    },
  );
}

async function mockHandoffApi(page: Page, variant: Variant): Promise<MockCalls> {
  const calls: MockCalls = {
    completeOnboardingBodies: [],
    dependentCreateBodies: [],
    switchTargets: [],
    conditionWrites: [],
  };

  let activeProfileId = "main-profile";
  let dependentCreated = false;
  const dependentProfileId = "dep-1";

  const buildMeResponse = () => ({
    auth_user_id: "user-1",
    profile_id: activeProfileId,
    email: "test@example.com",
    has_profile: true,
    onboarding_completed: true,
    profiles: [
      {
        id: "main-profile",
        label: "Me",
        relationship: "self",
        first_name: "Test",
        last_name: "User",
        is_primary: true,
        is_linked: false,
      },
      ...(dependentCreated
        ? [{
            id: dependentProfileId,
            label: "Mom",
            relationship: "parent",
            first_name: "Linda",
            last_name: "Care",
            is_primary: false,
            is_linked: false,
          }]
        : []),
    ],
  });

  for (const base of API_BASES) {
    await page.route(`${base}/auth/me**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(buildMeResponse()) }),
    );

    await page.route(`${base}/profile`, async (route: Route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = JSON.parse(route.request().postData() || "{}") as Record<string, unknown>;
      calls.completeOnboardingBodies.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "main-profile",
          profile_id: "main-profile",
          first_name: "Test",
          last_name: "User",
          profile_picture_url: null,
        }),
      });
    });

    await page.route(`${base}/profiles`, async (route: Route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = JSON.parse(route.request().postData() || "{}") as Record<string, unknown>;
      calls.dependentCreateBodies.push(body);
      dependentCreated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: dependentProfileId,
          profile_id: dependentProfileId,
          first_name: "Linda",
          last_name: "Care",
        }),
      });
    });

    await page.route(`${base}/profiles/*/switch`, async (route: Route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      const match = route.request().url().match(/\/profiles\/([^/]+)\/switch/);
      const nextId = match?.[1] || "";
      calls.switchTargets.push(nextId);
      activeProfileId = nextId || activeProfileId;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.route(`${base}/profile/*/conditions/add`, async (route: Route) => {
      const match = route.request().url().match(/\/profile\/([^/]+)\/conditions\/add/);
      calls.conditionWrites.push({
        profileId: match?.[1] || "unknown",
        body: JSON.parse(route.request().postData() || "{}") as Record<string, unknown>,
      });
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.route(`${base}/auth/complete-onboarding**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    await page.route(`${base}/todos/generate**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route(`${base}/chat/welcome**`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: variant === "self" ? "welcome-self" : "welcome-dependent",
          heading: variant === "self" ? "Hi, Test!" : "Hi, Linda!",
          message: "Welcome to Elena.",
          suggestions: [],
        }),
      }),
    );
    await page.route(`${base}/chat/sessions**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route(`${base}/chat/*/messages**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route(`${base}/web/subscription**`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plan: "free", tier: "free", status: "active", cancel_at_period_end: false }),
      }),
    );
    await page.route(`${base}/profile/*/doctors**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ doctors: [] }) }),
    );
    await page.route(`${base}/care-visits**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route(`${base}/todos?include_future=true**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route(`${base}/todos**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route(`${base}/habits/completions**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    await page.route(`${base}/habits**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route(`${base}/insurance/cards**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    await page.route(`${base}/**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
  }

  return calls;
}

async function runOnboardRecovery(page: Page) {
  await page.goto("/onboard");
  await expect(page.getByTestId("onboard-flush-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Ready to start getting that time back\?/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Create your account/i })).toHaveCount(0);

  await page.getByRole("button", { name: /^Continue$/i }).click();

  await expect(page).toHaveURL(/\/chat/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Create your account/i })).toHaveCount(0);
  await expect(page.getByText("Welcome to Elena.")).toBeVisible({ timeout: 20_000 });
}

test.describe("Onboard auth handoff variants", () => {
  test("self-setup handoff stays on the main profile after signup", async ({ page }) => {
    await mockSupabaseAuth(page);
    await injectAuthedHandoffState(page, "self");
    const calls = await mockHandoffApi(page, "self");

    await runOnboardRecovery(page);

    expect(calls.completeOnboardingBodies).toHaveLength(1);
    expect(calls.completeOnboardingBodies[0]).toMatchObject({
      first_name: "Test",
      last_name: "User",
      date_of_birth: "1990-01-01",
      zip_code: "60601",
    });
    expect(calls.dependentCreateBodies).toHaveLength(0);
    expect(calls.switchTargets).toHaveLength(0);
    expect(calls.conditionWrites).toEqual([
      {
        profileId: "main-profile",
        body: { name: "Asthma", status: "active" },
      },
    ]);
  });

  test("dependent-setup handoff creates and switches to the managed profile after signup", async ({ page }) => {
    await mockSupabaseAuth(page);
    await injectAuthedHandoffState(page, "dependent");
    const calls = await mockHandoffApi(page, "dependent");

    await runOnboardRecovery(page);

    expect(calls.completeOnboardingBodies).toHaveLength(1);
    expect(calls.completeOnboardingBodies[0]).toMatchObject({
      first_name: "Test",
      last_name: "User",
      date_of_birth: "1990-01-01",
      zip_code: "60601",
    });
    expect(calls.dependentCreateBodies).toHaveLength(1);
    expect(calls.dependentCreateBodies[0]).toMatchObject({
      first_name: "Linda",
      last_name: "Care",
      relationship: "parent",
      label: "Mom",
      date_of_birth: "1955-05-05",
      zip_code: "60601",
    });
    expect(calls.switchTargets).toEqual(["dep-1"]);
    expect(calls.conditionWrites).toEqual([
      {
        profileId: "dep-1",
        body: { name: "Arthritis", status: "active" },
      },
    ]);
  });
});
