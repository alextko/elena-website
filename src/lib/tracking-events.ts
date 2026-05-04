import mixpanel from 'mixpanel-browser';
import { getStoredAttribution } from './attribution';
import { trackWebFunnelActivated } from './web-funnel';

/** Ensure Mixpanel is initialized before using it.
 * analytics.ts owns init, but tracking-events.ts may run first.
 * This guarantees the instance is ready. */
function ensureInit() {
  // @ts-expect-error — check internal state
  if (mixpanel.__loaded) return;
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token || typeof window === 'undefined') return;
  mixpanel.init(token, {
    track_pageview: false,
    persistence: 'localStorage',
    record_sessions_percent: 100,
    record_mask_text_selector: '',
  });
  mixpanel.register({ platform: 'web' });
}

/** Returns the mixpanel instance from the npm package. */
function getMixpanelAny(): any | null {
  ensureInit();
  return mixpanel || null;
}

/** Returns the mixpanel instance (same as getMixpanelAny since we use the npm package). */
function getMixpanelReal(): any | null {
  ensureInit();
  return mixpanel || null;
}

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str.trim().toLowerCase())
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const ACTIVATION_FLAG = 'elena_activation_fired_v1';

/**
 * Fires once per browser when the user has BOTH authenticated and sent a first
 * message (via the claim path or directly in chat). Idempotent — safe to call
 * from multiple sites.
 *
 * Fires Meta `CompleteRegistration` here (not on the onboarding form) because
 * Meta locks the ad set optimization event after publish, so every ad set is
 * permanently optimizing on `CompleteRegistration`. Moving the fire earlier
 * in the funnel lets Meta optimize against activated users instead of users
 * who complete the full multi-step onboarding form. The onboarding-form
 * `CompleteRegistration` fire has been removed from `trackSignup` to avoid
 * double-counting.
 *
 * Returns the event_id used for the fbq fire so callers can hand it to backend
 * CAPI for dedup (Phase 2).
 */
export function trackActivation(userId?: string): string | undefined {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(ACTIVATION_FLAG)) return;
  localStorage.setItem(ACTIVATION_FLAG, new Date().toISOString());

  const attribution = getStoredAttribution();
  // Prefer the server-issued meta_event_id (stored at profile creation) so the fbq
  // pixel and the server CAPI CompleteRegistration share an event_id and Meta
  // dedupes them. Falls back to a fresh UUID for non-meta signups or pre-fix users
  // whose profile was created before the server started returning meta_event_id.
  let eid: string | undefined;
  try { eid = localStorage.getItem('elena_meta_event_id') || undefined; } catch { eid = undefined; }
  if (!eid) {
    eid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  try {
    const mp = getMixpanelAny();
    if (mp) {
      mp.track('Activated', {
        event_id: eid,
        ...(userId ? { user_id: userId } : {}),
        ...(attribution || {}),
      });
    }
  } catch { /* safe to ignore */ }

  try {
    trackWebFunnelActivated({
      source: "first_message",
      ...(userId ? { user_id: userId } : {}),
    });
  } catch { /* safe to ignore */ }

  try {
    const fbq = (window as any).fbq;
    if (fbq) {
      fbq('track', 'CompleteRegistration', { content_name: 'elena_activation' }, { eventID: eid });
    }
  } catch { /* safe to ignore */ }

  try {
    const ttq = (window as any).ttq;
    if (ttq) {
      ttq.track('SubmitForm', { content_name: 'elena_activation' });
    }
  } catch { /* safe to ignore */ }

  return eid;
}

export async function trackSignup(method: 'email' | 'google' | 'apple' | string, userId?: string, email?: string) {
  const attribution = getStoredAttribution();

  // Mixpanel identify + people.set (Signup Completed event is fired from fetchProfile)
  try {
    const mp = getMixpanelAny();
    if (mp && userId) mp.identify(userId);
  } catch { /* safe to ignore */ }

  try {
    const mp = getMixpanelReal();
    if (mp) {
      if (email) {
        mp.people.set({
          $email: email,
          sign_up_method: method,
          sign_up_date: new Date().toISOString(),
        });
      }
      if (attribution) {
        mp.people.set_once({
          initial_utm_source: attribution.utm_source,
          initial_utm_medium: attribution.utm_medium,
          initial_utm_campaign: attribution.utm_campaign,
          initial_utm_content: attribution.utm_content,
          initial_utm_term: attribution.utm_term,
          initial_ref: attribution.ref,
          initial_landing_page: attribution.landing_page,
          initial_referrer: attribution.referrer,
        });
      }
    }
  } catch { /* safe to ignore */ }

  // TikTok Pixel
  try {
    const ttq = (window as any).ttq;
    if (ttq) {
      if (email) {
        const hashedEmail = await sha256(email);
        const hashedId = userId ? await sha256(userId) : undefined;
        ttq.identify({
          email: hashedEmail,
          ...(hashedId ? { external_id: hashedId } : {}),
        });
      }
      ttq.track('CompleteRegistration', {
        content_name: 'elena_signup',
      });
    }
  } catch { /* TikTok pixel error — safe to ignore */ }

  // Meta `CompleteRegistration` is intentionally NOT fired here. It fires from
  // trackActivation (authed + first message) instead, to give Meta an earlier
  // optimization signal. See trackActivation() for the rationale.
}

