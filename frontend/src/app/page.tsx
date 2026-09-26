"use client";

import { useEffect, useState } from "react";
import { getBackendHealth, HealthCheckResponse } from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);

  const checkConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBackendHealth();
      setHealth(data);
      setLastPingTime(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to connect to FastAPI backend at http://localhost:8000");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    getBackendHealth()
      .then((data) => {
        if (!isCancelled) {
          setHealth(data);
          setLastPingTime(new Date().toLocaleTimeString());
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to connect to FastAPI backend at http://localhost:8000"
          );
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen p-6 md:p-12 flex flex-col items-center justify-center max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-[#2C2A29] mb-3">
          Your Little World
        </h1>
        <p className="text-[#6E655F] text-base md:text-lg max-w-xl mx-auto">
          Phase 0: Development Foundation & System Verification
        </p>
      </div>

      {/* Main Status Parchment Card */}
      <div className="w-full bg-[#F7F3EC] border border-[#E6DED2] rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between pb-6 border-b border-[#E6DED2]">
          <div>
            <h2 className="text-xl font-medium text-[#2C2A29]">
              Frontend ↔ Backend Communication
            </h2>
            <p className="text-sm text-[#6E655F] mt-1">
              Verifying real-time handshake between Next.js (port 3000) and FastAPI (port 8000)
            </p>
          </div>
          <button
            onClick={checkConnection}
            disabled={loading}
            className="px-4 py-2 bg-[#2C2A29] text-[#FDFBF7] text-sm rounded-lg hover:bg-[#443E3B] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Checking..." : "Re-check Connection"}
          </button>
        </div>

        {/* Live Ping Results */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E6DED2]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6E655F]">
              FastAPI Backend Status
            </span>
            <div className="mt-2 flex items-center space-x-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  health?.status === "healthy"
                    ? "bg-emerald-600"
                    : health?.status === "degraded"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />
              <span className="font-medium text-[#2C2A29]">
                {loading
                  ? "Pinging..."
                  : health
                  ? `${health.app_name} (${health.status})`
                  : "Unreachable (Start backend on port 8000)"}
              </span>
            </div>
            {health && (
              <p className="text-xs text-[#6E655F] mt-2">
                Version: {health.version} | Environment: {health.environment}
              </p>
            )}
            {error && (
              <p className="text-xs text-rose-700 mt-2 bg-rose-50 p-2 rounded border border-rose-200">
                {error}
              </p>
            )}
          </div>

          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E6DED2]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6E655F]">
              Database Connectivity
            </span>
            <div className="mt-2 flex items-center space-x-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  health?.database?.status === "connected"
                    ? "bg-emerald-600"
                    : "bg-amber-500"
                }`}
              />
              <span className="font-medium text-[#2C2A29]">
                {loading
                  ? "Checking..."
                  : health?.database?.status === "connected"
                  ? `Connected (${health.database.dialect})`
                  : health
                  ? `Pending configuration (${health.database?.error || "Check DATABASE_URL"})`
                  : "Awaiting backend connection"}
              </span>
            </div>
            <p className="text-xs text-[#6E655F] mt-2">
              Target: Supabase PostgreSQL (SQLAlchemy Async + Alembic)
            </p>
          </div>
        </div>

        {/* Phase 0 Architecture Checklist */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6E655F] mb-3">
            Phase 0 Foundation Checklist
          </h3>
          <ul className="space-y-2 text-sm text-[#2C2A29]">
            <li className="flex items-center space-x-2">
              <span className="text-emerald-700">✓</span>
              <span>Next.js 15+ App Router, React 19, TypeScript</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-700">✓</span>
              <span>Tailwind CSS v4 with cozy aesthetic tokens</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-700">✓</span>
              <span>FastAPI Backend + Pydantic Settings</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-700">✓</span>
              <span>SQLAlchemy 2.0 Async + Alembic migration configuration</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-700">✓</span>
              <span>Supabase JWT Auth verification dependency (`/api/v1/auth/me`)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-700">✓</span>
              <span>Pluggable AI provider abstraction contract (`LLMProvider`)</span>
            </li>
          </ul>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-[#E6DED2] flex items-center justify-between text-xs text-[#6E655F]">
          <span>Ready for Phase 1 (The Living Room Scene)</span>
          {lastPingTime && <span>Last checked at {lastPingTime}</span>}
        </div>
      </div>
    </main>
  );
}
