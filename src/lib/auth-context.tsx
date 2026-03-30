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
  todos: CareTodo[];
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
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
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
  const [todos, setTodos] = useState<CareTodo[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<Record<string, Set<string>>>({});
  const [profileDetailsLoaded, setProfileDetailsLoaded] = useState(false);
  const profileDetailsFetchingRef = useRef(false);
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
      if (!res.ok) return;
      const data: MeResponse = await res.json();

      console.log("[auth] /auth/me response:", { has_profile: data.has_profile, profile_id: data.profile_id, email: data.email });

      // Identify user in Mixpanel
      const { data: { session: currentSessionForProvider } } = await supabase.auth.getSession();
      const provider = currentSessionForProvider?.user?.app_metadata?.provider || "email";

      // New user with no profile - show onboarding popup (only once ever)
      if (!data.has_profile && !localStorage.getItem("elena_onboarding_done")) {
        analytics.alias(currentSessionForProvider?.user?.id || "");
        analytics.identify(currentSessionForProvider?.user?.id || "", {
          $email: data.email,
          has_profile: false,
          plan_type: "free",
        });
        analytics.track("Signup Completed", { method: provider });
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
          const createRes = await apiFetch("/profile", {
            method: "POST",
            body: JSON.stringify({ email: data.email || "" }),
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
      setProfileId(data.profile_id);
      setProfiles(data.profiles || []);

      const primary = data.profiles.find((p) => p.is_primary);
      if (primary) {
        analytics.identify(currentSessionForProvider?.user?.id || "", {
          $email: data.email,
          $name: `${primary.first_name} ${primary.last_name}`.trim(),
          has_profile: true,
          plan_type: "free",
        });
        analytics.track("Login Completed", { method: provider });

        setProfileData({
          firstName: primary.first_name,
          lastName: primary.last_name,
          email: data.email || "",
          profilePictureUrl: primary.profile_picture_url || null,
        });
      } else {
        setProfileData({
          firstName: "",
          lastName: "",
          email: data.email || "",
          profilePictureUrl: null,
        });
      }
    } catch {
      // Network error — profile data is optional
      profileFetchedRef.current = false; // allow retry
    }
  }, []);

  // Fetch detailed profile data (doctors, appointments, credits) — called lazily
  const fetchProfileDetails = useCallback(async () => {
    if (profileDetailsLoaded || profileDetailsFetchingRef.current) return;
    profileDetailsFetchingRef.current = true;

    const promises: Promise<void>[] = [];

    if (profileId) {
      promises.push(
        apiFetch(`/profile/${profileId}/doctors`)
          .then(async (res) => {
            if (!res.ok) return;
            const data = await res.json();
            setDoctors(data.doctors || []);
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/care-visits")
          .then(async (res) => {
            if (!res.ok) return;
            const data: CareVisit[] = await res.json();
            setCareVisits(data);
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/todos")
          .then(async (res) => {
            if (!res.ok) return;
            const data: CareTodo[] = await res.json();
            setTodos(data);
          })
          .catch(() => {}),
      );

      // Habits + week completions (for calendar strip checkmarks)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const startDate = monday.toISOString().slice(0, 10);
      const endDate = sunday.toISOString().slice(0, 10);

      promises.push(
        apiFetch("/habits")
          .then(async (res) => {
            if (!res.ok) return;
            const data: Habit[] = await res.json();
            setHabits(data);
          })
          .catch(() => {}),
      );
      promises.push(
        apiFetch(`/habits/completions?start_date=${startDate}&end_date=${endDate}`)
          .then(async (res) => {
            if (!res.ok) return;
            const data: Record<string, Record<string, boolean>> = await res.json();
            // data shape: { "habit_id": { "YYYY-MM-DD": true }, ... }
            // Convert to: { "YYYY-MM-DD": Set<habit_id> }
            const byDate: Record<string, Set<string>> = {};
            for (const [habitId, dates] of Object.entries(data)) {
              for (const [dateKey, done] of Object.entries(dates)) {
                if (done) {
                  if (!byDate[dateKey]) byDate[dateKey] = new Set();
                  byDate[dateKey].add(habitId);
                }
              }
            }
            setHabitCompletions(byDate);
          })
          .catch(() => {}),
      );

      promises.push(
        apiFetch("/insurance/cards")
          .then(async (res) => {
            if (!res.ok) return;
            const data = await res.json();
            // API returns { medical: {id, provider, plan_name, ...flat fields}, dental: {...}, ... }
            const cards: InsuranceCard[] = [];
            for (const [cardType, record] of Object.entries(data)) {
              if (record && typeof record === "object") {
                const r = record as Record<string, unknown>;
                // Fields are flat on the record — treat the whole record as structured_data
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
          })
          .catch(() => {}),
      );
    }

    promises.push(
      apiFetch("/web/subscription")
        .then(async (res) => {
          if (!res.ok) return;
          const data: SubscriptionResponse = await res.json();
          setSubscription(data);
        })
        .catch(() => {}),
    );

    await Promise.all(promises);
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

      if (event === "SIGNED_IN") {
        // Fresh sign-in — fetch profile if not already done
        fetchProfile();

        // Identify user in Mixpanel and track OAuth signups
        if (s?.user) {
          import('@/lib/tracking-events').then(({ identifyUser, trackSignup }) => {
            identifyUser(s.user.id, s.user.email || undefined);

            // Check if this is a brand-new OAuth signup (created within last 60 seconds)
            const createdAt = new Date(s.user.created_at);
            const now = new Date();
            const isNewUser = (now.getTime() - createdAt.getTime()) < 60000;
            if (isNewUser) {
              const provider = s.user.app_metadata?.provider || 'unknown';
              trackSignup(provider, s.user.id, s.user.email || undefined);
            }
          });
        }
      } else if (event === "SIGNED_OUT") {
        setProfileId(null);
        setProfiles([]);
        setProfileData(null);
        setDoctors([]);
        setCareVisits([]);
        setSubscription(null);
        setInsuranceCards([]);
        setTodos([]);
        setHabits([]);
        setHabitCompletions({});
        setProfileDetailsLoaded(false);
        profileFetchedRef.current = false;
      }
      // TOKEN_REFRESHED, USER_UPDATED, etc. — do nothing, just keep the session
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

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
    const today = new Date().toISOString().slice(0, 10);
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
      const res = await apiFetch("/todos");
      if (!res.ok) return;
      const data: CareTodo[] = await res.json();
      setTodos(data);
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
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startDate = monday.toISOString().slice(0, 10);
    const endDate = sunday.toISOString().slice(0, 10);
    try {
      const [habitsRes, completionsRes] = await Promise.all([
        apiFetch("/habits"),
        apiFetch(`/habits/completions?start_date=${startDate}&end_date=${endDate}`),
      ]);
      if (habitsRes.ok) {
        const data: Habit[] = await habitsRes.json();
        setHabits(data);
      }
      if (completionsRes.ok) {
        const data: Record<string, Record<string, boolean>> = await completionsRes.json();
        const byDate: Record<string, Set<string>> = {};
        for (const [habitId, dates] of Object.entries(data)) {
          for (const [dateKey, done] of Object.entries(dates)) {
            if (done) {
              if (!byDate[dateKey]) byDate[dateKey] = new Set();
              byDate[dateKey].add(habitId);
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
      const createRes = await apiFetch("/profile", {
        method: "POST",
        body: JSON.stringify({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          date_of_birth: data.date_of_birth || "",
          zip_code: data.home_address || "",
          email: profileData?.email || "",
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
    try {
      const res = await apiFetch(`/profiles/${newProfileId}/switch`, { method: "PUT" });
      if (!res.ok) return;
      setProfileId(newProfileId);

      // Update profileData from the profiles list
      const profile = profiles.find((p) => p.id === newProfileId);
      if (profile) {
        setProfileData((prev) => ({
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: prev?.email || "",
          profilePictureUrl: profile.profile_picture_url,
        }));
      }

      // Clear all cached data and allow re-fetch
      setProfileDetailsLoaded(false);
      profileDetailsFetchingRef.current = false;
      setDoctors([]);
      setCareVisits([]);
      setInsuranceCards([]);
      setTodos([]);
      setHabits([]);
      setHabitCompletions({});
    } catch {
      console.error("[auth] Failed to switch profile");
    }
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
      const { error } = await supabase.auth.signUp({ email, password });
      if (!error) {
        const { trackSignup } = await import('@/lib/tracking-events');
        trackSignup('email', undefined, email);
      }
      return { error: error?.message ?? null };
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/chat` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithApple = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/chat` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    analytics.reset();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfileId(null);
    setProfiles([]);
    setProfileData(null);
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
