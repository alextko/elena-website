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
import type { MeResponse, DoctorItem, AppointmentItem, SubscriptionResponse } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profileId: string | null;
  profileData: { firstName: string; lastName: string; email: string } | null;
  // Cached profile popover data
  doctors: DoctorItem[];
  appointments: AppointmentItem[];
  credits: number | null;
  profileDetailsLoaded: boolean;
  fetchProfileDetails: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
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
  } | null>(null);

  // Cached profile popover data — persists across sidebar toggles
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
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
        });
      } else {
        setProfileData({
          firstName: "",
          lastName: "",
          email: data.email || "",
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
        apiFetch("/appointments")
          .then(async (res) => {
            if (!res.ok) return;
            const data: AppointmentItem[] = await res.json();
            setAppointments(data);
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
        })
        .catch(() => {}),
    );

    await Promise.all(promises);
    setProfileDetailsLoaded(true);
  }, [profileId, profileDetailsLoaded]);

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
        setAppointments([]);
        setCredits(null);
        setProfileDetailsLoaded(false);
        profileFetchedRef.current = false;
      }
      // TOKEN_REFRESHED, USER_UPDATED, etc. — do nothing, just keep the session
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfileId(null);
    setProfileData(null);
    setDoctors([]);
    setAppointments([]);
    setCredits(null);
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
        appointments,
        credits,
        profileDetailsLoaded,
        fetchProfileDetails,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
