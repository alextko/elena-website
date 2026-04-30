import * as analytics from "@/lib/analytics";

const WEB_FUNNEL_VERSION = 2;

type AuthSurface = "auth_modal" | "tour_inline";

function withVersion(properties?: Record<string, unknown>) {
  return {
    funnel_version: WEB_FUNNEL_VERSION,
    ...(properties || {}),
  };
}

export function trackWebFunnelAuthEntry(props: {
  surface: AuthSurface;
  intent: string;
}) {
  analytics.track("Web Funnel Auth Entry Viewed", withVersion(props));
}

export function trackWebFunnelAuthSubmitted(props: {
  surface: AuthSurface;
  intent: string;
  method: string;
}) {
  analytics.track("Web Funnel Auth Submitted", withVersion(props));
}

export function trackWebFunnelAuthSucceeded(props: {
  source: string;
  intent: string;
  method: string;
  has_profile: boolean;
  first_auth_session: boolean;
  onboarding_collected_pre_auth: boolean;
}) {
  analytics.track("Web Funnel Auth Succeeded", withVersion(props));
}

export function trackWebFunnelOnboardingCompleted(props: {
  source: string;
  setup_for: "self" | "dependent";
  fields_filled?: string[];
  prewarmed_session?: boolean;
  error_count?: number;
}) {
  analytics.track("Web Funnel Onboarding Completed", withVersion(props));
}

export function trackWebFunnelSeedFlushed(props: {
  source: string;
  prewarmed_session: boolean;
  error_count: number;
  dependents_created?: number;
  primary_dependent_created?: boolean;
}) {
  analytics.track("Web Funnel Seed Flushed", withVersion(props));
}

export function trackWebFunnelActivated(props?: {
  source?: string;
  user_id?: string;
}) {
  analytics.track("Web Funnel Activated", withVersion(props));
}
