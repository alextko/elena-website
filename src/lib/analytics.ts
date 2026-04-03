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
  // Onboarding
  | "Onboarding Modal Shown"
  | "Onboarding Completed"
  | "Onboarding Skipped"
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
  | "Login Page Viewed";

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
  });

  mixpanel.register({ platform: "web" });
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  init();
  if (disabled) return;
  mixpanel.track(event, properties);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  init();
  if (disabled) return;
  mixpanel.identify(userId);
  if (traits) {
    mixpanel.people.set(traits);
  }
}

export function alias(userId: string) {
  init();
  if (disabled) return;
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
