/**
 * Server-side Mixpanel tracker. Used from route handlers (where there's no
 * window/browser SDK available) — primarily the email-redirect funnel
 * (/r/app, /r/unlock/<lead_id>) and Stripe-webhook payment fires.
 *
 * Fires the JSON Track API with a tight timeout. Best-effort: if Mixpanel
 * is slow or down, the redirect still happens. Never throws.
 */

const ENDPOINT = "https://api.mixpanel.com/track";
const TIMEOUT_MS = 800;

const TOKEN =
  process.env.MIXPANEL_TOKEN || process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "";

export type MixpanelProperties = Record<string, string | number | boolean | null | undefined>;

export async function trackServer(
  event: string,
  properties: MixpanelProperties = {},
  distinctId?: string,
): Promise<void> {
  if (!TOKEN) return;

  const payload = [
    {
      event,
      properties: {
        token: TOKEN,
        time: Math.floor(Date.now() / 1000),
        $insert_id: `${event}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...(distinctId ? { distinct_id: distinctId } : {}),
        ...properties,
      },
    },
  ];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/plain" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } catch {
    // Swallow — never block the redirect on tracking.
  } finally {
    clearTimeout(timer);
  }
}
