# Elena Website: Complete User Funnel & Analytics Instrumentation Audit

> **Purpose:** Agent-readable reference map of every web funnel, page, event, and data gap, designed so a downstream agent can determine which ICPs perform best on which funnels without re-exploring the code.
>
> **Compiled:** 2026-04-22
> **Repo:** `/Users/abhiwangoo/conductor/repos/elena/elena-website`
> **Sister docs:** `CONVERSION_ISSUES_2026-04-19.md`, `TRACKING_SESSION_HANDOFF.md`, `PAYWALL_NEXT_STEPS.md`

---

## 1. Funnel Inventory

### A. Primary Funnel: Late-Signup (Default)
**Purpose:** Maximize engagement before conversion friction; drive intent via landing hero before auth gate.

**Flow:**
1. **Landing Page** (`src/app/page.tsx`)
   - Entry: `/`, `/lp/*` variants (bill-fighting, calls, caregiver, meds, fertility, chronic, insurance, care-now, prices)
   - Hero input submission → records intent query
   - Hero CTA → routes to `/onboard` (late-signup) OR opens AuthModal (early-signup, `?signup=first`)
   - Exit: User clicks "Login" → AuthModal; or "Suggested Prompt" → routes to `/onboard`
   - Events: Landing Page Viewed, Hero Input Submitted, Suggested Prompt Clicked, Message Sent (landing pre-auth), Login Button Clicked, Onboard Route Entered

2. **Onboarding Tour** (`src/app/onboard/page.tsx`, `src/components/WebOnboardingTour.tsx`)
   - Entry: `/onboard` (via landing late-signup default, or `?signup=late`)
   - Flow: Multi-step quiz (5-10 screens depending on ICP); captures onboarding_responses (ICP signals: condition_type, symptom_severity, care_coordination_role, etc.)
   - Exit 1: Complete tour → AuthModal opens (unseeded)
   - Exit 2: Skip/Close → AuthModal (unseeded)
   - Events: Tour Started, Tour Screen Viewed, Tour Option Selected, Tour Completed, Tour Skipped

3. **Auth Modal / Signup** (triggered from `/onboard` or landing with `?signup=first`)
   - Entry: Modal overlay, routes POST to Supabase (email, Google OAuth, Apple OAuth)
   - Success: Creates auth.users row + creates default profile + calls fetchProfile()
   - Exit: Redirects to `/chat` on success
   - Events: Signup Completed (method: email|google|apple), Login Completed, User Identified in Mixpanel

4. **Chat (First Session)** (`src/app/chat/page.tsx`)
   - Entry: POST-auth redirect from modal OR returning user `/chat`
   - First auth: claimPendingMessages() on mount (backfill hero seed message + any admin pending messages)
   - First message send: Fires trackActivation() → CompleteRegistration to Meta + SubmitForm to TikTok
   - Triggers paywall on: document_limit (402 docs), upgrade_required (Pro/Premium features)
   - Events: App Loaded, Message Sent (chat authenticated), Paywall Hit, Activation (Mixpanel + Meta + TikTok)

### B. Secondary Funnel: Early-Signup (Explicit)
**Purpose:** Fast-track users who arrive with high purchase intent.

**Flow:**
1. **Landing Page with `?signup=first`** (`src/app/page.tsx`)
   - Immediately opens AuthModal (skips `/onboard` tour)
   - Otherwise identical to late-signup path
   - Events: Landing Page Viewed, Hero Input Submitted, Login Button Clicked, Signup Completed

2. **Auth Modal** (same as above)
3. **Chat (First Session)** (same as above, but enters with no quiz responses)
   - ICP data incomplete (no condition_type, etc.)
   - Events: Same as late-signup

### C. Paywall Funnel: Trial + Subscription
**Purpose:** Convert free users to paid (3-day or 7-day trial, then subscription).

**Trigger Points:**
- Hard gate: document_limit (402 docs uploaded) or upgrade_required error from backend
- Soft gate: post-onboarding, "Soft Paywall Triggered" (value moment detected)
- Upgrade Modal: Free-to-Pro/Premium conversions from chat

**4-Screen Paywall Flow** (`src/components/paywall/trial-flow.tsx`)
1. **Step 1: Reviews Header**
   - Entry: From hard gate OR soft gate OR post-onboarding default
   - CTA: "Start Trial" (primary)
   - Events: Paywall Screen Viewed (step: step_1, reason: post_onboarding|upgrade_required|soft), Paywall Plan Selected

