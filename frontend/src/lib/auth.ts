"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  devUserId: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [isConfigured] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(getSupabaseClient());
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(getSupabaseClient());
  });

  const [devUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    let token = localStorage.getItem("ylw_dev_user_token");
    if (!token) {
      token = `dev-user-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("ylw_dev_user_token", token);
    }
    return token;
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    // Retrieve initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state transitions (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  }, []);

  return {
    user,
    session,
    loading,
    isConfigured,
    devUserId,
    signIn,
    signUp,
    signOut,
  };
}
