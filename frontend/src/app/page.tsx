"use client";

import { useEffect, useState } from "react";
import WorldScene from "@/components/world/WorldScene";
import { getBackendHealth, HealthCheckResponse } from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

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
    <main className="min-h-screen px-4 py-8 sm:py-12 md:py-16 flex flex-col justify-between items-center relative overflow-hidden">
      {/* Central Living Room Environment */}
      <WorldScene />

      {/* Discreet Atmospheric Sanctuary Status Seal in Footer */}
      <footer className="mt-8 text-center text-xs text-[#8C7A6B] flex items-center justify-center space-x-3 select-none">
        <span className="font-serif italic">Your Little World</span>
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
    </main>
  );
}
