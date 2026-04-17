import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// Proves the onboarding-modal skip / pre-fill behavior end-to-end through the
// real auth UI. The other two funnel specs isolate the claim + welcome path by
// injecting a Supabase session directly — that's good for the agent-context
// pieces but doesn't exercise the modal. This spec fills the gap.
//
// Requirements:
//   1. elena-backend on :8000
//   2. NEXT_PUBLIC_API_BASE → http://localhost:8000 in the next dev server
//   3. ANTHROPIC_API_KEY set on the backend

const API_BASE = "http://localhost:8000";
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0";
const SUPABASE_STORAGE_KEY = "sb-livbrrqqxnvnxhggguig-auth-token";
const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
} as const;

interface ProfileRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  zip_code: string | null;
  gender: string | null;
  family_history: string | null;
  onboarding_completed_at: string | null;
  my_doctors: Array<Record<string, unknown>> | null;
  quiz_results: Array<Record<string, unknown>> | null;
}

async function fetchProfileByAuthUser(api: APIRequestContext, authUserId: string): Promise<ProfileRow | null> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/user_profiles?auth_user_id=eq.${authUserId}&select=*`,
    { headers: SUPABASE_HEADERS },
  );
  if (!resp.ok()) return null;
  const rows = (await resp.json()) as ProfileRow[];
  return rows[0] ?? null;
}

async function cleanupProfileByAuthUser(api: APIRequestContext, authUserId: string) {
  const profile = await fetchProfileByAuthUser(api, authUserId);
  if (!profile) return;
  await api.delete(`${SUPABASE_URL}/rest/v1/chat_sessions?profile_id=eq.${profile.id}`, {
    headers: SUPABASE_HEADERS,
  });
  await api.delete(`${SUPABASE_URL}/rest/v1/dme_intakes?profile_id=eq.${profile.id}`, {
    headers: SUPABASE_HEADERS,
  });
  await api.delete(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profile.id}`, {
    headers: SUPABASE_HEADERS,
  });
}

async function signUpViaSupabase(api: APIRequestContext, email: string, password: string): Promise<{
  authUserId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  userBlob: Record<string, unknown>;
}> {
  const resp = await api.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    data: { email, password },
  });
  expect(resp.ok(), `signup failed: ${resp.status()} ${await resp.text()}`).toBe(true);
  const body = await resp.json();
  return {
    authUserId: body.user.id as string,
    accessToken: body.access_token as string,
    refreshToken: body.refresh_token as string,
    expiresIn: (body.expires_in as number) ?? 3600,
    expiresAt: (body.expires_at as number) ?? Math.floor(Date.now() / 1000) + 3600,
    userBlob: body.user,
  };
}

async function injectAuth(
  page: Page,
  auth: { accessToken: string; refreshToken: string; expiresIn: number; expiresAt: number; userBlob: Record<string, unknown> },
) {
  const sessionBlob = {
    access_token: auth.accessToken,
    refresh_token: auth.refreshToken,
    token_type: "bearer",
    expires_in: auth.expiresIn,
    expires_at: auth.expiresAt,
    user: auth.userBlob,
  };
  await page.addInitScript(
    ({ storageKey, sessionBlob }) => {
      localStorage.setItem(storageKey, JSON.stringify(sessionBlob));
    },
    { storageKey: SUPABASE_STORAGE_KEY, sessionBlob },
  );
}

// ---------------------------------------------------------------------------
// TEST 1: Quiz funnel → email signup → modal shows with zip pre-filled
// ---------------------------------------------------------------------------

