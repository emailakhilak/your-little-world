"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorldScene from "@/components/world/WorldScene";
import SettingsModal from "@/components/world/SettingsModal";
import { getBackendHealth, HealthCheckResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    getBackendHealth()
      .then((data) => {
        if (!isCancelled) {
          setHealth(data);
        }
      })
      .catch(() => {
        // Silently handle if backend is starting up
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0E0E10] text-[#EAE6DF] px-4 py-6 sm:py-10 flex flex-col justify-between items-center relative select-text font-sans">
      {/* Top Quiet Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between z-10 mb-4 select-none px-4">
        <div className="flex items-center gap-2 select-none">
          <span className="text-xs font-doodle text-[#8E8E93]">✦</span>
          <span className="font-serif text-sm tracking-wide text-[#EAE6DF] font-medium">
            Your Little World
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/settings"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-full border border-[#2B2B32] hover:border-[#8E8E93] bg-[#141417] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-all items-center gap-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Open World Settings"
            className="sm:hidden px-2.5 py-1 rounded-full border border-[#2B2B32] bg-[#141417] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer"
          >
            ⚙️
          </button>
          <button
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            aria-label="Leave My World"
            title="Leave My World"
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-[#2B2B32] hover:border-[#8E8E93] bg-[#141417] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Central Living Room Environment */}
      <div className="my-auto w-full flex items-center justify-center">
        <WorldScene />
      </div>

      {/* Discreet Atmospheric Sanctuary Status Seal in Footer */}
      <footer className="mt-8 text-center text-xs font-doodle text-[#55555E] flex items-center justify-center space-x-3 select-none pb-2">
        <button
          onClick={() => setShowSettings(true)}
          className="hover:text-[#EAE6DF] transition-colors cursor-pointer"
        >
          world preferences
        </button>
        <span>•</span>
        <span className="flex items-center space-x-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              health?.status === "healthy" ? "bg-[#8E8E93]" : "bg-[#44444C]"
            }`}
          />
          <span>
            {health?.status === "healthy" ? "foundation connected" : "local standalone"}
          </span>
        </span>
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </main>
  );
}
