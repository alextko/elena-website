# Elena Website — Conversion Issues (2026-04-19)

Source: Mixpanel audit (project `4004819` — Elena health website), 30-day window ending 2026-04-19, tests filtered out (`$email`/`$name` excluding `test`, `abhi`, `alex`).

> **🔍 AUDIT NOTE (2026-04-19):** This report was re-audited against the current codebase after the app-report audit revealed that several claims were wrong in kind (instrumentation artifacts being reported as funnel bugs). Corrections are inline in blockquotes prefixed with **AUDIT**. Original text is preserved — statements found to be incorrect are marked ~~with strikethrough~~ and annotated.

**Bottom line: 0 real Checkout Completed, 0 real subscription_started across the last 30 days (and last 90). Every paid event in Mixpanel came from a test account.**

> **AUDIT — bottom line stands, but the *reason* is probably W5 (broken Stripe webhook), not the funnel-conversion bugs originally emphasized.** `TRACKING_SESSION_HANDOFF.md` documents a known open issue: "The subscription stays on `free` with no UTMs after a completed checkout." If subscriptions aren't being recorded in Supabase, then `subscription_started` can't fire and `Checkout Completed` is unreliable (client-side redirect-only). W5 has been re-prioritized to #1.

---

## Issue W1 — ~~Chat is accessible without an account (critical leak)~~ → "Message Sent" conflates pre-auth intent with post-auth usage

> **AUDIT — "chat accessible without signup" is incorrect as stated.** `/chat` is gated — `src/app/chat/page.tsx:227–235` redirects any session-less user to `/`. The real issue is that **the same event name `Message Sent` is emitted from two different places with different semantics**:
> - `src/app/page.tsx:762` fires `Message Sent` on the **landing hero** *before* signup, with `authenticated: false` and `source: "landing_page"`. This is an intent signal: the user typed a query and clicked send, which then opens the auth modal (`setAuthModalOpen(true)` at line 808) — they haven't actually used chat.
> - `src/components/chat-area.tsx:838` fires `Message Sent` from **authenticated chat** with `authenticated: true` and `source: "chat"` or `"post_signup"`.
>
> The 143 Message Sent users are a mix of both populations. Without breaking down by the `authenticated` property, the number is uninterpretable.

> **RE-AUDIT (2026-04-19, code-verified):** Claims about file/line locations and the dual-emit pattern all hold. One speculative claim below is wrong — see strikethrough.

### Evidence
| Event | Real users, 30d |
|---|---|
| Landing Page Viewed | 2,188 |
| Message Sent | **143** |
| Signup Completed | **24** |

~~**~6× more people send chat messages than create accounts.** The product is being given away pre-signup. Meta can't attribute conversions from these users, and none of them ever hit a paywall.~~

> **AUDIT — product is NOT being given away pre-signup.** Chat is auth-gated. The 143 vs 24 ratio is explained by: (a) many hero submits abandoning at the auth modal, (b) authed users sending multiple messages that don't all convert to new `Message Sent` uniques but show up in the count, (c) returning authed sessions. ~~The leak that matters is **authed users with `authenticated: true` but not counted in Signup Completed** — possible if Signup Completed fires only for OAuth-new-user branch in `fetchProfile` (auth-context.tsx:173) and misses some edge cases.~~
>
> **RE-AUDIT (code-verified, 2026-04-19):** The "OAuth-only" speculation is **wrong**. `auth-context.tsx:162` sets `provider = app_metadata?.provider || "email"`, and the `Signup Completed` track at `:173` gates only on `!data.has_profile`. It fires for email signups too. There is no email/OAuth asymmetry here. The real explanation for the 143 vs 24 gap is (a)+(b)+(c) above — no hidden leak path.

### Where to look
- ~~Landing page chat hero (`chat_hero_submit` / `Hero Input Submitted` / `Message Sent`)~~ → Landing hero fires `Hero Input Submitted` AND `Message Sent` (page.tsx:761–770). These are intent events, not usage events.
- ~~Any `/chat` route or embedded chat that does not require auth~~ → Verified: `/chat` redirects on line 233.
- ~~Check: does sending a message require a Supabase session?~~ → Yes, in chat-area.tsx the message send uses the authed `apiFetch` path.

### Fix
~~Either:~~
~~- **Gate all `Message Sent` behind Signup Completed** (hard gate), OR~~
~~- Allow 1–2 anonymous messages, then force signup modal before the 3rd message (soft gate with funnel insight).~~

