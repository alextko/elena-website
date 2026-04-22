/**
 * E2E coverage for the 4-screen trial paywall flow.
 *
 * All assertions target state-machine behavior, data flow (analytics calls,
 * /web/checkout request body), and DOM/aria — not visual polish.
 *
 * Uses the /paywall-preview route as the test harness so we don't need to
 * spin up auth / chat / Supabase mocks. The full post-2nd-message trigger
 * path (chat-area.tsx) is unit-tested via prod telemetry after launch.
 */

import { test, expect, type Page, type Route } from "@playwright/test";

const API_BASE_LOCAL = "http://localhost:8000";
const API_BASE_PROD = "https://elena-backend-production-production.up.railway.app";

type CapturedCheckout = {
  body: Record<string, unknown> | null;
  callCount: number;
};

type CapturedAnalytics = {
  event: string;
  properties: Record<string, unknown>;
}[];

/**
 * Mocks the /web/checkout endpoint on both local+prod bases so the test works
 * regardless of NEXT_PUBLIC_API_BASE. Returns a reference object populated by
 * the mock, plus the Playwright matcher helpers used to assert against it.
 */
async function mockCheckoutAndAnalytics(page: Page): Promise<{
  checkout: CapturedCheckout;
  analytics: CapturedAnalytics;
}> {
  const checkout: CapturedCheckout = { body: null, callCount: 0 };
  const analytics: CapturedAnalytics = [];

  // Spy on analytics.track via the __analytics_spy hook we added to
  // src/lib/analytics.ts. This works even when Mixpanel is disabled (no token
  // configured) because the spy fires before the disabled check.
  await page.addInitScript(() => {
    // @ts-expect-error test-only globals
    window.__paywall_captured = [];
    // @ts-expect-error test-only globals
    window.__analytics_spy = (event: string, properties: Record<string, unknown>) => {
      // @ts-expect-error test-only global
      window.__paywall_captured.push({ event, properties: properties || {} });
    };
  });

  const checkoutHandler = async (route: Route) => {
    checkout.callCount += 1;
    const raw = route.request().postData();
    checkout.body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    // Return a same-page fragment URL so TrialFlow's `window.location.href =
    // data.checkout_url` triggers only a hash-change (no navigation), which
    // preserves window.__paywall_captured for post-click assertions.
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ checkout_url: "#test-checkout-completed" }),
    });
  };

  for (const base of [API_BASE_LOCAL, API_BASE_PROD]) {
    await page.route(`${base}/web/checkout`, checkoutHandler);
  }

  // Periodically drain the captured events onto the returned array so tests
  // can make assertions synchronously after their triggering actions.
  const sync = async () => {
    try {
      const snapshot = (await page.evaluate(() => {
        // @ts-expect-error test-only global
        const arr = window.__paywall_captured as { event: string; properties: Record<string, unknown> }[];
        return arr ? arr.slice() : [];
      })) as CapturedAnalytics;
      analytics.splice(0, analytics.length, ...snapshot);
    } catch {
      // Page may be closed/disposed; ignore.
    }
  };
  // Poll on request-finished events so analytics fired after a network call
  // are captured before the next assertion. Errors are swallowed so test
  // teardown doesn't fail on a late callback.
  page.on("requestfinished", () => {
    void sync();
  });

  // Expose sync so tests can manually flush before assertions
  (analytics as unknown as { __sync: () => Promise<void> }).__sync = sync;

  return { checkout, analytics };
}

async function flushAnalytics(page: Page, analytics: CapturedAnalytics) {
  const fresh = (await page.evaluate(() => {
    // @ts-expect-error test-only global
    return (window.__paywall_captured as { event: string; properties: Record<string, unknown> }[]).slice();
  })) as CapturedAnalytics;
  analytics.splice(0, analytics.length, ...fresh);
}

