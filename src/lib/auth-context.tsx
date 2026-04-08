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
import { getStoredAttribution } from "@/lib/attribution";
import * as analytics from "@/lib/analytics";
import type { MeResponse, DoctorItem, CareVisit, CareTodo, CareTodoCreate, Habit, SubscriptionResponse, InsuranceCard, ProfileSummary } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profileId: string | null;
  profiles: ProfileSummary[];
  switchProfile: (profileId: string) => Promise<void>;
  profileData: { firstName: string; lastName: string; email: string; profilePictureUrl?: string | null } | null;
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
  refreshInsurance: () => Promise<void>;
  refreshHabits: () => Promise<void>;
  needsOnboarding: boolean;
  profileChecked: boolean;
  onboardingJustCompleted: boolean;
  completeOnboarding: (data: { first_name?: string; last_name?: string; date_of_birth?: string; home_address?: string }) => Promise<void>;
  profileDetailsLoaded: boolean;
  fetchProfileDetails: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: string | null }>;
  signInWithApple: (redirectTo?: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
  const [profileData, setProfileData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string | null;
  } | null>(null);

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

  // Fetch basic profile info (name, profileId) — called once on session restore
  const fetchProfile = useCallback(async () => {
    if (profileFetchedRef.current) return;
    profileFetchedRef.current = true;

    try {
      const res = await apiFetch("/auth/me");
      if (!res.ok) {
        console.warn("[auth] /auth/me failed with status", res.status);
        profileFetchedRef.current = false; // allow retry
        setProfileChecked(true); // unblock UI even on failure
        return;
      }
      const data: MeResponse = await res.json();

      console.log("[auth] /auth/me response:", { has_profile: data.has_profile, profile_id: data.profile_id, email: data.email });

      // Identify user in Mixpanel
      const { data: { session: currentSessionForProvider } } = await supabase.auth.getSession();
      const provider = currentSessionForProvider?.user?.app_metadata?.provider || "email";

      // New user with no profile - show onboarding popup
      // Use has_profile from backend as source of truth (not localStorage which is per-browser)
      if (!data.has_profile) {
        analytics.alias(currentSessionForProvider?.user?.id || "");
        analytics.identify(currentSessionForProvider?.user?.id || "", {
          $email: data.email,
          has_profile: false,
          plan_type: "free",
        });
        analytics.track("Signup Completed", { method: provider });
        // Fire ad pixel events (TikTok, Reddit, Meta) via trackSignup
        import('@/lib/tracking-events').then(({ trackSignup }) => {
          trackSignup(provider, currentSessionForProvider?.user?.id, data.email || undefined);
        });
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

      // Restore the previously-selected profile from localStorage (survives refresh)
      const savedProfileId = localStorage.getItem("elena_active_profile_id");
      const savedProfile = savedProfileId
        ? (data.profiles || []).find((p) => p.id === savedProfileId)
        : null;
      const activeProfile = savedProfile
        || (data.profiles || []).find((p) => p.is_primary)
        || null;

      setProfileId(activeProfile?.id || data.profile_id);

      const primary = (data.profiles || []).find((p) => p.is_primary);
      if (primary) {
        analytics.identify(currentSessionForProvider?.user?.id || "", {
          $email: data.email,
          $name: `${primary.first_name} ${primary.last_name}`.trim(),
          has_profile: true,
          plan_type: "free",
        });
        analytics.track("Login Completed", { method: provider });
      }

      if (activeProfile) {
        setProfileData({
          firstName: activeProfile.first_name,
          lastName: activeProfile.last_name,
          email: data.email || "",
          profilePictureUrl: activeProfile.profile_picture_url || null,
        });
      } else {
        setProfileData({
          firstName: "",
          lastName: "",
          email: data.email || "",
          profilePictureUrl: null,
        });
      }
    } catch (e) {
      // Network error — profile data is optional
      console.warn("[auth] fetchProfile error:", e);
      profileFetchedRef.current = false; // allow retry
      setProfileChecked(true); // unblock UI even on error
    }
  }, []);

  // Fetch detailed profile data (doctors, appointments, credits) — called lazily
  const fetchProfileDetails = useCallback(async () => {
    if (profileDetailsLoaded || profileDetailsFetchingRef.current) return;
    profileDetailsFetchingRef.current = true;
    const fetchVersion = profileFetchVersionRef.current;

    // Collect all results first, then apply atomically (prevents stale data on profile switch)
    let doctorsResult: DoctorItem[] | null = null;
    let visitsResult: CareVisit[] | null = null;
    let todosResult: CareTodo[] | null = null;
    let todayTodosResult: CareTodo[] | null = null;
    let habitsResult: Habit[] | null = null;
    let completionsResult: Record<string, Set<string>> | null = null;
    let insuranceResult: InsuranceCard[] | null = null;
    let subscriptionResult: SubscriptionResponse | null = null;

    const promises: Promise<void>[] = [];

    if (profileId) {
      promises.push(
        apiFetch(`/profile/${profileId}/doctors`)
          .then(async (res) => {
            if (!res.ok) return;
            const data = await res.json();
            doctorsResult = data.doctors || [];
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/care-visits")
          .then(async (res) => {
            if (!res.ok) return;
            visitsResult = await res.json();
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/todos?include_future=true")
          .then(async (res) => {
            if (!res.ok) return;
            todosResult = await res.json();
          })
          .catch(() => {}),
      );
      promises.push(
        apiFetch("/todos")
          .then(async (res) => {
            if (!res.ok) return;
            todayTodosResult = await res.json();
          })
          .catch(() => {}),
      );

      // Habits + completions (8 weeks back for calendar strip checkmarks)
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 12 * 7); // 12 weeks back to match mobile
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + 7);
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);

      promises.push(
        apiFetch("/habits")
          .then(async (res) => {
            if (!res.ok) return;
            habitsResult = await res.json();
          })
          .catch(() => {}),
      );
      promises.push(
        apiFetch(`/habits/completions?start_date=${startStr}&end_date=${endStr}`)
          .then(async (res) => {
            if (!res.ok) return;
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
            completionsResult = byDate;
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/insurance/cards")
          .then(async (res) => {
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
            insuranceResult = cards;
          })
          .catch(() => {}),
      );
    }

    promises.push(
      apiFetch("/web/subscription")
        .then(async (res) => {
          if (!res.ok) return;
          subscriptionResult = await res.json();
        })
        .catch(() => {}),
    );

    await Promise.all(promises);

    // Bail if the profile was switched while we were fetching — prevents stale data
    if (profileFetchVersionRef.current !== fetchVersion) {
      profileDetailsFetchingRef.current = false;
      return;
    }

    // Apply all results atomically
    if (doctorsResult !== null) setDoctors(doctorsResult);
    if (visitsResult !== null) setCareVisits(visitsResult);
    if (todosResult !== null) setTodos(todosResult);
    if (todayTodosResult !== null) setTodayTodos(todayTodosResult);
    if (habitsResult !== null) setHabits(habitsResult);
    if (completionsResult !== null) setHabitCompletions(completionsResult);
    if (insuranceResult !== null) setInsuranceCards(insuranceResult);
    if (subscriptionResult !== null) setSubscription(subscriptionResult);
    setProfileDetailsLoaded(true);
  }, [profileId, profileDetailsLoaded]);

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
        // Fresh sign-in — fetch profile if not already done
        // Mixpanel alias/identify is handled inside fetchProfile() to ensure
        // alias runs before identify (otherwise the anonymous ID never gets linked)
        fetchProfile();
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
      }
      // TOKEN_REFRESHED, USER_UPDATED, etc. — do nothing, just keep the session
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Eagerly re-fetch all profile data when profileId changes (after a profile switch)
  const prevProfileIdForFetch = useRef<string | null>(null);
  useEffect(() => {
    if (profileId && prevProfileIdForFetch.current !== null && profileId !== prevProfileIdForFetch.current) {
      // profileDetailsLoaded was set to false in switchProfile, so fetchProfileDetails will run
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
    const todo = todos.find((t) => t.id === id);
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
          t.id === id ? { ...t, status: todo?.status || "pending" } : t,
        ) as CareTodo[],
      );
    }
  }, [todos]);

  const toggleHabit = useCallback(async (id: string) => {
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local time
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
    } catch {
      // silent
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await apiFetch(`/todos/${id}`, { method: "DELETE" });
    } catch {
      // Already removed from UI
    }
  }, []);

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
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);
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
        // Mark onboarding complete on backend
        await apiFetch("/auth/complete-onboarding", { method: "POST" }).catch(() => {});
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
      // Still dismiss so user isn't stuck
      setNeedsOnboarding(false);
      localStorage.setItem("elena_onboarding_done", "1");
    }
  }, [profileData?.email]);

  const switchProfile = useCallback(async (newProfileId: string) => {
    // Update UI immediately (optimistic) — don't wait for the network call
    setProfileId(newProfileId);

    const profile = profiles.find((p) => p.id === newProfileId);
    if (profile) {
      setProfileData((prev) => ({
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: prev?.email || "",
        profilePictureUrl: profile.profile_picture_url,
      }));
    }

    // Invalidate any in-flight fetch so stale data isn't applied
    profileFetchVersionRef.current += 1;

    // Clear all cached data and allow re-fetch
    setProfileDetailsLoaded(false);
    profileDetailsFetchingRef.current = false;
    setDoctors([]);
    setCareVisits([]);
    setInsuranceCards([]);
    setTodos([]);
    setHabits([]);
    setHabitCompletions({});

    // Persist the switch to the backend in the background (non-blocking)
    apiFetch(`/profiles/${newProfileId}/switch`, { method: "PUT" }).catch(() => {
      console.error("[auth] Failed to persist profile switch");
    });
  }, [profiles, setProfileId]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
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

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo || `${window.location.origin}/chat` },
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

  const signInWithApple = useCallback(async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: redirectTo || `${window.location.origin}/chat` },
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

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        profileId,
        profiles,
        switchProfile,
        profileData,
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
        refreshInsurance,
        refreshHabits,
        needsOnboarding,
        profileChecked,
        onboardingJustCompleted,
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