~~Preferred: soft gate at 2 messages. You keep the "try before you buy" magic and capture intent signal.~~

> **AUDIT — the original "gate the chat" fix was based on a false premise. The actual fixes are:**
> 1. ~~**Split the event names.** Rename the landing-hero emit to `Hero Message Intent` (or similar). Keep `Message Sent` for authed chat-area only. This makes every funnel report meaningful without a per-property filter.~~
> 2. **Measure the landing→signup drop properly.** The real funnel is `Hero Input Submitted` (2,188 LP views baseline) → `Auth Modal Opened` → `Signup Completed` (24). Add intermediate events if missing. The drop is almost certainly at the auth modal, not at chat usage.
> 3. **If the landing-hero intent volume is high, A/B test one free message before the auth modal** — but this is an optimization, not a bug fix.
>
> **RE-AUDIT (code-verified, 2026-04-19):** Fix #1 is **redundant**. `page.tsx:761` already fires a distinct `Hero Input Submitted` event on the exact same submit, one line before the `Message Sent` emit. There is already a clean intent signal. The correct action is simpler: **delete the landing-page `Message Sent` track at `page.tsx:762-770` entirely** (or stop routing it to Mixpanel), since `Hero Input Submitted` already captures the same information without polluting the authed-usage event. No rename needed.

### Verification after fix
- ~~`Message Sent` unique-user count should be ≤ `Signup Completed` + (free allowance) × 2,188 LP views.~~
- ~~The ratio `Message Sent / Signup Completed` should drop from ~6× toward ≤1.5×.~~
- **Revised:** `Message Sent` broken down by `authenticated: true` only should be ≤ `Signup Completed` + returning-session allowance (small). `Hero Message Intent` (new event) should roughly equal current `Hero Input Submitted` counts.

---

## Issue W2 — ~~Three different paywall events, none firing reliably~~ → Three distinct surfaces by design; the real issue is naming hygiene + missing parent event

> **AUDIT — the original "unify into one event" recommendation would destroy signal.** The three events are intentionally different surfaces per the code:
> - **`paywall_hit`** (`trackPaywallHit` in `lib/tracking-events.ts:244`) — HARD gate. Fires on `document_limit` (chat-area.tsx:733) and `upgrade_required` chat-tool error (line 917). User was blocked from using a paid feature.
> - **`Soft Paywall Triggered`** (chat-area.tsx:230) — VALUE-MOMENT nudge. Fires ONCE per browser (localStorage-gated) on first file attach (line 749) or first form submit (line 1280).
> - **`Upgrade Modal Shown`** (upgrade-modal.tsx:67) — MODAL IMPRESSION. Fires whenever `UpgradeModal` opens, regardless of cause. It's a SUPERSET: fires for hard-paywall opens, soft-paywall opens (`reason="soft"`), AND self-initiated clicks (profile-popover.tsx:1148 has a manual Upgrade button).
>
> These are three different questions: "how often did we block a feature?", "how often did we nudge at a value moment?", "how often did the modal impress?" — don't collapse them.

### Evidence (real users, 30d)
| Event | Users |
|---|---|
| paywall_hit | 2 |
| Soft Paywall Triggered | 1 |
| Upgrade Modal Shown | 12 |
| ~~Gated Chip Shown~~ — (check) | N/A — event does not exist in website code |
| Checkout Completed | 0 |

~~Three different names for conceptually the same surface. Implies fragmented logic — likely 3 separate code paths, some of which don't fire, or fire for an irrelevant subset.~~

> **AUDIT — the 12/24 = 50% Upgrade Modal Shown rate is the right metric to focus on, not paywall_hit.** `Upgrade Modal Shown` is the superset that captures "user was shown a paywall for any reason." 50% is modest but not broken.

### Where to look
Search the repo for all three event names:
```
rg "paywall_hit|Soft Paywall Triggered|Upgrade Modal Shown" src/
```
~~Expected findings: probably 3 different components emitting 3 different event names. Likely suspects: quiz results gate, post-response nudge, feature-gated chip, and a legacy paywall component.~~

> **AUDIT — actual findings from grep:**
> - `paywall_hit`: 1 emitter (`trackPaywallHit`), 2 call sites (chat-area.tsx:733, 917)
> - `Soft Paywall Triggered`: 1 emitter (chat-area.tsx:230), 2 call sites (chat-area.tsx:749, 1280)
> - `Upgrade Modal Shown`: 1 emitter (upgrade-modal.tsx:67), fires on modal open — opened from chat-area.tsx (hard and soft) and profile-popover.tsx:1148 (manual).
> - There is NO `paywall_shown` unified parent event anywhere in the codebase.

