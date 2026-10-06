"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

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

export default function SignupPage() {
  const router = useRouter();
  const { signUp, session, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to home
  React.useEffect(() => {
    if (!isLoading && session) {
      router.replace("/");
    }
  }, [session, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please fill in all fields to build your world.");
      return;
    }

    if (password.length < 6) {
      setError("Your password should be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match. Please re-enter them carefully.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const res = await signUp(email, password);
      if (res.needEmailVerification) {
        setNotice(
          "We sent a quiet verification note to your email. Please check your inbox to enter your world."
        );
      } else {
        router.replace("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to create your world right now.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0E0E10] text-[#EAE6DF] flex flex-col justify-center items-center px-4 py-8 select-text font-sans">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Subtle doodle sprout icon */}
        <div className="mb-3 text-[#8E8E93] text-lg select-none" aria-hidden="true">
          🌱
        </div>

        {/* Title */}
        <h1 className="font-serif text-2xl tracking-wide text-[#EAE6DF] font-medium mb-1 text-center">
          YOUR LITTLE WORLD
        </h1>

        {/* Quiet Subtitle */}
        <p className="text-xs font-doodle text-[#8E8E93] tracking-wide mb-8 text-center">
          plant a new quiet space
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded border border-[#442226] bg-[#1F1416] text-[#E58E97] text-xs font-doodle text-center leading-relaxed"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="p-3 rounded border border-[#2B3B2B] bg-[#141C14] text-[#A3D9A5] text-xs font-doodle text-center leading-relaxed"
            >
              {notice}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-email"
              className="text-xs font-doodle text-[#8E8E93] px-1"
            >
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@somewhere.quiet"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B2B32] bg-[#141417] text-sm text-[#EAE6DF] placeholder-[#55555B] focus:outline-none focus:border-[#8E8E93] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-password"
              className="text-xs font-doodle text-[#8E8E93] px-1"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="signup-password"
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
              htmlFor="signup-confirm-password"
              className="text-xs font-doodle text-[#8E8E93] px-1"
            >
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="repeat your password"
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
            {isSubmitting ? "Planting..." : "Create My World"}
          </button>
        </form>

        {/* Link back to login */}
        <div className="mt-8 text-center">
          <p className="text-xs font-doodle text-[#77777D]">
            Already have a world?{" "}
            <Link
              href="/login"
              className="text-[#EAE6DF] hover:underline underline-offset-4 decoration-[#55555B] transition-colors"
            >
              Enter My World
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
