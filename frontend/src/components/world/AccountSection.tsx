"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function AccountSection() {
  const { user, loading, isConfigured, devUserId, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError(null);
    setAuthSuccess(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setAuthSuccess("Account created! Please check your email for confirmation.");
      } else {
        await signIn(email, password);
        setAuthSuccess("Welcome back to your sanctuary.");
      }
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setAuthError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-4 border-t border-[#252A34] text-xs text-[#9D978C] italic">
        Consulting sanctuary keys...
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-[#252A34] space-y-3">
      <span className="block text-base font-serif text-[#EAE6DF] font-medium">
        🗝️ Account &amp; Sanctuary Identity
      </span>

      {!isConfigured ? (
        <div className="bg-[#14161C] border border-[#2B303C] rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#9D978C]">Mode</span>
            <span className="px-2 py-0.5 rounded-full bg-[#2B303C]/60 text-[#EAE6DF] font-mono text-[11px]">
              Local Standalone (Offline)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9D978C]">Dev Identifier</span>
            <span className="font-mono text-[#86A868] text-[11px] truncate max-w-[200px]">
              {devUserId || "dev-user"}
            </span>
          </div>
          <p className="text-[#9D978C]/70 text-[11px] pt-1 border-t border-[#2B303C]/40">
            Cloud authentication is inactive. Configure Supabase in <code className="text-[#EAE6DF]">.env.local</code> to enable verified multi-device sessions.
          </p>
        </div>
      ) : user ? (
        <div className="bg-[#14161C] border border-[#2B303C] rounded-2xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#9D978C]">Account</span>
            <span className="text-[#EAE6DF] font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9D978C]">Status</span>
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Verified Session
            </span>
          </div>
          <div className="pt-2 border-t border-[#2B303C]/40 flex justify-end">
            <button
              type="button"
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-xl border border-[#2B303C] hover:border-rose-800/60 bg-[#1A1D24] text-[#9D978C] hover:text-rose-300 text-xs transition-colors"
            >
              Sign Out of Sanctuary
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-[#14161C] border border-[#2B303C] rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#2B303C]/40">
            <span className="text-[#9D978C] font-medium">
              {isSignUp ? "Create Sanctuary Account" : "Sign In with Supabase"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className="text-[#86A868] hover:underline text-[11px]"
            >
              {isSignUp ? "Have an account? Sign In" : "New? Create Account"}
            </button>
          </div>

          <div>
            <label className="block text-[#9D978C] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868]"
            />
          </div>

          <div>
            <label className="block text-[#9D978C] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868]"
            />
          </div>

          {authError && (
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/50 text-rose-300 text-[11px]">
              {authError}
            </div>
          )}

          {authSuccess && (
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-[11px]">
              {authSuccess}
            </div>
          )}

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-[#86A868] hover:bg-[#729256] text-white font-medium text-xs shadow transition-all disabled:opacity-50"
            >
              {submitting ? "Entering..." : isSignUp ? "Create Sanctuary" : "Enter Sanctuary"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
