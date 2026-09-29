"use client";

import { useState, useEffect } from "react";
import { fetchUserPreferences, updateUserPreferences } from "@/lib/api";

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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [newsDailyUpdate, setNewsDailyUpdate] = useState(true);
  const [newsUpdateTime, setNewsUpdateTime] = useState("20:00");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

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

      // Apply reduced-motion class to document root if toggled
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sm text-[#9D978C] hover:text-[#EAE6DF]"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚙️</span>
          <h3 className="font-serif text-xl text-[#EAE6DF]">World Settings</h3>
        </div>
        <p className="text-xs text-[#9D978C] mb-6">
          Tune the quiet parameters of your digital sanctuary.
        </p>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#9D978C] font-serif italic">
            Retrieving your world ledger...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* Display Name */}
            <div>
              <label className="block text-[#9D978C] mb-1 font-medium">Display Name / Inscription</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Wanderer, Builder, Botanist..."
                className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868]"
              />
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-[#9D978C] mb-1 font-medium">
                Timezone (defaults to Asia/Kolkata)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#9D978C]/70 mt-1">
                Used for 8 PM Faraway Window editions and Garden reminders.
              </p>
            </div>

            {/* Faraway Window News Schedule */}
            <div className="pt-2 border-t border-[#252A34]">
              <span className="block text-[#EAE6DF] font-medium mb-2">🪟 Faraway Window Editions</span>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#9D978C]">Automated Daily Delivery</span>
                <input
                  type="checkbox"
                  checked={newsDailyUpdate}
                  onChange={(e) => setNewsDailyUpdate(e.target.checked)}
                  className="rounded border-[#2B303C] bg-[#14161C] text-[#86A868]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9D978C]">Delivery Time ({timezone})</span>
                <input
                  type="time"
                  value={newsUpdateTime}
                  onChange={(e) => setNewsUpdateTime(e.target.value)}
                  className="bg-[#14161C] border border-[#2B303C] rounded-lg px-2 py-1 text-xs text-[#EAE6DF]"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="pt-2 border-t border-[#252A34]">
              <span className="block text-[#EAE6DF] font-medium mb-2">🔔 Whispers &amp; Notifications</span>
              <div className="flex items-center justify-between">
                <span className="text-[#9D978C]">Garden &amp; Milestone Reminders</span>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="rounded border-[#2B303C] bg-[#14161C] text-[#86A868]"
                />
              </div>
            </div>

            {/* Accessibility: Reduced Motion */}
            <div className="pt-2 border-t border-[#252A34]">
              <span className="block text-[#EAE6DF] font-medium mb-2">🌿 Atmosphere &amp; Motion</span>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#9D978C] block">Reduced Motion Mode</span>
                  <span className="text-[10px] text-[#9D978C]/60">
                    Quiets continuous animations and smooths transitions.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="rounded border-[#2B303C] bg-[#14161C] text-[#86A868]"
                />
              </div>
            </div>

            {statusMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[11px] text-center">
                {statusMessage}
              </div>
            )}

            <div className="pt-4 border-t border-[#252A34] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#2B303C] text-[#9D978C] hover:text-[#EAE6DF]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#86A868] hover:bg-[#729256] text-white font-medium shadow"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
