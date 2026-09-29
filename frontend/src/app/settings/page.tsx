"use client";

import { useState, useEffect } from "react";
import ReturnButton from "@/components/ui/ReturnButton";
import { fetchUserPreferences, updateUserPreferences } from "@/lib/api";
import AccountSection from "@/components/world/AccountSection";

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30) [Default]" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
];

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [newsDailyUpdate, setNewsDailyUpdate] = useState(true);
  const [newsUpdateTime, setNewsUpdateTime] = useState("20:00");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const data = await fetchUserPreferences();
        if (cancelled) return;
        setDisplayName(data.display_name || "");
        setTimezone(data.timezone || "Asia/Kolkata");
        setNewsDailyUpdate(data.news_daily_update);
        setNewsUpdateTime(data.news_update_time || "20:00");
        setNotificationsEnabled(data.notifications_enabled);
        setReducedMotion(data.reduced_motion);
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      await updateUserPreferences({
        display_name: displayName.trim() || null,
        timezone,
        news_daily_update: newsDailyUpdate,
        news_update_time: newsUpdateTime,
        notifications_enabled: notificationsEnabled,
        reduced_motion: reducedMotion,
      });
      setStatusMessage("World settings quietly saved.");

      if (typeof document !== "undefined") {
        if (reducedMotion) {
          document.documentElement.classList.add("reduced-motion");
        } else {
          document.documentElement.classList.remove("reduced-motion");
        }
      }

      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#13151A] text-[#EAE6DF] p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl flex items-center justify-between mb-8 pb-4 border-b border-[#2B303C]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1A1D24] border border-[#2B303C] flex items-center justify-center text-xl shadow-inner">
            ⚙️
          </div>
          <div>
            <h1 className="font-serif text-2xl text-[#EAE6DF] font-medium flex items-center gap-2">
              World Settings
            </h1>
            <p className="text-xs text-[#9D978C]">Personalize your sanctuary, timing, and atmosphere.</p>
          </div>
        </div>

        <ReturnButton />
      </div>

      <div className="w-full max-w-2xl bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-10 shadow-2xl">
        {loading ? (
          <div className="py-20 text-center font-serif text-sm italic text-[#9D978C]">
            Opening your world ledger...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 text-sm">
            {/* Display Name */}
            <div>
              <label className="block text-[#9D978C] mb-1.5 font-medium">Display Name / Inscription</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Wanderer, Builder, Botanist..."
                className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-4 py-2.5 text-sm text-[#EAE6DF] focus:outline-none focus:border-[#86A868]"
              />
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-[#9D978C] mb-1.5 font-medium">
                Timezone (defaults to Asia/Kolkata)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-4 py-2.5 text-sm text-[#EAE6DF] focus:outline-none focus:border-[#86A868]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#9D978C]/70 mt-1.5">
                Controls the 8 PM Faraway Window daily newspaper and Garden goal deadlines.
              </p>
            </div>

            {/* Faraway Window News Schedule */}
            <div className="pt-4 border-t border-[#252A34] space-y-3">
              <span className="block text-base font-serif text-[#EAE6DF] font-medium">
                🪟 Faraway Window Daily Delivery
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-[#9D978C] block">Automated Daily Newspaper</span>
                  <span className="text-xs text-[#9D978C]/60">
                    Curates an edition from your enabled sources.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newsDailyUpdate}
                  onChange={(e) => setNewsDailyUpdate(e.target.checked)}
                  className="rounded border-[#2B303C] bg-[#14161C] text-[#86A868] h-4 w-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#9D978C]">Delivery Time ({timezone})</span>
                <input
                  type="time"
                  value={newsUpdateTime}
                  onChange={(e) => setNewsUpdateTime(e.target.value)}
                  className="bg-[#14161C] border border-[#2B303C] rounded-lg px-3 py-1.5 text-sm text-[#EAE6DF]"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="pt-4 border-t border-[#252A34]">
              <span className="block text-base font-serif text-[#EAE6DF] font-medium mb-3">
                🔔 Whispers &amp; Notifications
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-[#9D978C] block">Reminders &amp; Daily Dispatches</span>
                  <span className="text-xs text-[#9D978C]/60">
                    Sends gentle whispers for Garden goals and Faraway Window daily editions.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="rounded border-[#2B303C] bg-[#14161C] text-[#86A868] h-4 w-4"
                />
              </div>
            </div>

            {/* Accessibility: Reduced Motion */}
            <div className="pt-4 border-t border-[#252A34]">
              <span className="block text-base font-serif text-[#EAE6DF] font-medium mb-3">
                🌿 Atmosphere &amp; Motion
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-[#9D978C] block">Reduced Motion Mode</span>
                  <span className="text-xs text-[#9D978C]/60">
                    Disables continuous ambient loops and calms transitions.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="rounded border-[#2B303C] bg-[#14161C] text-[#86A868] h-4 w-4"
                />
              </div>
            </div>

            {/* Account & Identity */}
            <AccountSection />

            {statusMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs text-center font-sans">
                {statusMessage}
              </div>
            )}

            <div className="pt-6 border-t border-[#252A34] flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#86A868] hover:bg-[#729256] text-white font-medium text-xs shadow-md transition-all"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
