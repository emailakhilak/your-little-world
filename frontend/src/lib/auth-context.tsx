"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase/client";
import { setCachedAuthToken } from "./api";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needEmailVerification?: boolean }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string, redirectTo?: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => ({}),
  signOut: async () => {},
  resetPasswordForEmail: async () => {},
  updatePassword: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getSupabaseClient()));

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setCachedAuthToken(initialSession?.access_token ?? null);
      })
      .catch((err) => {
        console.error("Error reading initial auth session:", err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setCachedAuthToken(currentSession?.access_token ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Authentication service is unavailable.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("We couldn't find a world with that email and password combination.");
      }
      if (error.message.includes("Email not confirmed")) {
        throw new Error("Please verify your email address to open your world.");
      }
      throw new Error(error.message);
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setCachedAuthToken(data.session.access_token);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Authentication service is unavailable.");
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        throw new Error("A world already exists for this email. Try entering instead.");
      }
      if (error.message.includes("Password should be")) {
        throw new Error("Please choose a password with at least 6 characters.");
      }
      throw new Error(error.message);
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setCachedAuthToken(data.session.access_token);
      return { needEmailVerification: false };
    }

    return { needEmailVerification: true };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setSession(null);
    setUser(null);
    setCachedAuthToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("ylw_dev_user_token");
    }
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string, redirectTo?: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Authentication service is unavailable.");
    }
    const defaultRedirect =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectTo || defaultRedirect,
    });

    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        throw new Error("Too many requests. Please wait a moment before trying again.");
      }
      throw new Error(error.message);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Authentication service is unavailable.");
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      if (error.message.includes("Password should be")) {
        throw new Error("Please choose a password with at least 6 characters.");
      }
      throw new Error(error.message);
    }

    if (data.user) {
      setUser(data.user);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPasswordForEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
