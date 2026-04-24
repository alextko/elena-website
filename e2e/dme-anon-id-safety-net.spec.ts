import { test, expect, type APIRequestContext } from "@playwright/test";

// Safety-net e2e for the production bug: Google OAuth redirect lands the user
// on /chat directly instead of /dme step 10, so the frontend never calls
// /dme/intake/{id}/claim. Without a safety net the intake stays with
// profile_id=NULL forever and none of the funnel context reaches the agent.
//
// This test simulates that exact broken path and verifies:
//   1. The anonymous intake is created with anon_id stored on the row.
//   2. Even though /dme/intake/{id}/claim is NEVER called, /chat/pending/claim
//      sweeps by anon_id and auto-claims the intake.
//   3. _sync_profile_fields runs as a result — zip, insurance, conditions,
//      doctors, and onboarding_completed_at are all populated on the profile.
//
// Requirements:
//   - elena-backend running on the Playwright API base
//   - Migration 016_dme_intakes_anon_id applied (anon_id column exists)

const API_BASE = process.env.PLAYWRIGHT_API_BASE || "http://localhost:8010";
const SUPABASE_URL = "https://livbrrqqxnvnxhggguig.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0";
const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
} as const;

interface ProfileFieldsRow {
  id: string;
  first_name: string | null;
  date_of_birth: string | null;
  zip_code: string | null;
  insurance_carrier: string | null;
  member_id: string | null;
  insurance_policy_number: string | null;
  active_conditions: string | null;
  onboarding_completed_at: string | null;
  my_doctors: Array<Record<string, unknown>> | null;
}

async function fetchProfile(api: APIRequestContext, profileId: string): Promise<ProfileFieldsRow | null> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profileId}&select=id,first_name,date_of_birth,zip_code,insurance_carrier,member_id,insurance_policy_number,active_conditions,onboarding_completed_at,my_doctors`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok()).toBe(true);
  const rows = (await resp.json()) as ProfileFieldsRow[];
  return rows[0] ?? null;
}

async function fetchIntake(api: APIRequestContext, intakeId: string): Promise<Record<string, unknown> | null> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/dme_intakes?id=eq.${intakeId}&select=id,profile_id,status,anon_id,shipping_zip`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok()).toBe(true);
  const rows = (await resp.json()) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

