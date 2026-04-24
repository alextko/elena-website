import { test, expect, type APIRequestContext } from "@playwright/test";

// Regression coverage for the DME intake → chat welcome handoff.
//
// We no longer drive active traffic into the DME landing page, so this spec
// intentionally stays narrow: it verifies the shared handoff/session boot logic
// that used to regress here.
//
// Specifically, when an authenticated user submits the DME intake form, the
// first assistant message on /chat should reference the specific intake fields
// (equipment, insurance, prescriber) pulled from dme_intakes via
// _build_submissions_context, and the landing should create exactly one chat
// session with no synthetic user resend.
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

interface ChatMessageRow {
  id: string;
  role: string;
  content: unknown;
  created_at: string;
}

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

async function fetchChatMessages(api: APIRequestContext, sessionId: string): Promise<ChatMessageRow[]> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${sessionId}&select=id,role,content,created_at&order=created_at.asc`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok()).toBe(true);
  return (await resp.json()) as ChatMessageRow[];
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

    // Intercept every /chat/welcome POST so we can assert that the landing
    // welcome the user actually sees references the DME intake and only one
    // fresh landing session is created.
    const welcomeCalls: Array<{
      request_just_onboarded: boolean | undefined;
      response_session_id: string | null;
      response_message: string;
      response_suggestions: string[];
    }> = [];
    page.on("response", async (resp) => {
      if (!resp.url().endsWith("/chat/welcome") || resp.request().method() !== "POST") return;
      try {
        const body = await resp.json();
        const reqBody = resp.request().postDataJSON() ?? {};
        welcomeCalls.push({
          request_just_onboarded: reqBody.just_onboarded,
          response_session_id: body.session_id ?? null,
          response_message: typeof body.message === "string" ? body.message : "",
          response_suggestions: Array.isArray(body.suggestions) ? body.suggestions : [],
        });
      } catch {}
    });

    await page.goto("/chat");

    // Wait until at least one welcome response has landed.
    await expect.poll(() => welcomeCalls.length, { timeout: 120_000 }).toBeGreaterThanOrEqual(1);
    // Give any StrictMode follow-up calls a beat to settle.
    await page.waitForTimeout(1_500);

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
    const landingSessionId = intakeWelcomeCall.response_session_id as string;

    // Poll until the assistant welcome row actually lands in chat_messages
    // (it's persisted async via _persist_message_bg in generate_onboarding_welcome).
    let landingAssistant: ChatMessageRow | undefined;
    const landingPollStart = Date.now();
    while (Date.now() - landingPollStart < 30_000) {
      const landingMsgs = await fetchChatMessages(request, landingSessionId);
      landingAssistant = landingMsgs.find((m) => m.role === "assistant");
      if (landingAssistant) break;
      await new Promise((r) => setTimeout(r, 1_000));
    }
    expect(landingAssistant, "landing session should have an assistant welcome within 30s").toBeTruthy();
    const welcomeText = (() => {
      const c = landingAssistant!.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        return c
          .map((b) => (typeof b === "object" && b && "text" in b ? (b as { text?: string }).text ?? "" : ""))
          .join(" ");
      }
      return "";
    })();
    console.log("[e2e dme] landing session welcome (first 400):", welcomeText.slice(0, 400));

    const welcomeBody = { session_id: landingSessionId, message: welcomeText };
    expect(welcomeBody.session_id).toBeTruthy();
    expect(typeof welcomeBody.message).toBe("string");
    expect((welcomeBody.message as string).length).toBeGreaterThan(20);
    const welcomeLower = (welcomeBody.message as string).toLowerCase();

    // Agent should reference the specific submission.
    const intakeSignals = [
      "cpap",
      "bipap",
      "sleep apnea",
      "osa",
      "aetna",
      "vanderbilt",
      "prescription",
      "equipment",
      "intake",
      "request",
      "sleep center",
    ];
    const matched = intakeSignals.filter((s) => welcomeLower.includes(s));
    expect(
      matched.length,
      `welcome should reference DME intake context. Got: ${welcomeLower.slice(0, 600)}`,
    ).toBeGreaterThan(0);
    console.log("[e2e dme] intake signals matched in welcome:", matched);

    // ------------------------------------------------------------------
    // 4. Verify exactly one chat_sessions row was created for this
    //    profile (no orphan), and that it matches the welcome's session_id.
    // ------------------------------------------------------------------
    await page.waitForTimeout(2_000);
    const sessionsResp = await request.get(
      `${SUPABASE_URL}/rest/v1/chat_sessions?profile_id=eq.${profileId}&select=id`,
      { headers: SUPABASE_HEADERS },
    );
    expect(sessionsResp.ok()).toBe(true);
    const allSessions = (await sessionsResp.json()) as Array<{ id: string }>;
    console.log("[e2e dme] sessions for profile:", allSessions.map((s) => s.id));
    expect(allSessions).toHaveLength(1);
    expect(allSessions[0].id).toBe(welcomeBody.session_id);

    // ------------------------------------------------------------------
    // 5. Verify no synthetic user message — the welcome should stand alone,
    //    with 0 user messages persisted in the session.
    // ------------------------------------------------------------------
    const messages = await fetchChatMessages(request, welcomeBody.session_id);
    const userMsgs = messages.filter((m) => m.role === "user");
    const assistantMsgs = messages.filter((m) => m.role === "assistant");
    console.log("[e2e dme] message roles in session:",
      messages.map((m) => m.role).slice(0, 10));
    expect(userMsgs.length).toBe(0);
    expect(assistantMsgs.length).toBeGreaterThanOrEqual(1);

    // Note: we intentionally do NOT assert on the localStorage flag state here
    // because Playwright's addInitScript re-fires on every document load and
    // re-sets the flag during the test. In production the DME page only sets
    // the flag once (on submit), and fetchWelcome's consumer deletes it, so a
    // reload won't re-trigger. The one-session assertion above is what proves
    // the flag was actually consumed.
  } finally {
    if (profileId) {
      await deleteChatSessionsForProfile(request, profileId);
      await deleteDmeIntakesForProfile(request, profileId);
      await deleteUserProfile(request, profileId);
    }
  }
});
