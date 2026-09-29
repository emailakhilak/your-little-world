"use client";

import { useState, useEffect, useCallback } from "react";
import ReturnButton from "@/components/ui/ReturnButton";
import {
  fetchDiaryEntryByDate,
  upsertDiaryEntry,
  deleteDiaryEntry,
  reflectOnDiaryEntry,
  fetchDiaryEntries,
  DiaryEntry,
  DiaryReflectionResponse,
} from "@/lib/api";

const MOODS = [
  { key: "peaceful", label: "Peaceful", icon: "🌙" },
  { key: "calm", label: "Calm", icon: "🌿" },
  { key: "contemplative", label: "Reflective", icon: "🕯️" },
  { key: "hopeful", label: "Hopeful", icon: "✨" },
  { key: "tired", label: "Restless / Tired", icon: "☁️" },
  { key: "heavy", label: "Heavy-hearted", icon: "🌧️" },
];

function getTodayStr() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export default function MoonPage() {
  const [currentDate, setCurrentDate] = useState<string>(getTodayStr());
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string>("peaceful");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"clean" | "dirty" | "saved" | "error">("clean");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Reflection modal
  const [isReflecting, setIsReflecting] = useState(false);
  const [reflection, setReflection] = useState<DiaryReflectionResponse | null>(null);
  const [reflectionError, setReflectionError] = useState<string | null>(null);

  // Search & Past Entries ledger
  const [viewMode, setViewMode] = useState<"editor" | "ledger">("editor");
  const [searchQuery, setSearchQuery] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState<DiaryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load entry for date
  const loadDateEntry = useCallback((dateStr: string) => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      setSaveStatus("clean");
      try {
        const data = await fetchDiaryEntryByDate(dateStr);
        if (cancelled) return;
        setEntry(data);
        if (data) {
          setTitle(data.title || "");
          setContent(data.content || "");
          setMood(data.mood || "peaceful");
          setTags(data.tags || []);
        } else {
          setTitle("");
          setContent("");
          setMood("peaceful");
          setTags([]);
        }
      } catch {
        if (cancelled) return;
        setEntry(null);
        setTitle("");
        setContent("");
        setMood("peaceful");
        setTags([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = loadDateEntry(currentDate);
    return () => cancel?.();
  }, [currentDate, loadDateEntry]);

  // Load ledger entries when switching to ledger view
  const loadLedger = useCallback((search?: string) => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsSearching(true);
      try {
        const res = await fetchDiaryEntries({ search, limit: 30 });
        if (cancelled) return;
        setLedgerEntries(res.items);
      } catch {
        if (cancelled) return;
        setLedgerEntries([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (viewMode === "ledger") {
      const cancel = loadLedger(searchQuery.trim() || undefined);
      return () => cancel?.();
    }
  }, [viewMode, searchQuery, loadLedger]);

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      const saved = await upsertDiaryEntry({
        entry_date: currentDate,
        title: title.trim() || null,
        content: content.trim(),
        mood: mood || null,
        tags,
      });
      setEntry(saved);
      setSaveStatus("saved");
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err: unknown) {
      console.error(err);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    try {
      await deleteDiaryEntry(entry.id);
      setEntry(null);
      setTitle("");
      setContent("");
      setMood("peaceful");
      setTags([]);
      setShowDeleteConfirm(false);
      setSaveStatus("clean");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReflect = async () => {
    if (!entry) return;
    setIsReflecting(true);
    setReflectionError(null);
    try {
      const res = await reflectOnDiaryEntry(entry.id);
      setReflection(res);
    } catch (err: unknown) {
      setReflectionError(err instanceof Error ? err.message : "Failed to obtain reflection");
    } finally {
      setIsReflecting(false);
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, "");
      if (!tags.includes(clean)) {
        setTags([...tags, clean]);
        setSaveStatus("dirty");
      }
      setTagInput("");
    }
  };

  const removeTag = (tToRemove: string) => {
    setTags(tags.filter((t) => t !== tToRemove));
    setSaveStatus("dirty");
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isToday = currentDate === getTodayStr();

  return (
    <main className="min-h-screen bg-[#13151A] text-[#EAE6DF] p-4 sm:p-8 flex flex-col items-center">
      {/* Ambient header bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 pb-4 border-b border-[#2B303C]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1A2234] border border-[#6275A4]/40 flex items-center justify-center text-xl shadow-inner">
            🌙
          </div>
          <div>
            <h1 className="font-serif text-2xl text-[#EAE6DF] font-medium flex items-center gap-2">
              The Moon Room
              <span className="text-xs font-doodle text-[#8B9BC2] font-normal tracking-wide">
                · private diary ·
              </span>
            </h1>
            <p className="text-xs text-[#9D978C]">
              Safe, quiet sanctuary for your candid feelings and nighttime reflections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === "editor" ? "ledger" : "editor")}
            className="px-3 py-1.5 rounded-xl border border-[#2B303C] hover:border-[#6275A4]/60 bg-[#1A1D24] text-xs font-sans text-[#EAE6DF] transition-all flex items-center gap-1.5"
            title="Browse past entries ledger"
          >
            {viewMode === "editor" ? "📖 Past Entries" : "✍️ Back to Diary"}
          </button>
          <ReturnButton />
        </div>
      </div>

      {viewMode === "ledger" ? (
        /* PAST ENTRIES LEDGER VIEW */
        <div className="w-full max-w-4xl bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-serif text-xl text-[#EAE6DF]">Memories & Reflections</h2>
              <p className="text-xs text-[#9D978C]">Search through your safe private history.</p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, feelings, words..."
                className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] placeholder-[#9D978C]/50 focus:outline-none focus:border-[#6275A4]"
              />
            </div>
          </div>

          {isSearching ? (
            <div className="py-16 text-center text-xs text-[#9D978C] font-serif italic">
              Leafing through the nighttime pages...
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-3xl block mb-2 opacity-50">🌙</span>
              <p className="font-serif italic text-sm text-[#9D978C]">
                {searchQuery ? "No entries match your search." : "Your ledger has no past entries yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ledgerEntries.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setCurrentDate(item.entry_date);
                    setViewMode("editor");
                  }}
                  className="p-4 rounded-2xl bg-[#14161C] border border-[#252A34] hover:border-[#6275A4]/50 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#8B9BC2] mb-1.5">
                      <span className="font-mono">{item.entry_date}</span>
                      <span>{item.mood ? MOODS.find((m) => m.key === item.mood)?.icon || "🌙" : "🌙"}</span>
                    </div>
                    <h3 className="font-serif text-sm text-[#EAE6DF] font-medium group-hover:text-[#8B9BC2] transition-colors line-clamp-1 mb-1">
                      {item.title || "Untitled Reflection"}
                    </h3>
                    <p className="text-xs text-[#9D978C] line-clamp-3 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#9D978C]/60 pt-2 border-t border-[#252A34]">
                    <span>{item.word_count} words</span>
                    <span className="text-[#8B9BC2]">Open page →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* DIARY EDITOR VIEW */
        <div className="w-full max-w-4xl flex flex-col gap-6">
          {/* Date Navigation & Mood Selector Banner */}
          <div className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            {/* Day Switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(shiftDate(currentDate, -1))}
                aria-label="Previous Day"
                className="w-8 h-8 rounded-lg bg-[#14161C] border border-[#2B303C] text-sm text-[#9D978C] hover:text-[#EAE6DF] hover:border-[#6275A4] flex items-center justify-center transition-colors"
              >
                ←
              </button>
              <div className="text-center px-3">
                <div className="font-serif text-base text-[#EAE6DF] font-medium">
                  {formatDateDisplay(currentDate)}
                </div>
                <div className="text-[11px] font-mono text-[#8B9BC2]">
                  {isToday ? "✦ Today's Sanctuary" : currentDate}
                </div>
              </div>
              <button
                onClick={() => setCurrentDate(shiftDate(currentDate, 1))}
                aria-label="Next Day"
                className="w-8 h-8 rounded-lg bg-[#14161C] border border-[#2B303C] text-sm text-[#9D978C] hover:text-[#EAE6DF] hover:border-[#6275A4] flex items-center justify-center transition-colors"
              >
                →
              </button>
              {!isToday && (
                <button
                  onClick={() => setCurrentDate(getTodayStr())}
                  className="ml-2 px-2.5 py-1 rounded-md text-[11px] bg-[#14161C] border border-[#6275A4]/40 text-[#8B9BC2] hover:bg-[#1A2234] transition-colors"
                >
                  Today
                </button>
              )}
            </div>

            {/* Mood picker */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-xs text-[#9D978C] mr-1 hidden sm:inline">Mood:</span>
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMood(m.key);
                    setSaveStatus("dirty");
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 border transition-all ${
                    mood === m.key
                      ? "bg-[#1A2234] border-[#6275A4] text-[#EAE6DF] shadow"
                      : "bg-[#14161C] border-transparent text-[#9D978C] hover:border-[#2B303C]"
                  }`}
                  title={m.label}
                >
                  <span>{m.icon}</span>
                  <span className="text-[11px]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Diary Paper Card */}
          <div className="bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-10 shadow-2xl relative">
            {/* Corner Candle Doodle */}
            <div
              aria-hidden="true"
              className="absolute top-6 right-8 text-xs font-doodle text-[#8B9BC2]/40 select-none hidden sm:block"
            >
              🕯️ candlelit solitude
            </div>

            {loading ? (
              <div className="py-24 text-center text-xs text-[#9D978C] font-serif italic">
                Drawing the night curtain...
              </div>
            ) : (
              <div>
                {/* Title */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSaveStatus("dirty");
                  }}
                  placeholder="Give tonight a quiet title (optional)..."
                  className="w-full bg-transparent font-serif text-xl sm:text-2xl text-[#EAE6DF] placeholder-[#9D978C]/40 border-b border-[#252A34] pb-3 mb-6 focus:outline-none focus:border-[#6275A4]/60 transition-colors"
                />

                {/* Content Editor */}
                <textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setSaveStatus("dirty");
                  }}
                  rows={12}
                  placeholder="Tonight's page is still blank. How did your heart feel today? What gave you peace, or weighed on your mind?..."
                  className="w-full bg-transparent text-sm sm:text-base text-[#EAE6DF] placeholder-[#9D978C]/40 leading-relaxed resize-y focus:outline-none font-sans"
                />

                {/* Tags row */}
                <div className="mt-4 pt-4 border-t border-[#252A34] flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#9D978C]">Tags:</span>
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-[#14161C] border border-[#2B303C] text-[11px] text-[#8B9BC2] flex items-center gap-1"
                    >
                      #{t}
                      <button
                        onClick={() => removeTag(t)}
                        className="hover:text-red-400 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="+ add tag (Enter)"
                    className="bg-transparent text-xs text-[#EAE6DF] placeholder-[#9D978C]/40 px-2 py-0.5 border border-dashed border-[#2B303C] rounded-full focus:outline-none focus:border-[#6275A4]"
                  />
                </div>

                {/* Footer Controls & Privacy Indicators */}
                <div className="mt-8 pt-4 border-t border-[#252A34] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  {/* Word count & save status */}
                  <div className="flex items-center gap-3 text-[#9D978C]">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    {saveStatus === "dirty" && (
                      <span className="text-[#E5B458]">Unsaved changes...</span>
                    )}
                    {saveStatus === "saved" && (
                      <span className="text-[#86A868]">
                        ✓ Saved at {lastSavedTime || "just now"}
                      </span>
                    )}
                    {saveStatus === "error" && (
                      <span className="text-red-400">Failed to save</span>
                    )}
                    {saveStatus === "clean" && entry && (
                      <span className="text-[#8B9BC2]">Encrypted & private</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {entry && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-[#9D978C] hover:text-red-400 text-xs transition-colors"
                      >
                        Erase Entry
                      </button>
                    )}

                    {entry && (
                      <button
                        onClick={handleReflect}
                        disabled={isReflecting}
                        className="px-3.5 py-1.5 rounded-xl border border-[#6275A4]/40 bg-[#1A2234] text-xs font-sans text-[#EAE6DF] hover:border-[#6275A4] transition-all flex items-center gap-1.5 shadow"
                        title="User-triggered thoughtful non-clinical reflection"
                      >
                        {isReflecting ? "Listening..." : "✦ Reflect on this"}
                      </button>
                    )}

                    <button
                      onClick={handleSave}
                      disabled={isSaving || (!content.trim() && !title.trim())}
                      className="px-5 py-2 rounded-xl bg-[#6275A4] hover:bg-[#50628e] disabled:opacity-50 text-white font-sans text-xs font-medium transition-all shadow-md"
                    >
                      {isSaving ? "Saving..." : "Save Entry"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="text-center text-[11px] text-[#9D978C]/70 max-w-md mx-auto">
            🔒 Strictly Private: Your diary entries are never sent to external AI models automatically.
            Reflection is only performed when you tap &quot;Reflect on this&quot;.
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="font-serif text-lg text-[#EAE6DF] mb-2">Erase tonight&apos;s page?</h3>
            <p className="text-xs text-[#9D978C] mb-6">
              This will permanently delete your entry for {currentDate}. This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 rounded-xl border border-[#2B303C] text-xs text-[#9D978C] hover:text-[#EAE6DF]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 rounded-xl bg-red-800/80 hover:bg-red-700 text-xs text-white"
              >
                Permanently Erase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reflection Modal */}
      {(reflection || reflectionError) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1D24] border border-[#6275A4]/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => {
                setReflection(null);
                setReflectionError(null);
              }}
              className="absolute top-4 right-4 text-sm text-[#9D978C] hover:text-[#EAE6DF]"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🌙</span>
              <div>
                <h3 className="font-serif text-lg text-[#EAE6DF]">Moonlight Reflection</h3>
                <span className="text-[11px] text-[#8B9BC2]">
                  Gentle, non-clinical companion reflection
                </span>
              </div>
            </div>

            {reflectionError ? (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-200">
                {reflectionError}
              </div>
            ) : reflection ? (
              <div className="space-y-4 text-xs text-[#EAE6DF]/90 font-sans leading-relaxed">
                <div className="p-4 rounded-xl bg-[#14161C] border border-[#252A34] italic font-serif text-sm text-[#EAE6DF]">
                  &ldquo;{reflection.reflection}&rdquo;
                </div>

                {reflection.themes.length > 0 && (
                  <div>
                    <span className="font-medium text-[#8B9BC2] block mb-1">
                      Recurring Themes Noticed:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {reflection.themes.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full bg-[#1A2234] border border-[#6275A4]/30 text-[11px] text-[#8B9BC2]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {reflection.questions_to_consider.length > 0 && (
                  <div>
                    <span className="font-medium text-[#E5B458] block mb-1">
                      Quiet Questions to Sit With:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-[#9D978C]">
                      {reflection.questions_to_consider.map((q, idx) => (
                        <li key={idx} className="leading-snug">
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 text-[10px] text-[#9D978C]/60 flex items-center justify-between border-t border-[#252A34]">
                  <span>Tone: {reflection.tone}</span>
                  <span>Provider: {reflection.provider}</span>
                </div>
              </div>
            ) : null}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setReflection(null);
                  setReflectionError(null);
                }}
                className="px-5 py-1.5 rounded-xl bg-[#14161C] border border-[#2B303C] text-xs text-[#EAE6DF] hover:border-[#6275A4]"
              >
                Close Reflection
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
