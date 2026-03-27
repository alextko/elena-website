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
import type { MeResponse, DoctorItem, CareVisit, CareTodo, CareTodoCreate, SubscriptionResponse, InsuranceCard } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profileId: string | null;
  profileData: { firstName: string; lastName: string; email: string; profilePictureUrl?: string | null } | null;
  updateProfilePicture: (url: string | null) => void;
  // Cached profile popover data
  doctors: DoctorItem[];
  careVisits: CareVisit[];
  credits: number | null;
  subscription: SubscriptionResponse | null;
  insuranceCards: InsuranceCard[];
  todos: CareTodo[];
  toggleTodo: (id: string) => Promise<void>;
  createTodo: (data: CareTodoCreate) => Promise<CareTodo | null>;
  updateTodo: (id: string, data: Partial<CareTodoCreate> & { status?: string }) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
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
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string | null;
  } | null>(null);

  // Cached profile popover data — persists across sidebar toggles
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [careVisits, setCareVisits] = useState<CareVisit[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [insuranceCards, setInsuranceCards] = useState<InsuranceCard[]>([]);
  const [todos, setTodos] = useState<CareTodo[]>([]);
  const [profileDetailsLoaded, setProfileDetailsLoaded] = useState(false);

  const profileFetchedRef = useRef(false);

  // Fetch basic profile info (name, profileId) — called once on session restore
  const fetchProfile = useCallback(async () => {
    if (profileFetchedRef.current) return;
    profileFetchedRef.current = true;

    try {
      const res = await apiFetch("/auth/me");
      if (!res.ok) return;
      const data: MeResponse = await res.json();
      setProfileId(data.profile_id);

      const primary = data.profiles.find((p) => p.is_primary);
      if (primary) {
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
    if (profileDetailsLoaded) return;

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
          setCredits(data.credits_remaining);
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
      setCredits(data.credits_remaining);
      setSubscription(data);
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
      } else if (event === "SIGNED_OUT") {
        setProfileId(null);
        setProfileData(null);
        setDoctors([]);
        setCareVisits([]);
        setCredits(null);
        setSubscription(null);
        setInsuranceCards([]);
        setTodos([]);
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
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfileId(null);
    setProfileData(null);
    setDoctors([]);
    setCareVisits([]);
    setCredits(null);
    setSubscription(null);
    setInsuranceCards([]);
    setTodos([]);
    setProfileDetailsLoaded(false);
    profileFetchedRef.current = false;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        profileId,
        profileData,
        doctors,
        careVisits,
        credits,
        subscription,
        insuranceCards,
        todos,
        toggleTodo,
        createTodo,
        updateTodo,
        deleteTodo,
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