2. **Step 2: Feature Highlights**
   - CTA: "Continue" (or "Back")
   - Events: Paywall Continue Clicked (from_screen: step_1), Paywall Back Clicked

3. **Step 3: Final Plan Selection**
   - Billing period selector: annual (default), monthly, weekly
   - Plan selector: Standard (default) or Premium
   - Primary CTA: "Start Trial"
   - Secondary CTA: "Maybe Later"
   - Events: Paywall Screen Viewed (step_3), Paywall Continue Clicked (from_screen: step_2), Paywall Plan Selected, Paywall Maybe Later Clicked

4. **Exit-Intent Sheet** (appears on step 3 exit attempt)
   - Options: "extended_7_day_trial" or "remind_tomorrow"
   - Events: Paywall Exit Offer Shown, Paywall Exit Offer Accepted (offer: extended_7_day_trial|remind_tomorrow), Paywall Exit Offer Dismissed

**Checkout Flow** (`src/app/checkout/page.tsx` server-side)
   - Stripe session creation: Includes `attribution` dict (UTM source, medium, campaign, content, term, ref)
   - Webhook: `_handle_checkout_completed` should write UTMs to subscriptions table + fire server-side Meta CAPI
   - Return: `?checkout=success` → Chat page detects, fires trackStartTrial() or trackSubscription()

**Upgrade Modal (Free→Pro/Premium)** (`src/components/upgrade-modal.tsx`)
   - Entry: Triggered from chat on upgrade_required, limit_reached, feature_blocked, document_limit, soft reasons
   - Reason codes: "upgrade_required" | "limit_reached" | "feature_blocked" | "document_limit" | "soft"
   - Plan selector: Standard weekly ($6.99) / monthly ($19.99) / annual ($179.99) OR Premium monthly ($39.99) / annual ($299.99)
   - Default billing period: annual
   - Events: Upgrade Modal Shown (reason, feature_name), Upgrade Plan Selected (plan_name, billing_period), Upgrade Dismissed (reason)

### D. Return User Funnel
**Purpose:** Re-engagement, feature discovery, upgrade funnel.

**Flow:**
1. **Chat (Returning)** (`src/app/chat/page.tsx`)
   - Entry: Direct `/chat` or OAuth re-login
   - Events: App Loaded (is_returning_user: true, session_count: N)
   - Paywall/Upgrade Modal on feature access (same as first session)

2. **Profile Switching** (multi-tenant)
   - Session storage: `elena_sessions`, `elena_active_session_id`, `elena_active_profile_id`
   - Events: Profile Switched (profile_type: primary|managed, profile_id) — **NOT YET WIRED**

---

## 2. Page Inventory

| Route | File | Component Type | Auth Gate | Roles | Events Fired | Redirects |
|-------|------|-----------------|-----------|-------|--------------|-----------|
| `/` | `src/app/page.tsx` | SSC + Client | No | Public | Landing Page Viewed, Hero Input Submitted, Suggested Prompt Clicked, Message Sent (pre-auth), Login Button Clicked, Onboard Route Entered | `/onboard` (late-signup), AuthModal (early-signup or login) |
| `/lp/[ref]` | `src/app/page.tsx` (rewrite) | SSC + Client | No | Public | Landing Page Viewed (landing_variant: ref), Hero Input Submitted, Message Sent (pre-auth), Onboard Route Entered | `/onboard`, AuthModal |
| `/onboard` | `src/app/onboard/page.tsx` | Client (dynamic) | No | Public | Tour Started, Tour Screen Viewed, Tour Option Selected, Tour Completed, Tour Skipped | AuthModal (on complete/skip) |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Route (server) | N/A | Public | None (server-side OAuth handler) | `/chat` (success) or `/` (error) |
| `/chat` | `src/app/chat/page.tsx` | SSC + Client | **Yes** (redirect to login) | authenticated | App Loaded, Message Sent (authenticated), Activation (trackActivation), Paywall Hit, Upgrade Modal Shown, Checkout Completed | Paywall sheet (modal), Checkout (external Stripe) |
| `/checkout` | `src/app/checkout/page.tsx` | Server | **Yes** (auth guard) | authenticated | None (server-side session creation) | Stripe (redirect) |
| `/paywall-preview` | `src/app/paywall-preview/page.tsx` | Client | No | Public | Paywall Screen Viewed (all steps) + all paywall events (for QA preview) | N/A |
| `/api/web/[...route]` | `src/app/api/web/route.ts` | Route (server) | Varies | backend | None (API) | N/A |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | SSC | No | Public | Blog Page Viewed, Blog Scroll (depth %), Article Read (time on page), Blog CTA Clicked | Article links (internal), CTA (typically chat signup) |

