"use client";

import { useState, useEffect, useCallback, useId, useRef } from "react";
import Link from "next/link";
import {
  fetchDiaryEntryByDate,
  upsertDiaryEntry,
  DiaryEntry,
} from "@/lib/api";
import SleepingDoodleBear from "@/components/moon/SleepingDoodleBear";

const MONTHS = [
  { value: 1, name: "January" },
  { value: 2, name: "February" },
  { value: 3, name: "March" },
  { value: 4, name: "April" },
  { value: 5, name: "May" },
  { value: 6, name: "June" },
  { value: 7, name: "July" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "October" },
  { value: 11, name: "November" },
  { value: 12, name: "December" },
];

function getLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLongDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function MoonRoomPage() {
  const timeInputId = useId();
  const daySelectId = useId();
  const monthSelectId = useId();
  const yearSelectId = useId();

  // Automatic today's date
  const [todayStr] = useState<string>(() => getLocalDateStr());

  // Today's entry state
  const [todayContent, setTodayContent] = useState<string>("");
  const [todayTime, setTodayTime] = useState<string>("");
  const [isLoadingToday, setIsLoadingToday] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showBearAnimation, setShowBearAnimation] = useState<boolean>(false);

  // Past Entries Date Selector visibility (toggled in normal document flow)
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState<boolean>(false);

  // Date Selector Form State (defaults to yesterday)
  const [selDay, setSelDay] = useState<number>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.getDate();
  });
  const [selMonth, setSelMonth] = useState<number>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.getMonth() + 1;
  });
  const [selYear, setSelYear] = useState<number>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.getFullYear();
  });

  // Dynamic Diary Content Area View State: "today" | "past"
  const [contentMode, setContentMode] = useState<"today" | "past">("today");
  const [viewedPastDate, setViewedPastDate] = useState<string>("");
  const [viewedPastEntry, setViewedPastEntry] = useState<DiaryEntry | null>(null);
  const [isLoadingPast, setIsLoadingPast] = useState<boolean>(false);
  const pastEntriesCache = useRef<Record<string, DiaryEntry | null>>({});

  // Load Today's Diary on initial mount
  useEffect(() => {
    let cancelled = false;
    async function loadToday() {
      setIsLoadingToday(true);
      try {
        const entry = await fetchDiaryEntryByDate(todayStr);
        if (!cancelled && entry) {
          pastEntriesCache.current[todayStr] = entry;
          setTodayContent((prev) => (prev.trim() ? prev : (entry.content || "")));
          // Only populate time if user previously entered it; do NOT force current time
          if (entry.entry_time) {
            setTodayTime((prev) => (prev.trim() ? prev : (entry.entry_time || "")));
          }
        }
      } catch (err) {
        console.error("Failed to load today's diary entry:", err);
      } finally {
        if (!cancelled) {
          setIsLoadingToday(false);
        }
      }
    }
    loadToday();
    return () => {
      cancelled = true;
    };
  }, [todayStr]);

  // Handle Save Today's Entry
  const handleSaveToday = async () => {
    if (!todayContent.trim()) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);

    try {
      const saved = await upsertDiaryEntry({
        entry_date: todayStr,
        content: todayContent.trim(),
        entry_time: todayTime.trim() || null,
      });

      pastEntriesCache.current[todayStr] = saved;
      // Show the sleeping bear animation ONLY after successful save
      setShowBearAnimation(true);
    } catch (err: unknown) {
      console.error("Save entry failed:", err);
      setShowBearAnimation(false);
      setSaveError(
        err instanceof Error ? err.message : "Could not save your thoughts right now."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle View Past Entry
  const handleViewPastEntry = async () => {
    const targetDateStr = `${selYear}-${String(selMonth).padStart(2, "0")}-${String(selDay).padStart(2, "0")}`;

    // If user selected today's date, switch back to today's diary
    if (targetDateStr === todayStr) {
      setContentMode("today");
      return;
    }

    setViewedPastDate(targetDateStr);
    setContentMode("past");

    // Fast memory cache check
    if (pastEntriesCache.current[targetDateStr] !== undefined) {
      setViewedPastEntry(pastEntriesCache.current[targetDateStr]);
      setIsLoadingPast(false);
      return;
    }

    setIsLoadingPast(true);

    try {
      const entry = await fetchDiaryEntryByDate(targetDateStr);
      pastEntriesCache.current[targetDateStr] = entry;
      setViewedPastEntry(entry);
    } catch (err) {
      console.error("Failed to fetch past entry:", err);
      setViewedPastEntry(null);
    } finally {
      setIsLoadingPast(false);
    }
  };

  // Return to Today's Diary
  const handleReturnToToday = useCallback(() => {
    setContentMode("today");
  }, []);

  // Compute days in currently selected month and year
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

  return (
    <main className="min-h-screen bg-[#0E0E10] text-[#EAE6DF] flex flex-col items-center px-4 py-8 sm:py-12 select-text font-sans">
      {/* Discreet monochrome return link to living room */}
      <div className="w-full max-w-2xl flex justify-start mb-4">
        <Link
          href="/"
          className="text-xs font-doodle text-[#77777D] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-sm px-1 py-0.5"
          aria-label="Return to The Living Room"
        >
          <span>←</span>
          <span>living room</span>
        </Link>
      </div>

      {/* =========================================================================
          1. STATIC HEADER (Remains static throughout all interactions)
          ========================================================================= */}
      <header className="flex flex-col items-center text-center select-none mb-6">
        {/* Simple Hand-Drawn Doodle Moon */}
        <div className="w-12 h-12 flex items-center justify-center mb-1" aria-hidden="true">
          <svg
            viewBox="0 0 50 50"
            className="w-10 h-10"
            fill="none"
            stroke="#EAE6DF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Sketched crescent moon doodle */}
            <path d="M 33 8 C 22 10, 14 20, 16 32 C 18 42, 28 46, 38 42 C 26 42, 19 33, 20 22 C 21 14, 26 9, 33 8 Z" />
            {/* Subtle tiny starry speckle doodle */}
            <circle cx="36" cy="18" r="0.8" fill="#EAE6DF" />
            <circle cx="42" cy="24" r="0.6" fill="#A0A0A5" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-serif text-[#F5F5F5] font-normal tracking-wide">
          The Moon Room
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm font-doodle text-[#8E8E93] tracking-wider mt-1">
          A quiet place for your thoughts
        </p>

        {/* Subtle hand-drawn doodle separator */}
        <div className="w-40 sm:w-48 h-2 mt-3 flex items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 160 8" className="w-full h-full" fill="none">
            <path
              d="M 5 4 C 30 2, 55 6, 80 4 C 105 2, 130 6, 155 4"
              stroke="#2C2C32"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </header>

      {/* =========================================================================
          2. STATIC PAST ENTRIES CONTROL (Remains static throughout interaction)
          ========================================================================= */}
      <section
        className="w-full max-w-2xl flex flex-col items-center mb-4"
        aria-label="Past Entries Navigation"
      >
        <button
          type="button"
          onClick={() => setIsDateSelectorOpen((prev) => !prev)}
          aria-expanded={isDateSelectorOpen}
          aria-controls="past-entries-date-selector"
          className="group inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-dashed border-[#44444C] bg-[#141417] hover:border-[#D4D4D8] hover:bg-[#1A1A1E] text-xs sm:text-sm font-doodle text-[#CCCCCC] hover:text-[#FFFFFF] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
        >
          <span aria-hidden="true" className="text-xs">
            {isDateSelectorOpen ? "▲" : "▼"}
          </span>
          <span>Past Entries</span>
        </button>

        {/* =======================================================================
            3. PAST ENTRIES DATE SELECTOR (Expands naturally in document flow)
            Inserted ABOVE today's diary, naturally pushing it down without overlay
            ======================================================================= */}
        {isDateSelectorOpen && (
          <div
            id="past-entries-date-selector"
            className="w-full bg-[#141417] border border-[#2B2B32] rounded-2xl p-4 sm:p-5 mt-4 transition-all shadow-lg"
          >
            <h2 className="text-xs sm:text-sm font-doodle text-[#A1A1AA] mb-3 tracking-wide text-center sm:text-left">
              Select a past date
            </h2>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 sm:gap-4">
              {/* Day, Month, Year selects */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
                {/* Day */}
                <div className="flex flex-col gap-1">
                  <label htmlFor={daySelectId} className="text-[11px] font-doodle text-[#8E8E93]">
                    Day
                  </label>
                  <select
                    id={daySelectId}
                    value={selDay}
                    onChange={(e) => setSelDay(Number(e.target.value))}
                    className="bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-[#F0F0F0] font-sans focus:outline-none focus:border-[#D4D4D8] transition-colors cursor-pointer"
                  >
                    {dayOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div className="flex flex-col gap-1">
                  <label htmlFor={monthSelectId} className="text-[11px] font-doodle text-[#8E8E93]">
                    Month
                  </label>
                  <select
                    id={monthSelectId}
                    value={selMonth}
                    onChange={(e) => {
                      const newM = Number(e.target.value);
                      setSelMonth(newM);
                      // Keep day valid for changed month
                      const maxDays = new Date(selYear, newM, 0).getDate();
                      if (selDay > maxDays) setSelDay(maxDays);
                    }}
                    className="bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-2 py-1.5 text-xs sm:text-sm text-[#F0F0F0] font-sans focus:outline-none focus:border-[#D4D4D8] transition-colors cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div className="flex flex-col gap-1">
                  <label htmlFor={yearSelectId} className="text-[11px] font-doodle text-[#8E8E93]">
                    Year
                  </label>
                  <select
                    id={yearSelectId}
                    value={selYear}
                    onChange={(e) => setSelYear(Number(e.target.value))}
                    className="bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-2 py-1.5 text-xs sm:text-sm text-[#F0F0F0] font-sans focus:outline-none focus:border-[#D4D4D8] transition-colors cursor-pointer"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* View Entry Action Button */}
              <button
                type="button"
                onClick={handleViewPastEntry}
                disabled={isLoadingPast}
                className="px-4 py-2 rounded-xl border border-[#D4D4D8] bg-[#1C1C20] hover:bg-[#282830] text-xs sm:text-sm font-doodle text-[#FFFFFF] tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] disabled:opacity-50"
              >
                {isLoadingPast ? "Opening..." : "View Entry"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          4. DYNAMIC CONTENT AREA (Below Header and Past Entries Control)
          - If contentMode === "today": Shows Today's Diary (Date, Time, Writing Area, Bear, Save)
          - If contentMode === "past": Shows Selected Past Entry (Read-Only) or Gentle Empty State
          ========================================================================= */}
      <section className="w-full max-w-2xl flex flex-col gap-4">
        {contentMode === "today" ? (
          /* =======================================================================
             TODAY'S DIARY (Normal Document Flow)
             ======================================================================= */
          <div className="flex flex-col gap-4">
            {/* Today's Date and User-entered Time Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
              {/* Date: Automatically determined from current date */}
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-doodle text-[#8E8E93]">Date:</span>
                <span className="text-sm sm:text-base font-serif text-[#F0F0F0] tracking-wide">
                  {formatLongDate(todayStr)}
                </span>
              </div>

              {/* Time: Manual user input (not automatically forced) */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor={timeInputId}
                  className="text-xs font-doodle text-[#8E8E93] cursor-pointer"
                >
                  Time:
                </label>
                <div className="relative">
                  <input
                    id={timeInputId}
                    type="text"
                    value={todayTime}
                    onChange={(e) => setTodayTime(e.target.value)}
                    placeholder="10:30 PM"
                    className="bg-[#141417] border border-[#3E3E48] rounded-xl px-3 py-1 text-xs sm:text-sm text-[#F0F0F0] font-doodle placeholder-[#55555E] focus:outline-none focus:border-[#D4D4D8] w-28 sm:w-32 transition-colors text-center"
                    aria-label="User-controlled time input"
                  />
                </div>
              </div>
            </div>

            {/* Writing Area: Large editable writing area */}
            <div className="relative bg-[#141417] border border-[#2C2C32] rounded-3xl p-5 sm:p-8 shadow-2xl">
              {/* Subtle top-right quiet notebook annotation */}
              <div
                aria-hidden="true"
                className="absolute top-4 right-6 text-[11px] font-doodle text-[#55555E] select-none hidden sm:block"
              >
                · tonight&apos;s page ·
              </div>

              <textarea
                id="today-diary-textarea"
                value={todayContent}
                onChange={(e) => setTodayContent(e.target.value)}
                rows={14}
                placeholder={isLoadingToday ? "opening the quiet page..." : "Write your thoughts here..."}
                className="w-full bg-transparent text-sm sm:text-base text-[#EAE6DF] placeholder-[#55555E] leading-relaxed resize-y focus:outline-none font-serif tracking-wide min-h-[340px]"
                aria-label="Today's diary thoughts"
              />
            </div>

            {/* SLEEPING BEAR ANIMATION:
                Appears BELOW writing area AND ABOVE Save Entry button ONLY after successful save */}
            {showBearAnimation && (
              <SleepingDoodleBear onSettled={() => setShowBearAnimation(false)} />
            )}

            {/* Save Entry Footer Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-1">
              {/* Subtle error or info message */}
              <div className="text-xs font-doodle text-[#8E8E93]">
                {saveError ? (
                  <span className="text-[#D4A373]">{saveError}</span>
                ) : (
                  <span className="text-[#55555E]">Today I write. Tomorrow I remember.</span>
                )}
              </div>

              {/* Save Entry Button */}
              <button
                type="button"
                id="save-entry-button"
                onClick={handleSaveToday}
                disabled={isSaving || !todayContent.trim()}
                className="px-6 py-2 rounded-2xl border border-[#EDEDED] bg-[#1E1E24] hover:bg-[#2A2A32] text-xs sm:text-sm font-doodle text-[#FFFFFF] tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isSaving ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </div>
        ) : (
          /* =======================================================================
             READ-ONLY PAST ENTRY (Or Gentle Empty State)
             NO textarea, NO Save Entry button, NO Edit button
             ======================================================================= */
          <div className="flex flex-col gap-4">
            {/* Past Entry Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-doodle text-[#8E8E93]">Date:</span>
                <span className="text-sm sm:text-base font-serif text-[#F0F0F0] tracking-wide">
                  {formatLongDate(viewedPastDate)}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xs font-doodle text-[#8E8E93]">Time:</span>
                <span className="text-xs sm:text-sm font-doodle text-[#D4D4D8]">
                  {viewedPastEntry?.entry_time || "—"}
                </span>
              </div>
            </div>

            {/* Content Display: Read-Only Diary Page or Gentle Empty State */}
            {isLoadingPast ? (
              <div className="flex flex-col items-center justify-center bg-[#141417] border border-[#2C2C32] rounded-3xl p-10 sm:p-14 text-center select-none min-h-[260px]">
                <p className="font-serif italic text-sm text-[#77777D] tracking-wide">
                  opening the quiet page...
                </p>
              </div>
            ) : viewedPastEntry && viewedPastEntry.content.trim() ? (
              <article className="relative bg-[#141417] border border-[#2C2C32] rounded-3xl p-6 sm:p-9 shadow-2xl min-h-[300px]">
                {/* Subtle top-right past page indicator */}
                <div
                  aria-hidden="true"
                  className="absolute top-4 right-6 text-[11px] font-doodle text-[#55555E] select-none"
                >
                  · read-only memory ·
                </div>

                <div className="whitespace-pre-wrap font-serif text-sm sm:text-base text-[#EDEDED] leading-relaxed pt-2">
                  {viewedPastEntry.content}
                </div>
              </article>
            ) : (
              /* Gentle Empty State (Section 13) */
              <div className="flex flex-col items-center justify-center bg-[#141417] border border-[#2C2C32] rounded-3xl p-10 sm:p-14 text-center select-none min-h-[260px]">
                <div className="w-10 h-10 mb-2 flex items-center justify-center opacity-70">
                  <svg
                    viewBox="0 0 50 50"
                    className="w-8 h-8"
                    fill="none"
                    stroke="#A0A0A5"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 33 8 C 22 10, 14 20, 16 32 C 18 42, 28 46, 38 42 C 26 42, 19 33, 20 22 C 21 14, 26 9, 33 8 Z" />
                  </svg>
                </div>
                <p className="font-serif italic text-sm text-[#A0A0A5] tracking-wide">
                  🌙 No thoughts were recorded for this day.
                </p>
              </div>
            )}

            {/* Return to Today's Diary (Section 11) */}
            <div className="flex items-center justify-center sm:justify-start pt-2">
              <button
                type="button"
                onClick={handleReturnToToday}
                className="px-4 py-2 rounded-2xl border border-[#44444C] bg-[#141417] hover:border-[#EDEDED] hover:bg-[#1C1C20] text-xs sm:text-sm font-doodle text-[#CCCCCC] hover:text-[#FFFFFF] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
              >
                Write Today&apos;s Entry
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
