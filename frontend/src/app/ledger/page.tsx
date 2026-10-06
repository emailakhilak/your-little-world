"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchLedgerEntries,
  fetchLedgerEntryByDate,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  LedgerEntry,
} from "@/lib/api";
import {
  DoodleLedgerBook,
  DoodleSearchGlass,
  DoodlePlus,
  DoodlePencil,
  DoodleTrash,
  DoodleLedgerDivider,
} from "@/components/ledger/LedgerDoodles";

type LedgerView = "list" | "day" | "new";

function getLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekday(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "";
  }
}

function formatMonthDay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr: string): string {
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

export default function LittleLedgerPage() {
  const [activeView, setActiveView] = useState<LedgerView>("list");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Day View state
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateStr());
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Entry state
  const [newDate, setNewDate] = useState<string>(() => getLocalDateStr());
  const [newContent, setNewContent] = useState("");
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchDateInput, setSearchDateInput] = useState(() => getLocalDateStr());
  const [isSearching, setIsSearching] = useState(false);

  // Load recent entries
  useEffect(() => {
    let ignore = false;
    const fetch = async () => {
      try {
        const res = await fetchLedgerEntries({ limit: 60 });
        if (!ignore) {
          setEntries(res.items);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load ledger.";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetch();

    return () => {
      ignore = true;
    };
  }, []);

  // Open day page
  const handleOpenDay = (dateStr: string, existing?: LedgerEntry | null) => {
    setSelectedDate(dateStr);
    setIsEditing(false);
    setError(null);
    if (existing !== undefined) {
      setSelectedEntry(existing);
      setEditContent(existing ? existing.content : "");
      setActiveView("day");
    } else {
      const found = entries.find((e) => e.entry_date === dateStr);
      if (found) {
        setSelectedEntry(found);
        setEditContent(found.content);
        setActiveView("day");
      } else {
        // Fetch from API in case not loaded in top 60
        fetchLedgerEntryByDate(dateStr)
          .then((entry) => {
            setSelectedEntry(entry);
            setEditContent(entry ? entry.content : "");
            setActiveView("day");
          })
          .catch(() => {
            setSelectedEntry(null);
            setEditContent("");
            setActiveView("day");
          });
      }
    }
  };

  // Search a specific day
  const handleSearchDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDateInput) return;
    setIsSearching(true);
    try {
      const entry = await fetchLedgerEntryByDate(searchDateInput);
      setSelectedDate(searchDateInput);
      setSelectedEntry(entry);
      setEditContent(entry ? entry.content : "");
      setIsEditing(false);
      setIsSearchOpen(false);
      setActiveView("day");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to find day.";
      setError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  // Open new entry
  const handleOpenNew = () => {
    const today = getLocalDateStr();
    setNewDate(today);
    setNewContent("");
    setError(null);
    setActiveView("new");
  };

  // Create new entry
  const handleCreate = async () => {
    if (!newContent.trim()) {
      setError("Please write a little note before saving.");
      return;
    }
    setIsSavingNew(true);
    setError(null);
    try {
      const created = await createLedgerEntry({
        entry_date: newDate || getLocalDateStr(),
        content: newContent.trim(),
      });
      // Update local state without refreshing entire page
      setEntries((prev) => {
        const filtered = prev.filter((item) => item.id !== created.id && item.entry_date !== created.entry_date);
        return [created, ...filtered].sort((a, b) => (b.entry_date > a.entry_date ? 1 : -1));
      });
      setSelectedDate(created.entry_date);
      setSelectedEntry(created);
      setEditContent(created.content);
      setIsEditing(false);
      setActiveView("day");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save ledger note.";
      setError(msg);
    } finally {
      setIsSavingNew(false);
    }
  };

  // Update existing entry
  const handleUpdate = async () => {
    if (!selectedEntry) return;
    if (!editContent.trim()) {
      setError("Content cannot be empty.");
      return;
    }
    setIsSavingEdit(true);
    setError(null);
    try {
      const updated = await updateLedgerEntry(selectedEntry.id, {
        content: editContent.trim(),
      });
      setSelectedEntry(updated);
      setIsEditing(false);
      setEntries((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update entry.";
      setError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete entry
  const handleDelete = async () => {
    if (!selectedEntry) return;
    const ok = window.confirm("Erase this day's ledger note?");
    if (!ok) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteLedgerEntry(selectedEntry.id);
      setEntries((prev) => prev.filter((item) => item.id !== selectedEntry.id));
      setSelectedEntry(null);
      setActiveView("list");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete entry.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#EAE6DF] px-4 py-8 sm:py-12 flex flex-col items-center select-text">
      <div className="w-full max-w-xl mx-auto flex flex-col flex-1">
        {/* =========================================================================
            VIEW 1: MAIN LITTLE LEDGER LIST
            ========================================================================= */}
        {activeView === "list" && (
          <>
            {/* Top Navigation */}
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/"
                className="font-doodle text-xs text-[#77777D] hover:text-[#EAE6DF] inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:underline"
              >
                <span>←</span>
                <span>my little world</span>
              </Link>

              {/* Doodle Search/Find a Day button */}
              <button
                onClick={() => setIsSearchOpen((prev) => !prev)}
                className="font-doodle text-xs text-[#8E8E93] hover:text-[#EAE6DF] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-transparent hover:border-[#2B2B32] transition-colors cursor-pointer"
                aria-label="Search a day"
              >
                <DoodleSearchGlass className="w-3.5 h-3.5 text-[#8E8E93]" />
                <span>Search a day</span>
              </button>
            </div>

            {/* Header */}
            <header className="flex flex-col items-center text-center mb-8">
              <div className="text-[#8E8E93] mb-2 opacity-80">
                <DoodleLedgerBook className="w-9 h-9" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#F5F5F5] font-normal tracking-wide">
                The Little Ledger
              </h1>
              <p className="font-doodle text-xs sm:text-sm text-[#8E8E93] mt-1 tracking-wider">
                little notes about my money
              </p>
            </header>

            {/* Expandable Search A Day Panel */}
            {isSearchOpen && (
              <form
                onSubmit={handleSearchDay}
                className="mb-8 p-4 bg-[#141418] border border-[#2B2B32] rounded-xl flex flex-col sm:flex-row items-center gap-3 animate-fade-in"
              >
                <label className="font-doodle text-xs text-[#8E8E93] self-start sm:self-center">
                  Pick date:
                </label>
                <input
                  type="date"
                  value={searchDateInput}
                  onChange={(e) => setSearchDateInput(e.target.value)}
                  className="bg-[#0E0E10] border border-[#3E3E48] text-[#EAE6DF] rounded-lg px-3 py-1.5 font-serif text-sm focus:outline-none focus:border-[#8E8E93] w-full sm:w-auto"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full sm:w-auto font-serif text-xs bg-[#1E1E26] hover:bg-[#282834] text-[#EAE6DF] border border-[#3E3E48] px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSearching ? "Finding..." : "Open Day"}
                </button>
              </form>
            )}

            {/* Subtle Divider */}
            <DoodleLedgerDivider className="w-full text-[#24242A] mb-8" />

            {/* Section Header: Recent */}
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="font-serif text-xs uppercase tracking-widest text-[#77777D]">
                Recent
              </span>
              {error && <span className="font-doodle text-xs text-[#E06C75]">{error}</span>}
            </div>

            {/* Natural Vertical List of Days */}
            <div className="flex-1 flex flex-col">
              {isLoading ? (
                <div className="py-16 text-center">
                  <p className="font-doodle text-xs text-[#77777D] animate-pulse">
                    ~ opening the ledger pages... ~
                  </p>
                </div>
              ) : entries.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center">
                  <p className="font-doodle text-xs text-[#77777D] italic">
                    The ledger is clean and quiet. No notes written yet.
                  </p>
                  <button
                    onClick={handleOpenNew}
                    className="mt-4 font-doodle text-xs text-[#8E8E93] hover:text-[#EAE6DF] underline decoration-dotted transition-colors cursor-pointer"
                  >
                    + write the first note
                  </button>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[#181820]">
                  {entries.map((entry) => {
                    const weekday = getWeekday(entry.entry_date);
                    const monthDay = formatMonthDay(entry.entry_date);
                    return (
                      <button
                        key={entry.id}
                        onClick={() => handleOpenDay(entry.entry_date, entry)}
                        className="group flex items-center justify-between py-4 px-2 hover:bg-[#141418] rounded-lg transition-colors duration-150 text-left cursor-pointer w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8E8E93]"
                      >
                        <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-colors">
                          {weekday}
                        </span>
                        <span className="font-doodle text-xs sm:text-sm text-[#8E8E93] group-hover:text-[#D4D4D8] transition-colors">
                          {monthDay}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Small Doodle-Style (+) Button */}
            <div className="sticky bottom-6 mt-8 flex justify-center pointer-events-none">
              <button
                onClick={handleOpenNew}
                className="pointer-events-auto group p-3 bg-[#141418] hover:bg-[#1E1E26] text-[#EAE6DF] hover:text-[#FFFFFF] border border-[#3E3E48] hover:border-[#8E8E93] rounded-full shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF]"
                aria-label="New Ledger Entry"
                title="New Ledger Entry"
              >
                <DoodlePlus className="w-5 h-5 text-[#EAE6DF] group-hover:text-[#FFFFFF]" />
              </button>
            </div>
          </>
        )}

        {/* =========================================================================
            VIEW 2: OPEN DAY'S LEDGER PAGE
            ========================================================================= */}
        {activeView === "day" && (
          <div className="flex-1 flex flex-col animate-fade-in">
            {/* Top Bar with Back and Edit/Delete controls */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setActiveView("list")}
                className="font-doodle text-xs text-[#8E8E93] hover:text-[#EAE6DF] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>←</span>
                <span>The Little Ledger</span>
              </button>

              {selectedEntry && !isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-[#8E8E93] hover:text-[#EAE6DF] hover:bg-[#181820] rounded-md transition-colors cursor-pointer"
                    title="Edit note"
                    aria-label="Edit note"
                  >
                    <DoodlePencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-1.5 text-[#77777D] hover:text-[#E06C75] hover:bg-[#181820] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete note"
                    aria-label="Delete note"
                  >
                    <DoodleTrash className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Date Display */}
            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl text-[#F5F5F5] font-normal">
                {getWeekday(selectedDate)}
              </h2>
              <p className="font-doodle text-xs sm:text-sm text-[#8E8E93] mt-1">
                {formatFullDate(selectedDate)}
              </p>
            </div>

            <DoodleLedgerDivider className="w-full text-[#24242A] mb-8" />

            {/* Note Content / Edit Box */}
            <div className="flex-1">
              {isEditing ? (
                <div className="flex flex-col gap-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={8}
                    className="w-full bg-[#141418] border border-[#3E3E48] focus:border-[#8E8E93] focus:outline-none rounded-xl p-4 font-serif text-base text-[#EAE6DF] leading-relaxed resize-y placeholder:text-[#55555E]"
                    placeholder="Write anything..."
                    autoFocus
                  />
                  {error && <span className="font-doodle text-xs text-[#E06C75]">{error}</span>}
                  <div className="flex items-center justify-end gap-3 mt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(selectedEntry?.content || "");
                      }}
                      className="font-doodle text-xs text-[#8E8E93] hover:text-[#EAE6DF] px-3 py-1.5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={isSavingEdit}
                      className="font-serif text-xs bg-[#1E1E26] hover:bg-[#282834] text-[#EAE6DF] border border-[#3E3E48] px-5 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingEdit ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : selectedEntry ? (
                <div className="font-serif text-base sm:text-lg text-[#EAE6DF] leading-relaxed whitespace-pre-wrap py-2 min-h-[160px]">
                  {selectedEntry.content}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <p className="font-doodle text-xs text-[#77777D] italic">
                    Nothing was written here that day.
                  </p>
                  <button
                    onClick={() => {
                      setNewDate(selectedDate);
                      setNewContent("");
                      setActiveView("new");
                    }}
                    className="mt-4 font-doodle text-xs text-[#8E8E93] hover:text-[#EAE6DF] underline decoration-dotted transition-colors cursor-pointer"
                  >
                    + write for this day
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Back Button */}
            <div className="mt-12 pt-6 border-t border-[#181820]">
              <button
                onClick={() => setActiveView("list")}
                className="font-doodle text-xs text-[#77777D] hover:text-[#EAE6DF] transition-colors cursor-pointer"
              >
                ← back
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: NEW LEDGER ENTRY
            ========================================================================= */}
        {activeView === "new" && (
          <div className="flex-1 flex flex-col animate-fade-in">
            {/* Top Back */}
            <div className="mb-6">
              <button
                onClick={() => setActiveView("list")}
                className="font-doodle text-xs text-[#8E8E93] hover:text-[#EAE6DF] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>←</span>
                <span>The Little Ledger</span>
              </button>
            </div>

            {/* Header */}
            <div className="mb-4">
              <h2 className="font-serif text-2xl sm:text-3xl text-[#F5F5F5] font-normal">
                New Ledger Entry
              </h2>
              <p className="font-doodle text-xs sm:text-sm text-[#8E8E93] mt-1">
                {formatFullDate(newDate || getLocalDateStr())}
              </p>
            </div>

            <DoodleLedgerDivider className="w-full text-[#24242A] mb-6" />

            {/* Writing Area */}
            <div className="flex-1 flex flex-col">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={9}
                className="w-full bg-[#141418] border border-[#2B2B32] focus:border-[#8E8E93] focus:outline-none rounded-xl p-4 font-serif text-base sm:text-lg text-[#EAE6DF] leading-relaxed resize-y placeholder:text-[#55555E]"
                placeholder="Write anything..."
                autoFocus
              />

              {error && (
                <span className="font-doodle text-xs text-[#E06C75] mt-2 block">
                  {error}
                </span>
              )}

              {/* Centered Doodle-style Save Button */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleCreate}
                  disabled={isSavingNew}
                  className="font-serif text-sm bg-[#16161E] hover:bg-[#20202C] text-[#EAE6DF] hover:text-[#FFFFFF] border border-[#3E3E48] hover:border-[#8E8E93] px-8 py-2.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF]"
                >
                  {isSavingNew ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* Bottom Back Button */}
            <div className="mt-12 pt-6 border-t border-[#181820]">
              <button
                onClick={() => setActiveView("list")}
                className="font-doodle text-xs text-[#77777D] hover:text-[#EAE6DF] transition-colors cursor-pointer"
              >
                ← back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
