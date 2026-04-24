import { test, expect, type APIRequestContext } from "@playwright/test";

// Regression coverage for the DME intake → chat welcome handoff.
//
// We no longer drive active traffic into the DME landing page, so this spec
// intentionally stays narrow: it verifies the shared handoff/session boot logic
// that used to regress here.
//
// Specifically, when an authenticated user submits the DME intake form, the
// /chat landing should request exactly one intake-aware welcome and should not
// auto-send any synthetic user message afterward. The text generation itself is
// mocked here on purpose: the DME landing page is no longer a traffic-bearing
// surface, and live welcome generation is already covered elsewhere.
//
// Requirements to run:
//   1. elena-backend running locally on the Playwright API base
//   2. NEXT_PUBLIC_API_BASE pointed at it when starting `npm run dev`
//   3. Backend has ANTHROPIC_API_KEY set

const API_BASE = process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010";
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0";
const SUPABASE_STORAGE_KEY = "sb-livbrrqqxnvnxhggguig-auth-token";
const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
} as const;

async function deleteDmeIntakesForProfile(api: APIRequestContext, profileId: string) {
  await api.delete(`${SUPABASE_URL}/rest/v1/dme_intakes?profile_id=eq.${profileId}`, {
    headers: SUPABASE_HEADERS,
  });
}

async function deleteChatSessionsForProfile(api: APIRequestContext, profileId: string) {
  await api.delete(`${SUPABASE_URL}/rest/v1/chat_sessions?profile_id=eq.${profileId}`, {
    headers: SUPABASE_HEADERS,
  });
}

async function deleteUserProfile(api: APIRequestContext, profileId: string) {
  await api.delete(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profileId}`, {
    headers: SUPABASE_HEADERS,
  });
}

interface ProfileFieldsRow {
  id: string;
  zip_code: string | null;
  active_conditions: string | null;
  insurance_policy_number: string | null;
  onboarding_completed_at: string | null;
  my_doctors: Array<Record<string, unknown>> | null;
}

async function fetchProfileFields(api: APIRequestContext, profileId: string): Promise<ProfileFieldsRow | null> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profileId}&select=id,zip_code,active_conditions,insurance_policy_number,onboarding_completed_at,my_doctors`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok()).toBe(true);
  const rows = (await resp.json()) as ProfileFieldsRow[];
  return rows[0] ?? null;
}

const DME_WELCOME = {
  heading: "Hi DmeE2E! 👋",
  message:
    "I see you just submitted a DME intake for a CPAP / BiPAP machine through Aetna and Vanderbilt Sleep Center. I can help with the prescription and next equipment steps.",
  suggestions: [
    "Help me with the prescription",
    "What happens next with my equipment?",
    "Do you need anything else from me?",
  ],
};