---

## 3. Event Instrumentation

### A. Complete Event Catalog

#### Landing Page Events
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| Landing Page Viewed | `src/app/page.tsx:~90` | Page mount (useEffect) | `landing_variant` (ref or "homepage") | Mixpanel | Fires before any user interaction; ref extracted via LP_PATH_MAP |
| Hero Input Submitted | `src/app/page.tsx:~140` | User types in hero input + clicks submit | `query_length` | Mixpanel | Distinct from Message Sent; intent signal |
| Suggested Prompt Clicked | `src/app/page.tsx:~160` | User clicks rotating prompt example | `prompt_label` | Mixpanel | **GAP:** No TikTok/Meta equivalent; may indicate lower intent vs typed input |
| Message Sent (pre-auth) | `src/app/page.tsx:~170` | User sends message from landing hero | `is_first_message: true`, `has_attachment`, `message_length`, `authenticated: false`, `source: "landing_page"`, `landing_variant` | Mixpanel, TikTok (custom), Meta (custom) | **DATA GAP:** Fires pre-auth (stub receiver), not identified to user; should be deleted per CONVERSION_ISSUES_2026-04-19.md W1 |
| Login Button Clicked | `src/app/page.tsx:~185` | User clicks "Login" CTA | None | Mixpanel | Entry to early-signup or returning user flow |
| Onboard Route Entered | `src/app/page.tsx:~145` | User routed to `/onboard` | `source: "landing_hero"`, `landing_variant` | Mixpanel | Late-signup decision point |

#### Onboarding Tour Events
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| Tour Started | `src/components/WebOnboardingTour.tsx:~50` | `/onboard` page mount | None | Mixpanel | ICP entry; captures quiz start |
| Tour Screen Viewed | `src/components/WebOnboardingTour.tsx:~110` | User navigates to screen N | `screen_index`, `screen_name` (from survey schema) | Mixpanel | Funnel visibility; check dropoff per screen |
| Tour Option Selected | `src/components/WebOnboardingTour.tsx:~150` | User selects multi-choice answer | `question_name`, `selected_value`, `is_custom_input` | Mixpanel | **ICP CRITICAL:** Maps condition_type, symptom_severity, care_role, family_status, etc. to Mixpanel people properties via set_once |
| Tour Completed | `src/components/WebOnboardingTour.tsx:~200` | User clicks "Done" after all screens | `responses_count`, `time_on_tour_seconds` | Mixpanel | Triggers AuthModal (unseeded) |
| Tour Skipped | `src/components/WebOnboardingTour.tsx:~210` | User clicks "Skip" or close button | `exit_screen`, `reason` | Mixpanel | Funnel exit; ICP data incomplete |

#### Auth / User ID Events
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| Signup Completed | `src/lib/auth-context.tsx:~320` | POST-auth, fetchProfile() on new user | `method` (email|google|apple) | Mixpanel, TikTok (CompleteRegistration) | Fires AFTER auth succeeds + fetchProfile confirms new user (no data.has_profile) |
| Login Completed | `src/lib/auth-context.tsx:~330` | POST-auth, fetchProfile() on returning user | `method` (email|google|apple) | Mixpanel | Fires AFTER auth succeeds + fetchProfile confirms returning (data.has_profile) |
| User Identified | `src/lib/auth-context.tsx:~310` (identify call) | POST-auth, fetchProfile() | `$email`, `has_profile`, `plan_type`, `$name` (returning only), `sign_up_method`, `sign_up_date`, `initial_utm_*`, `initial_ref` (set_once) | Mixpanel | Alias + identify: converts anon session to identified user |

