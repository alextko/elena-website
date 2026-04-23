# Tracking & Attribution - Session Handoff

## What Was Done

### Infrastructure Implemented (all deployed to production)

**1. Pixel Scripts in `src/app/layout.tsx`**
- **Mixpanel** (token: `e9b69d05debaeec0b454f2cdfba21d2d`) - global init with `track_pageview: true`, `persistence: "localStorage+cookie"`, `record_sessions_percent: 0`
- **TikTok Pixel** (ID: `D73VRHJC77U67GBD0NIG`) - fires `ttq.page()` on every load
- **Reddit Pixel** (ID: `a2_iquaum6mzu9t`) - fires `rdt('track', 'PageVisit')` on every load
- All three use `strategy="afterInteractive"`
- A `beforeInteractive` error guard suppresses Mixpanel's session recording `fb` TypeError

**2. UTM Attribution Layer - `src/lib/attribution.ts`**
- Captures UTMs from URL on page load, stores in `elena_attribution` cookie (30-day expiry, SameSite=Lax)
- Registers UTMs as Mixpanel super properties and people properties
- Uses `isMixpanelReady()` probe (`get_config('token')`) to distinguish stub from real library
- Polls every 200ms (max 25 attempts) before calling register/people.set

**3. Conversion Events - `src/lib/tracking-events.ts`**
- `trackSignup(method, userId?, email?)` - fires to Mixpanel (`sign_up`), TikTok (`CompleteRegistration`), Reddit (`SignUp`)
- `trackSubscription(plan, value, currency)` - fires to Mixpanel (`subscription_started`), TikTok (`Subscribe`), Reddit (`Purchase`)
- `identifyUser(userId, email?)` - identifies user in Mixpanel, TikTok (SHA-256 hashed email)
- All calls wrapped in try-catch with `getMixpanel()` safety probe

**4. Auth Integration - `src/lib/auth-context.tsx`**
- `signUp` callback: fires `trackSignup('email', undefined, email)` after successful signup
- `onAuthStateChange SIGNED_IN`: fires `identifyUser()` on every sign-in, detects new OAuth signups (created_at within 60s) and fires `trackSignup(provider)`

**5. Attribution on Signup - `src/app/providers.tsx`**
- Calls `captureAttribution()` on mount to persist UTMs from URL to cookie

**6. Landing Page Variants - `src/app/page.tsx`**
- `LP_PATH_MAP` extracts ref from `/lp/*` paths (rewrites keep browser URL)
- Hero copy changes based on ref: bills, calls, caregiver

**7. Rewrites for UTM Preservation**
- `vercel.json`: `/lp/bills` -> `/?ref=bills` (rewrite, not redirect, preserves UTMs in browser URL)
- `next.config.ts`: same rewrites for local dev

**8. Stripe Attribution Passthrough (backend: `elena-backend`)**
- `src/api_web.py`: `CheckoutRequest` model accepts `attribution` dict
- `src/stripe_billing.py`: `create_checkout_session()` puts UTMs into Stripe session metadata
- `_handle_checkout_completed` webhook: extracts UTMs from metadata into subscriptions table

**9. Database Migration (already run in Supabase)**
```sql
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS ref TEXT;
```

---

## Bugs Fixed This Session

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Site-wide white screen / infinite spinner | Mixpanel `record_sessions_percent: 100` threw uncaught `TypeError: Cannot read properties of undefined (reading 'fb')` which crashed React hydration | Added `beforeInteractive` error guard that suppresses the `fb` error; set `record_sessions_percent: 0` |
| Infinite redirect loop after login | `vercel.json` redirected `/chat` -> `/`, but `page.tsx` redirected authenticated users to `/chat` | Removed `/chat` redirect from `vercel.json` (the `/chat/page.tsx` route exists) |
| Events lost / not appearing in Mixpanel | `lazyOnload` strategy loaded pixels too late; events queued in stub were lost on page navigation | Restored `afterInteractive` for all pixels, kept error guard as safety net |
| `a.push is not a function` on multiple pages | Mixpanel stub's `register()` called during stub-to-real library transition | `get_config('token')` probe with polling in attribution.ts, tracking-events.ts, blog-chrome.tsx |
| 404 on `/lp/bills` locally | `vercel.json` rewrites only work on Vercel | Added same rewrites to `next.config.ts` |
| Landing page showing default copy on `/lp/bills` | `useSearchParams` reads browser URL (no `?ref=` visible with rewrites) | Added `usePathname()` + `LP_PATH_MAP` to extract ref from path |

---

## Current State - What Needs Verification

