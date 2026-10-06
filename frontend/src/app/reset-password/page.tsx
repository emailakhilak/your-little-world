"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";

function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(() => Boolean(getSupabaseClient()));
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    // Check if recovery session or token is active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasValidSession(true);
      }
      setIsCheckingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasValidSession(true);
      }
      setIsCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please choose a new password.");
      return;
    }

    if (password.length < 6) {
      setError("Please choose a password with at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updatePassword(password);
      setIsSuccess(true);
      setTimeout(() => {
        router.replace("/");
      }, 2000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to update password. Your recovery link may have expired.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0E0E10] text-[#EAE6DF] flex flex-col justify-center items-center px-4 py-8 select-text font-sans">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Subtle doodle star icon */}
        <div className="mb-3 text-[#8E8E93] text-lg select-none" aria-hidden="true">
          ✦
        </div>

        {/* Minimal Title */}
        <h1 className="font-serif text-2xl tracking-wide text-[#EAE6DF] font-medium mb-1 text-center">
          YOUR LITTLE WORLD
        </h1>

        {/* Quiet Subtitle */}
        <p className="text-xs font-doodle text-[#8E8E93] tracking-wide mb-8 text-center">
          inscribe a new key for your sanctuary
        </p>

        {isCheckingAuth ? (
          <div className="py-12 text-center text-xs font-doodle text-[#77777D] animate-pulse">
            ~ verifying recovery link ~
          </div>
        ) : isSuccess ? (
          <div className="w-full flex flex-col items-center gap-6">
            <div
              role="status"
              className="w-full p-4 rounded-lg border border-[#2B3B2B] bg-[#141C14] text-[#A3D9A5] text-xs font-doodle text-center leading-relaxed"
            >
              ~ your key has been renewed ~
            </div>
            <p className="text-xs font-doodle text-[#77777D] text-center leading-relaxed">
              Entering your little world in a moment...
            </p>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-lg border border-[#2B2B32] hover:border-[#8E8E93] bg-[#1A1A1E] text-xs font-doodle text-[#EAE6DF] transition-colors"
            >
              Enter Now →
            </Link>
          </div>
        ) : !hasValidSession ? (
          <div className="w-full flex flex-col items-center gap-6">
            <div
              role="alert"
              className="w-full p-4 rounded-lg border border-[#442226] bg-[#1F1416] text-[#E58E97] text-xs font-doodle text-center leading-relaxed"
            >
              This recovery link is invalid or has expired. Please request a new recovery link.
            </div>
            <Link
              href="/forgot-password"
              className="px-4 py-2.5 rounded-lg border border-[#2B2B32] hover:border-[#8E8E93] bg-[#1A1A1E] text-xs font-doodle text-[#EAE6DF] transition-colors"
            >
              Request New Key →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="p-3 rounded border border-[#442226] bg-[#1F1416] text-[#E58E97] text-xs font-doodle text-center leading-relaxed"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="new-password"
                className="text-xs font-doodle text-[#8E8E93] px-1"
              >
                New Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="at least 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#2B2B32] bg-[#141417] text-sm text-[#EAE6DF] placeholder-[#55555B] focus:outline-none focus:border-[#8E8E93] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 p-1 text-[#77777D] hover:text-[#EAE6DF] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-xs cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm-new-password"
                className="text-xs font-doodle text-[#8E8E93] px-1"
              >
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="repeat your new password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#2B2B32] bg-[#141417] text-sm text-[#EAE6DF] placeholder-[#55555B] focus:outline-none focus:border-[#8E8E93] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 p-1 text-[#77777D] hover:text-[#EAE6DF] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-xs cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 px-4 py-3 rounded-lg border border-[#2B2B32] hover:border-[#8E8E93] bg-[#1A1A1E] hover:bg-[#222228] text-sm font-doodle tracking-wide text-[#EAE6DF] hover:text-[#FFFFFF] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
            >
              {isSubmitting ? "Renewing..." : "Update My Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