#### Chat & Message Events
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| App Loaded | `src/app/chat/page.tsx:~200` | `/chat` page mount (useEffect) | `is_returning_user` (bool), `session_count` | Mixpanel | Distinguishes first vs returning sessions |
| Message Sent (chat) | `src/app/chat/page.tsx:~250` | User sends message in chat | `is_first_message`, `has_attachment`, `message_length`, `authenticated: true`, `source: "chat"`, `message_type` | Mixpanel, TikTok, Meta | First message fires trackActivation() in parallel if authenticated |
| Activation | `src/lib/tracking-events.ts:~40` (trackActivation) | First message in chat (authenticated) OR after claiming pending messages | `user_id` | Mixpanel ("Activated"), TikTok ("SubmitForm"), Meta ("CompleteRegistration", with event_id) | **CRITICAL:** Delayed from signup to authed + first action (peak commitment); gates Meta CompleteRegistration to this event vs Signup Completed |
| Paywall Hit | `src/lib/tracking-events.ts:~80` (trackPaywallHit) | Error from backend: document_limit (402 docs) or upgrade_required | `reason` ("document_limit" \| "upgrade_required"), `feature` (e.g., "document_upload") | Mixpanel, TikTok ("ViewContent"), Meta ("PaywallHit") | Hard conversion gate; triggers 4-screen paywall flow |
| Soft Paywall Triggered | `src/app/chat/page.tsx:~280` | Internal logic detects value moment (e.g., first analysis complete, savings number generated) | `feature`, `value_moment_type` | Mixpanel | Soft gate; shows modal nudge but doesn't block feature access |

#### Paywall Events
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| Paywall Screen Viewed | `src/components/paywall/trial-flow.tsx:~150` | User navigates to step 1, 2, or 3 | `screen: "step_1"\|"step_2"\|"step_3"`, `reason: "post_onboarding"\|"upgrade_required"\|"soft"`, `plan_shown` | Mixpanel | Funnel visibility per entry reason; baseline conversion metric |
| Paywall Continue Clicked | `src/components/paywall/trial-flow.tsx:~200` | User clicks "Continue" on step 1 or 2 | `from_screen: "step_1"\|"step_2"` | Mixpanel | Funnel progression; check drop-off rate between steps |
| Paywall Back Clicked | `src/components/paywall/trial-flow.tsx:~210` | User clicks "Back" button | `from_step: 1\|2\|3` | Mixpanel | Funnel abandonment signal |
| Paywall Plan Selected | `src/components/paywall/trial-flow.tsx:~220` | User selects plan (Standard or Premium) before checkout | `plan: "standard"\|"premium"`, `billing_period: "weekly"\|"monthly"\|"annual"` | Mixpanel | Purchase intent; pre-Stripe signal |
| Paywall Trial Started | `src/app/chat/page.tsx:~310` (trackStartTrial on checkout=success) | Checkout success detected (`?checkout=success`), subscription status = "trialing" | `plan: "standard_weekly"\|"standard_monthly"\|"standard_annual"`, `trial_days: 3\|7`, `source: "primary_cta"\|"exit_offer"` | Mixpanel, TikTok ("StartTrial"), Meta ("StartTrial", event_id for CAPI dedup) | Trial conversion; event_id from meta_start_trial_event_id (backend-issued on checkout success) |
| Paywall Maybe Later Clicked | `src/components/paywall/trial-flow.tsx:~230` | User clicks "Maybe Later" on step 3 | None | Mixpanel | Soft funnel exit; user stays on free plan |
| Paywall Exit Offer Shown | `src/components/paywall/trial-flow.tsx:~310` | User attempts to exit (close sheet / back from step 3) | None | Mixpanel | Retention nudge impression |
| Paywall Exit Offer Accepted | `src/components/paywall/trial-flow.tsx:~320` | User selects exit offer option | `offer: "extended_7_day_trial"\|"remind_tomorrow"` | Mixpanel | Retention conversion; "extended_7_day_trial" triggers immediate 7-day trial, "remind_tomorrow" defers email (deferred wiring per PAYWALL_NEXT_STEPS.md) |
| Paywall Exit Offer Dismissed | `src/components/paywall/trial-flow.tsx:~330` | User closes exit sheet | None | Mixpanel | Retention funnel exit |
| Checkout Completed | `src/app/chat/page.tsx:~305` | Page mount detects `?checkout=success` URL param | None | Mixpanel | Client-side success marker (unreliable; webhook is source of truth) |
| Subscription Started | `src/lib/tracking-events.ts:~110` (trackSubscription on checkout=success, status="active") | Checkout success detected, subscription status = "active" (paid conversion) | `plan: "standard_monthly"\|"standard_annual"\|"premium_monthly"\|"premium_annual"`, `value: <price_usd>`, `currency: "USD"`, `attribution: <utm_dict>` | Mixpanel (track_charge), TikTok ("Subscribe"), Meta ("Subscribe", event_id for CAPI dedup) | Paid conversion; event_id from meta_subscribe_event_id (backend-issued) |

