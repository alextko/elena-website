"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/apiFetch";
import type { MeResponse } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profileId: string | null;
  profileData: { firstName: string; lastName: string; email: string } | null;
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

  // Fetch profile info from backend after session is established
  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me");
      if (!res.ok) return;
      const data: MeResponse = await res.json();
      setProfileId(data.profile_id);

      // Get name from primary profile if available
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

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s) {
        fetchProfile();
      } else {
        setProfileId(null);
        setProfileData(null);
      }
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
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        profileId,
        profileData,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
