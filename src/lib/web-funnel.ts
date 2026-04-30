import * as analytics from "@/lib/analytics";

const WEB_FUNNEL_VERSION = 2;

type AuthSurface = "auth_modal" | "tour_inline";

function withVersion(properties?: Record<string, unknown>) {
  return {
    funnel_version: WEB_FUNNEL_VERSION,
    ...(properties || {}),
  };
}

function withCanonical(step: string, label: string, properties?: Record<string, unknown>) {
  return withVersion({
    canonical_step: step,
    step_label: label,
    ...(properties || {}),
  });
}

export function trackWebFunnelAuthEntry(props: {
  surface: AuthSurface;
  intent: string;
}) {
  analytics.track("Web Funnel Auth Entry Viewed", withCanonical("auth_step_viewed", "Auth Step Viewed", props));
}

export function trackWebFunnelAuthSubmitted(props: {
  surface: AuthSurface;
  intent: string;
  method: string;
}) {
  analytics.track("Web Funnel Auth Submitted", withCanonical("auth_submitted", "Auth Submitted", props));
}

export function trackWebFunnelAuthSucceeded(props: {
  source: string;
  intent: string;
  method: string;
  has_profile: boolean;
  first_auth_session: boolean;
  onboarding_collected_pre_auth: boolean;
}) {
  analytics.track("Web Funnel Auth Succeeded", withCanonical("auth_succeeded", "Auth Succeeded", props));
}

export function trackWebFunnelProfileFormViewed(props: {
  source: string;
  setup_for: "self" | "dependent";
  is_anonymous_tour: boolean;
}) {
  analytics.track("Web Funnel Profile Form Viewed", withCanonical("name_step_viewed", "Name Step Viewed", props));
}

export function trackWebFunnelProfileFormSubmitted(props: {
  source: string;
  setup_for: "self" | "dependent";
  is_anonymous_tour: boolean;
  fields_filled: string[];
}) {
  analytics.track("Web Funnel Profile Form Submitted", withCanonical("name_step_submitted", "Name Step Submitted", props));
}

export function trackWebFunnelOnboardingCompleted(props: {
  source: string;
  setup_for: "self" | "dependent";
  fields_filled?: string[];
  prewarmed_session?: boolean;
  error_count?: number;
}) {
  analytics.track("Web Funnel Onboarding Completed", withCanonical("profile_saved", "Profile Saved", props));
}

export function trackWebFunnelSeedFlushed(props: {
  source: string;
  prewarmed_session: boolean;
  error_count: number;
  dependents_created?: number;
  primary_dependent_created?: boolean;
}) {
  analytics.track("Web Funnel Seed Flushed", withCanonical("onboarding_handoff_completed", "Onboarding Handoff Completed", props));
}

export function trackWebFunnelActivated(props?: {
  source?: string;
  user_id?: string;
}) {
  analytics.track("Web Funnel Activated", withCanonical("first_chat_sent", "First Chat Sent", props));
}
