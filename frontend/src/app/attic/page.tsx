"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  createNote,
  deleteNote,
  fetchNotes,
  Note,
  NoteCreateInput,
  NoteUpdateInput,
  suggestNoteTags,
  toggleArchiveNote,
  togglePinNote,
  updateNote,
} from "@/lib/api";
import { DoodleCandleIcon, DoodleAtticDivider } from "@/components/attic/AtticDoodles";
import IdeaCard from "@/components/attic/IdeaCard";
import IdeaModal from "@/components/attic/IdeaModal";

type AtticViewMode = "home" | "all-ideas";

export default function AtticPage() {
  const [viewMode, setViewMode] = useState<AtticViewMode>("home");
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Large Idea Pad State (State 1)
  const [padTitle, setPadTitle] = useState("");
  const [padContent, setPadContent] = useState("");
  const [padIsPinned, setPadIsPinned] = useState(false);
  const [padTags, setPadTags] = useState("");
  const [isPadSaving, setIsPadSaving] = useState(false);
  const [padNotice, setPadNotice] = useState<string | null>(null);
  const [isPadSuggesting, setIsPadSuggesting] = useState(false);

  // Idea Modal (Detail / Edit) State
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Restore persisted view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("attic_view_mode");
    if (saved === "home" || saved === "all-ideas") {
      queueMicrotask(() => {
        setViewMode(saved);
      });
    }
  }, []);

  const changeViewMode = (mode: AtticViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("attic_view_mode", mode);
    }
  };

  // Load real notes from the database
  const loadNotes = useCallback(async () => {
    try {
      const res = await fetchNotes({
        is_archived: showArchived,
        limit: 100,
      });
      setNotes(res.items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load ideas.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    let ignore = false;
    const fetch = async () => {
      try {
        const res = await fetchNotes({
          is_archived: showArchived,
          limit: 100,
        });
        if (!ignore) {
          setNotes(res.items);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load ideas.";
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    fetch();

    return () => {
      ignore = true;
    };
  }, [showArchived]);

  // Filter notes client-side based on search query
  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // State 1: Inscribe idea from large idea pad
  const handleInscribeFromPad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!padTitle.trim() || !padContent.trim()) {
      setError("Please provide both a title and content to inscribe your idea.");
      return;
    }

    setError(null);
    setIsPadSaving(true);
    try {
      const cleanTags = padTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: NoteCreateInput = {
        title: padTitle.trim(),
        content: padContent.trim(),
        category: "idea",
        tags: cleanTags,
        is_pinned: padIsPinned,
      };

      const created = await createNote(payload);
      setNotes((prev) => [created, ...prev]);
      setPadTitle("");
      setPadContent("");
      setPadTags("");
      setPadIsPinned(false);
      setPadNotice("~ tucked into the attic ~");
      setTimeout(() => setPadNotice(null), 3000);
      setSearchQuery("");
      setShowArchived(false);
      changeViewMode("all-ideas");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to inscribe idea.");
    } finally {
      setIsPadSaving(false);
    }
  };

  // State 1: AI Tag suggestion for large idea pad
  const handlePadSuggestTags = async () => {
    if (!padTitle && !padContent) return;
    setIsPadSuggesting(true);
    try {
      const suggestion = await suggestNoteTags({
        title: padTitle,
        content: padContent,
      });
      if (suggestion.suggested_tags?.length) {
        const merged = Array.from(
          new Set([
            ...padTags.split(",").map((t) => t.trim()).filter(Boolean),
            ...suggestion.suggested_tags,
          ])
        ).join(", ");
        setPadTags(merged);
      }
    } catch {
      // Non-critical, ignore
    } finally {
      setIsPadSuggesting(false);
    }
  };

  // Click card to open modal
  const handleCardClick = (note: Note) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  // Modal Save (Immediate state update without redundant refetch)
  const handleModalSave = async (payload: NoteCreateInput | NoteUpdateInput) => {
    setError(null);
    try {
      if (selectedNote) {
        const updated = await updateNote(selectedNote.id, payload as NoteUpdateInput);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        setSelectedNote(updated);
      } else {
        const created = await createNote(payload as NoteCreateInput);
        setNotes((prev) => [created, ...prev]);
        setSelectedNote(created);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save idea.";
      setError(msg);
      throw err;
    }
  };

  // Modal Pin toggle (Optimistic with rollback)
  const handleModalTogglePin = async (note: Note) => {
    setError(null);
    const targetPinned = !note.is_pinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, is_pinned: targetPinned } : n))
    );
    if (selectedNote && selectedNote.id === note.id) {
      setSelectedNote({ ...selectedNote, is_pinned: targetPinned });
    }

    try {
      const updated = await togglePinNote(note.id, targetPinned);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      if (selectedNote && selectedNote.id === note.id) {
        setSelectedNote(updated);
      }
    } catch (err: unknown) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, is_pinned: note.is_pinned } : n))
      );
      if (selectedNote && selectedNote.id === note.id) {
        setSelectedNote(note);
      }
      const msg =
        err instanceof Error
          ? err.message
          : note.is_pinned
          ? "Failed to unpin idea."
          : "Failed to pin idea.";
      setError(msg);
      throw err;
    }
  };

  // Modal Archive toggle (Optimistic with rollback)
  const handleModalToggleArchive = async (note: Note) => {
    setError(null);
    const targetArchived = !note.is_archived;
    setNotes((prev) =>
      showArchived
        ? prev.map((n) => (n.id === note.id ? { ...n, is_archived: targetArchived } : n))
        : prev.filter((n) => n.id !== note.id)
    );
    if (selectedNote && selectedNote.id === note.id) {
      setSelectedNote({ ...selectedNote, is_archived: targetArchived });
    }

    try {
      const updated = await toggleArchiveNote(note.id, targetArchived);
      setNotes((prev) =>
        showArchived
          ? prev.map((n) => (n.id === updated.id ? updated : n))
          : prev.filter((n) => n.id !== updated.id)
      );
      if (selectedNote && selectedNote.id === note.id) {
        setSelectedNote(updated);
      }
    } catch (err: unknown) {
      setNotes((prev) =>
        prev.some((n) => n.id === note.id)
          ? prev.map((n) => (n.id === note.id ? note : n))
          : [note, ...prev]
      );
      if (selectedNote && selectedNote.id === note.id) {
        setSelectedNote(note);
      }
      const msg =
        err instanceof Error
          ? err.message
          : note.is_archived
          ? "Failed to restore idea."
          : "Failed to archive idea.";
      setError(msg);
    }
  };

  // Modal Delete (Optimistic with rollback)
  const handleModalDelete = async (note: Note) => {
    setError(null);
    const prevNotes = notes;
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setIsModalOpen(false);
    setSelectedNote(null);

    try {
      await deleteNote(note.id);
    } catch (err: unknown) {
      setNotes(prevNotes);
      const msg = err instanceof Error ? err.message : "Failed to delete idea.";
      setError(msg);
      throw err;
    }
  };

  return (
    <main className="min-h-screen bg-[#0E0E10] text-[#EAE6DF] flex flex-col items-center px-4 py-8 sm:py-12 select-text font-sans">
      {/* Discreet doodle return navigation to living room */}
      <div className="w-full max-w-3xl flex justify-start mb-4">
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
          TOP HEADER (Both States):
          🕯️ The Little Attic
             somewhere for little ideas
          ────────────────────────────────
          ========================================================================= */}
      <header className="w-full max-w-3xl flex flex-col mb-4">
        <div className="w-full flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hand-drawn Doodle Candle Icon */}
            <div
              onClick={() => changeViewMode("home")}
              className="w-10 h-10 flex items-center justify-center text-[#EAE6DF] hover:text-[#FFFFFF] cursor-pointer transition-colors"
              title="Little Attic Home"
            >
              <DoodleCandleIcon className="w-8 h-8" />
            </div>

            <div>
              <h1
                onClick={() => changeViewMode("home")}
                className="font-serif text-2xl sm:text-3xl text-[#F5F5F5] font-normal tracking-wide cursor-pointer hover:text-[#FFFFFF] transition-colors"
              >
                The Little Attic
              </h1>
              <p className="font-doodle text-xs sm:text-sm text-[#8E8E93] tracking-wider mt-0.5">
                somewhere for little ideas
              </p>
            </div>
          </div>
        </div>

        {/* Sketched Hand-drawn Divider Line */}
        <DoodleAtticDivider className="w-full max-w-3xl mt-4 mb-2" />
      </header>

      {/* Error Banner if any */}
      {error && (
        <div className="w-full max-w-xl p-3 mb-6 bg-[#1A1414] border border-[#4A2020] rounded-xl text-xs text-[#E5A8A8] flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadNotes}
            className="underline hover:text-white ml-3 cursor-pointer text-xs font-mono"
          >
            Retry
          </button>
        </div>
      )}

      {/* =========================================================================
          STATE 1 — LITTLE ATTIC HOME
          ========================================================================= */}
      {viewMode === "home" && (
        <section className="w-full max-w-xl flex flex-col items-center">
          {/* Centered Search Bar */}
          <div className="w-full max-w-md relative my-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  changeViewMode("all-ideas");
                }
              }}
              placeholder="Search ideas..."
              className="w-full bg-[#141417] border border-[#2B2B32] focus:border-[#8E8E93] rounded-full px-5 py-2.5 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#5A5A62] font-mono focus:outline-none transition-colors text-center shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#77777D] hover:text-[#F5F5F5]"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Centered [ All Ideas ] Button */}
          <div className="my-3 flex justify-center">
            <button
              type="button"
              onClick={() => changeViewMode("all-ideas")}
              className="px-6 py-2.5 rounded-full border border-[#3E3E48] hover:border-[#D4D4D8] bg-[#141417] hover:bg-[#1C1C22] text-xs sm:text-sm font-doodle text-[#EAE6DF] hover:text-[#FFFFFF] transition-all cursor-pointer flex items-center gap-2 group shadow-xs active:scale-98"
            >
              <span>All Ideas</span>
              {notes.length > 0 && (
                <span className="text-[11px] font-mono text-[#8E8E93] group-hover:text-[#D4D4D8]">
                  ({notes.length})
                </span>
              )}
              <span className="text-xs transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </button>
          </div>

          {/* Large Idea Area (Current / Simple Idea Space) */}
          <form
            onSubmit={handleInscribeFromPad}
            className="w-full bg-[#141417] border border-[#2B2B32] hover:border-[#3E3E48] rounded-2xl p-6 sm:p-8 mt-2 transition-all shadow-xs relative text-left"
          >
            {/* Subtle deckle corner accent */}
            <div
              className="absolute top-3 right-3 text-[10px] font-mono text-[#3E3E48] pointer-events-none select-none"
              aria-hidden="true"
            >
              ◺
            </div>

            {/* Title: "new idea" */}
            <div className="mb-4">
              <input
                type="text"
                required
                value={padTitle}
                onChange={(e) => setPadTitle(e.target.value)}
                placeholder="new idea"
                className="w-full bg-transparent border-b border-[#2B2B32] focus:border-[#8E8E93] pb-2 text-base sm:text-lg font-serif text-[#F5F5F5] placeholder-[#5A5A62] focus:outline-none transition-colors"
              />
            </div>

            {/* Content: "your idea content" */}
            <div className="mb-4">
              <textarea
                required
                rows={6}
                value={padContent}
                onChange={(e) => setPadContent(e.target.value)}
                placeholder="your idea content"
                className="w-full bg-transparent text-xs sm:text-sm font-sans text-[#EAE6DF] placeholder-[#5A5A62] focus:outline-none resize-none leading-relaxed min-h-[140px]"
              />
            </div>

            {/* Optional tags & quick pin */}
            <div className="pt-2 border-t border-[#232328] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={padTags}
                  onChange={(e) => setPadTags(e.target.value)}
                  placeholder="tags (comma-separated)..."
                  className="bg-[#0E0E10] border border-[#2B2B32] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#EAE6DF] placeholder-[#5A5A62] focus:outline-none focus:border-[#8E8E93]"
                />
                <button
                  type="button"
                  onClick={handlePadSuggestTags}
                  disabled={isPadSuggesting || (!padTitle && !padContent)}
                  className="text-[11px] font-doodle text-[#8E8E93] hover:text-[#FFFFFF] disabled:opacity-40 cursor-pointer"
                >
                  {isPadSuggesting ? "✦ Analyzing..." : "✦ Suggest"}
                </button>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <label className="flex items-center gap-1.5 cursor-pointer font-doodle text-[#8E8E93] hover:text-[#EAE6DF]">
                  <input
                    type="checkbox"
                    checked={padIsPinned}
                    onChange={(e) => setPadIsPinned(e.target.checked)}
                    className="rounded border-[#3E3E48] bg-[#0E0E10] accent-[#EAE6DF]"
                  />
                  <span>📌 Pin</span>
                </label>

                <button
                  type="submit"
                  disabled={isPadSaving}
                  className="px-4 py-1.5 rounded-full border border-[#D4D4D8] bg-[#F5F5F5] text-[#0E0E10] hover:bg-[#FFFFFF] text-xs font-doodle font-semibold transition-all cursor-pointer disabled:opacity-40"
                >
                  {isPadSaving ? "Inscribing..." : "+ Inscribe Idea"}
                </button>
              </div>
            </div>

            {/* Saved Notice */}
            {padNotice && (
              <div className="mt-3 text-center text-xs font-doodle text-[#A1A1AA] animate-fade-in">
                {padNotice}
              </div>
            )}
          </form>
        </section>
      )}

      {/* =========================================================================
          STATE 2 — ALL IDEAS
          ========================================================================= */}
      {viewMode === "all-ideas" && (
        <section className="w-full max-w-4xl flex flex-col items-center">
          {/* Sub-bar: Subtle Return to Attic & Non-dominating Compact Filter */}
          <div className="w-full flex items-center justify-between gap-3 mb-6">
            {/* Subtle "← Little Attic" return control */}
            <button
              type="button"
              onClick={() => changeViewMode("home")}
              className="px-3 py-1.5 rounded-full border border-[#2B2B32] hover:border-[#8E8E93] bg-[#141417] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Little Attic</span>
            </button>

            {/* Subtle non-dominating filter and archive toggle */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="filter ideas..."
                className="bg-[#141417] border border-[#2B2B32] focus:border-[#8E8E93] rounded-full px-3 py-1 text-xs font-mono text-[#F5F5F5] placeholder-[#5A5A62] focus:outline-none w-32 sm:w-44 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className={`px-2.5 py-1 rounded-full text-xs font-doodle border transition-colors cursor-pointer ${
                  showArchived
                    ? "bg-[#25252D] border-[#8E8E93] text-[#FFFFFF]"
                    : "bg-[#141417] border-[#2B2B32] text-[#77777D] hover:text-[#EAE6DF]"
                }`}
                title={showArchived ? "Viewing archived ideas" : "View archived ideas"}
              >
                🗄️ {showArchived ? "Archived" : "Active"}
              </button>
            </div>
          </div>

          {/* Heading: All Ideas */}
          <div className="text-center mb-6">
            <h2 className="font-serif text-xl sm:text-2xl text-[#F5F5F5] font-normal">
              {showArchived ? "Archived Ideas" : "All Ideas"}
            </h2>
            <p className="font-doodle text-xs text-[#8E8E93] mt-1">
              {filteredNotes.length}{" "}
              {filteredNotes.length === 1 ? "idea" : "ideas"} tucked away
              {searchQuery ? ` matching "${searchQuery}"` : ""}
            </p>
          </div>

          {/* Responsive Idea Grid */}
          {isLoading ? (
            <div className="py-16 text-center text-[#8E8E93] text-xs font-doodle">
              <span className="inline-block animate-pulse text-xl mb-2">🕯️</span>
              <p>lighting the candle on the desk...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="w-full py-16 px-6 bg-[#141417] border border-[#2B2B32] rounded-2xl text-center">
              <div className="text-2xl mb-2">📜</div>
              <h3 className="font-serif text-base text-[#F5F5F5] font-normal mb-1">
                {searchQuery
                  ? "No ideas matched this filter"
                  : showArchived
                  ? "The archive drawer is empty"
                  : "No ideas tucked away yet"}
              </h3>
              <p className="text-xs font-doodle text-[#8E8E93] max-w-sm mx-auto mb-4">
                {searchQuery
                  ? "Try searching for a different keyword or tag."
                  : "Return to the Little Attic to write your first spark."}
              </p>
              <button
                type="button"
                onClick={() => changeViewMode("home")}
                className="px-4 py-1.5 rounded-full border border-[#3E3E48] hover:border-[#8E8E93] text-xs font-doodle text-[#EAE6DF] hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                ← Return to Little Attic
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
              {filteredNotes.map((note) => (
                <IdeaCard
                  key={note.id}
                  note={note}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Idea Detail / Edit Modal */}
      <IdeaModal
        isOpen={isModalOpen}
        editingNote={selectedNote}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNote(null);
        }}
        onSave={handleModalSave}
        onTogglePin={handleModalTogglePin}
        onToggleArchive={handleModalToggleArchive}
        onDelete={handleModalDelete}
      />

      {/* Quiet Atmospheric Footer */}
      <footer className="mt-16 text-center text-xs font-doodle text-[#5A5A62] select-none pb-6">
        <span>the little attic</span>
        <span className="mx-2">•</span>
        <span>somewhere for little ideas</span>
      </footer>
    </main>
  );
}