#### Upgrade Modal Events
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| Upgrade Modal Shown | `src/components/upgrade-modal.tsx:~110` | Modal opens on free user | `reason: "upgrade_required"\|"limit_reached"\|"feature_blocked"\|"document_limit"\|"soft"`, `feature_name: <feature>` | Mixpanel | Feature gate impression; conversion cliff (W3: 15 impressions, 0 conversions) |
| Upgrade Plan Selected | `src/components/upgrade-modal.tsx:~150` | User clicks plan card | `plan_name: "standard"\|"premium"`, `billing_period: "weekly"\|"monthly"\|"annual"` | Mixpanel, TikTok (custom), Meta (custom) | Purchase intent; funnels to Stripe checkout |
| Upgrade Dismissed | `src/components/upgrade-modal.tsx:~155` | User closes modal | `reason: <original_reason>` | Mixpanel | Soft exit; user stays on free plan |

#### Blog Events
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| Blog Page Viewed | `src/app/blog/[slug]/page.tsx:~50` | Blog article mount | `article_slug`, `article_title` | Mixpanel, TikTok (ViewContent) | Top-of-funnel awareness |
| Blog Scroll (depth %) | `src/components/blog-chrome.tsx:~200` | User scrolls past 25%, 50%, 75%, 100% | `depth_percent: 25\|50\|75\|100` | Mixpanel | Engagement signal; Intersection Observer (debounced) |
| Article Read | `src/app/blog/[slug]/page.tsx:~150` | User remains on page >3 min | `time_on_page_seconds`, `reading_time_estimate` | Mixpanel | High-intent content consumption |
| Blog CTA Clicked | `src/components/blog-chrome.tsx:~250` | User clicks internal CTA | `cta_text`, `cta_link`, `section` | Mixpanel, TikTok, Meta | Conversion vector from owned media |

#### View Content Events (Generic)
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| View Content | `src/lib/tracking-events.ts:~90` (trackViewContent) | Called from landing, blog, paywall preview | `contentType: "landing_page"\|"blog_article"\|"paywall"`, `contentName: <ref or slug>` | Mixpanel, TikTok ("ViewContent"), Meta ("ViewContent") | Standardized content impression |

#### Attribution & Property Registration
| Event | File:Line | Trigger | Properties | Destinations | Notes |
|-------|-----------|---------|------------|--------------|-------|
| (Implicit: UTM registration) | `src/lib/attribution.ts:~80` | Page load via captureAttribution() | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `ref`, `landing_page`, `referrer` (super props), `initial_utm_*`, `initial_ref`, `initial_landing_page`, `initial_referrer`, `first_visit` (people set_once) | Mixpanel | No explicit event; 30-day cookie persistence |

### B. Event Destination Matrix

| Event | Mixpanel | TikTok | Meta/Facebook |
|-------|----------|--------|---------------|
| Landing Page Viewed | ✓ | | |
| Hero Input Submitted | ✓ | | |
| Suggested Prompt Clicked | ✓ | | |
| Message Sent (pre-auth) | ✓ | ✓ | ✓ |
| Message Sent (chat) | ✓ | ✓ | ✓ |
| Signup Completed | ✓ | ✓ (CompleteRegistration) | |
| Activation | ✓ | ✓ (SubmitForm) | ✓ (CompleteRegistration) |
| Paywall Hit | ✓ | ✓ (ViewContent) | ✓ (PaywallHit) |
| Soft Paywall Triggered | ✓ | | |
| Paywall Screen Viewed | ✓ | | |
| Paywall Trial Started | ✓ | ✓ (StartTrial) | ✓ (StartTrial, event_id) |
| Subscription Started | ✓ (track_charge) | ✓ (Subscribe) | ✓ (Subscribe, event_id) |
| Upgrade Modal Shown | ✓ | | |
| Upgrade Plan Selected | ✓ | | |
| Blog Page Viewed | ✓ | | |
| View Content | ✓ | ✓ (ViewContent) | ✓ (ViewContent) |

---

## 4. Instrumentation Setup

### A. SDK Initialization

#### Mixpanel (`src/app/layout.tsx:~40-80`)
- Error guard `beforeInteractive` suppresses Mixpanel `fb` TypeError
- Main script `afterInteractive` at `https://cdn.mxpnl.com/libs/mixpanel-${version}.min.js`
- `window.mixpanel.init(NEXT_PUBLIC_MIXPANEL_TOKEN, { track_pageview: false, persistence: "localStorage+cookie", record_sessions_percent: 0 })`
- Token: `e9b69d05debaeec0b454f2cdfba21d2d`
- Settings: pageview controlled manually; session recording OFF for privacy; cross-device persistence ON