A full clean E2E test was just run (2026-03-28 ~6:20pm ET):
- User: `abhi@elena-health.com`
- Flow: Landed with UTMs -> signed up -> completed Stripe subscription upgrade
- UTM link used: `https://elena-health.com/lp/bills?utm_source=tiktok&utm_medium=spark&utm_campaign=icp1_billfighter&utm_content=video_billscan`

### Check 1: Supabase subscriptions table (ISSUE FOUND)
The subscription row for `abhi@elena-health.com` (auth_user_id: `4eb1f579-5c83-4283-b7f3-0bb4adf98777`) shows:
- `plan: "free"`, `stripe_subscription_id: null`
- ALL UTM columns are null

**This means the Stripe checkout webhook either hasn't fired or failed.** Investigate:
1. Check Stripe Dashboard -> Webhooks -> recent events for `checkout.session.completed`
2. Check if the webhook endpoint is configured correctly and returning 200
3. Check the Stripe session metadata for the customer `cus_UEYJqsN76xUTCK` - does it contain UTM fields?
4. Check if the frontend is passing the `attribution` dict to the checkout API call

### Check 2: Mixpanel
- Check Live View for events from this session: `$mp_web_page_view`, `sign_up`, `subscription_started`
- If no events: the `afterInteractive` + error guard fix may not be sufficient, or the `getMixpanel()` probe is still blocking calls
- Check Users -> `abhi@elena-health.com` for profile properties

### Check 3: TikTok Events Manager (5-20 min delay)
- Check for `PageView`, `CompleteRegistration`, `Subscribe` events
- Pixel ID: `D73VRHJC77U67GBD0NIG`

### Check 4: Reddit Events Manager (5-20 min delay)
- Check for `PageVisit`, `SignUp`, `Purchase` events
- Pixel ID: `a2_iquaum6mzu9t`

---

## Likely Issues to Investigate

### 1. Stripe Webhook Not Updating Subscription
The most critical issue. The subscription stays on `free` with no UTMs after a completed checkout. Check:
- `elena-backend/src/stripe_billing.py` - `_handle_checkout_completed()` handler
- Is the webhook endpoint registered in Stripe Dashboard?
- Is the backend receiving the webhook? Check server logs.
- Is `attribution` being passed from frontend to `create_checkout_session()`?

### 2. Frontend Not Passing Attribution to Checkout
Check wherever the checkout API is called from the frontend. It needs to:
1. Read `elena_attribution` cookie via `getStoredAttribution()` from `src/lib/attribution.ts`
2. Pass it as `attribution` in the POST body to the checkout endpoint
3. Search for where `create-checkout-session` or similar API call is made in the frontend

### 3. Mixpanel Events May Still Not Fire
The `getMixpanel()` helper in `tracking-events.ts` returns null if the real Mixpanel library hasn't loaded yet (it probes with `get_config('token')`). If the library loads slowly, events fired during signup could be silently dropped. Potential fix: use the stub's built-in queuing for `track()` and `identify()` calls (they're safe on the stub), and only use the probe for `register()` / `people.set()`.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Pixel scripts (Mixpanel, TikTok, Reddit) + error guard |
| `src/lib/attribution.ts` | UTM capture, cookie persistence, Mixpanel registration |
| `src/lib/tracking-events.ts` | Conversion events to all 3 platforms |
| `src/lib/auth-context.tsx` | Signup/signin tracking integration |
| `src/app/providers.tsx` | Attribution capture on mount |
| `src/app/page.tsx` | Landing page with LP_PATH_MAP for variant detection |
| `vercel.json` | Rewrites for /lp/* routes |
| `next.config.ts` | Same rewrites for local dev |
| `src/app/blog/_components/blog-chrome.tsx` | Safe Mixpanel calls for blog pages |

Backend (elena-backend repo):
| `src/api_web.py` | Checkout endpoint accepts attribution dict |
| `src/stripe_billing.py` | Passes attribution to Stripe metadata, writes UTMs on webhook |

---

## Pixel IDs & Tokens

- Mixpanel token: `e9b69d05debaeec0b454f2cdfba21d2d`
- TikTok Pixel ID: `D73VRHJC77U67GBD0NIG`
- Reddit Pixel ID: `a2_iquaum6mzu9t`

## UTM Structure for Ads

```
?utm_source=tiktok&utm_medium=spark&utm_campaign=icp1_billfighter&utm_content=video_billscan
?utm_source=tiktok&utm_medium=spark&utm_campaign=icp2_callphobic&utm_content=video_callsim
?utm_source=tiktok&utm_medium=spark&utm_campaign=icp3_caregiver&utm_content=video_storytime
?utm_source=reddit&utm_medium=cpc&utm_campaign=billfighters&utm_content=ad_scanresult
?utm_source=reddit&utm_medium=cpc&utm_campaign=callphobic&utm_content=ad_holdtime
```
