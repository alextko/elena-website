import { test, expect, type APIRequestContext } from "@playwright/test";

// End-to-end coverage for the quiz-funnel → chat agent context handoff.
//
// Verifies that when a visitor completes the risk-assessment quiz and then
// signs up, their full quiz answers + recommendations are:
//   1. Captured in pending_messages.metadata.quiz_payload pre-auth
//   2. Persisted to user_profiles.quiz_results at claim time
//   3. Surfaced into the agent's first assistant message via the
//      generate_onboarding_welcome path triggered from /chat/pending/claim
//
// Requirements to run:
//   1. elena-backend running locally on :8000 (gunicorn or uvicorn)
//   2. NEXT_PUBLIC_API_BASE pointed at it when starting `npm run dev`
//   3. Backend has ANTHROPIC_API_KEY set (welcome generation calls Claude)

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

interface PendingRow {
  id: string;
  anon_id: string;
  content: string;
  source: string;
  metadata: Record<string, unknown> | null;
  claimed_at: string | null;
  claimed_session_id: string | null;
  claimed_profile_id: string | null;
}

interface ProfileRow {
  id: string;
  email: string | null;
  quiz_results: Array<Record<string, unknown>> | null;
  zip_code: string | null;
  gender: string | null;
  family_history: string | null;
  active_conditions: string | null;
  social_history: string | null;
  onboarding_completed_at: string | null;
}

interface ChatMessageRow {
  id: string;
  role: string;
  content: unknown;
  created_at: string;
}

async function fetchPendingByAnon(api: APIRequestContext, anonId: string): Promise<PendingRow[]> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/pending_messages?anon_id=eq.${anonId}&select=*&order=created_at.asc`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok()).toBe(true);
  return (await resp.json()) as PendingRow[];
}

async function fetchProfile(api: APIRequestContext, profileId: string): Promise<ProfileRow | null> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profileId}&select=id,email,quiz_results,zip_code,gender,family_history,active_conditions,social_history,onboarding_completed_at`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok()).toBe(true);
  const rows = (await resp.json()) as ProfileRow[];
  return rows[0] ?? null;
}

async function fetchChatMessages(api: APIRequestContext, sessionId: string): Promise<ChatMessageRow[]> {
  const resp = await api.get(
    `${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${sessionId}&select=id,role,content,created_at&order=created_at.asc`,
    { headers: SUPABASE_HEADERS },
  );
  expect(resp.ok()).toBe(true);
  return (await resp.json()) as ChatMessageRow[];
}

async function deletePendingByAnon(api: APIRequestContext, anonId: string) {
  await api.delete(`${SUPABASE_URL}/rest/v1/pending_messages?anon_id=eq.${anonId}`, {
    headers: SUPABASE_HEADERS,
  });
}

async function deleteChatSession(api: APIRequestContext, sessionId: string) {
  await api.delete(`${SUPABASE_URL}/rest/v1/chat_sessions?id=eq.${sessionId}`, {
    headers: SUPABASE_HEADERS,
  });
}