/**
 * Fires Subscribe across Mixpanel + TikTok + Meta.
 *
 * eventId should be the server-issued `meta_subscribe_event_id` from
 * /web/subscription. Passing it lets the backend's server-side CAPI fire
 * (same event_id) dedup with this browser fire in Meta's 7-day window. Without
 * it we're fine — Meta just treats the browser fire as a standalone event —
 * but dedup is what keeps the count honest.
 *
 * Do NOT call this for a trial start. Use trackStartTrial() — Subscribe at $0
 * poisons Meta value optimization. Subscribe is only for real paid conversions
 * (direct-paid checkout, or trial→paid transition on day 3).
 */
export function trackSubscription(
  plan: string,
  value: number,
  currency: string = 'USD',
  eventId?: string,
) {
  const attribution = getStoredAttribution();

  try {
    const mp = getMixpanelAny();
    if (mp) {
      mp.track('subscription_started', {
        plan,
        value,
        currency,
        ...(eventId ? { event_id: eventId } : {}),
        ...(attribution || {}),
      });
    }
  } catch { /* safe to ignore */ }

  try {
    const mp = getMixpanelReal();
    if (mp) {
      mp.people.set({
        plan,
        subscription_date: new Date().toISOString(),
      });
      mp.people.track_charge(value, { plan });
    }
  } catch { /* safe to ignore */ }

  try {
    const ttq = (window as any).ttq;
    if (ttq) {
      ttq.track('Subscribe', {
        content_name: plan,
        value,
        currency,
      });
    }
  } catch { /* safe to ignore */ }

  // Meta Pixel
  try {
    const fbq = (window as any).fbq;
    if (fbq) {
      const options = eventId ? { eventID: eventId } : undefined;
      fbq('track', 'Subscribe', {
        value,
        currency,
        content_name: plan,
      }, options);
    }
  } catch { /* Meta pixel error — safe to ignore */ }
}

/**
 * Fires StartTrial across Mixpanel + TikTok + Meta at value=0.
 *
 * For the 3-day free trial on standard_weekly / standard_annual. Meta's
 * primary in-window conversion signal while trials drive most signups —
 * optimize ad sets on StartTrial, not Subscribe, until post-trial Subscribe
 * volume is meaningful (~2 weeks in).
 *
 * eventId should be the server-issued `meta_start_trial_event_id` from
 * /web/subscription — same dedup mechanic as trackSubscription. Uses a
 * different prefix on the backend so the later Subscribe fire on day 3 has
 * a distinct event_id.
 */
export function trackStartTrial(plan: string, currency: string = 'USD', eventId?: string) {
  const attribution = getStoredAttribution();

  try {
    const mp = getMixpanelAny();
    if (mp) {
      mp.track('trial_started', {
        plan,
        value: 0,
        currency,
        ...(eventId ? { event_id: eventId } : {}),
        ...(attribution || {}),
      });
    }
  } catch { /* safe to ignore */ }

  try {
    const mp = getMixpanelReal();
    if (mp) {
      mp.people.set({
        plan,
        trial_started_at: new Date().toISOString(),
      });
    }
  } catch { /* safe to ignore */ }

  try {
    const ttq = (window as any).ttq;
    if (ttq) {
      ttq.track('StartTrial', {
        content_name: plan,
        value: 0,
        currency,
      });
    }
  } catch { /* safe to ignore */ }

  try {
    const fbq = (window as any).fbq;
    if (fbq) {
      const options = eventId ? { eventID: eventId } : undefined;
      fbq('track', 'StartTrial', {
        value: 0,
        currency,
        content_name: plan,
      }, options);
    }
  } catch { /* Meta pixel error — safe to ignore */ }
}

export function trackViewContent(contentType: 'blog' | 'landing_page', contentName: string) {
  try {
    const mp = getMixpanelAny();
    if (mp) {
      mp.track('view_content', { content_type: contentType, content_name: contentName });
    }
  } catch { /* safe to ignore */ }

  try {
    const ttq = (window as any).ttq;
    if (ttq) {
      ttq.track('ViewContent', {
        content_type: contentType,
        content_name: contentName,
      });
    }
  } catch { /* TikTok pixel error — safe to ignore */ }

  // Meta Pixel
  try {
    const fbq = (window as any).fbq;
    if (fbq) {
      fbq('track', 'ViewContent', {
        content_type: contentType,
        content_name: contentName,
      });
    }
  } catch { /* Meta pixel error — safe to ignore */ }
}

