// Paywall gate verification — reproduces the leak observed in production
// for sharisven / toddandchom / garlesha (all hit no paywall despite going
// past the free-tier limits on gated tools).
//
// USAGE:
//   # Target production (read-only sign-up via +paywalltest alias, no card entry)
//   PAYWALL_E2E_BASE_URL=https://www.elena-ai.com \
//     npx playwright test e2e/paywall-gate-verification.spec.ts --headed
//
//   # Or target localhost
//   npx playwright test e2e/paywall-gate-verification.spec.ts --headed
//
// This test deliberately STOPS at the paywall. It never enters card details.
// If the paywall does NOT appear, the test dumps page HTML + captured network
// calls to test-results/paywall-leak-<timestamp>/ for post-mortem.

import { test, expect, Page, Request } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.PAYWALL_E2E_BASE_URL || "http://localhost:3000";
const SLOW_MO = 500;
const RUN_ID = `paywall-leak-${Date.now()}`;

function aliasedEmail(): string {
  const ts = Date.now();
  return `paywall+paywalltest-${ts}@elena-ai-testing.com`;
}

async function captureNetwork(page: Page): Promise<Request[]> {
  const reqs: Request[] = [];
  page.on("request", (r) => {
    const url = r.url();
    if (
      url.includes("/api/") ||
      url.includes("/web/") ||
      url.includes("/chat") ||
      url.includes("/documents") ||
      url.includes("/structured-documents") ||
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
  fs.writeFileSync(path.join(dir, "page.html"), await page.content());
  await page.screenshot({ path: path.join(dir, "page.png"), fullPage: true });
  fs.writeFileSync(
    path.join(dir, "requests.json"),
    JSON.stringify(
      reqs.map((r) => ({ method: r.method(), url: r.url(), headers: r.headers() })),
      null,
      2,
    ),
  );
  console.log(`[forensics] Wrote ${dir}`);
}

test.use({
  headless: false,
  launchOptions: { slowMo: SLOW_MO },
});

test("new free user hits paywall after 2 gated tool invocations", async ({
  browser,
}) => {
  test.setTimeout(5 * 60_000); // 5 min — onboarding is long

  const ctx = await browser.newContext(); // fresh incognito
  const page = await ctx.newPage();
  const reqs = await captureNetwork(page);

  const email = aliasedEmail();
  console.log(`[test] Using email: ${email}`);

  // 1. Land on signup / onboarding
  await page.goto(`${BASE_URL}/onboard`);
  await page.waitForLoadState("networkidle");

  // 2. Walk through the /onboard quiz. Each step shows a question with
  //    one or more choice buttons and a Continue button that's disabled
  //    until at least one choice is selected. Strategy: on every step,
  //    pick the first choice that isn't "Continue" / "Back" / "Skip",
  //    then click Continue. Repeat until we reach a screen with an
  //    email field (auth) or the URL changes to /chat.
  try {
    const MAX_QUIZ_STEPS = 25;
    for (let step = 0; step < MAX_QUIZ_STEPS; step++) {
      // Have we reached email/password signup?
      const emailField = page.getByLabel(/email/i).first();
      if (await emailField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await emailField.fill(email);
        const pw = page.getByLabel(/password/i).first();
        if (await pw.isVisible().catch(() => false)) await pw.fill("TestPassword123!");
        await page
          .getByRole("button", { name: /sign up|create account|continue|submit/i })
          .first()
          .click();
        break;
      }
      // Did we already land on /chat (happens after auth)?
      if (/\/chat/.test(page.url())) break;

      // Pick a quiz option. Skip Continue/Back/Skip buttons.
      const allButtons = await page.getByRole("button").all();
      let picked = false;
      for (const b of allButtons) {
        const txt = (await b.textContent())?.trim() || "";
        if (
          !txt ||
          /^(continue|back|skip|next|submit)$/i.test(txt) ||
          (await b.isDisabled().catch(() => false))
        ) {
          continue;
        }
        // Avoid obvious chrome (dev-tools, language toggles, etc.)
        if (/dev tools|language/i.test(txt)) continue;
        await b.click().catch(() => {});
        picked = true;
        break;
      }
      if (!picked) {
        // Maybe it's a text input step (zip, DOB, etc.) — fill any text inputs with a default.
        const inputs = await page.getByRole("textbox").all();
        for (const inp of inputs) {
          const label = (await inp.getAttribute("placeholder")) || "";
          if (/zip/i.test(label)) await inp.fill("10036");
          else if (/year|date|birth/i.test(label)) await inp.fill("1985-01-01");
          else await inp.fill("Test");
        }
      }
      const cont = page.getByRole("button", { name: /^continue$/i }).first();
      if (await cont.isVisible({ timeout: 1500 }).catch(() => false)) {
        await cont.click().catch(() => {});
      }
      await page.waitForTimeout(300);
    }
  } catch (e) {
    await dumpForensics(page, reqs, "onboarding-failed");
    throw e;
  }

  // 3. Wait for chat interface
  await page.waitForURL(/\/chat/, { timeout: 30_000 }).catch(async () => {
    await dumpForensics(page, reqs, "never-reached-chat");
    throw new Error("Did not reach /chat after onboarding");
  });

  const chatInput = page.getByRole("textbox").first();
  await chatInput.waitFor({ timeout: 10_000 });

  // 4. Gated action #1 — trigger provider_search + call_provider intent
  //    This mirrors sharisven's flow ("MRI pricing near zip 10036").
  await chatInput.fill(
    "Can you get me cash-pay pricing for a bilateral breast MRI near zip 10036? Call the 3 closest imaging centers.",
  );
  await chatInput.press("Enter");
  await page.waitForTimeout(15_000); // let tools run

  // 5. Gated action #2 — document upload intent (toddandchom flow).
  await chatInput.fill(
    "I have lab results I want you to analyze. How do I upload a PDF?",
  );
  await chatInput.press("Enter");
  await page.waitForTimeout(10_000);

  // 6. Gated action #3 — another call to push past call_provider free=1 limit.
  await chatInput.fill(
    "Please call Dr. Smith's office at the number you found to book me an appointment this week.",
  );
  await chatInput.press("Enter");
  await page.waitForTimeout(15_000);

  // 7. Assertion — paywall should be visible by now.
  //    The trial-flow uses data-testid on its root, and the upgrade-modal
  //    has a known heading. Match either.
  const paywallVisible = await Promise.race([
    page
      .getByTestId("paywall-trial-flow")
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false),
    page
      .getByRole("heading", { name: /upgrade|unlock|trial/i })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false),
    page
      .locator('[data-testid="upgrade-modal"], [data-testid="soft-paywall"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false),
  ]);

  if (!paywallVisible) {
    await dumpForensics(page, reqs, "paywall-did-not-fire");
    // Surface the error_code responses we saw
    const gateResponses = reqs
      .filter((r) => r.url().includes("/chat") || r.url().includes("/documents"))
      .map((r) => ({ method: r.method(), url: r.url() }));
    console.log("[gates]", JSON.stringify(gateResponses, null, 2));
    throw new Error(
      `Paywall did NOT appear after 3 gated actions. Forensics dumped to test-results/${RUN_ID}/paywall-did-not-fire/`,
    );
  }

  // 8. DO NOT click into Stripe Checkout. Test ends here.
  console.log("[test] PASS — paywall visible. Test stops before card entry.");
  await dumpForensics(page, reqs, "paywall-fired-ok");
});