test.describe("Paywall trial flow — state machine", () => {
  test("step 1 opens by default on the preview route", async ({ page }) => {
    await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await expect(page.getByTestId("paywall-trial-step-1")).toBeVisible();
  });

  test("step 1 → step 2 → step 3 forward navigation", async ({ page }) => {
    await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");

    await expect(page.getByTestId("paywall-trial-step-1")).toBeVisible();
    await page.getByTestId("paywall-step-1-continue").click();

    await expect(page.getByTestId("paywall-trial-step-2")).toBeVisible();
    await page.getByTestId("paywall-step-2-continue").click();

    await expect(page.getByTestId("paywall-trial-step-3")).toBeVisible();
  });

  test("back arrow returns to the previous step", async ({ page }) => {
    await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");

    await page.getByTestId("paywall-step-1-continue").click();
    await expect(page.getByTestId("paywall-trial-step-2")).toBeVisible();

    // Back from step 2 → step 1
    await page.getByTestId("paywall-trial-step-2").getByTestId("paywall-back").click();
    await expect(page.getByTestId("paywall-trial-step-1")).toBeVisible();

    // Forward again → step 2 → step 3 → back → step 2
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();
    await expect(page.getByTestId("paywall-trial-step-3")).toBeVisible();

    await page.getByTestId("paywall-trial-step-3").getByTestId("paywall-back").click();
    await expect(page.getByTestId("paywall-trial-step-2")).toBeVisible();
  });
});

test.describe("Paywall step 3 — plan selector data flow", () => {
  test("weekly is selected by default; yearly selection swaps aria-pressed + fine print", async ({ page }) => {
    await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();
    await expect(page.getByTestId("paywall-trial-step-3")).toBeVisible();

    const yearly = page.getByTestId("paywall-plan-yearly");
    const weekly = page.getByTestId("paywall-plan-weekly");

    await expect(weekly).toHaveAttribute("aria-pressed", "true");
    await expect(yearly).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("paywall-fine-print")).toContainText("$6.99 per week");

    await yearly.click();
    await expect(weekly).toHaveAttribute("aria-pressed", "false");
    await expect(yearly).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("paywall-fine-print")).toContainText("$179.99 per year");
    await expect(page.getByTestId("paywall-billing-line")).toContainText("$179.99");

    await weekly.click();
    await expect(page.getByTestId("paywall-fine-print")).toContainText("$6.99 per week");
  });
});

test.describe("Paywall step 3 — /web/checkout request body", () => {
  test("primary CTA sends trial_days=3 with the default weekly plan", async ({ page }) => {
    const { checkout } = await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();

    // Default selection is weekly
    await page.getByTestId("paywall-start-trial").click();

    await expect.poll(() => checkout.callCount).toBeGreaterThanOrEqual(1);
    expect(checkout.body).toMatchObject({
      plan: "standard_weekly",
      trial_days: 3,
    });
  });

  test("selecting yearly then primary CTA sends plan=standard_annual trial_days=3", async ({ page }) => {
    const { checkout } = await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();

    await page.getByTestId("paywall-plan-yearly").click();
    await page.getByTestId("paywall-start-trial").click();

    await expect.poll(() => checkout.callCount).toBeGreaterThanOrEqual(1);
    expect(checkout.body).toMatchObject({
      plan: "standard_annual",
      trial_days: 3,
    });
  });
});

