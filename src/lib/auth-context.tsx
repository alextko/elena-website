"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/apiFetch";
import { claimPendingMessages } from "@/lib/pendingMessage";
import { getStoredAttribution } from "@/lib/attribution";
import { PENDING_SIGNUP_KEY, hasPendingSignup, promoteStoredTourStateToPostAuthResume } from "@/lib/authHandoff";
import * as analytics from "@/lib/analytics";
import { trackWebFunnelAuthSucceeded } from "@/lib/web-funnel";
import type { MeResponse, DoctorItem, CareVisit, CareTodo, CareTodoCreate, Habit, SubscriptionResponse, InsuranceCard, ProfileSummary } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profileId: string | null;
  profiles: ProfileSummary[];
  switchProfile: (profileId: string) => Promise<void>;
  isSwitchingProfile: boolean;
  profileData: { firstName: string; lastName: string; email: string; profilePictureUrl?: string | null; dob?: string | null; zipCode?: string | null } | null;
  hasMobileApp: boolean;
  updateProfilePicture: (url: string | null) => void;
  // Cached profile popover data
  doctors: DoctorItem[];
  careVisits: CareVisit[];
  subscription: SubscriptionResponse | null;
  insuranceCards: InsuranceCard[];
  todos: CareTodo[];       // all todos (calendar view, include_future=true)
  todayTodos: CareTodo[];  // filtered for today only
  habits: Habit[];
  habitCompletions: Record<string, Set<string>>; // date -> habit IDs completed
  toggleHabit: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  createTodo: (data: CareTodoCreate) => Promise<CareTodo | null>;
  updateTodo: (id: string, data: Partial<CareTodoCreate> & { status?: string }) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
  refreshDoctors: () => Promise<void>;
  refreshVisits: () => Promise<void>;
  /** Re-fetch /auth/me to update the `profiles` list (e.g. after adding a
   *  managed profile). Intentionally does NOT change `profileId` — the
   *  active profile stays on whatever it already was. */
  refreshProfiles: () => Promise<void>;
  refreshInsurance: () => Promise<void>;
  refreshHabits: () => Promise<void>;
  needsOnboarding: boolean;
  profileChecked: boolean;
  onboardingJustCompleted: boolean;
  clearOnboardingJustCompleted: () => void;
  completeOnboarding: (data: { first_name?: string; last_name?: string; date_of_birth?: string; home_address?: string }) => Promise<void>;
  profileDetailsLoaded: boolean;
  fetchProfileDetails: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  signIn: (email: string, password: string, options?: { source?: string }) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, options?: { source?: string }) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirectTo?: string, options?: { intent?: "signup" | "signin"; source?: string }) => Promise<{ error: string | null }>;
  signInWithApple: (redirectTo?: string, options?: { intent?: "signup" | "signin"; source?: string }) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ONBOARDING_REQUIRED_PROFILE_FIELDS = ["first_name", "last_name"] as const;
const AUTH_INTENT_KEY = "elena_auth_intent";
const ONBOARD_PENDING_SIGNUP_KEY = PENDING_SIGNUP_KEY;

type AuthIntent = {
  intent: "signup" | "signin";
  source?: string;
};

function storeAuthIntent(intent: "signup" | "signin", source?: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify({ intent, source } satisfies AuthIntent));
  } catch {}
}

function consumeAuthIntent(): AuthIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(AUTH_INTENT_KEY);
    const parsed = JSON.parse(raw) as Partial<AuthIntent>;
    if (parsed.intent === "signup" || parsed.intent === "signin") {
      return { intent: parsed.intent, source: parsed.source };
    }
  } catch {}
  return null;
}

function isLikelyFirstAuthSession(user: User | null | undefined) {
  if (!user?.created_at || !user?.last_sign_in_at) return false;
  const created = new Date(user.created_at).getTime();
  const lastSignIn = new Date(user.last_sign_in_at).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(lastSignIn)) return false;
  return Math.abs(lastSignIn - created) < 2 * 60 * 1000;
}