#### TikTok Pixel (`src/app/layout.tsx:~85-95`)
- Script `afterInteractive` at `https://analytics.tiktok.com/i18n/pixel/config/5ea6c8ab3c2e6ad00dc8d7c5.js`
- `window.ttq.page()` fired on load
- Pixel ID: `D73VRHJC77U67GBD0NIG`
- Conversion events: CompleteRegistration, SubmitForm, StartTrial, Subscribe, ViewContent, PaywallHit (custom)

#### Meta Pixel (`src/app/layout.tsx:~100-115`)
- Inline fbq bootstrap + `fbq('init', NEXT_PUBLIC_META_PIXEL_ID)` + `fbq('track', 'PageView')`
- Standard + custom events with `event_id` for CAPI dedup (server-side CAPI not yet wired)

#### Attribution (`src/lib/attribution.ts:~80`)
- `captureAttribution()` called from `src/app/providers.tsx` on mount
- Reads `utm_*`, `ref`, `landing_page`, `referrer` from URL/document
- Writes `elena_attribution` cookie (30-day, SameSite=Lax)
- Registers super properties on Mixpanel once ready (polls 25 × 200ms = 5s timeout)
- Writes `initial_*` + `first_visit` as people `set_once`

#### User Identification (`src/lib/auth-context.tsx:~310-350`)
1. **Pre-auth:** Mixpanel default `distinct_id` (browser); UTMs as super properties
2. **Signup:** `analytics.alias(user.id)` → `analytics.identify(user.id, { $email, sign_up_method, sign_up_date, plan_type: "free", initial_utm_*, ... })`
3. **Login:** `analytics.identify(user.id, { $email, $name, has_profile: true, plan_type })`
4. **Subscription update:** plan_type refreshed via identify on webhook-triggered refresh

### B. Environment Variables
| Variable | Value / Source | Usage | Required |
|----------|----------------|-------|----------|
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | `e9b69d05debaeec0b454f2cdfba21d2d` | Mixpanel init | Yes |
| `NEXT_PUBLIC_META_PIXEL_ID` | (env only) | Meta Pixel init | Yes |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | `D73VRHJC77U67GBD0NIG` | TikTok Pixel init | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | env | Auth + profiles API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | env | Client-side auth | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | env | Checkout session | Yes |

### C. Session & Device ID Handling
- **sessionStorage:** `elena_sessions`, `elena_active_session_id`, `elena_active_profile_id`, `elena_late_signup`
- **localStorage:** `elena_attribution` (JSON, 30-day), `ACTIVATION_FLAG` (bool gate for trackActivation)
- **Mixpanel distinct_id:** browser fingerprint + localStorage ID
- **TikTok / Meta:** pixel-native; no custom device ID
- **User ID:** Supabase UUID; separate `profile_id` UUID for multi-tenant profile rows

---

## 5. ICP-Relevant Data Captured

### A. Explicit ICP Attributes (Quiz Responses)
Captured by `Tour Option Selected` in `src/components/WebOnboardingTour.tsx` → Mixpanel people props (`set_once`).

| Attribute | Quiz Question | Mixpanel Property | Type | Values |
|-----------|---------------|-------------------|------|--------|
| Condition Type | "What condition do you have?" | `condition_type` | String | bill_fighting, calls, caregiver, meds, fertility, chronic, insurance, care_now, prices |
| Symptom Severity | "How severe are your symptoms?" | `symptom_severity` | String | mild, moderate, severe |
| Care Coordination Role | "Managing care for..." | `care_coordination_role` | String | self, family_member, caregiver, healthcare_provider |
| Family Status | "Living situation?" | `family_status` | String | single, married, family_with_children, living_with_parents |
| Age Range | "Age range?" | `age_group` | String | 18-25, 26-35, 36-45, 46-55, 56-65, 65+ |
| Tech Comfort | "Comfortable with technology?" | `tech_comfort_level` | String | very / somewhat / not comfortable |
| Insurance Status | "Have health insurance?" | `has_insurance` | Boolean | true/false |
| Current Provider | "Using a provider?" | `uses_current_provider` | Boolean | true/false |
| Provider Name | Free text | `current_provider_name` | String | freeform |
| Time to Healthcare | "How long for appointments?" | `time_to_healthcare_weeks` | Integer | 1-52 |
| Pain Points | Multi-select | `pain_points` | Array | [diagnosis_difficulty, cost_burden, time_consuming, medication_confusion, ...] |
| Preferred Contact | "Preferred contact?" | `preferred_contact_method` | String | email, phone, sms, push |

