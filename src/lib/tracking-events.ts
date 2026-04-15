import mixpanel from 'mixpanel-browser';
import { getStoredAttribution } from './attribution';

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
 * from multiple sites. This is the Meta ad-set optimization target (`Lead`).
 * Returns the event_id used for the fbq fire so callers can hand it to backend
 * CAPI for dedup.
 */
export function trackActivation(userId?: string): string | undefined {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(ACTIVATION_FLAG)) return;
  localStorage.setItem(ACTIVATION_FLAG, new Date().toISOString());

  const attribution = getStoredAttribution();
  const eid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
    const fbq = (window as any).fbq;
    if (fbq) {
      fbq('track', 'Lead', { content_name: 'elena_activation' }, { eventID: eid });
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

  // Meta Pixel
  try {
    const fbq = (window as any).fbq;
    if (fbq) {
      fbq('track', 'CompleteRegistration', {
        content_name: 'elena_signup',
        method,
      });
    }
  } catch { /* Meta pixel error — safe to ignore */ }
}

export function trackSubscription(plan: string, value: number, currency: string = 'USD') {
  const attribution = getStoredAttribution();

  try {
    const mp = getMixpanelAny();
    if (mp) {
      mp.track('subscription_started', {
        plan,
        value,
        currency,
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
      fbq('track', 'Subscribe', {
        value,
        currency,
        content_name: plan,
      });
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