function hasCompletedRequiredOnboardingFields(
  profile:
    | {
        first_name?: string | null;
        last_name?: string | null;
        date_of_birth?: string | null;
        zip_code?: string | null;
      }
    | null
    | undefined,
) {
  if (!profile) return false;
  return ONBOARDING_REQUIRED_PROFILE_FIELDS.every((field) => {
    const value = profile[field];
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileIdState] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);
  const [profileData, setProfileData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string | null;
    dob?: string | null;
    zipCode?: string | null;
  } | null>(null);
  const [hasMobileApp, setHasMobileApp] = useState(false);

  // Cached profile popover data — persists across sidebar toggles
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [careVisits, setCareVisits] = useState<CareVisit[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [insuranceCards, setInsuranceCards] = useState<InsuranceCard[]>([]);
  const [todos, setTodos] = useState<CareTodo[]>([]);  // all todos (calendar view)
  const [todayTodos, setTodayTodos] = useState<CareTodo[]>([]);  // filtered for today
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<Record<string, Set<string>>>({});
  const [profileDetailsLoaded, setProfileDetailsLoaded] = useState(false);
  const profileDetailsFetchingRef = useRef(false);
  const profileFetchVersionRef = useRef(0); // guards against stale fetches after profile switch
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);

  const setProfileId = useCallback((id: string | null) => {
    setProfileIdState(id);
    if (id) {
      localStorage.setItem("elena_active_profile_id", id);
    } else {
      localStorage.removeItem("elena_active_profile_id");
    }
  }, []);

  const profileFetchedRef = useRef(false);

  const selectBackendActiveProfile = useCallback((data: MeResponse) => {
    const profiles = data.profiles || [];
    const primary = profiles.find((p) => p.is_primary) || null;
    const active =
      profiles.find((p) => p.id === data.profile_id)
      || primary
      || null;
    return { active, primary };
  }, []);

  // Fetch basic profile info (name, profileId) — called once on session restore
  const fetchProfile = useCallback(async () => {
    if (profileFetchedRef.current) return;
    profileFetchedRef.current = true;

    // Restore cached /auth/me immediately so profileId is available while we refresh
    try {
      const cached = sessionStorage.getItem("elena_me_cache");
      if (cached) {
        const data: MeResponse = JSON.parse(cached);
        if (data.has_profile && data.profile_id) {
          setProfileChecked(true);
          setProfiles(data.profiles || []);
          setHasMobileApp(!!data.has_mobile_app);
          const { active: activeProfile, primary: primaryProfile } = selectBackendActiveProfile(data);
          setProfileId(activeProfile?.id || data.profile_id);
          setNeedsOnboarding(!(data.onboarding_completed || hasCompletedRequiredOnboardingFields(primaryProfile)));
          if (activeProfile) {
            setProfileData({
              firstName: activeProfile.first_name,
              lastName: activeProfile.last_name,
              email: data.email || "",
              profilePictureUrl: activeProfile.profile_picture_url || null,
            });
          }
        }
      }
    } catch {}

    try {
      const res = await apiFetch("/auth/me");
      if (!res.ok) {
        console.warn("[auth] /auth/me failed with status", res.status);
        profileFetchedRef.current = false; // allow retry
        setProfileChecked(true); // unblock UI even on failure
        return;
      }
      const data: MeResponse = await res.json();
      // Cache for instant restore on next page load
      try { sessionStorage.setItem("elena_me_cache", JSON.stringify(data)); } catch {}
      setHasMobileApp(!!data.has_mobile_app);

      console.log("[auth] /auth/me response:", { has_profile: data.has_profile, profile_id: data.profile_id, email: data.email });

      // Identify user in Mixpanel
      const { data: { session: currentSessionForProvider } } = await supabase.auth.getSession();
      const provider = currentSessionForProvider?.user?.app_metadata?.provider || "email";
      const authIntent = consumeAuthIntent();
      const firstAuthSession = isLikelyFirstAuthSession(currentSessionForProvider?.user);
      const onboardingCollectedPreAuth =
        typeof window !== "undefined" && sessionStorage.getItem(ONBOARD_PENDING_SIGNUP_KEY) === "1";

      // New user with no profile - show onboarding popup
      // Use has_profile from backend as source of truth (not localStorage which is per-browser)
      if (!data.has_profile) {
        analytics.alias(currentSessionForProvider?.user?.id || "");
        analytics.identify(currentSessionForProvider?.user?.id || "", {
          $email: data.email,
          has_profile: false,
        });
        analytics.track("Signup Completed", {
          method: provider,
          source: authIntent?.source || "unknown",
          auth_intent: authIntent?.intent || "unknown",
          onboarding_collected_pre_auth: onboardingCollectedPreAuth,
          first_auth_session: firstAuthSession,
        });
        trackWebFunnelAuthSucceeded({
          source: authIntent?.source || "unknown",
          intent: authIntent?.intent || "unknown",
          method: provider,
          has_profile: false,
          first_auth_session: firstAuthSession,
          onboarding_collected_pre_auth: onboardingCollectedPreAuth,
        });
        // Ad pixel CompleteRegistration fires after onboarding completes (in completeOnboarding),
        // not here — firing here would count users who sign up but never finish onboarding.
        console.log("[auth] No profile found, showing onboarding");
        // Pull name from Google/Apple OAuth metadata if available
        // Read directly from Supabase session (not React state, which may be stale)
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const meta = currentSession?.user?.user_metadata as Record<string, string> | undefined;
        const oauthName = meta?.full_name || meta?.name || "";
        const parts = oauthName ? oauthName.split(" ") : [];
        const oauthFirst = parts[0] || "";
        const oauthLast = parts.slice(1).join(" ") || "";
        const oauthAvatar = meta?.avatar_url || meta?.picture || null;
        console.log("[auth] OAuth data:", { oauthFirst, oauthLast, hasAvatar: !!oauthAvatar, metaKeys: meta ? Object.keys(meta) : [] });

        setNeedsOnboarding(true);
        setProfileChecked(true);
        setProfileData({
          firstName: oauthFirst,
          lastName: oauthLast,
          email: data.email || "",
          profilePictureUrl: oauthAvatar,
        });
        return;
      }

      // Onboarding was done before but profile still missing (e.g. earlier CORS failure)
      // Silently create a minimal profile
      if (!data.has_profile) {
        console.log("[auth] No profile but onboarding already done, creating silently");
        try {
          const silentAttribution = getStoredAttribution();
          const createRes = await apiFetch("/profile", {
            method: "POST",
            body: JSON.stringify({
              email: data.email || "",
              ...(silentAttribution?.ref ? { referral_code: silentAttribution.ref } : {}),
              ...(silentAttribution?.utm_source ? { utm_source: silentAttribution.utm_source } : {}),
              ...(silentAttribution?.utm_medium ? { utm_medium: silentAttribution.utm_medium } : {}),
              ...(silentAttribution?.utm_campaign ? { utm_campaign: silentAttribution.utm_campaign } : {}),
            }),
          });
          if (createRes.ok) {
            const created = await createRes.json();
            setProfileId(created.profile_id || created.id);
            setProfileData({
              firstName: created.first_name || "",
              lastName: created.last_name || "",
              email: data.email || "",
              profilePictureUrl: null,
            });
          }
        } catch {}
        setProfileChecked(true);
        return;
      }

      setProfileChecked(true);
      setProfiles(data.profiles || []);

      const { active: activeProfile, primary } = selectBackendActiveProfile(data);

      setProfileId(activeProfile?.id || data.profile_id);

      if (primary) {
        analytics.identify(currentSessionForProvider?.user?.id || "", {
          $email: data.email,
          $name: `${primary.first_name} ${primary.last_name}`.trim(),
          has_profile: true,
        });
        analytics.track(
          authIntent?.intent === "signup" && firstAuthSession ? "Signup Completed" : "Login Completed",
          {
            method: provider,
            source: authIntent?.source || "unknown",
            auth_intent: authIntent?.intent || "unknown",
            onboarding_collected_pre_auth: onboardingCollectedPreAuth,
            first_auth_session: firstAuthSession,
            classification:
              authIntent?.intent === "signup" && firstAuthSession
                ? "intent_plus_first_auth"
                : "existing_profile_or_signin",
          },
        );
        trackWebFunnelAuthSucceeded({
          source: authIntent?.source || "unknown",
          intent: authIntent?.intent || "unknown",
          method: provider,
          has_profile: true,
          first_auth_session: firstAuthSession,
          onboarding_collected_pre_auth: onboardingCollectedPreAuth,
        });
      }

      if (activeProfile) {
        setProfileData({
          firstName: activeProfile.first_name,
          lastName: activeProfile.last_name,
          email: data.email || "",
          profilePictureUrl: activeProfile.profile_picture_url || null,
          dob: activeProfile.date_of_birth || null,
          zipCode: activeProfile.zip_code || null,
        });
      } else {
        setProfileData({
          firstName: "",
          lastName: "",
          email: data.email || "",
          profilePictureUrl: null,
          dob: null,
          zipCode: null,
        });
      }

      // If backend says onboarding isn't complete (happens when a funnel created
      // a partial profile — e.g. quiz gave us zip + OAuth name but not DOB), we
      // want the onboarding modal to show anyway so the user can fill the gap.
      // The modal will pre-fill from profileData so the user only types what's
      // actually missing.
      if (!(data.onboarding_completed || hasCompletedRequiredOnboardingFields(primary))) {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    } catch (e) {
      // Network error — profile data is optional
      console.warn("[auth] fetchProfile error:", e);
      profileFetchedRef.current = false; // allow retry
      setProfileChecked(true); // unblock UI even on error
    }
  }, [selectBackendActiveProfile]);

  // Fetch detailed profile data (doctors, appointments, credits) — called eagerly on login.
  // Guard only on fetchingRef (not on profileDetailsLoaded) so a newly-signed-up
  // user with optimistic loaded=true can still hydrate real data from the backend.
  const fetchProfileDetails = useCallback(async () => {
    if (profileDetailsFetchingRef.current) return;
    profileDetailsFetchingRef.current = true;
    const fetchVersion = profileFetchVersionRef.current;

    // Restore cached profile details instantly so the popover isn't blank
    try {
      const cached = sessionStorage.getItem("elena_profile_details");
      if (cached) {
        const c = JSON.parse(cached);
        const cachedProfileId = c._profileId;
        if (cachedProfileId === profileId) {
          if (c.doctors) setDoctors(c.doctors);
          if (c.careVisits) setCareVisits(c.careVisits);
          if (c.todos) setTodos(c.todos);
          if (c.todayTodos) setTodayTodos(c.todayTodos);
          if (c.habits) setHabits(c.habits);
          if (c.insuranceCards) setInsuranceCards(c.insuranceCards);
          if (c.subscription) setSubscription(c.subscription);
          // habitCompletions uses Sets which don't serialize — skip cache
          setProfileDetailsLoaded(true);
        }
      }
    } catch {}

    // Helper: only apply state if the profile hasn't switched mid-flight
    const isStale = () => profileFetchVersionRef.current !== fetchVersion;
    // Mark loaded after first meaningful response so the popover skeleton clears early
    const markLoaded = () => { if (!isStale()) setProfileDetailsLoaded(true); };

    // Fire all requests in parallel, apply state as each resolves (progressive loading).
    // Each request guards against stale profile switches independently.
    const promises: Promise<void>[] = [];

    // Collect results for cache write at the end (set inline before setState, so non-null at use site)
    let doctorsResult: DoctorItem[] = [];
    let visitsResult: CareVisit[] = [];
    let todosResult: CareTodo[] = [];
    let todayTodosResult: CareTodo[] = [];
    let habitsResult: Habit[] = [];
    let insuranceResult: InsuranceCard[] = [];
    let subscriptionResult: SubscriptionResponse | null = null;

    if (profileId) {
      promises.push(
        apiFetch(`/profile/${profileId}/doctors`)
          .then(async (res) => {
            if (!res.ok || isStale()) return;
            const data = await res.json();
            doctorsResult = data.doctors || [];
            if (!isStale()) setDoctors(doctorsResult);
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/care-visits")
          .then(async (res) => {
            if (!res.ok || isStale()) return;
            visitsResult = await res.json();
            if (!isStale()) { setCareVisits(visitsResult); markLoaded(); }
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/todos?include_future=true")
          .then(async (res) => {
            if (!res.ok || isStale()) return;
            todosResult = await res.json();
            if (!isStale()) { setTodos(todosResult); markLoaded(); }
          })
          .catch(() => {}),
      );
      promises.push(
        apiFetch("/todos")
          .then(async (res) => {
            if (!res.ok || isStale()) return;
            todayTodosResult = await res.json();
            if (!isStale()) { setTodayTodos(todayTodosResult); markLoaded(); }
          })
          .catch(() => {}),
      );

      // Habits + completions (12 weeks back for calendar strip checkmarks)
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 12 * 7);
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + 7);
      const startStr = formatLocalDateKey(startDate);
      const endStr = formatLocalDateKey(endDate);

      promises.push(
        apiFetch("/habits")
          .then(async (res) => {
            if (!res.ok || isStale()) return;
            habitsResult = await res.json();
            if (!isStale()) setHabits(habitsResult);
          })
          .catch(() => {}),
      );
      promises.push(
        apiFetch(`/habits/completions?start_date=${startStr}&end_date=${endStr}`)
          .then(async (res) => {
            if (!res.ok || isStale()) return;
            const raw = await res.json();
            const byDate: Record<string, Set<string>> = {};
            if (Array.isArray(raw)) {
              for (const row of raw as { habit_id: string; completed_date: string }[]) {
                if (!byDate[row.completed_date]) byDate[row.completed_date] = new Set();
                byDate[row.completed_date].add(row.habit_id);
              }
            } else {
              for (const [habitId, dates] of Object.entries(raw as Record<string, Record<string, boolean>>)) {
                for (const [dateKey, done] of Object.entries(dates)) {
                  if (done) {
                    if (!byDate[dateKey]) byDate[dateKey] = new Set();
                    byDate[dateKey].add(habitId);
                  }
                }
              }
            }
            if (!isStale()) setHabitCompletions(byDate);
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/insurance/cards")
          .then(async (res) => {
            if (!res.ok || isStale()) return;
            const data = await res.json();
            const cards: InsuranceCard[] = [];
            for (const [cardType, record] of Object.entries(data)) {
              if (record && typeof record === "object") {
                const r = record as Record<string, unknown>;
                const structured: Record<string, string | null> = {};
                for (const [k, v] of Object.entries(r)) {
                  if (k === "id" || k === "profile_id" || k === "created_at" || k === "updated_at"
                      || k.endsWith("_s3_key") || k.endsWith("_s3_url")) continue;
                  structured[k] = v != null ? String(v) : null;
                }
                cards.push({
                  id: r.id as string | undefined,
                  card_type: cardType,
                  structured_data: structured,
                  front_url: (r.front_s3_url as string) || null,
                  back_url: (r.back_s3_url as string) || null,
                });
              }
            }
            insuranceResult = cards;
            if (!isStale()) setInsuranceCards(insuranceResult);
          })
          .catch(() => {}),
      );
    }

    promises.push(
      apiFetch("/web/subscription")
        .then(async (res) => {
          if (!res.ok || isStale()) return;
          subscriptionResult = await res.json();
          if (!isStale()) {
            setSubscription(subscriptionResult);
            // Source of truth for Mixpanel plan_type — DB tier, not a hardcoded
            // "free" guess. Without this, paid/trialing users land in the
            // free-user cohort until refreshSubscription is called.
            const tier = subscriptionResult?.tier;
            if (tier) {
              analytics.setSuperProperties({ plan_type: tier });
              analytics.setPeopleProperties({ plan_type: tier });
            }
          }
        })
        .catch(() => {}),
    );

    try {
      await Promise.all(promises);

      if (isStale()) return;

      setProfileDetailsLoaded(true);

      // Cache for instant restore on next page load
      try {
        sessionStorage.setItem("elena_profile_details", JSON.stringify({
          _profileId: profileId,
          doctors: doctorsResult,
          careVisits: visitsResult,
          todos: todosResult,
          todayTodos: todayTodosResult,
          habits: habitsResult,
          insuranceCards: insuranceResult,
          subscription: subscriptionResult,
        }));
      } catch {}
    } finally {
      // Always release the lock so a later refresh (or profile switch) can re-enter.
      profileDetailsFetchingRef.current = false;
    }
  }, [profileId]);

  // Refresh just subscription/credits — used after Stripe checkout redirect
  const refreshSubscription = useCallback(async () => {
    try {
      const res = await apiFetch("/web/subscription");
      if (!res.ok) return;
      const data: SubscriptionResponse = await res.json();
      setSubscription(data);
      analytics.setSuperProperties({ plan_type: data.tier });
      analytics.setPeopleProperties({ plan_type: data.tier });
    } catch {
      // Network error — ignore
    }
  }, []);

  useEffect(() => {
    // Restore session from localStorage
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s) fetchProfile();
    });

    // Listen for auth changes — only update session/user, don't re-fetch profile
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (event === "PASSWORD_RECOVERY") {
        // Recovery session — don't fetch profile, the reset-password page handles this
      } else if (event === "SIGNED_IN") {
        // Fresh sign-in — run the pending/claim sweep BEFORE fetchProfile so
        // /auth/me returns the final state (profile bootstrapped from DME or
        // quiz funnel, structured fields backfilled, onboarding_completed_at
        // flipped when the currently required onboarding fields are populated).
        // Without this
        // await, /me races the sweep and the onboarding modal pops with
        // empty fields asking for data the funnel just collected.
        //
        // Mixpanel alias/identify is handled inside fetchProfile() to ensure
        // alias runs before identify (otherwise the anonymous ID never gets linked)
        (async () => {
          let recoveredAuthHandoff = false;
          if (typeof window !== "undefined") {
            recoveredAuthHandoff = promoteStoredTourStateToPostAuthResume({
              localStorage: window.localStorage,
              sessionStorage: window.sessionStorage,
            });
            if (recoveredAuthHandoff && hasPendingSignup(window.sessionStorage)) {
              analytics.track("Auth Handoff Recovery Triggered", {
                source: "signed_in_event",
                recovered_phase: "joyride",
              });
            }
          }
          try {
            await claimPendingMessages();
          } catch (e) {
            console.warn("[auth] post-signin pending claim failed", e);
          }
          // Belt-and-suspenders: if the user landed back on /dme step 10 and
          // we have an intake_id in sessionStorage, fire the direct claim
          // too. Idempotent server-side.
          try {
            const intakeId = (typeof window !== "undefined")
              ? sessionStorage.getItem("elena_dme_intake_id")
              : null;
            if (intakeId) {
              const res = await apiFetch(`/dme/intake/${intakeId}/claim`, { method: "POST" });
              if (res.ok) {
                try { sessionStorage.removeItem("elena_dme_intake_id"); } catch {}
                try { localStorage.setItem("elena_post_intake_submit", "dme"); } catch {}
              }
            }
          } catch (e) {
            console.warn("[auth] direct DME claim failed", e);
          }
          fetchProfile();
        })();
      } else if (event === "SIGNED_OUT") {
        setProfileId(null);
        setProfiles([]);
        setProfileData(null);
        setDoctors([]);
        setCareVisits([]);
        setSubscription(null);
        setInsuranceCards([]);
        setTodos([]); setTodayTodos([]);
        setHabits([]);
        setHabitCompletions({});
        setProfileDetailsLoaded(false);
        profileFetchedRef.current = false;
        try { sessionStorage.removeItem("elena_me_cache"); sessionStorage.removeItem("elena_profile_details"); } catch {}
      }
      // TOKEN_REFRESHED, USER_UPDATED, etc. — do nothing, just keep the session
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Eagerly fetch profile details as soon as profileId is available (and on profile switch)
  const prevProfileIdForFetch = useRef<string | null>(null);
  useEffect(() => {
    if (profileId && profileId !== prevProfileIdForFetch.current) {
      // profileDetailsLoaded was set to false in switchProfile (or is false on initial load),
      // so fetchProfileDetails will run
      fetchProfileDetails();
    }
    prevProfileIdForFetch.current = profileId;
  }, [profileId, fetchProfileDetails]);

  // Preload profile photos so they display instantly in the switcher dropdown
  useEffect(() => {
    for (const p of profiles) {
      if (p.profile_picture_url) {
        const img = new Image();
        img.src = p.profile_picture_url;
      }
    }
  }, [profiles]);

  const updateProfilePicture = useCallback((url: string | null) => {
    setProfileData((prev) =>
      prev ? { ...prev, profilePictureUrl: url } : prev,
    );
  }, []);

  const toggleTodo = useCallback(async (id: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
          : t,
      ) as CareTodo[],
    );
    setTodayTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
          : t,
      ) as CareTodo[],
    );
    const todo = todos.find((t) => t.id === id);
    const todayTodo = todayTodos.find((t) => t.id === id);
    const previousStatus = todo?.status || todayTodo?.status || "pending";
    const newStatus = todo?.status === "completed" ? "pending" : "completed";
    try {
      await apiFetch(`/todos/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert on failure
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: previousStatus } : t,
        ) as CareTodo[],
      );
      setTodayTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: previousStatus } : t,
        ) as CareTodo[],
      );
    }
  }, [todos, todayTodos]);

  const toggleHabit = useCallback(async (id: string) => {
    const today = formatLocalDateKey(new Date());
    setHabitCompletions((prev) => {
      const next = { ...prev };
      const todaySet = new Set(next[today] || []);
      if (todaySet.has(id)) todaySet.delete(id);
      else todaySet.add(id);
      next[today] = todaySet;
      return next;
    });
    try {
      await apiFetch("/habits/completions", {
        method: "POST",
        body: JSON.stringify({ habit_id: id, completed_date: today }),
      });
    } catch {}
  }, []);

  const createTodo = useCallback(async (data: CareTodoCreate): Promise<CareTodo | null> => {
    try {
      const res = await apiFetch("/todos", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const created: CareTodo = await res.json();
      setTodos((prev) => [...prev, created]);
      // Also add to todayTodos if it's a daily habit or due today
      const today = new Date().toISOString().split("T")[0];
      if (created.frequency === "daily" || created.due_date === today || !created.due_date) {
        setTodayTodos((prev) => [...prev, created]);
      }
      analytics.track("todo_created", {
        source: "manual",
        created_from: "web",
        todo_kind: created.frequency === "daily" ? "daily" : "care",
        category: created.category,
        frequency: created.frequency,
        has_due_time: !!created.due_time,
        has_start_date: !!created.due_date,
        canonical_step: "task_added",
        step_label: "Task Added",
      });
      return created;
    } catch {
      return null;
    }
  }, []);

  const updateTodo = useCallback(async (id: string, data: Partial<CareTodoCreate> & { status?: string }) => {
    try {
      const res = await apiFetch(`/todos/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const updated: CareTodo = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setTodayTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      analytics.track("todo_updated", {
        source: "manual",
        created_from: "web",
        todo_kind: updated.frequency === "daily" ? "daily" : "care",
        category: updated.category,
        frequency: updated.frequency,
        update_type: data.status ? "status_change" : "content_edit",
        canonical_step: "task_updated",
        step_label: "Task Updated",
      });
    } catch {
      // silent
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    const existing = todos.find((t) => t.id === id) || todayTodos.find((t) => t.id === id) || null;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setTodayTodos((prev) => prev.filter((t) => t.id !== id));
    analytics.track("todo_deleted", {
      source: "manual",
      created_from: "web",
      todo_kind: existing?.frequency === "daily" ? "daily" : "care",
      category: existing?.category,
      canonical_step: "task_removed",
      step_label: "Task Removed",
    });
    try {
      await apiFetch(`/todos/${id}`, { method: "DELETE" });
    } catch {
      // Already removed from UI
    }
  }, [todos, todayTodos]);

  const refreshTodos = useCallback(async () => {
    try {
      const [allRes, todayRes] = await Promise.all([
        apiFetch("/todos?include_future=true"),
        apiFetch("/todos"),
      ]);
      if (allRes.ok) setTodos(await allRes.json());
      if (todayRes.ok) setTodayTodos(await todayRes.json());
    } catch {}
  }, []);

  const refreshDoctors = useCallback(async () => {
    if (!profileId) return;
    try {
      const res = await apiFetch(`/profile/${profileId}/doctors`);
      if (!res.ok) return;
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch {}
  }, [profileId]);

  const refreshVisits = useCallback(async () => {
    try {
      const res = await apiFetch("/care-visits");
      if (!res.ok) return;
      const data: CareVisit[] = await res.json();
      setCareVisits(data);
    } catch {}
  }, []);

  const refreshProfiles = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me");
      if (!res.ok) return;
      const data: MeResponse = await res.json();
      const { active, primary } = selectBackendActiveProfile(data);
      setProfiles(data.profiles || []);
      setHasMobileApp(!!data.has_mobile_app);
      setProfileId(active?.id || data.profile_id || null);
      setNeedsOnboarding(!(data.onboarding_completed || hasCompletedRequiredOnboardingFields(primary)));
      setProfileData((prev) => ({
        firstName: active?.first_name || "",
        lastName: active?.last_name || "",
        email: data.email || prev?.email || "",
        profilePictureUrl: active?.profile_picture_url || null,
        dob: active?.date_of_birth || null,
        zipCode: active?.zip_code || null,
      }));
      // Also keep the cached /auth/me fresh so the next page load sees the
      // new profile in the dropdown immediately.
      try { sessionStorage.setItem("elena_me_cache", JSON.stringify(data)); } catch {}
    } catch {}
  }, [selectBackendActiveProfile, setProfileId]);

  const refreshInsurance = useCallback(async () => {
    try {
      const res = await apiFetch("/insurance/cards");
      if (!res.ok) return;
      const data = await res.json();
      const cards: InsuranceCard[] = [];
      for (const [cardType, record] of Object.entries(data)) {
        if (record && typeof record === "object") {
          const r = record as Record<string, unknown>;
          const structured: Record<string, string | null> = {};
          for (const [k, v] of Object.entries(r)) {
            if (k === "id" || k === "profile_id" || k === "created_at" || k === "updated_at"
                || k.endsWith("_s3_key") || k.endsWith("_s3_url")) continue;
            structured[k] = v != null ? String(v) : null;
          }
          cards.push({
            id: r.id as string | undefined,
            card_type: cardType,
            structured_data: structured,
            front_url: (r.front_s3_url as string) || null,
            back_url: (r.back_s3_url as string) || null,
          });
        }
      }
      setInsuranceCards(cards);
    } catch {}
  }, []);

  const refreshHabits = useCallback(async () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 12 * 7); // 12 weeks back to match mobile
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 7);
    const startStr = formatLocalDateKey(startDate);
    const endStr = formatLocalDateKey(endDate);
    try {
      const [habitsRes, completionsRes] = await Promise.all([
        apiFetch("/habits"),
        apiFetch(`/habits/completions?start_date=${startStr}&end_date=${endStr}`),
      ]);
      if (habitsRes.ok) {
        const data: Habit[] = await habitsRes.json();
        setHabits(data);
      }
      if (completionsRes.ok) {
        const raw = await completionsRes.json();
        const byDate: Record<string, Set<string>> = {};
        // API returns array of {id, habit_id, completed_date}
        if (Array.isArray(raw)) {
          for (const row of raw as { habit_id: string; completed_date: string }[]) {
            const dateKey = row.completed_date;
            if (!byDate[dateKey]) byDate[dateKey] = new Set();
            byDate[dateKey].add(row.habit_id);
          }
        } else {
          // Legacy format: {habit_id: {date: true}}
          for (const [habitId, dates] of Object.entries(raw as Record<string, Record<string, boolean>>)) {
            for (const [dateKey, done] of Object.entries(dates)) {
              if (done) {
                if (!byDate[dateKey]) byDate[dateKey] = new Set();
                byDate[dateKey].add(habitId);
              }
            }
          }
        }
        setHabitCompletions(byDate);
      }
    } catch {}
  }, []);

  const completeOnboarding = useCallback(async (data: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    home_address?: string;
  }) => {
    try {
      const attribution = getStoredAttribution();
      const createRes = await apiFetch("/profile", {
        method: "POST",
        body: JSON.stringify({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          date_of_birth: data.date_of_birth || "",
          zip_code: data.home_address || "",
          email: profileData?.email || "",
          ...(attribution?.ref ? { referral_code: attribution.ref } : {}),
          ...(attribution?.utm_source ? { utm_source: attribution.utm_source } : {}),
          ...(attribution?.utm_medium ? { utm_medium: attribution.utm_medium } : {}),
          ...(attribution?.utm_campaign ? { utm_campaign: attribution.utm_campaign } : {}),
          ...(attribution?.utm_content ? { utm_content: attribution.utm_content } : {}),
          ...(attribution?.utm_term ? { utm_term: attribution.utm_term } : {}),
        }),
      });
      if (createRes.ok) {
        const created = await createRes.json();
        console.log("[onboarding] Profile created:", { id: created.profile_id || created.id, first_name: created.first_name, last_name: created.last_name, picture_url: created.profile_picture_url });
        // For meta-sourced signups the server also fires CAPI CompleteRegistration with
        // event_id = meta_event_id. Persist it so trackActivation's fbq fire can reuse
        // the same eventID — Meta dedupes pixel+CAPI on matching (event_name, event_id).
        if (typeof created.meta_event_id === "string" && created.meta_event_id.length > 0) {
          try { localStorage.setItem("elena_meta_event_id", created.meta_event_id); } catch {}
        }
        setProfileId(created.profile_id || created.id);
        setProfileData((prev) => {
          const pictureUrl = created.profile_picture_url || prev?.profilePictureUrl || null;
          console.log("[onboarding] Setting profileData:", { firstName: created.first_name || data.first_name, pictureUrl, prevPicture: prev?.profilePictureUrl });
          return {
            firstName: created.first_name || data.first_name || "",
            lastName: created.last_name || data.last_name || "",
            email: prev?.email || "",
            profilePictureUrl: pictureUrl,
          };
        });
        setNeedsOnboarding(false);
        setOnboardingJustCompleted(true);
        localStorage.setItem("elena_onboarding_done", "1");
        // Everything below this line is fire-and-forget. The modal has already
        // unmounted (needsOnboarding=false) and the critical profile state is
        // set — we don't block the UI on LLM todo generation, invite acceptance,
        // or ad pixel fires, since each can take seconds.
        void apiFetch("/auth/complete-onboarding", { method: "POST" }).catch(() => {});

        // Generate the 3 core game plan todos (same as mobile onboarding).
        // LLM call — fire-and-forget; todos populate into state when ready.
        void (async () => {
          try {
            const genRes = await apiFetch("/todos/generate", {
              method: "POST",
              body: JSON.stringify({
                date_of_birth: data.date_of_birth || "",
                generate_habits: false,
              }),
            });
            if (genRes.ok) {
              const generated = await genRes.json();
              setTodos(generated);
              setTodayTodos(generated);
            }
          } catch (e) {
            console.error("[onboarding] Failed to generate todos:", e);
          }
        })();

        // Accept pending invite (invite-link signup flow) — fire-and-forget.
        const pendingInvite = localStorage.getItem("elena_pending_invite");
        if (pendingInvite) {
          void (async () => {
            try {
              const acceptRes = await apiFetch(`/family/invite/${pendingInvite}/accept`, { method: "POST" });
              if (acceptRes.ok) {
                localStorage.removeItem("elena_pending_invite");
                profileFetchedRef.current = false;
                await fetchProfile();
                localStorage.setItem("elena_invite_accepted", "1");
              }
            } catch {}
          })();
        }

        // Fire ad pixel CompleteRegistration — fire-and-forget.
        void (async () => {
          const { data: { session: pixelSession } } = await supabase.auth.getSession();
          const pixelProvider = pixelSession?.user?.app_metadata?.provider || "email";
          const { trackSignup } = await import('@/lib/tracking-events');
          trackSignup(pixelProvider, pixelSession?.user?.id, profileData?.email || undefined);
        })();
      } else {
        const errText = await createRes.text().catch(() => "");
        console.error("[onboarding] POST /profile failed:", createRes.status, errText);
        // Still dismiss the modal so the user isn't stuck
        setNeedsOnboarding(false);
        setOnboardingJustCompleted(true);
        localStorage.setItem("elena_onboarding_done", "1");
      }
    } catch (err) {
      console.error("[onboarding] Error:", err);
      // Still dismiss so user isn't stuck, but keep the post-onboarding
      // handoff alive so /chat can mount the walkthrough + recovery UI.
      setNeedsOnboarding(false);
      setOnboardingJustCompleted(true);
      localStorage.setItem("elena_onboarding_done", "1");
    }
  }, [profileData?.email]);

  const switchProfile = useCallback(async (newProfileId: string) => {
    if (!newProfileId || newProfileId === profileId) return;

    const targetProfile = profiles.find((p) => p.id === newProfileId) || null;
    const previousProfileData = profileData;

    // Invalidate any in-flight fetch so stale data isn't applied
    profileFetchVersionRef.current += 1;
    setIsSwitchingProfile(true);

    if (targetProfile) {
      setProfileData((prev) => ({
        firstName: targetProfile.first_name || "",
        lastName: targetProfile.last_name || "",
        email: prev?.email || user?.email || "",
        profilePictureUrl: targetProfile.profile_picture_url || null,
        dob: targetProfile.date_of_birth || null,
        zipCode: targetProfile.zip_code || null,
      }));
    }

    // Clear all cached data and allow re-fetch
    setProfileDetailsLoaded(false);
    profileDetailsFetchingRef.current = false;
    try { sessionStorage.removeItem("elena_profile_details"); } catch {}
    setDoctors([]);
    setCareVisits([]);
    setInsuranceCards([]);
    setTodos([]);
    setHabits([]);
    setHabitCompletions({});

    try {
      const switchRes = await apiFetch(`/profiles/${newProfileId}/switch`, { method: "PUT" });
      if (!switchRes.ok) {
        console.error("[auth] Failed to persist profile switch", switchRes.status);
        setProfileData(previousProfileData);
        return;
      }
      // Update the client-side active profile immediately before any follow-up
      // fetches. apiFetch injects X-Profile-Id from localStorage, so without
      // this refreshProfiles() can ask /auth/me using the stale previous
      // profile header and appear to "switch back" in the UI.
      setProfileId(newProfileId);
      await refreshProfiles();
    } catch (err) {
      console.error("[auth] Failed to persist profile switch", err);
      setProfileData(previousProfileData);
    } finally {
      setIsSwitchingProfile(false);
    }
  }, [profileData, profileId, profiles, refreshProfiles, setProfileId, user?.email]);

  const signIn = useCallback(
    async (email: string, password: string, options?: { source?: string }) => {
      storeAuthIntent("signin", options?.source);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string, options?: { source?: string }) => {
      storeAuthIntent("signup", options?.source);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/chat` },
      });
      // Signup Completed is tracked in fetchProfile() to avoid duplicates
      return { error: error?.message ?? null };
    },
    [],
  );

  const signInWithGoogle = useCallback(async (redirectTo?: string, options?: { intent?: "signup" | "signin"; source?: string }) => {
    storeAuthIntent(options?.intent || "signin", options?.source);
    const resolvedRedirectTo =
      redirectTo
      || `${window.location.origin}/${options?.intent === "signup" ? "onboard" : "chat"}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: resolvedRedirectTo },
    });
    return { error: error?.message ?? null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const res = await apiFetch("/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({
          email,
          redirect_to: `${window.location.origin}/reset-password`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { error: data.detail || "Something went wrong. Please try again." };
      }
      return { error: null };
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, []);

  const signInWithApple = useCallback(async (redirectTo?: string, options?: { intent?: "signup" | "signin"; source?: string }) => {
    storeAuthIntent(options?.intent || "signin", options?.source);
    const resolvedRedirectTo =
      redirectTo
      || `${window.location.origin}/${options?.intent === "signup" ? "onboard" : "chat"}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: resolvedRedirectTo },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    analytics.reset();
    await supabase.auth.signOut();
    // Clear all account-scoped localStorage to prevent stale data on re-login
    localStorage.removeItem("elena_active_profile_id");
    localStorage.removeItem("elena_onboarding_done");
    localStorage.removeItem("elena_pending_query");
    setSession(null);
    setUser(null);
    setProfileId(null);
    setProfiles([]);
    setHasMobileApp(false);
    setProfileData(null);
    setNeedsOnboarding(false);
    setProfileChecked(false);
    setDoctors([]);
    setCareVisits([]);
    setSubscription(null);
    setInsuranceCards([]);
    setTodos([]);
    setHabits([]);
    setHabitCompletions({});
    setProfileDetailsLoaded(false);
    profileFetchedRef.current = false;
  }, [setProfileId]);

  const clearOnboardingJustCompleted = useCallback(() => {
    setOnboardingJustCompleted(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        profileId,
        profiles,
        switchProfile,
        isSwitchingProfile,
        profileData,
        hasMobileApp,
        doctors,
        careVisits,
        subscription,
        insuranceCards,
        todos,
        todayTodos,
        habits,
        habitCompletions,
        toggleHabit,
        toggleTodo,
        createTodo,
        updateTodo,
        deleteTodo,
        refreshTodos,
        refreshDoctors,
        refreshVisits,
        refreshProfiles,
        refreshInsurance,
        refreshHabits,
        needsOnboarding,
        profileChecked,
        onboardingJustCompleted,
        clearOnboardingJustCompleted,
        completeOnboarding,
        profileDetailsLoaded,
        fetchProfileDetails,
        refreshSubscription,
        updateProfilePicture,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