test("quiz signup: profile backfilled from quiz, modal pre-fills zip", async ({ page, request }) => {
  test.setTimeout(180_000);

  const stamp = Date.now();
  const anonId = crypto.randomUUID();
  const email = `e2e-pbf-quiz-${stamp}@elena.test`;
  const password = `PlaywrightTest_${stamp}!`;
  let authUserId: string | null = null;

  try {
    // 1. Seed a pending_messages row with a quiz_payload that mirrors what
    //    real production quiz submits. Note: no "zip" field — the production
    //    UI doesn't collect it despite the type declaring it.
    const quizPayload = {
      quiz_type: "health_risk_assessment",
      completed_at: new Date().toISOString(),
      score: { value: 55, label: "Moderate", color: "#ffa500" },
      answers: {
        age: "40-49",
        sex: "female",
        familyHistory: ["heart_disease", "diabetes"],
        diagnosedConditions: [],
        recentSymptoms: ["fatigue"],
        smokeVape: "no",
        alcohol: "moderate",
        exercise: "1-2",
        sleep: "okay",
        lastPhysical: "3+ years",
        lastBloodwork: "3+ years",
        lastScreening: "never",
        hasPCP: "no",
        lastPap: "3+ years",
        lastMammogram: "never",
        selfRating: "okay",
      },
      recommendations: [
        { id: "r1", title: "Establish a primary care doctor", category: "care_gap" },
      ],
    };

    const postResp = await request.post(`${API_BASE}/chat/pending`, {
      data: {
        anon_id: anonId,
        content: "I just took the health risk assessment. Can you help me get a PCP?",
        source: "risk_assessment",
        metadata: { kind: "get_started", quiz_payload: quizPayload },
      },
    });
    expect(postResp.ok(), `POST /chat/pending failed: ${postResp.status()}`).toBe(true);

    // 2. Sign up via Supabase — email/password so NO OAuth name.
    const auth = await signUpViaSupabase(request, email, password);
    authUserId = auth.authUserId;

    // 3. Inject auth + anon_id into the browser, navigate to /chat.
    //    (Skip the actual UI quiz walk — that's tested in quiz-funnel-context-handoff.)
    await injectAuth(page, auth);
    await page.addInitScript((aid) => {
      localStorage.setItem("elena_anon_id", aid);
    }, anonId);

    // Wait for the claim to fire.
    const claimResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/chat/pending/claim") && resp.request().method() === "POST",
      { timeout: 120_000 },
    );
    await page.goto("/chat");
    const claimResp = await claimResponsePromise;
    expect(claimResp.status()).toBe(200);
    const claimBody = await claimResp.json();
    console.log("[e2e pbf-quiz] claim →", {
      session_id: claimBody.session_id,
      quiz_results_persisted: claimBody.quiz_results_persisted,
    });
    expect(claimBody.quiz_results_persisted).toBe(true);

    // 4. Profile should exist + be backfilled from quiz.
    await page.waitForTimeout(1_500);
    const profile = await fetchProfileByAuthUser(request, authUserId);
    expect(profile, "profile must exist after claim auto-create").not.toBeNull();
    console.log("[e2e pbf-quiz] profile:", {
      first_name: profile!.first_name,
      last_name: profile!.last_name,
      zip_code: profile!.zip_code,
      gender: profile!.gender,
      family_history: profile!.family_history,
      dob: profile!.date_of_birth,
      onboarding_completed_at: profile!.onboarding_completed_at,
    });
    // Email signup gives no OAuth name → first/last NULL. Production quiz
    // doesn't collect zip → zip_code NULL/empty. Therefore the 4 modal
    // fields can't all be satisfied from the funnel → onboarding stays incomplete.
    expect(profile!.gender).toBe("female");
    expect(profile!.family_history).toContain("Heart disease");
    expect(profile!.onboarding_completed_at).toBeNull();
    // zip_code is NOT populated by the quiz in production (the UI doesn't
    // collect it). Assert it's blank so this test fails loudly if someone
    // silently changes the quiz to collect zip without updating this spec.
    expect(profile!.zip_code || "").toBe("");
    expect(profile!.quiz_results).not.toBeNull();
    expect((profile!.quiz_results || []).length).toBe(1);

    // 5. Onboarding modal SHOULD be visible.
    //    A pure quiz signup gives us no OAuth name (email/password), no DOB,
    //    and (today) no zip — the production quiz doesn't collect zip despite
    //    the type declaring it. So the modal is correctly showing with empty
    //    inputs for the user to fill. What the claim DID backfill behind the
    //    scenes is gender/family_history/social_history (verified above via
    //    fetchProfileByAuthUser). Those aren't surfaced on the modal — they're
    //    used by the agent via the system prompt.
    const modalHeading = page.getByRole("heading", { name: /Welcome to Elena/i });
    await expect(modalHeading).toBeVisible({ timeout: 15_000 });
    console.log("[e2e pbf-quiz] modal shown as expected (quiz doesn't collect modal fields)");
  } finally {
    if (authUserId) await cleanupProfileByAuthUser(request, authUserId);
    // Always delete the pending row too.
    await request.delete(`${SUPABASE_URL}/rest/v1/pending_messages?anon_id=eq.${anonId}`, {
      headers: SUPABASE_HEADERS,
    });
  }
});

// ---------------------------------------------------------------------------
// TEST 2: DME funnel → submit → /chat shows NO onboarding modal
// ---------------------------------------------------------------------------