test.describe("Paywall maybe-later exit-intent sheet", () => {
  test("Maybe later opens exit sheet; No thanks closes everything", async ({ page }) => {
    await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();

    await page.getByTestId("paywall-maybe-later").click();
    await expect(page.getByTestId("paywall-exit-sheet")).toBeVisible();

    await page.getByTestId("paywall-exit-dismiss").click();
    await expect(page.getByTestId("paywall-exit-sheet")).toBeHidden();
    await expect(page.getByTestId("paywall-trial-step-3")).toBeHidden();
  });

  test("Exit-offer accept sends trial_days=7 with weekly plan to /web/checkout", async ({ page }) => {
    const { checkout } = await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();
    await page.getByTestId("paywall-maybe-later").click();

    await page.getByTestId("paywall-exit-accept-7day").click();

    await expect.poll(() => checkout.callCount).toBeGreaterThanOrEqual(1);
    expect(checkout.body).toMatchObject({
      plan: "standard_weekly",
      trial_days: 7,
    });
  });

  test("Exit-sheet backdrop click closes sheet but keeps step 3 open", async ({ page }) => {
    await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();
    await page.getByTestId("paywall-maybe-later").click();
    await expect(page.getByTestId("paywall-exit-sheet")).toBeVisible();

    await page.getByTestId("paywall-exit-sheet-backdrop").click();
    await expect(page.getByTestId("paywall-exit-sheet")).toBeHidden();
    await expect(page.getByTestId("paywall-trial-step-3")).toBeVisible();
  });
});

test.describe("Paywall analytics — event firing", () => {
  test("fires Paywall Screen Viewed for each step", async ({ page }) => {
    const { analytics } = await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();
    await page.waitForTimeout(100);
    await flushAnalytics(page, analytics);

    const viewedEvents = analytics.filter((e) => e.event === "Paywall Screen Viewed");
    const screens = viewedEvents.map((e) => e.properties.screen);
    expect(screens).toContain("step_1");
    expect(screens).toContain("step_2");
    expect(screens).toContain("step_3");
    // Every Paywall Screen Viewed should carry the reason
    for (const e of viewedEvents) {
      expect(e.properties.reason).toBe("post_onboarding");
    }
  });

  test("fires Paywall Trial Started with source=primary_cta", async ({ page }) => {
    const { analytics } = await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();
    await page.getByTestId("paywall-start-trial").click();
    await page.waitForTimeout(150);
    await flushAnalytics(page, analytics);

    const started = analytics.find((e) => e.event === "Paywall Trial Started");
    expect(started).toBeDefined();
    expect(started?.properties).toMatchObject({
      plan: "standard_weekly",
      trial_days: 3,
      source: "primary_cta",
    });
  });

  test("fires Paywall Trial Started with source=exit_offer + trial_days=7", async ({ page }) => {
    const { analytics } = await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();
    await page.getByTestId("paywall-maybe-later").click();
    await page.getByTestId("paywall-exit-accept-7day").click();
    await page.waitForTimeout(150);
    await flushAnalytics(page, analytics);

    const started = analytics.find((e) => e.event === "Paywall Trial Started");
    expect(started).toBeDefined();
    expect(started?.properties).toMatchObject({
      plan: "standard_weekly",
      trial_days: 7,
      source: "exit_offer",
    });
  });

  test("fires Paywall Exit Offer events on the full dismiss path", async ({ page }) => {
    const { analytics } = await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-step-2-continue").click();

    await page.getByTestId("paywall-maybe-later").click();
    await page.getByTestId("paywall-exit-dismiss").click();
    await page.waitForTimeout(100);
    await flushAnalytics(page, analytics);

    const names = analytics.map((e) => e.event);
    expect(names).toContain("Paywall Maybe Later Clicked");
    expect(names).toContain("Paywall Exit Offer Shown");
    expect(names).toContain("Paywall Exit Offer Dismissed");
  });

  test("fires Paywall Back Clicked with from_step", async ({ page }) => {
    const { analytics } = await mockCheckoutAndAnalytics(page);
    await page.goto("/paywall-preview");
    await page.getByTestId("paywall-step-1-continue").click();
    await page.getByTestId("paywall-trial-step-2").getByTestId("paywall-back").click();
    await page.waitForTimeout(100);
    await flushAnalytics(page, analytics);

    const back = analytics.find((e) => e.event === "Paywall Back Clicked");
    expect(back).toBeDefined();
    expect(back?.properties.from_step).toBe(2);
  });
});
