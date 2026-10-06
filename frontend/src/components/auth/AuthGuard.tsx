"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!isLoading) {
      if (!session && !isPublicRoute) {
        // If there's a local dev token stored in localStorage (standalone dev testing), allow it
        const hasDevToken =
          typeof window !== "undefined" &&
          Boolean(localStorage.getItem("ylw_dev_user_token"));

        if (!hasDevToken) {
          router.replace("/login");
        }
      }
    }
  }, [session, isLoading, isPublicRoute, router]);

  if (isLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-[#8E8E93] flex flex-col items-center justify-center select-none font-sans">
        <span className="text-sm font-doodle text-[#77777D] animate-pulse">
          ~ entering your world ~
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