### Fix
~~- Consolidate to **one event name** (`paywall_shown`) with a `trigger` property (`quiz_results`, `message_limit`, `feature_gate`, `upgrade_cta`, etc.)~~ → **Do not consolidate.** Would lose discovery/blocking/impression distinctions.
~~- Audit every code path that can show a paid gate and make sure it emits `paywall_shown`.~~
~~- Remove dead paywall components.~~ → No dead components found.

> **AUDIT — revised fix:**
> 1. **Add a unified parent event `paywall_shown`** that fires whenever `Upgrade Modal Shown` fires, with a `trigger` property (`hard`, `soft`, `manual`). Keep the three existing events intact as child signals. This gives both the top-line impression count AND the granular cause breakdown.
> 2. **Naming hygiene**: Rename `Soft Paywall Triggered` → `Soft Paywall Shown` so all three paywall-adjacent events share the `_shown`/`Shown` suffix and appear together in Mixpanel Lexicon.
> 3. **Mark `paywall_hit` as `Paywall Hit`** (Title Case) for consistency with the rest of the website's `Signup Completed` / `Upgrade Modal Shown` convention — or leave as-is if snake_case is intentional.

### Verification after fix
- ~~`paywall_shown` unique-user count / `Signup Completed` unique-user count ≥ 70% over a 7-day window.~~ → Still a reasonable target, but recognize that Upgrade Modal Shown already gets us 50% without any changes.

---

## Issue W3 — ~~Paywall barely fires to signed-up users~~ → Paywall firing is modest, not broken; real problem is conversion at the modal

> **AUDIT — the original "barely fires" framing is overstated.** `Upgrade Modal Shown` fired for 12 of 24 real signups (50%). That's not "barely" — it's modest. The metric to focus on is what happens *after* the modal shows, where the conversion is 0/12 (no Checkout Completed by real users).

### Evidence
~~Only 2 of 24 real signups (8%) triggered `paywall_hit`. Even if you add Upgrade Modal Shown (12), that's only 58% — and Upgrade Modal is likely a different surface (e.g., passive nav CTA, not a blocking gate).~~

> **AUDIT — corrected breakdown:**
> - 12/24 (50%) of real signups saw `Upgrade Modal Shown`
> - 2/24 (8%) hit a hard gate (`paywall_hit`)
> - 0/12 of those who saw the modal converted to `Checkout Completed`
>
> The bottleneck is **modal → checkout**, not **signup → modal**. This flips the investigation.

> **RE-AUDIT (code-verified, 2026-04-19):** The bottleneck framing is correct, but the "blackbox after Upgrade Modal Shown" claim (below) is wrong — the instrumentation is already there. See strikethrough on fix #1.

> **RE-AUDIT #3 (Mixpanel-queried, 2026-04-19 — feature-usage depth):**
> Question: how many real users engaged deeply enough to *trigger* a paywall from feature usage (not passive impressions)?
>
> **Web, 30d, real users:** `paywall_hit` = 4 unique users. By `reason`:
> - `document_limit`: 2 users (hit free upload cap)
> - `feature_blocked`: 2 users (tried gated chat tool)
> - `upgrade_required`: 1 user (backend 402 on gated tool)
>
> (Rows sum to 5 because 1 user tripped multiple reasons; uniques = 4.)
>
> **Funnel `Onboarding Completed → paywall_hit` (30d):** 3 of 23 (13%). So **3 of 4 feature-paywall users were post-onboarding (75%)**, 1 of 4 was pre-onboarding.
>
> For comparison: `Upgrade Modal Shown` = 15. Of those, ~11 were passive impressions (profile-popover "View plans", soft nudges) — not triggered by hitting a feature limit. **Only ~27% of modal impressions came from real feature engagement.**
>
> **Implication:** The top-of-funnel volume is too low to generate meaningful paywall data. 4 feature-paywall events and 0 plan clicks is not a conversion problem — it's a *volume* problem. Fix Meta optimization + ICP targeting before investing in paywall UX beyond a trial variant.