test("DME submit → chat creates one intake-aware welcome session without synthetic resend", async ({ page, request }) => {
  test.setTimeout(360_000); // welcome + follow-up turn + MRF cold-load on first provider search

  const stamp = Date.now();
  const email = `e2e-dme-${stamp}@elena.test`;
  const password = `PlaywrightTest_${stamp}!`;

  let authUserId: string | null = null;
  let profileId: string | null = null;

  try {
    // ------------------------------------------------------------------
    // 1. Sign up via Supabase GoTrue + create a profile row.
    // ------------------------------------------------------------------
    const signupResp = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email, password },
    });
    expect(signupResp.ok(), `signup failed: ${signupResp.status()} ${await signupResp.text()}`).toBe(true);
    const signupBody = await signupResp.json();
    authUserId = signupBody.user.id as string;
    const accessToken = signupBody.access_token as string;
    const refreshToken = signupBody.refresh_token as string;

    const profileResp = await request.post(`${SUPABASE_URL}/rest/v1/user_profiles`, {
      headers: { ...SUPABASE_HEADERS, Prefer: "return=representation" },
      data: {
        auth_user_id: authUserId,
        email,
        first_name: "DmeE2E",
        last_name: "Test",
        zip_code: "37062",
      },
    });
    expect(profileResp.ok(), `profile insert failed: ${profileResp.status()} ${await profileResp.text()}`).toBe(true);
    const profileRows = (await profileResp.json()) as Array<{ id: string }>;
    profileId = profileRows[0].id;

    // ------------------------------------------------------------------
    // 2. POST the DME intake directly to the backend (what the DME page
    //    does on submit). This is the source-of-truth row the agent will
    //    see via _build_submissions_context.
    // ------------------------------------------------------------------
    const intakeResp = await request.post(`${API_BASE}/dme/intake`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Profile-Id": profileId,
      },
      data: {
        patient_first_name: "DmeE2E",
        patient_last_name: "Test",
        patient_dob: "1980-01-01",
        patient_phone: "+15555551234",
        patient_email: email,
        shipping_street: "123 Main St",
        shipping_apt: "Apt 4",
        shipping_city: "Fairview",
        shipping_state: "TN",
        shipping_zip: "37062",
        insurance_provider: "Aetna",
        insurance_member_id: "W123456789",
        insurance_group_number: "G42",
        insurance_plan_type: "PPO",
        insurance_zip: "37062",
        equipment_type: "CPAP / BiPAP Machine",
        urgency: "urgent",
        equipment_notes: "Just diagnosed with OSA, AHI 18",
        has_diagnosis: true,
        condition_description: "Obstructive sleep apnea (AHI 18)",
        has_prescription: false,
        prescribing_doctor_name: "",
        prescribing_doctor_phone: "",
        doctor_clinic_name: "Vanderbilt Sleep Center",
        doctor_phone: "(615) 555-0199",
        doctor_fax: "(615) 555-0299",
        delivery_timing: "asap",
        mobility_issues: false,
        access_notes: "",
        source: "web_quiz",
      },
    });
    expect(intakeResp.ok(), `DME intake POST failed: ${intakeResp.status()} ${await intakeResp.text()}`).toBe(true);

    // ------------------------------------------------------------------
    // 2.5 Profile backfill assertion — _sync_profile_fields should have
    //     copied patient/shipping/insurance/condition/clinic fields onto the
    //     user_profiles row (blank-only), and flipped onboarding_completed_at
    //     because all four modal fields are now populated from the intake.
    // ------------------------------------------------------------------
    const backfilledProfile = await fetchProfileFields(request, profileId);
    expect(backfilledProfile).not.toBeNull();
    console.log("[e2e dme] profile after intake:", {
      zip_code: backfilledProfile!.zip_code,
      active_conditions: backfilledProfile!.active_conditions,
      insurance_policy_number: backfilledProfile!.insurance_policy_number,
      onboarding_completed_at: backfilledProfile!.onboarding_completed_at,
      doctor_count: (backfilledProfile!.my_doctors || []).length,
    });
    expect(backfilledProfile!.zip_code).toBe("37062");
    expect(backfilledProfile!.active_conditions || "").toContain("Obstructive sleep apnea");
    expect(backfilledProfile!.insurance_policy_number).toBe("G42");
    expect(backfilledProfile!.onboarding_completed_at).not.toBeNull();
    // my_doctors should contain an entry for the Vanderbilt clinic (specialist).
    const doctors = backfilledProfile!.my_doctors || [];
    expect(doctors.length).toBeGreaterThanOrEqual(1);
    const hasVanderbilt = doctors.some(
      (d) => String(d?.name || "").toLowerCase().includes("vanderbilt"),
    );
    expect(hasVanderbilt, `my_doctors should include Vanderbilt. Got: ${JSON.stringify(doctors)}`).toBe(true);

    // ------------------------------------------------------------------
    // 3. Inject auth + the post-intake-submit flag into /chat and watch
    //    for the /chat/welcome call that fires as a result.
    // ------------------------------------------------------------------
    const sessionBlob = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: signupBody.expires_in ?? 3600,
      expires_at: signupBody.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      user: signupBody.user,
    };
    await page.addInitScript(
      ({ storageKey, sessionBlob, pId }) => {
        localStorage.setItem(storageKey, JSON.stringify(sessionBlob));
        localStorage.setItem("elena_active_profile_id", pId);
        localStorage.setItem("elena_onboarding_done", "1");
        localStorage.setItem("elena_post_intake_submit", "dme");
      },
      { storageKey: SUPABASE_STORAGE_KEY, sessionBlob, pId: profileId },
    );

    // Intercept /chat/welcome so this spec stays deterministic and focused on
    // the frontend handoff/session boot logic rather than live LLM output.
    const welcomeCalls: Array<{
      request_just_onboarded: boolean | undefined;
      response_session_id: string | null;
      response_message: string;
      response_suggestions: string[];
    }> = [];
    const landingSessionId = `dme-welcome-${stamp}`;
    await page.route(`${API_BASE}/chat/welcome**`, async (route) => {
      const reqBody = route.request().postDataJSON() ?? {};
      welcomeCalls.push({
        request_just_onboarded:
          typeof reqBody === "object" && reqBody && "just_onboarded" in reqBody
            ? (reqBody as { just_onboarded?: boolean }).just_onboarded
            : undefined,
        response_session_id: landingSessionId,
        response_message: DME_WELCOME.message,
        response_suggestions: DME_WELCOME.suggestions,
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: landingSessionId,
          ...DME_WELCOME,
        }),
      });
    });

    let sendCallCount = 0;
    await page.route(`${API_BASE}/chat/send**`, async (route) => {
      sendCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chat_request_id: `unexpected-dme-send-${sendCallCount}`,
          session_id: landingSessionId,
        }),
      });
    });

    await page.goto("/chat");

    await expect.poll(() => welcomeCalls.length, { timeout: 30_000 }).toBe(1);
    await expect(page.getByRole("heading", { name: DME_WELCOME.heading })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(DME_WELCOME.message)).toBeVisible({ timeout: 30_000 });

    console.log("[e2e dme] /chat/welcome calls observed:", welcomeCalls.length);
    welcomeCalls.forEach((c, i) =>
      console.log(`  #${i} just_onboarded=${c.request_just_onboarded} session=${c.response_session_id} msg="${c.response_message.slice(0, 120).replace(/\s+/g, " ")}..."`),
    );

    expect(
      welcomeCalls.length,
      `expected exactly one landing /chat/welcome call for the post-intake redirect (got ${welcomeCalls.length})`,
    ).toBe(1);

    const intakeWelcomeCall = welcomeCalls[0];
    expect(intakeWelcomeCall.response_session_id, "landing welcome must have a session_id").toBeTruthy();
    expect(intakeWelcomeCall.request_just_onboarded).toBe(true);

    // ------------------------------------------------------------------
    // 4. Verify no synthetic user resend fires after the welcome lands.
    // ------------------------------------------------------------------
    await page.waitForTimeout(1_000);
    expect(sendCallCount).toBe(0);
    await expect(page.getByPlaceholder("Ask Elena anything...", { exact: true })).toBeVisible();
  } finally {
    if (profileId) {
      await deleteChatSessionsForProfile(request, profileId);
      await deleteDmeIntakesForProfile(request, profileId);
      await deleteUserProfile(request, profileId);
    }
  }
});