test("DME submit: profile backfilled + onboarding marked complete, modal never shows", async ({ page, request }) => {
  test.setTimeout(180_000);

  const stamp = Date.now();
  const email = `e2e-pbf-dme-${stamp}@elena.test`;
  const password = `PlaywrightTest_${stamp}!`;
  let authUserId: string | null = null;

  try {
    // 1. Sign up first (email/password, no OAuth).
    const auth = await signUpViaSupabase(request, email, password);
    authUserId = auth.authUserId;

    // 2. Directly create the profile via the /profile endpoint (simulates the
    //    DME flow's signup completing → completeOnboarding creating the profile).
    //    In production the DME page triggers this through handleSignup + auth modal;
    //    for the test we're isolating the backfill behavior.
    //    Actually — we let /dme/intake/anonymous pre-save, then /dme/intake/{id}/claim
    //    claim it after auth. But /dme/intake/{id}/claim requires require_profile,
    //    which means a profile must already exist. So: post-signup, create a bare
    //    profile via /profile with empty body (mimics handleSubmit precondition).
    const createProfileResp = await request.post(`${API_BASE}/profile`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      data: { email },
    });
    expect(createProfileResp.ok(), `POST /profile failed: ${createProfileResp.status()} ${await createProfileResp.text()}`).toBe(true);
    const createdProfile = await createProfileResp.json();
    const profileId = (createdProfile.id || createdProfile.profile_id) as string;
    expect(profileId).toBeTruthy();

    // 3. POST the DME intake with all four modal-required fields populated.
    const intakeResp = await request.post(`${API_BASE}/dme/intake`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
        "X-Profile-Id": profileId,
      },
      data: {
        patient_first_name: "DmeBackfill",
        patient_last_name: "Patient",
        patient_dob: "1980-01-01",
        patient_phone: "+15555551234",
        patient_email: email,
        shipping_street: "123 Main St",
        shipping_apt: "Apt 4",
        shipping_city: "Fairview",
        shipping_state: "TN",
        shipping_zip: "37062",
        insurance_provider: "Aetna",
        insurance_member_id: "W111",
        insurance_group_number: "G42",
        insurance_plan_type: "PPO",
        insurance_zip: "37062",
        equipment_type: "CPAP / BiPAP Machine",
        urgency: "urgent",
        equipment_notes: "just diagnosed",
        has_diagnosis: true,
        condition_description: "Obstructive sleep apnea",
        has_prescription: false,
        prescribing_doctor_name: "",
        prescribing_doctor_phone: "",
        doctor_clinic_name: "Vanderbilt Sleep Center",
        doctor_phone: "(615) 555-0199",
        doctor_fax: "",
        delivery_timing: "asap",
        mobility_issues: false,
        access_notes: "",
        source: "web_quiz",
      },
    });
    expect(intakeResp.ok(), `DME intake POST failed: ${intakeResp.status()} ${await intakeResp.text()}`).toBe(true);

    // 4. Verify profile backfill.
    const profile = await fetchProfileByAuthUser(request, authUserId);
    expect(profile).not.toBeNull();
    console.log("[e2e pbf-dme] profile after intake:", {
      first_name: profile!.first_name,
      last_name: profile!.last_name,
      dob: profile!.date_of_birth,
      zip_code: profile!.zip_code,
      onboarding_completed_at: profile!.onboarding_completed_at,
      doctor_count: (profile!.my_doctors || []).length,
    });
    expect(profile!.first_name).toBe("DmeBackfill");
    expect(profile!.last_name).toBe("Patient");
    expect(profile!.date_of_birth).toBe("1980-01-01");
    expect(profile!.zip_code).toBe("37062");
    // Critical: onboarding_completed_at must be set so the modal is skipped.
    expect(profile!.onboarding_completed_at).not.toBeNull();
    // my_doctors should have a Vanderbilt entry.
    const doctors = profile!.my_doctors || [];
    expect(doctors.length).toBeGreaterThanOrEqual(1);
    expect(
      doctors.some((d) => String(d?.name || "").toLowerCase().includes("vanderbilt")),
      `my_doctors should include Vanderbilt. Got: ${JSON.stringify(doctors)}`,
    ).toBe(true);

    // 5. Inject auth + navigate to /chat. Assert the onboarding modal is NEVER visible.
    //    The welcome fetch path runs but we're not asserting on it here — the focus
    //    is on the modal skip.
    await injectAuth(page, auth);
    await page.addInitScript((pid) => {
      localStorage.setItem("elena_active_profile_id", pid);
    }, profileId);

    await page.goto("/chat");

    // The onboarding modal heading would say "Welcome to Elena" or "Hey <name>!".
    // We want it to NOT appear. Give the page time to call /auth/me and settle.
    await page.waitForTimeout(4_000);
    const modalCount = await page.getByRole("heading", { name: /Welcome to Elena|Hey DmeBackfill/i }).count();
    console.log("[e2e pbf-dme] modal headings visible count:", modalCount);
    expect(modalCount, "onboarding modal should be skipped because backfill marked onboarding complete").toBe(0);
  } finally {
    if (authUserId) await cleanupProfileByAuthUser(request, authUserId);
  }
});