async function cleanup(api: APIRequestContext, profileId: string | null, intakeId: string | null, authUserId: string | null) {
  if (intakeId) {
    await api.delete(`${SUPABASE_URL}/rest/v1/dme_intakes?id=eq.${intakeId}`, { headers: SUPABASE_HEADERS });
  }
  if (profileId) {
    await api.delete(`${SUPABASE_URL}/rest/v1/chat_sessions?profile_id=eq.${profileId}`, { headers: SUPABASE_HEADERS });
    await api.delete(`${SUPABASE_URL}/rest/v1/medical_insurance?profile_id=eq.${profileId}`, { headers: SUPABASE_HEADERS });
    await api.delete(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profileId}`, { headers: SUPABASE_HEADERS });
  }
  // Leaves auth.users behind — Supabase anon key can't delete from auth schema.
  void authUserId;
}

test("anon-id sweep claims DME intake when /dme/intake/{id}/claim was never called", async ({ request }) => {
  test.setTimeout(60_000);

  const stamp = Date.now();
  const email = `e2e-dme-safety-${stamp}@elena.test`;
  const password = `PlaywrightTest_${stamp}!`;
  const anonId = crypto.randomUUID();

  let authUserId: string | null = null;
  let profileId: string | null = null;
  let intakeId: string | null = null;
  let accessToken: string | null = null;

  try {
    // ------------------------------------------------------------------
    // 1. Visitor (pre-auth) submits the DME form. Frontend POSTs to
    //    /dme/intake/anonymous including anon_id (new in this PR).
    // ------------------------------------------------------------------
    const anonResp = await request.post(`${API_BASE}/dme/intake/anonymous`, {
      headers: { "Content-Type": "application/json" },
      data: {
        patient_first_name: "SafetyNet",
        patient_last_name: "Tester",
        patient_dob: "1985-05-05",
        patient_phone: "+15555559999",
        patient_email: email,
        shipping_street: "42 Wallaby Way",
        shipping_city: "Fairview",
        shipping_state: "TN",
        shipping_zip: "37062",
        insurance_provider: "Aetna",
        insurance_member_id: "SAFETY-NET-123",
        insurance_group_number: "G-SN42",
        insurance_plan_type: "PPO",
        insurance_zip: "37062",
        equipment_type: "CPAP / BiPAP Machine",
        urgency: "urgent",
        equipment_notes: "Testing the anon_id safety net",
        has_diagnosis: true,
        condition_description: "Obstructive sleep apnea (AHI 22)",
        has_prescription: false,
        doctor_clinic_name: "Vanderbilt Sleep Center",
        doctor_phone: "(615) 555-0199",
        delivery_timing: "asap",
        mobility_issues: false,
        access_notes: "",
        source: "web_quiz",
        anon_id: anonId,
      },
    });
    expect(anonResp.ok(), `anonymous intake failed: ${anonResp.status()} ${await anonResp.text()}`).toBe(true);
    const anonBody = await anonResp.json();
    intakeId = anonBody.intake_id as string;
    expect(intakeId).toBeTruthy();

    // Verify anon_id persisted on the row + profile_id is null (pending_signup).
    const preClaim = await fetchIntake(request, intakeId);
    expect(preClaim).not.toBeNull();
    expect(preClaim!.profile_id).toBeNull();
    expect(preClaim!.anon_id).toBe(anonId);
    expect(preClaim!.status).toBe("pending_signup");

    // ------------------------------------------------------------------
    // 2. User signs up (simulating Google OAuth finishing). Profile is
    //    created WITHOUT any of the intake data — mimics what actually
    //    happens on prod when OAuth redirects to /chat and the modal's
    //    /profile POST creates a bare profile from OAuth metadata only.
    // ------------------------------------------------------------------
    const signupResp = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email, password },
    });
    expect(signupResp.ok(), `signup failed: ${signupResp.status()}`).toBe(true);
    const signupBody = await signupResp.json();
    authUserId = signupBody.user.id as string;
    accessToken = signupBody.access_token as string;

    const profileResp = await request.post(`${SUPABASE_URL}/rest/v1/user_profiles`, {
      headers: { ...SUPABASE_HEADERS, Prefer: "return=representation" },
      data: {
        auth_user_id: authUserId,
        email,
        first_name: "SafetyNet",
        last_name: "Tester",
        // Deliberately leave zip_code, DOB, insurance, etc. empty — this
        // mirrors the bare OAuth profile that got created on prod.
      },
    });
    expect(profileResp.ok()).toBe(true);
    profileId = ((await profileResp.json()) as Array<{ id: string }>)[0].id;

    // Confirm the profile is bare BEFORE the sweep runs.
    const preSweepProfile = await fetchProfile(request, profileId);
    expect(preSweepProfile!.zip_code || "").toBe("");
    expect(preSweepProfile!.active_conditions || "").toBe("");
    expect(preSweepProfile!.onboarding_completed_at).toBeNull();

    // ------------------------------------------------------------------
    // 3. CRITICAL: we deliberately DO NOT call /dme/intake/{id}/claim.
    //    On prod, OAuth redirects to /chat and this call is never made.
    //    Instead the user lands on /chat, which calls /chat/pending/claim.
    //    That's our safety-net hook.
    // ------------------------------------------------------------------
    const claimResp = await request.post(`${API_BASE}/chat/pending/claim`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Profile-Id": profileId,
      },
      data: { anon_id: anonId },
    });
    expect(claimResp.ok(), `claim_pending_messages failed: ${claimResp.status()} ${await claimResp.text()}`).toBe(true);

    // ------------------------------------------------------------------
    // 4. Assertions — sweep should have claimed the intake and synced.
    // ------------------------------------------------------------------
    const postClaim = await fetchIntake(request, intakeId);
    expect(postClaim!.profile_id, "dme_intakes.profile_id should now equal the user's profile").toBe(profileId);
    expect(postClaim!.status, "intake status should flip to submitted").toBe("submitted");

    const postSweepProfile = await fetchProfile(request, profileId);
    expect(postSweepProfile).not.toBeNull();
    console.log("[safety-net] profile after sweep:", postSweepProfile);

    expect(postSweepProfile!.zip_code).toBe("37062");
    expect(postSweepProfile!.date_of_birth).toBe("1985-05-05");
    expect(postSweepProfile!.insurance_carrier).toBe("Aetna");
    expect(postSweepProfile!.member_id).toBe("SAFETY-NET-123");
    expect(postSweepProfile!.insurance_policy_number).toBe("G-SN42");
    expect(postSweepProfile!.active_conditions || "").toContain("Obstructive sleep apnea");
    expect(postSweepProfile!.onboarding_completed_at).not.toBeNull();
    const doctors = postSweepProfile!.my_doctors || [];
    expect(doctors.some((d) => String(d?.name || "").toLowerCase().includes("vanderbilt"))).toBe(true);

    // ------------------------------------------------------------------
    // 5. Idempotency — re-running claim_pending_messages must not blow up
    //    or re-sync over top of user's data.
    // ------------------------------------------------------------------
    const claimResp2 = await request.post(`${API_BASE}/chat/pending/claim`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Profile-Id": profileId,
      },
      data: { anon_id: anonId },
    });
    expect(claimResp2.ok()).toBe(true);
    const afterIdempotent = await fetchIntake(request, intakeId);
    expect(afterIdempotent!.profile_id).toBe(profileId);
  } finally {
    await cleanup(request, profileId, intakeId, authUserId);
  }
});

test("claim bootstraps profile from DME intake when user has none — no modal race", async ({ request }) => {
  // Covers the real prod bug: user signs up (OAuth lands on /chat), NO
  // profile exists yet, but the DME intake is already in the DB. Hitting
  // /chat/pending/claim must bootstrap a profile from the intake so that the
  // very next /auth/me call returns has_profile=true and onboarding_completed
  // =true — preventing the onboarding modal from popping with empty fields.
  test.setTimeout(60_000);

  const stamp = Date.now();
  const email = `e2e-dme-bootstrap-${stamp}@elena.test`;
  const password = `PlaywrightTest_${stamp}!`;
  const anonId = crypto.randomUUID();

  let authUserId: string | null = null;
  let profileId: string | null = null;
  let intakeId: string | null = null;
  let accessToken: string | null = null;

  try {
    // 1. Anonymous intake with anon_id.
    const anonResp = await request.post(`${API_BASE}/dme/intake/anonymous`, {
      headers: { "Content-Type": "application/json" },
      data: {
        patient_first_name: "BootstrapNet",
        patient_last_name: "Tester",
        patient_dob: "1990-09-09",
        patient_phone: "+15555551111",
        patient_email: email,
        shipping_street: "99 Bootstrap Ln",
        shipping_city: "Nashville",
        shipping_state: "TN",
        shipping_zip: "37203",
        insurance_provider: "BCBS",
        insurance_member_id: "BOOT-123",
        insurance_group_number: "G-BOOT",
        insurance_plan_type: "PPO",
        insurance_zip: "37203",
        equipment_type: "Hospital Bed",
        urgency: "routine",
        has_diagnosis: true,
        condition_description: "Mobility impairment",
        has_prescription: false,
        doctor_clinic_name: "Nashville General",
        delivery_timing: "flexible",
        source: "web_quiz",
        anon_id: anonId,
      },
    });
    expect(anonResp.ok()).toBe(true);
    intakeId = (await anonResp.json()).intake_id as string;

    // 2. Signup — auth.users exists, but NO user_profiles row.
    const signupResp = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email, password },
    });
    expect(signupResp.ok()).toBe(true);
    const signupBody = await signupResp.json();
    authUserId = signupBody.user.id as string;
    accessToken = signupBody.access_token as string;

    // Confirm no profile yet.
    const preResp = await request.get(
      `${SUPABASE_URL}/rest/v1/user_profiles?auth_user_id=eq.${authUserId}&select=id`,
      { headers: SUPABASE_HEADERS },
    );
    expect((await preResp.json()).length).toBe(0);

    // 3. Call /chat/pending/claim — with no profile, this must bootstrap one
    //    from the DME intake so onboarding_completed_at is set on the first
    //    /me call that follows.
    const claimResp = await request.post(`${API_BASE}/chat/pending/claim`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      data: { anon_id: anonId },
    });
    expect(claimResp.ok(), `claim failed: ${claimResp.status()} ${await claimResp.text()}`).toBe(true);

    // 4. /auth/me should now return has_profile=true + onboarding_completed=true.
    const meResp = await request.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meResp.ok()).toBe(true);
    const me = await meResp.json();
    console.log("[bootstrap-test] /auth/me:", me);
    expect(me.has_profile).toBe(true);
    expect(me.onboarding_completed).toBe(true);
    profileId = me.profile_id;

    // 5. Profile is populated from intake. Modal would NEVER pop.
    const profile = await fetchProfile(request, profileId!);
    expect(profile!.date_of_birth).toBe("1990-09-09");
    expect(profile!.zip_code).toBe("37203");
    expect(profile!.insurance_carrier).toBe("BCBS");
    expect(profile!.active_conditions || "").toContain("Mobility impairment");
    expect(profile!.onboarding_completed_at).not.toBeNull();

    // 6. Intake is linked.
    const intake = await fetchIntake(request, intakeId);
    expect(intake!.profile_id).toBe(profileId);
    expect(intake!.status).toBe("submitted");
  } finally {
    await cleanup(request, profileId, intakeId, authUserId);
  }
});
