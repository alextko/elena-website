import { NextResponse, type NextRequest } from "next/server";

import { trackServer } from "@/lib/server/mixpanel";

/**
 * On-domain redirect to the iOS App Store. Used in email templates so the
 * visible link stays on `elena-health.com` (improves Gmail trust + lets us
 * swap the destination without re-sending email content).
 *
 * Hit: https://elena-health.com/r/app[?lead=<lead_id>]  →  302  →  App Store
 *
 * Fires `Email Link Clicked - App Store` to Mixpanel before redirecting,
 * with `lead_id` if the email passed it through. Tracking is best-effort
 * with an 800ms hard timeout — never blocks the redirect.
 */
const APP_STORE_URL =
  "https://apps.apple.com/us/app/elena-ai-health-navigator/id6760362771";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("lead") || undefined;
  await trackServer(
    "Email Link Clicked - App Store",
    {
      funnel: "scan_pricing",
      destination: APP_STORE_URL,
      user_agent: req.headers.get("user-agent") || null,
      referer: req.headers.get("referer") || null,
    },
    leadId,
  );
  return NextResponse.redirect(APP_STORE_URL, 302);
}