async function deleteUserProfile(api: APIRequestContext, profileId: string) {
  await api.delete(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${profileId}`, {
    headers: SUPABASE_HEADERS,
  });
}

// Deterministic quiz answers — picked so getRecommendations() yields a non-empty list
// (these match the expected branches in elena-website/src/app/risk-assessment/lib/recommendations.ts).
const TEST_ANSWERS = {
  age: "40-49",
  sex: "female",
  zip: "37062",
  familyHistory: ["heart_disease", "diabetes"],
  smokeVape: "no",
  alcohol: "moderate",
  exercise: "1-2",
  sleep: "okay",
  diagnosedConditions: [],
  recentSymptoms: ["fatigue"],
  lastPhysical: "3+ years",
  lastBloodwork: "3+ years",
  lastScreening: "never",
  hasPCP: "no",
  lastPap: "3+ years",
  lastMammogram: "never",
  selfRating: "okay",
} as const;

test("quiz funnel completion → claim persists quiz_results + agent welcome references quiz", async ({ page, request }) => {
  test.setTimeout(360_000); // welcome + follow-up turn + MRF cold-load on first provider search

  const stamp = Date.now();
  const anonId = crypto.randomUUID();
  const email = `e2e-quiz-${stamp}@elena.test`;
  const password = `PlaywrightTest_${stamp}!`;

  let authUserId: string | null = null;
  let profileId: string | null = null;
  let claimedSessionId: string | null = null;

  try {
    // ------------------------------------------------------------------
    // 1. Visit /risk-assessment with sessionStorage seeded so the page
    //    boots straight into step 12 (Results) with our deterministic
    //    answers. Inject anon_id ahead of time so postPendingMessage uses it.
    // ------------------------------------------------------------------
    await page.addInitScript(
      ({ anonId, answers }) => {
        sessionStorage.setItem("elena_quiz_answers", JSON.stringify(answers));
        sessionStorage.setItem("elena_quiz_step", "12");
        localStorage.setItem("elena_anon_id", anonId);
      },
      { anonId, answers: TEST_ANSWERS },
    );

    // Watch for the POST /chat/pending fired by handleGetStarted in results.tsx.
    const pendingPostPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/chat/pending") &&
        !resp.url().includes("/chat/pending/claim") &&
        resp.request().method() === "POST",
      { timeout: 20_000 },
    );

    await page.goto("/risk-assessment");

    // The Results page renders "Get Started with Elena" at the bottom.
    const cta = page.getByRole("button", { name: /get started with elena/i });
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await cta.click();

    const pendingResp = await pendingPostPromise;
    expect(pendingResp.status()).toBe(200);
    const pendingBody = await pendingResp.json();
    const pendingId = pendingBody.pending_id as string;
    expect(pendingId).toBeTruthy();

    // ------------------------------------------------------------------
    // 2. Verify the pending row carries metadata.quiz_payload with the
    //    full quiz state (answers + recommendations + score).
    // ------------------------------------------------------------------
    const pendingRows = await fetchPendingByAnon(request, anonId);
    expect(pendingRows).toHaveLength(1);
    const pending = pendingRows[0];
    expect(pending.id).toBe(pendingId);
    expect(pending.source).toBe("risk_assessment");
    expect(pending.claimed_at).toBeNull();

    const meta = pending.metadata ?? {};
    expect(meta).toHaveProperty("quiz_payload");
    const quizPayload = (meta as Record<string, unknown>).quiz_payload as Record<string, unknown>;
    expect(quizPayload.quiz_type).toBe("health_risk_assessment");
    expect(typeof quizPayload.completed_at).toBe("string");
    expect(quizPayload.answers).toMatchObject({ age: "40-49", sex: "female", zip: "37062" });
    expect(Array.isArray(quizPayload.recommendations)).toBe(true);
    expect((quizPayload.recommendations as unknown[]).length).toBeGreaterThan(0);
    expect(quizPayload).toHaveProperty("score");

    console.log("[e2e] Pending row OK — quiz_payload contains:", {
      quiz_type: quizPayload.quiz_type,
      answer_keys: Object.keys(quizPayload.answers as object),
      recommendation_count: (quizPayload.recommendations as unknown[]).length,
    });

    // ------------------------------------------------------------------
    // 3. Sign the user up via Supabase GoTrue and create a profile row.
    //    (Skips the website's quiz-page auth modal on purpose so the
    //    test isolates the claim path.)
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
    expect(accessToken).toBeTruthy();

    // Create a minimal profile so /auth/me returns has_profile=true.
    // INTENTIONALLY omit zip_code — this test proves the quiz mapper backfills
    // zip_code from quiz_payload.answers.zip when the profile field is blank.
    // The tool-call assertion later requires zip 37062 in the search; it will
    // get there ONLY if the mapper ran.
    const profileResp = await request.post(`${SUPABASE_URL}/rest/v1/user_profiles`, {
      headers: { ...SUPABASE_HEADERS, Prefer: "return=representation" },
      data: {
        auth_user_id: authUserId,
        email,
        first_name: "QuizE2E",
        last_name: "Test",
      },
    });
    expect(profileResp.ok(), `profile insert failed: ${profileResp.status()} ${await profileResp.text()}`).toBe(true);
    const profileRows = (await profileResp.json()) as Array<{ id: string }>;
    profileId = profileRows[0].id;

    // ------------------------------------------------------------------
    // 4. Inject Supabase auth + anon_id into /chat and watch the claim.
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
      ({ storageKey, sessionBlob, anonId, pId }) => {
        localStorage.setItem(storageKey, JSON.stringify(sessionBlob));
        localStorage.setItem("elena_anon_id", anonId);
        localStorage.setItem("elena_active_profile_id", pId);
        localStorage.setItem("elena_onboarding_done", "1");
      },
      { storageKey: SUPABASE_STORAGE_KEY, sessionBlob, anonId, pId: profileId },
    );

    const claimResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/chat/pending/claim") && resp.request().method() === "POST",
      { timeout: 120_000 },
    );

    await page.goto("/chat");

    const claimResp = await claimResponsePromise;
    expect(claimResp.status()).toBe(200);
    const claimBody = await claimResp.json();

    console.log("[e2e] Claim response body:", JSON.stringify({
      session_id: claimBody.session_id,
      claimed_count: claimBody.claimed_count,
      quiz_results_persisted: claimBody.quiz_results_persisted,
      welcome_message_excerpt: typeof claimBody.welcome_message === "string"
        ? claimBody.welcome_message.slice(0, 200)
        : claimBody.welcome_message,
      welcome_suggestions: claimBody.welcome_suggestions,
    }, null, 2));

    expect(claimBody.session_id).toBeTruthy();
    expect(claimBody.claimed_count).toBe(1);
    expect(claimBody.quiz_results_persisted).toBe(true);
    expect(typeof claimBody.welcome_message).toBe("string");
    expect((claimBody.welcome_message as string).length).toBeGreaterThan(20);
    claimedSessionId = claimBody.session_id as string;

    // ------------------------------------------------------------------
    // 5. Verify user_profiles.quiz_results was populated by the claim path.
    // ------------------------------------------------------------------
    const profile = await fetchProfile(request, profileId);
    expect(profile).not.toBeNull();
    expect(profile!.quiz_results).not.toBeNull();
    expect(profile!.quiz_results!).toHaveLength(1);
    const persistedQuiz = profile!.quiz_results![0] as Record<string, unknown>;
    expect(persistedQuiz.quiz_type).toBe("health_risk_assessment");
    expect(persistedQuiz.answers).toMatchObject({ age: "40-49", sex: "female" });
    expect(Array.isArray(persistedQuiz.recommendations)).toBe(true);
    console.log("[e2e] user_profiles.quiz_results populated, recommendation_count:",
      (persistedQuiz.recommendations as unknown[]).length);

    // NEW: structured field backfill assertions. The quiz mapper should have
    // copied answers.zip → zip_code (fills the pre-seeded empty-string),
    // answers.sex → gender, answers.familyHistory → family_history, and the
    // lifestyle block → social_history. active_conditions stays empty because
    // TEST_ANSWERS.diagnosedConditions is empty.
    console.log("[e2e] profile structured fields:", {
      zip_code: profile!.zip_code,
      gender: profile!.gender,
      family_history: profile!.family_history,
      active_conditions: profile!.active_conditions,
      social_history: profile!.social_history,
      onboarding_completed_at: profile!.onboarding_completed_at,
    });
    expect(profile!.zip_code).toBe(TEST_ANSWERS.zip);
    expect(profile!.gender).toBe(TEST_ANSWERS.sex);
    expect(profile!.family_history).toContain("Heart disease");
    expect(profile!.family_history).toContain("Diabetes");
    expect(profile!.social_history).toBeTruthy();
    // DOB is never collected by the quiz, so onboarding should NOT be marked
    // complete — the modal must still show (for DOB only).
    expect(profile!.onboarding_completed_at).toBeNull();

    // ------------------------------------------------------------------
    // 6. Verify the assistant welcome was persisted to chat_messages,
    //    and that it references the quiz (loose check — the model can
    //    word things many ways, so we look for either an explicit
    //    "assessment"/"quiz" mention OR for a known recommendation
    //    keyword from the test answers).
    // ------------------------------------------------------------------
    const messages = await fetchChatMessages(request, claimedSessionId);
    const assistantMsgs = messages.filter((m) => m.role === "assistant");
    expect(assistantMsgs.length).toBeGreaterThanOrEqual(1);

    const stringify = (c: unknown): string => {
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        return c
          .map((b) => (typeof b === "object" && b && "text" in b ? (b as { text?: string }).text ?? "" : ""))
          .join(" ");
      }
      return JSON.stringify(c);
    };
    const welcomeText = stringify(assistantMsgs[0].content).toLowerCase();
    console.log("[e2e] First assistant message text (first 300 chars):", welcomeText.slice(0, 300));

    // Quiz-aware signal: at least one of these must appear in the welcome.
    const quizSignals = [
      "assessment",
      "quiz",
      "shared",
      "told me",
      "primary care",
      "screening",
      "mammogram",
      "physical",
      "bloodwork",
      "blood work",
      "pcp",
    ];
    const hasSignal = quizSignals.some((s) => welcomeText.includes(s));
    expect(
      hasSignal,
      `welcome should reference quiz context. Got: ${welcomeText.slice(0, 500)}`,
    ).toBe(true);

    // Pending row was marked claimed and linked to the new session.
    const claimedRows = await fetchPendingByAnon(request, anonId);
    expect(claimedRows).toHaveLength(1);
    expect(claimedRows[0].claimed_session_id).toBe(claimedSessionId);
    expect(claimedRows[0].claimed_profile_id).toBe(profileId);

    // ------------------------------------------------------------------
    // 7. No orphan session: the only chat_sessions row for this profile
    //    should be the claim's session. (Prior to the page-stitching fix,
    //    /chat would race-create a second welcome session here.)
    // ------------------------------------------------------------------
    // Give the page a beat to settle any in-flight requests before counting.
    await page.waitForTimeout(2_000);
    const sessionsResp = await request.get(
      `${SUPABASE_URL}/rest/v1/chat_sessions?profile_id=eq.${profileId}&select=id`,
      { headers: SUPABASE_HEADERS },
    );
    expect(sessionsResp.ok()).toBe(true);
    const allSessions = (await sessionsResp.json()) as Array<{ id: string }>;
    console.log("[e2e] sessions for profile:", allSessions.map((s) => s.id));
    expect(allSessions).toHaveLength(1);
    expect(allSessions[0].id).toBe(claimedSessionId);

    // ------------------------------------------------------------------
    // 8. No synthetic-resend duplicate: the claim session's user-message
    //    count should be 0 (the welcome stands on its own; the user is
    //    free to type a follow-up but the page should not auto-send the
    //    localStorage query when the server already produced a welcome).
    // ------------------------------------------------------------------
    const userMsgs = messages.filter((m) => m.role === "user");
    const finalMessages = await fetchChatMessages(request, claimedSessionId);
    const finalUserMsgs = finalMessages.filter((m) => m.role === "user");
    console.log("[e2e] user-message count in claim session:",
      `initial=${userMsgs.length}, final=${finalUserMsgs.length}`);
    expect(finalUserMsgs.length).toBe(0);

    // ------------------------------------------------------------------
    // 9. Full round-trip: send a follow-up user message that should cause
    //    the agent to use quiz context (location + prior intent) WITHOUT
    //    re-asking. Quiz answers say zip=37062, hasPCP=no, so "yes find
    //    me one" should trigger search_providers_and_rates with the zip
    //    already filled in.
    // ------------------------------------------------------------------
    const sendResp = await request.post(`${API_BASE}/chat/send`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Profile-Id": profileId,
      },
      data: {
        message: "Yes please find me a primary care doctor",
        session_id: claimedSessionId,
      },
    });
    expect(sendResp.ok(), `chat/send failed: ${sendResp.status()} ${await sendResp.text()}`).toBe(true);
    const sendBody = await sendResp.json();
    const chatRequestId = sendBody.chat_request_id as string;
    expect(chatRequestId).toBeTruthy();
    console.log("[e2e] chat_request_id =", chatRequestId);

    // Poll until the turn finishes.
    const pollStart = Date.now();
    let pollBody: { phase: string; result?: { reply?: string; doctor_results?: unknown[] } } | null = null;
    while (Date.now() - pollStart < 240_000) {
      const pollResp = await request.get(`${API_BASE}/chat/poll/${chatRequestId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!pollResp.ok()) {
        await new Promise((r) => setTimeout(r, 1_000));
        continue;
      }
      const body = await pollResp.json();
      if (body.phase === "completed" || body.phase === "failed") {
        pollBody = body;
        break;
      }
      await new Promise((r) => setTimeout(r, 1_500));
    }
    expect(pollBody, "chat send should complete within 120s").not.toBeNull();
    expect(pollBody!.phase).toBe("completed");
    console.log("[e2e] chat poll completed. reply (first 200):",
      (pollBody!.result?.reply || "").slice(0, 200));
    console.log("[e2e] doctor_results returned:",
      Array.isArray(pollBody!.result?.doctor_results) ? pollBody!.result!.doctor_results!.length : "none");

    // Reply should acknowledge and be substantive.
    expect(typeof pollBody!.result?.reply).toBe("string");
    expect((pollBody!.result!.reply as string).length).toBeGreaterThan(20);

    // ------------------------------------------------------------------
    // 10. Tool-call verification: scan chat_messages for a tool_use block
    //     from search_providers_and_rates AND confirm the agent filled in
    //     zip_code from the quiz answers (not asked for it).
    // ------------------------------------------------------------------
    const postSendMsgs = await fetchChatMessages(request, claimedSessionId);
    // Find assistant messages whose content list has a tool_use block.
    type ContentBlock = { type?: string; name?: string; input?: Record<string, unknown>; text?: string };
    const toolUses: Array<{ name: string; input: Record<string, unknown> }> = [];
    for (const m of postSendMsgs) {
      if (m.role !== "assistant") continue;
      const c = m.content;
      if (!Array.isArray(c)) continue;
      for (const block of c as ContentBlock[]) {
        if (block?.type === "tool_use" && block.name) {
          toolUses.push({ name: block.name, input: block.input || {} });
        }
      }
    }
    console.log("[e2e] tool_use blocks observed:",
      toolUses.map((t) => `${t.name}(${JSON.stringify(t.input).slice(0, 120)})`));

    // The agent should have attempted a provider search (the primary action
    // implied by "yes find me a PCP").
    const providerSearch = toolUses.find((t) => t.name === "search_providers_and_rates");
    expect(
      providerSearch,
      `expected search_providers_and_rates tool call. Got: ${toolUses.map((t) => t.name).join(", ")}`,
    ).toBeTruthy();

    // KEY ASSERTION: the zip from the quiz answers flowed into the tool call
    // WITHOUT the agent having to re-ask the user. TEST_ANSWERS.zip === "37062".
    const searchZip = providerSearch!.input.zip_code as string | undefined;
    console.log("[e2e] search_providers_and_rates zip_code =", searchZip);
    expect(
      searchZip,
      `search_providers_and_rates should carry quiz zip. input=${JSON.stringify(providerSearch!.input)}`,
    ).toBe(TEST_ANSWERS.zip);

    // Final user-message count should be 1 now (our follow-up).
    const finalFinalUserMsgs = postSendMsgs.filter((m) => m.role === "user");
    expect(finalFinalUserMsgs.length).toBe(1);
  } finally {
    if (claimedSessionId) await deleteChatSession(request, claimedSessionId);
    await deletePendingByAnon(request, anonId);
    if (profileId) await deleteUserProfile(request, profileId);
    // Auth user in auth.users is intentionally left (anon key can't delete).
  }
});