> **RE-AUDIT #2 (Mixpanel-queried, 2026-04-19 — critical finding):**
> Now that `Upgrade Plan Selected` / `Upgrade Dismissed` are confirmed wired, the Mixpanel data (30d, tests filtered) for real users:
>
> | Event | Real users |
> |---|---|
> | Upgrade Modal Shown | **15** |
> | Upgrade Plan Selected | **0** |
> | Upgrade Dismissed | 4 |
> | Checkout Completed | 0 |
> | subscription_started | 0 |
>
> **15 modal impressions, 0 plan clicks.** The cliff is the modal itself, not Stripe redirect, not the webhook. Zero real users have ever clicked either plan card. The remaining 11 (15 − 4 dismissed) probably closed the tab or clicked outside the modal.
>
> This **invalidates** the earlier theory that W5 (broken Stripe webhook) masks real revenue — there is no revenue to mask. No real user has even reached the Stripe checkout step.
>
> The actual conversion problem is the modal's offer: two paid tiers ($19.99 / $39.99 monthly, per code) with no free trial, no money-back guarantee, no social proof, no value re-reinforcement. Cold users seeing a price wall close the modal.

### Where to look
- ~~`Signup Completed` → what happens next? Does the user land in free chat with no gate?~~
- ~~Is there a gate on message count, feature use (bill upload, booking), or time-on-app?~~
- ~~Check: after signup, is the paywall hidden if the user has *any* entitlement (e.g., a "trial" flag that's permanently true in dev/staging/prod)?~~
- **Revised**: `UpgradeModal` component (`src/components/upgrade-modal.tsx`) — look at what the user sees. Pricing, CTA wording, plan differentiation. ~~Add `Upgrade Plan Selected` and `Upgrade Dismissed` instrumentation if missing (both event names exist in `analytics.ts:36–37` but call sites are worth verifying).~~
  - **RE-AUDIT (code-verified, 2026-04-19):** Both events are **already wired**. `Upgrade Plan Selected` fires at `upgrade-modal.tsx:109` on plan click with `plan_name` and `billing_period` properties. `Upgrade Dismissed` fires at `upgrade-modal.tsx:143` on close with `reason`. No instrumentation work needed — the action is to *query Mixpanel* for these events to see where the 12 modal impressions drop.

### Fix
~~Define and ship a deterministic paywall policy. Minimum recommended:~~
~~1. Paywall fires **immediately after quiz results / preview results screen** (the highest-intent moment per product.md).~~
~~2. If skipped: **hard message limit** (e.g., 3 free messages), then paywall blocks further chat.~~
~~3. Any premium feature tap (booking, bill analysis, call) fires paywall if not subscribed.~~

> **AUDIT — `product.md` does not exist in any elena repo.** That citation was wrong and has been removed from the app report too.
>
> **Revised fix:**
> 1. ~~**Instrument `Upgrade Plan Selected` and `Upgrade Dismissed`** if not currently firing. Without these, we can't distinguish "user saw modal and closed it" from "user clicked a plan but checkout failed."~~ **[RE-AUDIT: already wired at `upgrade-modal.tsx:109` and `:143`. Replace this step with: query Mixpanel for these event counts alongside `Upgrade Modal Shown` (12) — if `Upgrade Plan Selected` << 12, the drop is at plan choice; if it matches 12 and `Checkout Completed` is 0, the drop is at the Stripe redirect, which is also consistent with W5.]**
> 2. **Increase hard-gate frequency.** Currently only `document_limit` (402 response on upload) and `upgrade_required` chat-tool error trigger `paywall_hit`. Consider adding a message-count hard gate (e.g., 10 free messages per week) to force more paywall moments for engaged users.
> 3. **Redesign the modal** only after instrumentation confirms where users drop (plan select? checkout redirect? Stripe page?).

### Verification after fix
- Funnel: `Upgrade Modal Shown` → `Upgrade Plan Selected` → `Checkout Completed` → `subscription_started`. Aim for 20% modal→plan, 60% plan→checkout, 90% checkout→sub.
- ~~`paywall_shown` unique-user count / `Signup Completed` unique-user count ≥ 70%.~~
- ~~Median time from `Signup Completed` → `paywall_shown` ≤ 5 minutes.~~

---

## Issue W4 — ~~Two-tier pricing ($19.99 / $49.99)~~ Two-tier pricing ($19.99 / $39.99) with zero conversion signal

### Evidence
~~Pricing tiers: $19.99/mo or $15/mo annual; $49.99/mo Premium or $39.99/mo annual.~~ Zero real users have converted, so **we have no data on whether Premium is helping or hurting**. Classic risk: ~~2.5×~~ 2× price gap with unclear differentiation causes decision paralysis.

> **AUDIT — claim stands. Pricing tiers confirmed by user. No code change needed to validate, but note that the `UpgradeModal` component renders these plans — any A/B should happen there.**

> **RE-AUDIT (code-verified, 2026-04-19):** Prices in user's message (`$49.99` Premium) do not match code. Actual plan config in `src/components/upgrade-modal.tsx:28–54`:
> - **Standard:** monthly $19.99, annual $179.99 ($15/mo equivalent)
> - **Premium:** monthly **$39.99** (not $49.99), annual $299.99 ($25/mo equivalent)
>
> Price gap is 2× (not 2.5×). Annual toggle is the default (`useState<BillingPeriod>("annual")` at line 64), which is good for LTV. Confirm with the user whether the code or their message is the source of truth — they may have updated pricing in the modal without updating elsewhere, or the other way.
>
> **New finding from RE-AUDIT #2 on W3:** `Upgrade Plan Selected` = 0 for real users. Pricing may not be the primary issue — *any* immediate-paid offer with no trial is probably too cold for Meta-sourced traffic, regardless of which tier. Add a free-trial variant before A/B-testing price.

### Where to look
- Paywall/checkout component — identify how plans are rendered → `src/components/upgrade-modal.tsx`
- Stripe product configuration (in dashboard, not repo)
- Plan selection instrumentation: `Upgrade Plan Selected` event in `analytics.ts:36` — verify it fires with the selected plan as a property.

### Fix (sequenced)
1. **First, do not change pricing.** Fix W5 (webhook) + W3 instrumentation so paywall actually converts measurably. You need ≥200 `Upgrade Modal Shown` events/month before pricing tests have statistical meaning.
2. Once volume exists, A/B test: (a) single tier $19.99/mo + $99/yr, (b) current two-tier.
3. Kill Premium if it's not driving >15% of paid conversions.

### Verification after fix
Run a Mixpanel funnel `Upgrade Modal Shown` → `Checkout Completed` broken down by plan selected. Need ≥50 Checkout Completed events before drawing conclusions.

---

## Issue W5 — ~~Meta pixel fires `Subscribe` and `sign_up` but Checkout Completed is 0~~ → Stripe webhook is known-broken; revenue tracking fires client-side only, on URL redirect

> **AUDIT — this issue is bigger than originally described and is now priority #1.** Verified in code + existing repo documentation:
> 1. `Checkout Completed` fires client-side in `src/app/chat/page.tsx:208` **on URL query param** (`searchParams.get("checkout") === "success"`). If the user closes the tab before redirect, or the redirect URL is hit from a different session, the event is lost.
> 2. `trackSubscription` fires from the same block (line 216) ONLY after a client-side call to `/web/subscription` confirms ~~`tier !== "free"`~~ `tier !== "free" AND status === "active"` (code-verified at `chat/page.tsx:215` — both conditions required). But per the repo's own `TRACKING_SESSION_HANDOFF.md:80–84`:
>    > "The subscription row for `abhi@elena-health.com` shows: `plan: 'free'`, `stripe_subscription_id: null`, ALL UTM columns are null. **This means the Stripe checkout webhook either hasn't fired or failed.**"
> 3. If the webhook isn't updating the DB, then `/web/subscription` returns `free`, `trackSubscription` never fires, and Mixpanel never sees `subscription_started` — even for real paying Stripe customers.
>
> **This is likely why we have $0 Mixpanel revenue regardless of whether anyone actually paid.**

### Evidence
~~The Mixpanel event list has both `sign_up` (lowercase) and `Signup Completed` — likely one is the Meta pixel event, the other is the internal Mixpanel event.~~ `subscription_started` fired once in 90 days — all from a test account.

> **AUDIT — `sign_up` vs `Signup Completed`:** Both are real. `Signup Completed` is the Mixpanel convention (analytics.ts:12, fired from auth-context.tsx:173 in `fetchProfile`). `sign_up` is either a legacy event or a pixel-internal event — grep shows it in the Mixpanel Lexicon but no active emitters in src/. Probably retire from the Lexicon.

### Where to look
- ~~Stripe checkout success handler (`api/stripe/webhook` or equivalent)~~ → Actual location: `elena-backend/src/stripe_billing.py`, function `_handle_checkout_completed` (per `TRACKING_SESSION_HANDOFF.md:109`).
- ~~Confirm `Checkout Completed` and `subscription_started` fire server-side on `checkout.session.completed` webhook, not client-side post-redirect (redirect fires can be lost).~~ → Confirmed they do NOT fire server-side. Both fire in `src/app/chat/page.tsx:208, 216`.

### Fix
- ~~Move subscription event tracking to the Stripe webhook handler (server-side, reliable).~~
- ~~Mirror to Meta CAPI (see cross-repo issue C1) with the `Subscribe` event + purchase value.~~

> **AUDIT — revised fix, in order:**
> 1. **First diagnose the webhook.** Per `TRACKING_SESSION_HANDOFF.md:85–88`: check Stripe Dashboard → Webhooks for recent `checkout.session.completed` events, confirm endpoint is registered, check backend logs for handler invocation. Until this is fixed, nothing else matters.
> 2. **Move `subscription_started` emission to the backend** on successful webhook + DB update. Use Mixpanel's HTTP API or a lightweight server-side SDK.
> 3. **Keep `Checkout Completed` client-side** (it's a UX event — "user returned from Stripe"), but treat it as unreliable and don't use it for ARR reporting.
> 4. **Mirror `subscription_started` to Meta CAPI** with the matching `event_id` for deduplication. The `trackSubscription` client fire already hits Meta Pixel — server-side CAPI is the reliable counterpart.

### Verification after fix
- ~~Fire a test checkout → both `Checkout Completed` (Mixpanel) and `Subscribe` (Meta CAPI) should log with matching `email` and `value`.~~
- **Revised:** After a real Stripe checkout completes: (a) Supabase `subscriptions.plan` changes from `free` to a paid tier, (b) Mixpanel `subscription_started` fires server-side, (c) Meta CAPI `Subscribe` event is received.

---

## Priority order

~~1. **W1** (chat gate) — biggest leak, enables Meta optimization fix~~
~~2. **W3** (paywall actually fires) — without this, nothing else matters~~
~~3. **W2** (unify paywall events) — clean data for W3 to measure~~
~~4. **W5** (server-side subscription tracking) — so paid conversions actually get counted~~
~~5. **W4** (pricing test) — only after W1–W3 generate volume~~

> **AUDIT — revised priority after code review:**
>
> 1. **W5 (fix Stripe webhook + move `subscription_started` server-side)** — This is probably why we see $0 revenue even with test checkouts attempted. Per `TRACKING_SESSION_HANDOFF.md`, the webhook is known-broken. Until the DB reflects paid subscriptions, every downstream funnel metric is misleading.
> 2. **W3 (instrument `Upgrade Plan Selected` and `Upgrade Dismissed` on the modal)** — Need to know where the 12 modal impressions drop off. Currently a blackbox after `Upgrade Modal Shown`.
> 3. **W1 (split `Message Sent` into pre-auth intent vs authed usage)** — Rename the landing-hero emit; keep `Message Sent` for chat-area only. This is a data-hygiene fix, not a funnel fix.
> 4. **W2 (add `paywall_shown` parent event; keep the three existing signals)** — Gives a clean top-line number without destroying the granular events.
> 5. **W4 (pricing A/B)** — Only meaningful after W5+W3 produce conversion volume.
>
> The original prioritization overweighted W1 (based on a false "chat is ungated" premise). The real #1 is revenue tracking itself being broken.

> **RE-AUDIT (code + Mixpanel verified, 2026-04-19) — priorities inverted again:**
>
> 1. **W3 — redesign the Upgrade Modal.** Mixpanel: 15 real modal impressions, **0 plan clicks**. The modal is the cliff. Ship a free-trial variant (7-day, card-required) as the first test. No other downstream fix matters if 0% of modal viewers click a plan.
> 2. **W4 — correct pricing doc + add trial variant.** Code has Premium at $39.99 (not $49.99 as in user's message); align the doc and the modal offering. Add the trial variant as part of W3.
> 3. **W5 — Stripe webhook fix still worthwhile, but downgraded.** Since no one has clicked "Get Standard/Premium," the webhook has had nothing to process. Fix it for future-proofing, not as a blocker to revenue.
> 4. **W2 — add `paywall_shown` parent event.** Still a nice-to-have for reporting clarity. Low urgency.
> 5. **W1 — delete the duplicate landing-page `Message Sent` emit** (per RE-AUDIT #1 at W1). Data hygiene. Quick.
>
> The priority order has now flipped twice as the audit got more concrete. This final order reflects the Mixpanel-verified reality: the conversion problem is at the modal itself (W3), not in tracking plumbing (W5).
