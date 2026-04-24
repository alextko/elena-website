/**
 * E2E coverage for the `lateSignupFlag` resolver on the landing page.
 *
 * The flag determines whether the hero CTA routes the user into the
 * late-signup funnel (/onboard) or shows the AuthModal immediately.
 * Default flipped from `false` (auth-first) to `true` (onboard-first) in
 * PR #25 — tests pin that default in place and verify the override
 * URL params still work.
 */

import { test, expect, type Page, type Route } from "@playwright/test";

const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";

/**
 * Mock just enough of Supabase + backend so the landing page renders
 * without a real session. User is anonymous; the hero CTA should be
 * reachable.
 */
async function mockLanding(page: Page) {
  // Supabase: no session
  await page.route(`${SUPABASE_URL}/auth/v1/token**`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ session: null }) }),
  );
  await page.route(`${SUPABASE_URL}/auth/v1/user**`, (route: Route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "unauthenticated" }) }),
  );
  // If the landing page happens to fetch anything else from Supabase REST,
  // return an empty array so it doesn't hang on network.
  await page.route(`${SUPABASE_URL}/rest/v1/**`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  // /onboard loads a tour shell + quiz content. We don't need the real data
  // to land there — just block the API calls that would otherwise hang.
  for (const base of [process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010", "https://elena-backend-production-production.up.railway.app"]) {
    await page.route(`${base}/**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
  }
}

async function fillAndSendHero(page: Page, query = "hi elena test") {
  // The hero textarea with placeholder "Ask Elena anything..."
  const textarea = page.getByPlaceholder("Ask Elena anything...");
  await expect(textarea).toBeVisible({ timeout: 10_000 });
  await textarea.fill(query);
  // Send button — identified by aria-label
  await page.getByRole("button", { name: "Send" }).click();
}

test.describe("Landing page — late-signup default", () => {
  test("default (no query params): hero CTA routes to /onboard, no AuthModal", async ({ page }) => {
    await mockLanding(page);

    await page.goto("/");
    await fillAndSendHero(page);

    // URL should change to /onboard
    await expect(page).toHaveURL(/\/onboard/, { timeout: 5_000 });

    // AuthModal must NOT be visible
    await expect(page.getByText("Create an account")).not.toBeVisible();
  });

  test("?signup=first: hero CTA opens AuthModal (legacy signup-first), URL stays on /", async ({ page }) => {
    await mockLanding(page);

    await page.goto("/?signup=first");
    await fillAndSendHero(page);

    // AuthModal (signup mode) should be visible
    await expect(page.getByText("Create an account")).toBeVisible({ timeout: 5_000 });

    // URL should NOT have navigated to /onboard
    expect(page.url()).not.toContain("/onboard");
  });

  test("?signup=late: hero CTA routes to /onboard (legacy opt-in still works)", async ({ page }) => {
    await mockLanding(page);

    await page.goto("/?signup=late");
    await fillAndSendHero(page);

    await expect(page).toHaveURL(/\/onboard/, { timeout: 5_000 });
  });

  test("sessionStorage persists ?signup=first choice across navigation", async ({ page }) => {
    await mockLanding(page);

    // Visit with ?signup=first — sets elena_late_signup=0 in sessionStorage
    await page.goto("/?signup=first");
    // Let the flag resolver run by submitting the hero
    await fillAndSendHero(page);
    await expect(page.getByText("Create an account")).toBeVisible({ timeout: 5_000 });

    // Navigate back to / without the query param. Flag should still be
    // false because sessionStorage.elena_late_signup === "0".
    await page.goto("/");
    await fillAndSendHero(page);

    // Still signup-first — AuthModal re-appears, URL stays on /
    await expect(page.getByText("Create an account")).toBeVisible({ timeout: 5_000 });
    expect(page.url()).not.toContain("/onboard");
  });

  test("sessionStorage persists ?signup=late choice across navigation", async ({ page }) => {
    await mockLanding(page);

    await page.goto("/?signup=late");
    await fillAndSendHero(page);
    await expect(page).toHaveURL(/\/onboard/, { timeout: 5_000 });

    // Fresh tab's /. Should stay in late-signup because sessionStorage says so
    // (and that's also the default, so doubly covered).
    await page.goto("/");
    await fillAndSendHero(page);
    await expect(page).toHaveURL(/\/onboard/, { timeout: 5_000 });
  });

  test("cold /onboard deep-link arms the post-seed paywall gate on mount", async ({ page }) => {
    // Regression pin: paid ads that deep-link directly to /onboard (skipping
    // the landing hero) must still arm elena_tour_post_seed_gate so the
    // paywall fires at message #2 on /chat. Without the mount-time write in
    // src/app/onboard/page.tsx, cold entries previously slipped through
    // without the gate — Meta's optimizer saw no StartTrial event.
    await mockLanding(page);

    await page.goto("/onboard?utm_source=meta&utm_campaign=cold_deeplink");
    // Wait for the mount effect to run
    await page.waitForFunction(
      () => sessionStorage.getItem("elena_tour_post_seed_gate") === "1",
      undefined,
      { timeout: 5_000 },
    );

    const gate = await page.evaluate(() => sessionStorage.getItem("elena_tour_post_seed_gate"));
    expect(gate).toBe("1");
  });
});
