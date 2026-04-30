import mixpanel from "mixpanel-browser";

export type AnalyticsEvent =
  // Landing Page
  | "Landing Page Viewed"
  | "Suggested Prompt Clicked"
  | "Hero Input Submitted"
  | "Login Button Clicked"
  // Authentication
  | "Auth Modal Opened"
  | "Auth Method Selected"
  | "Signup Completed"
  | "Login Completed"
  | "Auth Error"
  | "Web Funnel Auth Entry Viewed"
  | "Web Funnel Auth Submitted"
  | "Web Funnel Auth Succeeded"
  | "Web Funnel Onboarding Completed"
  | "Web Funnel Seed Flushed"
  | "Web Funnel Activated"
  // Onboarding
  | "Onboarding Modal Shown"
  | "Onboarding Completed"
  | "Onboarding Skipped"
  | "Web Tour Started"
  | "Web Tour Step Viewed"
  | "Web Tour Completed"
  | "Web Tour Joyride Completed"
  | "Web Tour Seed Query Written"
  | "Web Tour Care Context"
  | "Web Tour Care Ack Continued"
  | "Web Tour Setup For Selected"
  | "Web Tour Pain Step"
  | "Web Tour Value Step Shown"
  | "Web Tour Value Step Continued"
  | "Web Tour Router Selected"
  | "Web Tour Situation Selected"
  | "Web Tour Situation Skipped"
  | "Web Tour Meds Selected"
  | "Web Tour Care Plan Reviewed"
  | "Web Tour Elena Plan Continued"
  | "Web Tour Validation Shown"
  | "Web Tour Setup For Shown"
  | "Web Tour Elena Plan Shown"
  | "Web Tour Care Ack Shown"
  | "Web Tour Action Toggled"
  | "Web Tour Social Proof Continued"
  | "Onboard Auth Step Viewed"
  // Web/App shared entity + chat instrumentation
  | "provider_created"
  | "provider_updated"
  | "provider_deleted"
  | "todo_created"
  | "todo_updated"
  | "todo_deleted"
  | "visit_created"
  | "visit_updated"
  | "visit_deleted"
  | "chat_tool_used"
  | "chat_tool_first_used"
  | "chat_element_shown"
  | "chat_element_first_shown"
  // Chat / Conversation
  | "Welcome Screen Shown"
  | "Welcome Suggestion Clicked"
  | "Message Sent"
  | "Response Received"
  | "Suggestion Chip Clicked"
  | "File Attached"
  | "Booking Initiated"
  | "Booking Completed"
  | "Booking Failed"
  | "Form Submitted"
  // Session Management
  | "New Chat Started"
  | "Session Switched"
  | "Session Search Used"
  // Upgrade / Conversion
  | "Upgrade Modal Shown"
  | "Upgrade Plan Selected"
  | "Upgrade Dismissed"
  | "Checkout Completed"
  // Engagement
  | "App Loaded"
  | "Login Page Viewed"
  // Quiz Funnel
  | "Quiz Page Viewed"
  | "Quiz Started"
  | "Quiz Step Completed"
  | "Quiz Interstitial Viewed"
  | "Quiz Completed"
  | "Quiz Results Gate Shown"
  | "Quiz Results Viewed"
  | "Quiz Signup Clicked"
  | "Quiz Action Clicked"
  | "Quiz Get Started Clicked"
  // HIPAA
  | "HIPAA_CONSENT_SIGNED"
  // Feedback
  | "Feedback: Yes"
  | "Feedback: Submitted"
  | "Feedback: Download Clicked"
  // App CTA (download app prompt triggered by in-app data entry)
  | "App CTA: Shown"
  | "App CTA: Download Clicked"
  | "App CTA: Dismissed"
  // Web tour inline data-entry prompts
  | "Web Tour Data Added"
  | "Web Tour Data Skipped"
  // Debug / diagnostics (pre-existing events fired throughout onboard + chat)
  | "Tour Buffer Flushed"
  | "Tour Buffer Flush Failed"
  | "Onboard Flush Continue Clicked"
  | "Onboard Auth Gate Hit"
  | "Auth Handoff Recovery Triggered"
  | "Authenticated Auth Step Detected"
  | "Onboard Route Entered"
  | "Form Missing From DOM"
  | "Form Invisible In DOM"
  | "Form Missing From State"
  | "Form Request Received"
  | "Hipaa Tool Not Called"
  | "Hipaa Form Requested"
  // Paywall
  | "Soft Paywall Triggered"
  // Trial Paywall (post-onboarding 4-screen flow + exit intent)
  | "Paywall Screen Viewed"
  | "Paywall Continue Clicked"
  | "Paywall Back Clicked"
  | "Paywall Plan Selected"
  | "Paywall Trial Started"
  | "Paywall Maybe Later Clicked"
  | "Paywall Exit Offer Shown"
  | "Paywall Exit Offer Accepted"
  | "Paywall Exit Offer Dismissed";

let initialized = false;
let disabled = false;

function init() {
  if (initialized) return;
  initialized = true;

  if (typeof window === "undefined") {
    disabled = true;
    return;
  }

  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    disabled = true;
    return;
  }

  mixpanel.init(token, {
    track_pageview: false,
    persistence: "localStorage",
    record_sessions_percent: 100,
    record_mask_text_selector: "",
    debug: process.env.NODE_ENV === "development",
  });

  mixpanel.register({ platform: "web" });
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  init();
  // Test-only spy hook — Playwright can set window.__analytics_spy before
  // page load to capture every track() call without needing real Mixpanel.
  if (typeof window !== "undefined") {
    const spy = (window as unknown as { __analytics_spy?: (ev: string, props?: Record<string, unknown>) => void }).__analytics_spy;
    if (spy) spy(event, properties);
  }
  if (disabled) return;
  console.log(`[mp] track: ${event}`, properties || "", `distinct_id=${mixpanel.get_distinct_id?.() || "?"}`);
  mixpanel.track(event, properties);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  init();
  if (disabled) return;
  const prevId = mixpanel.get_distinct_id?.() || "?";
  mixpanel.identify(userId);
  console.log(`[mp] identify: ${prevId} → ${userId}`, traits || "");
  if (traits) {
    mixpanel.people.set(traits);
  }
}

export function alias(userId: string) {
  init();
  if (disabled) return;
  const anonId = mixpanel.get_distinct_id?.() || "?";
  console.log(`[mp] alias: ${anonId} → ${userId}`);
  mixpanel.alias(userId);
}

export function reset() {
  init();
  if (disabled) return;
  mixpanel.reset();
}

export function setSuperProperties(props: Record<string, unknown>) {
  init();
  if (disabled) return;
  mixpanel.register(props);
}

export function setPeopleProperties(props: Record<string, unknown>) {
  init();
  if (disabled) return;
  mixpanel.people.set(props);
}

export function registerOnce(props: Record<string, unknown>) {
  init();
  if (disabled) return;
  mixpanel.register_once(props);
}
