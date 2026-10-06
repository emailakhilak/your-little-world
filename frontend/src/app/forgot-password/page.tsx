"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please provide your email address.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await resetPasswordForEmail(email.trim());
      setIsSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to dispatch recovery note right now.";
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
          recover your key to enter
        </p>

        {isSuccess ? (
          <div className="w-full flex flex-col items-center gap-6">
            <div
              role="status"
              className="w-full p-4 rounded-lg border border-[#2B3B2B] bg-[#141C14] text-[#A3D9A5] text-xs font-doodle text-center leading-relaxed"
            >
              If a world exists for <strong className="text-[#EAE6DF] font-sans">{email.trim()}</strong>,
              a quiet key to reset your password has been sent. Please check your inbox.
            </div>

            <p className="text-xs font-doodle text-[#77777D] text-center leading-relaxed">
              Once you follow the link in your email, you will be invited to set a new password.
            </p>

            <Link
              href="/login"
              className="mt-2 text-xs font-doodle text-[#EAE6DF] hover:underline underline-offset-4 decoration-[#55555B] transition-colors"
            >
              ← Return to login
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
                htmlFor="reset-email"
                className="text-xs font-doodle text-[#8E8E93] px-1"
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@somewhere.quiet"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B2B32] bg-[#141417] text-sm text-[#EAE6DF] placeholder-[#55555B] focus:outline-none focus:border-[#8E8E93] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 px-4 py-3 rounded-lg border border-[#2B2B32] hover:border-[#8E8E93] bg-[#1A1A1E] hover:bg-[#222228] text-sm font-doodle tracking-wide text-[#EAE6DF] hover:text-[#FFFFFF] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
            >
              {isSubmitting ? "Dispatching..." : "Send Recovery Key"}
            </button>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-xs font-doodle text-[#77777D] hover:text-[#EAE6DF] transition-colors"
              >
                ← Return to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
