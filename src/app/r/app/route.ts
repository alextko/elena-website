import { NextResponse } from "next/server";

/**
 * On-domain redirect to the iOS App Store. Used in email templates so the
 * visible link stays on `elena-health.com` (improves Gmail trust + lets us
 * swap the destination without re-sending email content).
 *
 * Hit: https://elena-health.com/r/app  →  302  →  App Store
 */
const APP_STORE_URL =
  "https://apps.apple.com/us/app/elena-ai-health-navigator/id6760362771";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.redirect(APP_STORE_URL, 302);
}
