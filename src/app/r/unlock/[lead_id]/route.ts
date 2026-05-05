import { NextResponse, type NextRequest } from "next/server";

import { trackServer } from "@/lib/server/mixpanel";

/**
 * On-domain redirect to the scan-pricing Stripe payment link, with the
 * lead id passed through as `client_reference_id` so the eventual Stripe
 * webhook can map the payment back to the original quiz submission row.
 *
 * Hit: https://elena-health.com/r/unlock/<lead_id>  →  302  →  Stripe
 *
 * Fires `Email Link Clicked - Unlock CTA` to Mixpanel before redirecting,
 * keyed on lead_id. Tracking is best-effort with an 800ms hard timeout.
 *
 * Two reasons we route through our domain instead of linking buy.stripe.com
 * directly in the email:
 *   1. Gmail's spam classifier penalizes emails whose visible links don't
 *      match the sending domain. mail-tester / Resend Insights both flag.
 *   2. We can swap the Stripe payment link target (or change to a server-
 *      side Checkout Session) without rewriting / resending email content.
 */
const STRIPE_PAYMENT_LINK_BASE =
  "https://buy.stripe.com/fZu4gy1C8cnH78F1h6fMA00";

// Validate the lead_id loosely: accept UUIDs and url-safe slugs only, to
// avoid open-redirect-shaped abuse via path manipulation.
const LEAD_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ lead_id: string }> },
) {
  const { lead_id } = await ctx.params;
  if (!lead_id || !LEAD_ID_RE.test(lead_id)) {
    return new NextResponse("Invalid lead reference", { status: 400 });
  }
  const target = `${STRIPE_PAYMENT_LINK_BASE}?client_reference_id=${encodeURIComponent(lead_id)}`;
  await trackServer(
    "Email Link Clicked - Unlock CTA",
    {
      funnel: "scan_pricing",
      destination: STRIPE_PAYMENT_LINK_BASE,
      lead_id,
      user_agent: req.headers.get("user-agent") || null,
      referer: req.headers.get("referer") || null,
    },
    lead_id,
  );
  return NextResponse.redirect(target, 302);
}