export function trackPaywallHit(reason: string, feature?: string) {
  try {
    const mp = getMixpanelAny();
    if (mp) {
      mp.track('paywall_hit', { reason, ...(feature ? { gated_feature: feature } : {}) });
    }
  } catch { /* safe to ignore */ }

  try {
    const ttq = (window as any).ttq;
    if (ttq) {
      ttq.track('ViewContent', {
        content_type: 'paywall',
        content_name: feature || reason,
      });
    }
  } catch { /* safe to ignore */ }

  try {
    const fbq = (window as any).fbq;
    if (fbq) {
      fbq('trackCustom', 'PaywallHit', {
        reason,
        ...(feature ? { gated_feature: feature } : {}),
      });
    }
  } catch { /* safe to ignore */ }
}

const SCAN_PRICING_LEAD_FLAG_PREFIX = 'elena_scan_pricing_lead_fired_v1:';

/**
 * Fires the Meta `Lead` event for the scan-pricing quiz on the confirmation
 * page. Calls the backend first, which fires CAPI server-side and returns a
 * deterministic event_id (uuid5 of anon_id). The browser then fires fbq with
 * that same event_id so Meta dedupes within its 7-day window.
 *
 * - Idempotent per anon_id via localStorage; refresh of the confirmation
 *   page does not re-fire.
 * - Server is also idempotent via scan_pricing_requests.meta_lead_fired_at.
 * - Standard event so Meta optimization + AEM treats it natively.
 *   content_name="scan_pricing_quiz" lets you build a Custom Conversion
 *   in Events Manager that targets ONLY this Lead source for ad set
 *   optimization (vs all Lead fires).
 */
export async function trackScanPricingLead(anonId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!anonId) return;

  const flagKey = SCAN_PRICING_LEAD_FLAG_PREFIX + anonId;
  if (localStorage.getItem(flagKey)) return;

  let eventId: string | undefined;
  let serverFired = false;
  let serverReason: string | null | undefined;
  let serverResponded = false;
  try {
    const res = await fetch('/backend/web/scan-pricing-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anon_id: anonId }),
    });
    if (res.ok) {
      const body = (await res.json()) as {
        fired: boolean;
        event_id: string;
        reason?: string | null;
      };
      eventId = body.event_id;
      serverFired = !!body.fired;
      serverReason = body.reason ?? null;
      serverResponded = true;
    }
  } catch { /* network blip — handled below */ }

  // Gate the browser pixel fires on quiz completion. The server is the source
  // of truth for "did this anon_id ever submit the quiz?" — if it tells us
  // there's no intake row, this person landed organically (refresh, share
  // link, copy-paste). Don't fire Lead in that case; it would corrupt the
  // optimization signal.
  //
  // Fire criteria: server responded AND (it just fired CAPI itself, or it
  // skipped CAPI for a reason that still implies quiz completion). On a
  // network failure we can't tell, so we don't fire — biased toward false
  // negatives over false positives.
  const QUIZ_COMPLETED_REASONS = new Set([
    'already_fired',     // we previously fired CAPI for this anon_id; quiz was completed
    'capi_not_configured', // intake row exists; CAPI is just unconfigured
    'capi_error',        // intake row exists; CAPI errored on Meta's side
  ]);
  const shouldFire = serverResponded && (
    serverFired || (serverReason !== null && serverReason !== undefined && QUIZ_COMPLETED_REASONS.has(serverReason))
  );

  if (!shouldFire) {
    // No fire. Don't even mint a flag — let a future legit confirmation page
    // visit (after the user actually completes the quiz) get a clean shot at
    // firing.
    return;
  }

  if (!eventId) {
    eventId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  try {
    const fbq = (window as any).fbq;
    if (fbq) {
      // No value/currency on the Lead — money hasn't been exchanged yet.
      // Real $ flows on the downstream Purchase event from the Stripe webhook.
      fbq(
        'track',
        'Lead',
        {
          content_name: 'scan_pricing_quiz',
          content_category: 'imaging_price_quote',
        },
        { eventID: eventId },
      );
    }
  } catch { /* safe to ignore */ }

  try {
    const ttq = (window as any).ttq;
    if (ttq) {
      ttq.track('SubmitForm', { content_name: 'scan_pricing_quiz' });
    }
  } catch { /* safe to ignore */ }

  try {
    localStorage.setItem(flagKey, JSON.stringify({
      at: new Date().toISOString(),
      event_id: eventId,
      server_fired: serverFired,
    }));
  } catch { /* safe to ignore */ }
}

export function identifyUser(userId: string, email?: string) {
  try {
    const mp = getMixpanelAny();
    if (mp) mp.identify(userId);
  } catch { /* safe to ignore */ }

  try {
    const mp = getMixpanelReal();
    if (mp) {
      const props: Record<string, string> = {
        last_login: new Date().toISOString(),
      };
      if (email) props['$email'] = email;
      mp.people.set(props);
    }
  } catch { /* safe to ignore */ }
}