**Availability:**
- Tour completers → full ICP
- Tour skippers → ICP blank
- Returning users → immutable (`set_once`); re-prompt not implemented

### B. Behavioral ICP Signals
| Attribute | Event | Property | Trigger |
|-----------|-------|----------|---------|
| Signup path | `Signup Completed` | `signup_path: "early"\|"late"` | `?signup=first` param usage |
| Landing variant | `Landing Page Viewed` | `landing_variant` | `/lp/[ref]` route |
| Feature gated | `Paywall Hit` | `feature_triggered` | Hard gate from backend |
| Early engagement | `Message Sent` | `is_first_message: true` | First chat message |
| Session count | `App Loaded` | `session_count` | App mount |
| Trial path | `Paywall Trial Started` | `source: "primary_cta"\|"exit_offer"` | Trial start |
| Trial abandonment | `Paywall Maybe Later Clicked` | — | Step 3 exit |
| Upgrade interaction | `Upgrade Modal Shown` + `Upgrade Plan Selected` | `reason`, `plan_name` | Modal impression/click |

### C. Context / Device Attributes
| Attribute | Source | Mixpanel |
|-----------|--------|----------|
| Email | Supabase auth | `$email` |
| Name | OAuth provider | `$name` |
| Sign-up method | Auth context | `sign_up_method` |
| Sign-up date | Auth timestamp | `sign_up_date` (set_once) |
| Plan type | Subscription state | `plan_type` |
| Last login | Auth context | `last_login` |
| UTMs (current) | attribution.ts | `utm_source/medium/campaign/content/term`, `ref`, `landing_page`, `referrer` (super props) |
| UTMs (first-touch) | attribution.ts | `initial_utm_*`, `initial_ref`, `initial_landing_page`, `initial_referrer`, `first_visit` (people set_once) |

**GAP:** No auto-captured geo/browser/OS/device; Mixpanel default does not include these.

### D. Profile / Multi-Tenant Data
| Attribute | Source | Tracked? |
|-----------|--------|----------|
| Profile ID | profiles.id | **No** (session-scoped only) |
| Primary vs managed | profiles.relationship_to_owner | **No** |
| Profile name | profiles.{first,last}_name | via `$name` |
| Profile switching | sessionStorage change | **No event wired** |

---

## 6. Data Gaps

### Critical (block accurate ICP analysis)
- **A. Signup vs Activation attribution conflict** — both originally mapped to Meta CompleteRegistration; now unified to Activation. Verify no regression.
- **B. Stripe webhook silent failure** — `?checkout=success` only updates client; `subscriptions` table + UTM columns not written; no server-side Meta CAPI. Paid-conversion attribution unreliable until webhook fixed (see `TRACKING_SESSION_HANDOFF.md` Check 1).
- **C. Activation latency not captured** — no timestamp on `Activation`; can't measure time-to-aha.
- **D. Profile switching untracked** — multi-tenant managed profiles have no event; secondary conversions unattributable.
- **E. Tour abandonment incomplete** — `Tour Skipped` has `exit_screen`/`reason` in spec, verify wired; need screen-level dropoff.

### High Priority
- **F. Message Sent (pre-auth) fires to stub** — `src/app/page.tsx:~170` queues event before Mixpanel loads; events lost on nav. Delete per CONVERSION_ISSUES_2026-04-19.md W1.
- **G. Soft Paywall trigger vague** — no precise condition documented; hard to reproduce or A/B.
- **H. Maybe Later conversion not traced** — no follow-up property linking later upgrade to prior "Maybe Later" exit.
- **I. Meta CAPI dedup incomplete** — event_id passed to pixel, but server-side CAPI fire not implemented (deferred Phase 2).

### Medium
- **J. No device/browser/geo** — Mixpanel default doesn't auto-capture; ICP can't segment by device or region.
- **K. Tour response order unknown** — no `response_number` on `Tour Option Selected`.
- **L. Paywall reason missing on trial start** — `trackStartTrial` doesn't receive `reason` (post_onboarding/upgrade_required/soft/exit_offer).
- **M. Blog→chat funnel unlinked** — blog events lack session/anon ID for user-to-user carryover.
- **N. Activation CAPI not fired** — no event_id returned/used server-side for Meta Activation dedup.

### Low
- **O. Suggested Prompt Clicked Mixpanel-only** — no ad-platform signal.
- **P. Upgrade modal reason not granular** — flat enum; can't break out which features drive upgrade intent.
- **Q. First message timestamp not captured.**
- **R. Session duration untracked** (record_sessions_percent: 0 by design).

