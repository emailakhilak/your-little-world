"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WorldScene from "@/components/world/WorldScene";
import SettingsModal from "@/components/world/SettingsModal";
import { getBackendHealth, HealthCheckResponse } from "@/lib/api";

export default function Home() {
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
    <main className="min-h-screen px-4 py-6 sm:py-10 flex flex-col justify-between items-center relative overflow-hidden">
      {/* Top Quiet Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2 select-none">
          <span className="text-lg">✦</span>
          <span className="font-serif text-sm tracking-wide text-[#EAE6DF]/90 font-medium">
            Your Little World
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/settings"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl border border-[#2B303C] hover:border-[#86A868]/50 bg-[#1A1D24]/60 text-[#9D978C] hover:text-[#EAE6DF] transition-all items-center gap-1.5"
          >
            <span>⚙️</span> Settings
          </Link>
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Open World Settings"
            className="sm:hidden w-8 h-8 rounded-xl border border-[#2B303C] bg-[#1A1D24]/60 text-sm flex items-center justify-center text-[#9D978C] hover:text-[#EAE6DF]"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Central Living Room Environment */}
      <div className="my-auto w-full flex items-center justify-center">
        <WorldScene />
      </div>

      {/* Discreet Atmospheric Sanctuary Status Seal in Footer */}
      <footer className="mt-8 text-center text-xs text-[#8C7A6B] flex items-center justify-center space-x-3 select-none">
        <button
          onClick={() => setShowSettings(true)}
          className="hover:text-[#EAE6DF] transition-colors font-serif italic"
        >
          World Preferences
        </button>
        <span>•</span>
        <span className="flex items-center space-x-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              health?.status === "healthy" ? "bg-emerald-600" : "bg-amber-600"
            }`}
          />
          <span className="text-[#8C7A6B]">
            {health?.status === "healthy" ? "Foundation Connected" : "Local Standalone"}
          </span>
        </span>
      </footer>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </main>
  );
}
