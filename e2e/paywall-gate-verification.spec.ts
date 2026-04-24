import { randomUUID } from "node:crypto";

import { expect, test, type Page, type Request } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL =
  process.env.PAYWALL_E2E_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://localhost:3001";
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0";
const SUPABASE_STORAGE_KEY = "sb-livbrrqqxnvnxhggguig-auth-token";
const RUN_ID = `paywall-leak-${Date.now()}`;

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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function expectOk(response: Response, label: string) {
  expect(
    response.ok,
    `${label}: ${response.status} ${await response.clone().text()}`,
  ).toBe(true);
}

async function safeDelete(url: string) {
  try {
    await fetch(url, {
      method: "DELETE",
      headers: SUPABASE_HEADERS,
    });
  } catch {}
}

async function createAuthedUser(
  profileOverrides: Record<string, unknown> = {},
): Promise<TestUser> {
  const stamp = Date.now();
  const suffix = randomUUID().slice(0, 8);
  const email = `paywall+pw-${stamp}-${suffix}@elena-ai-testing.com`;
  const password = `Playwright_${suffix}!`;
  const firstName = "Paywall";
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

async function cleanupAuthedUser(user: TestUser | null) {
  if (!user) return;

  await safeDelete(`${SUPABASE_URL}/rest/v1/chat_sessions?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/medical_insurance?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/secondary_medical_insurance?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/dental_insurance?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/vision_insurance?profile_id=eq.${user.profileId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/feature_usage?auth_user_id=eq.${user.authUserId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/credit_ledger?auth_user_id=eq.${user.authUserId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/subscriptions?auth_user_id=eq.${user.authUserId}`);
  await safeDelete(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.profileId}`);
}

async function seedFeatureUsage(
  authUserId: string,
  feature: string,
  count: number,
) {
  const usageDate = todayIsoDate();
  await safeDelete(
    `${SUPABASE_URL}/rest/v1/feature_usage?auth_user_id=eq.${authUserId}&feature=eq.${feature}&usage_date=eq.${usageDate}`,
  );

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/feature_usage`, {
    method: "POST",
    headers: { ...SUPABASE_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({
      auth_user_id: authUserId,
      feature,
      usage_date: usageDate,
      count,
    }),
  });
  await expectOk(resp, `seed feature_usage (${feature})`);
}

async function primeBrowserAuth(page: Page, user: TestUser) {
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
    ({ storageKey, sessionBlob, profileId, meCache }) => {
      localStorage.setItem(storageKey, JSON.stringify(sessionBlob));
      localStorage.setItem("elena_onboarding_done", "1");
      localStorage.setItem("elena_active_profile_id", profileId);
      sessionStorage.setItem("elena_me_cache", JSON.stringify(meCache));
    },
    {
      storageKey: SUPABASE_STORAGE_KEY,
      sessionBlob: user.sessionBlob,
      profileId: user.profileId,
      meCache,
    },
  );
}

async function openChat(page: Page) {
  const welcomePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes("/chat/welcome") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    )
    .catch(() => null);

  await page.goto("/chat");
  await expect(page.getByPlaceholder("Ask Elena anything...")).toBeVisible({
    timeout: 30_000,
  });
  await welcomePromise;
}

async function captureNetwork(page: Page): Promise<Request[]> {
  const reqs: Request[] = [];
  page.on("request", (r) => {
    const url = r.url();
    if (
      url.includes("/web/") ||
      url.includes("/chat") ||
      url.includes("/documents") ||
      url.includes("checkout")
    ) {
      reqs.push(r);
    }
  });
  return reqs;
}

async function dumpForensics(page: Page, reqs: Request[], label: string) {
  const dir = path.join("test-results", RUN_ID, label);
  fs.mkdirSync(dir, { recursive: true });

  try {
    fs.writeFileSync(path.join(dir, "page.html"), await page.content());
    await page.screenshot({ path: path.join(dir, "page.png"), fullPage: true });
  } catch (error) {
    fs.writeFileSync(
      path.join(dir, "page-error.txt"),
      `Could not capture page snapshot: ${String(error)}`,
    );
  }

  fs.writeFileSync(
    path.join(dir, "requests.json"),
    JSON.stringify(
      reqs.map((r) => ({ method: r.method(), url: r.url(), headers: r.headers() })),
      null,
      2,
    ),
  );
}

async function detectPaywallSurface(
  page: Page,
): Promise<"reviews" | "trial" | "upgrade" | null> {
  const reviewModal = page.getByTestId("paywall-reviews-modal");
  if (await reviewModal.isVisible().catch(() => false)) return "reviews";

  const trialStep = page.getByTestId("paywall-trial-step-1");
  if (await trialStep.isVisible().catch(() => false)) return "trial";

  const upgradeDialog = page.getByRole("dialog").filter({
    hasText: /Free limit reached|Upgrade your plan|Get more out of Elena/i,
  });
  if (await upgradeDialog.first().isVisible().catch(() => false)) return "upgrade";

  return null;
}

test("seeded free user hits paywall when provider-search quota is exhausted", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const reqs = await captureNetwork(page);
  let user: TestUser | null = null;

  try {
    user = await createAuthedUser({
      insurance_carrier: "Aetna",
      member_id: "MEM123",
      insurance_policy_number: "POL123",
    });
    await seedFeatureUsage(user.authUserId, "provider_search", 2);
    await primeBrowserAuth(page, user);
    await openChat(page);

    const chatInput = page.getByPlaceholder("Ask Elena anything...");
    await chatInput.fill("Find me an in-network dermatologist near 94110.");
    await chatInput.press("Enter");

    await expect
      .poll(() => detectPaywallSurface(page), {
        timeout: 60_000,
        intervals: [1_000, 2_000, 5_000],
      })
      .toBe("reviews");

    await page.getByTestId("paywall-reviews-continue").click();
    await expect(page.getByTestId("paywall-trial-step-1")).toBeVisible({
      timeout: 30_000,
    });

    await dumpForensics(page, reqs, "paywall-fired-ok");
  } catch (error) {
    await dumpForensics(page, reqs, "paywall-did-not-fire");
    throw error;
  } finally {
    await cleanupAuthedUser(user);
    await ctx.close();
  }
});