---

## 7. Key Files for Further Inspection

### Core Tracking & Analytics
1. `src/lib/tracking-events.ts` — Multi-pixel conversion library (trackSignup, trackSubscription, trackStartTrial, trackActivation, trackPaywallHit, trackViewContent, identifyUser)
2. `src/lib/analytics.ts` — Mixpanel wrapper + typed event union; exposes `window.__analytics_spy` for Playwright
3. `src/lib/attribution.ts` — UTM capture, cookie, Mixpanel register/set_once
4. `src/app/layout.tsx` — Pixel init (Mixpanel, TikTok, Meta) + `fb` error guard
5. `src/app/providers.tsx` — Root provider that calls `captureAttribution()`
6. `src/lib/auth-context.tsx` — `fetchProfile()`, alias + identify, Signup/Login events
7. `src/app/chat/page.tsx` — App Loaded, Message Sent, Paywall Hit, trackActivation, `?checkout=success` → trackStartTrial/trackSubscription
8. `src/components/paywall/trial-flow.tsx` — 4-screen paywall + exit-intent
9. `src/components/upgrade-modal.tsx` — Free→Pro/Premium upgrade modal

### Onboarding & ICP Capture
10. `src/app/page.tsx` — Landing + LP_PATH_MAP; early vs late signup routing
11. `src/app/onboard/page.tsx` — Onboarding tour host
12. `src/components/WebOnboardingTour.tsx` — Multi-step quiz; set_once people properties
13. `src/app/auth/callback/route.ts` — OAuth callback

### Blog
14. `src/app/blog/[slug]/page.tsx`
15. `src/components/blog-chrome.tsx` — Scroll depth, CTA

### Backend Integration (elena-backend repo)
16. `elena-backend/src/api_web.py` — CheckoutRequest with attribution dict
17. `elena-backend/src/stripe_billing.py` — `_handle_checkout_completed` webhook (currently broken)

### E2E
18. `e2e/paywall-trial-flow.spec.ts` — 14 paywall tests
19. `e2e/onboarding-exploratory.spec.ts` — onboarding coverage (untracked in repo)

### Reference Docs
20. `CONVERSION_ISSUES_2026-04-19.md`
21. `TRACKING_SESSION_HANDOFF.md`
22. `PAYWALL_NEXT_STEPS.md`

---

## Summary: Data Readiness for ICP Analysis

### Available Now
- Full event funnel (30+ events) across Mixpanel / TikTok / Meta
- User identification + email + sign_up_method
- ICP quiz attributes (12+) as Mixpanel people props
- UTM attribution (current + first-touch)
- 9 landing variants via LP_PATH_MAP (bill_fighting, calls, caregiver, meds, fertility, chronic, insurance, care_now, prices)
- Trial + subscription tracking with plan/billing_period

### Broken / Incomplete
- Stripe webhook not writing subscriptions / UTMs (Phase 1 blocker)
- Pre-auth Message Sent fires to stub (delete)
- Activation latency / first-message timestamps missing
- Profile switching untracked
- Meta CAPI server-side not wired (client-only with event_id)
- No device/browser/geo auto-capture
- Tour screen-level abandonment metadata incomplete

### Recommended Next Steps for a Downstream ICP Agent
1. **Fix Stripe webhook first** — without it, paid conversion data is unreliable.
2. **Delete landing `Message Sent`** — reduces noise in pre-auth stream.
3. **Verify Mixpanel live view** for signup/activation/trial in prod.
4. **Primary ICP axis:** `landing_variant` × `condition_type` (filterable via Mixpanel).
5. **Secondary:** `care_coordination_role`, `has_insurance`, `age_group` as segmentation.
6. **Funnel conversion metrics to compute:**
   - Landing Page Viewed → Onboard Route Entered → Tour Completed → Signup Completed → Activation → Paywall Hit → Paywall Trial Started → Subscription Started
   - Per-variant and per-ICP conversion rates.
   - Time between Signup Completed and Activation (requires latency instrumentation).
7. **Await Phase 2:** Meta CAPI, profile switching, trial-ending email (see PAYWALL_NEXT_STEPS.md).

---

**Event count:** 30+ across 3 external platforms
**ICP attributes:** 12 quiz-derived + 15+ behavioral/contextual
**Data gaps:** 18 total (5 critical, 5 high, 5 medium, 3 low)
