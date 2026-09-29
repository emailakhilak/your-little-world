"use client";

import { useEffect, useState } from "react";
import ReturnButton from "@/components/ui/ReturnButton";
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

const NOTE_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "all", label: "All Notes", icon: "✨" },
  { id: "idea", label: "Ideas", icon: "💡" },
  { id: "thought", label: "Thoughts", icon: "🍃" },
  { id: "snippet", label: "Snippets", icon: "📜" },
  { id: "reminder", label: "Things to Remember", icon: "📌" },
  { id: "project", label: "Project Sparks", icon: "🛠️" },
];

export default function AtticPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [viewDrawer, setViewDrawer] = useState<boolean>(false);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    category: string;
    tags: string;
    is_pinned: boolean;
  }>({
    title: "",
    content: "",
    category: "idea",
    tags: "",
    is_pinned: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Delete dialog
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch notes
  useEffect(() => {
    let ignore = false;

    const loadNotes = async () => {
      try {
        const cat = selectedCategory !== "all" ? selectedCategory : undefined;
        const res = await fetchNotes({
          category: cat,
          search: debouncedSearch || undefined,
          is_archived: viewDrawer,
          limit: 100,
        });
        if (!ignore) {
          setNotes(res.items);
          setTotal(res.total);
          setPinnedCount(res.pinned_count);
          setArchivedCount(res.archived_count);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to open desk drawer.";
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    loadNotes();

    return () => {
      ignore = true;
    };
  }, [selectedCategory, debouncedSearch, viewDrawer]);

  const refreshNotes = async () => {
    try {
      const cat = selectedCategory !== "all" ? selectedCategory : undefined;
      const res = await fetchNotes({
        category: cat,
        search: debouncedSearch || undefined,
        is_archived: viewDrawer,
        limit: 100,
      });
      setNotes(res.items);
      setTotal(res.total);
      setPinnedCount(res.pinned_count);
      setArchivedCount(res.archived_count);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to refresh notes.");
    }
  };

  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormData({
      title: "",
      content: "",
      category: "idea",
      tags: "",
      is_pinned: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (n: Note) => {
    setEditingNote(n);
    setFormData({
      title: n.title,
      content: n.content,
      category: n.category,
      tags: n.tags.join(", "),
      is_pinned: n.is_pinned,
    });
    setIsModalOpen(true);
  };

  const handleSuggestTags = async () => {
    if (!formData.title && !formData.content) return;
    setIsSuggesting(true);
    try {
      const suggestion = await suggestNoteTags({
        title: formData.title,
        content: formData.content,
      });
      setFormData((prev) => ({
        ...prev,
        category: suggestion.suggested_category || prev.category,
        tags: Array.from(
          new Set([
            ...prev.tags.split(",").map((t) => t.trim()).filter(Boolean),
            ...suggestion.suggested_tags,
          ])
        ).join(", "),
      }));
    } catch {
      // Non-critical, ignore
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setIsSaving(true);
    try {
      const cleanTags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingNote) {
        const payload: NoteUpdateInput = {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
          tags: cleanTags,
          is_pinned: formData.is_pinned,
        };
        await updateNote(editingNote.id, payload);
      } else {
        const payload: NoteCreateInput = {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
          tags: cleanTags,
          is_pinned: formData.is_pinned,
        };
        await createNote(payload);
      }
      setIsModalOpen(false);
      await refreshNotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePin = async (n: Note) => {
    try {
      await togglePinNote(n.id);
      await refreshNotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle pin.");
    }
  };

  const handleToggleArchive = async (n: Note) => {
    try {
      await toggleArchiveNote(n.id);
      await refreshNotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle archive.");
    }
  };

  const handleDelete = async () => {
    if (!deletingNote) return;
    setIsDeleting(true);
    try {
      await deleteNote(deletingNote.id);
      setDeletingNote(null);
      await refreshNotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete note.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 flex flex-col items-center max-w-4xl mx-auto">
      {/* Return button header */}
      <div className="w-full flex items-center justify-between mb-6">
        <ReturnButton />
        <div
          aria-hidden="true"
          className="text-xs font-doodle text-[#B3835B]/80 select-none"
        >
          ~ sparks &amp; ink · things tucked away ~
        </div>
      </div>

      {/* Main Chamber Header */}
      <header className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#27211C] border border-[#B3835B]/40 flex items-center justify-center text-3xl shadow-inner shrink-0">
            🕯️
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[11px] uppercase tracking-widest text-[#B3835B] font-semibold">
                Chamber of Sparks
              </span>
              <span className="text-xs text-[#9D978C]/70">•</span>
              <span className="text-xs text-[#9D978C]/80 font-mono">
                {total} notes · {pinnedCount} pinned · {archivedCount} archived
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#EAE6DF] mt-1 font-medium">
              The Little Attic
            </h1>
            <p className="text-[#9D978C] text-sm sm:text-base mt-2 leading-relaxed font-sans">
              A wooden writing desk for fleeting ideas, questions that linger, project snippets, and things tucked away for safekeeping.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="mt-3 sm:mt-0 px-4 py-2.5 bg-[#B3835B]/20 hover:bg-[#B3835B]/30 active:scale-95 text-xs font-medium text-[#EAE6DF] border border-[#B3835B]/50 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <span>✍️ Write Note</span>
          </button>
        </div>
      </header>

      {/* Search and Desk Mode Controls */}
      <section className="w-full space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Debounced Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#9D978C]">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, questions, tags..."
              className="w-full bg-[#14161C] border border-[#2B303C] focus:border-[#B3835B] focus:outline-none rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[#EAE6DF] placeholder-[#9D978C]/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9D978C] hover:text-[#EAE6DF]"
              >
                ×
              </button>
            )}
          </div>

          {/* Active Desk vs Archived Drawer Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewDrawer(false)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                !viewDrawer
                  ? "bg-[#B3835B]/25 text-[#EAE6DF] border-[#B3835B]/60"
                  : "bg-[#14161C] border-[#252A34] text-[#9D978C] hover:text-[#EAE6DF]"
              }`}
            >
              <span>🪵 Desk View</span>
            </button>
            <button
              onClick={() => setViewDrawer(true)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                viewDrawer
                  ? "bg-[#B3835B]/25 text-[#EAE6DF] border-[#B3835B]/60"
                  : "bg-[#14161C] border-[#252A34] text-[#9D978C] hover:text-[#EAE6DF]"
              }`}
            >
              <span>🗄️ Drawer ({archivedCount})</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        {!viewDrawer && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {NOTE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#B3835B]/25 border-[#B3835B] text-[#EAE6DF]"
                      : "bg-[#14161C] border-[#252A34] text-[#9D978C] hover:border-[#3B4254] hover:text-[#EAE6DF]"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Error Banner */}
      {error && (
        <div className="w-full p-4 mb-6 bg-[#251A1C] border border-[#52292E] rounded-2xl text-xs text-[#E5A8A8] flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={refreshNotes}
            className="underline hover:text-white ml-3 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Notes Stream */}
      <section className="w-full space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-[#9D978C] text-sm">
            <div className="inline-block animate-pulse text-2xl mb-2">🕯️</div>
            <p className="font-serif italic">Lighting the candle on the desk...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="w-full py-16 px-6 bg-[#1A1D24] border border-[#2B303C] rounded-3xl text-center">
            <div className="text-3xl mb-3">
              {viewDrawer ? "🗄️" : searchQuery ? "🔍" : "📜"}
            </div>
            <h2 className="font-serif text-lg text-[#EAE6DF] font-medium mb-1">
              {viewDrawer
                ? "The drawer is tidy and empty"
                : searchQuery
                ? "No notes matched this search"
                : "Nothing tucked away yet"}
            </h2>
            <p className="text-xs text-[#9D978C] max-w-sm mx-auto mb-6">
              {viewDrawer
                ? "Notes you archive will rest quietly in this drawer."
                : searchQuery
                ? "Try searching for a different word, tag, or category."
                : "Jot down a fleeting thought, a code snippet, or a question to return to."}
            </p>
            {!viewDrawer && !searchQuery && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-[#B3835B]/20 hover:bg-[#B3835B]/30 border border-[#B3835B]/50 rounded-xl text-xs text-[#EAE6DF] transition-all cursor-pointer"
              >
                Write Your First Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {notes.map((n) => {
              const catMeta = NOTE_CATEGORIES.find((c) => c.id === n.category);
              return (
                <article
                  key={n.id}
                  className={`p-5 bg-[#1A1D24] border rounded-2xl transition-all flex flex-col justify-between group ${
                    n.is_pinned
                      ? "border-[#B3835B]/60 shadow-md bg-[#1C1E26]"
                      : "border-[#2B303C] hover:border-[#3B4254]"
                  }`}
                >
                  <div>
                    {/* Header: Category, Pin, Date */}
                    <div className="flex items-center justify-between text-[11px] text-[#9D978C] mb-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#14161C] border border-[#252A34] text-[#D8B48D] font-medium">
                        {catMeta?.icon || "📝"} {catMeta?.label || n.category}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTogglePin(n)}
                          title={n.is_pinned ? "Unpin note" : "Pin to top of desk"}
                          className={`p-1 rounded-md text-xs cursor-pointer transition-colors ${
                            n.is_pinned
                              ? "text-[#B3835B] hover:text-[#EAE6DF]"
                              : "text-[#9D978C]/60 hover:text-[#EAE6DF]"
                          }`}
                        >
                          📌
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-serif font-medium text-[#EAE6DF] leading-snug mb-2">
                      {n.title}
                    </h2>

                    {/* Content */}
                    <p className="text-xs sm:text-sm text-[#9D978C] font-sans leading-relaxed whitespace-pre-wrap line-clamp-6 mb-3">
                      {n.content}
                    </p>

                    {/* Tags */}
                    {n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {n.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#14161C] border border-[#252A34] text-[#A8A49C]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-[#252A34] flex items-center justify-between text-xs text-[#9D978C]">
                    <span className="text-[10px] font-mono">
                      {new Date(n.updated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(n)}
                        className="hover:text-[#EAE6DF] cursor-pointer"
                      >
                        Edit
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleToggleArchive(n)}
                        className="hover:text-[#EAE6DF] cursor-pointer"
                      >
                        {n.is_archived ? "Restore" : "Archive"}
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => setDeletingNote(n)}
                        className="hover:text-rose-400 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Note Create / Edit Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 shadow-2xl relative text-left">
            <h3 className="font-serif text-xl text-[#EAE6DF] font-medium mb-1">
              {editingNote ? "Revise Parchment" : "New Attic Note"}
            </h3>
            <p className="text-xs text-[#9D978C] mb-4">
              Write down whatever is lingering on your mind.
            </p>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="text-xs text-[#9D978C] font-medium block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Distributed cache design thought"
                  className="w-full bg-[#14161C] border border-[#2B303C] focus:border-[#B3835B] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#EAE6DF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9D978C] font-medium block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#14161C] border border-[#2B303C] focus:border-[#B3835B] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none"
                  >
                    <option value="idea">💡 Idea</option>
                    <option value="thought">🍃 Thought</option>
                    <option value="snippet">📜 Snippet</option>
                    <option value="reminder">📌 Reminder</option>
                    <option value="project">🛠️ Project Spark</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#9D978C] font-medium block mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="cache, systems, rust"
                    className="w-full bg-[#14161C] border border-[#2B303C] focus:border-[#B3835B] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[#9D978C] font-medium">
                    Content
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestTags}
                    disabled={isSuggesting || (!formData.title && !formData.content)}
                    className="text-[11px] text-[#B3835B] hover:text-[#EAE6DF] disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <span>{isSuggesting ? "✦ Analyzing..." : "✦ Suggest Tags with AI"}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Record your thoughts, code, or ideas here..."
                  className="w-full bg-[#14161C] border border-[#2B303C] focus:border-[#B3835B] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#EAE6DF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="rounded border-[#2B303C] text-[#B3835B] focus:ring-0"
                />
                <label htmlFor="is_pinned" className="text-xs text-[#9D978C] cursor-pointer">
                  Pin this note to the top of the desk
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#9D978C] hover:text-[#EAE6DF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#B3835B]/30 hover:bg-[#B3835B]/40 border border-[#B3835B]/60 text-[#EAE6DF] cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Tucking away..." : editingNote ? "Save Changes" : "Store Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingNote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 text-center shadow-2xl">
            <div className="text-3xl mb-2">🗑️</div>
            <h3 className="font-serif text-lg text-[#EAE6DF] font-medium mb-1">
              Burn this note?
            </h3>
            <p className="text-xs text-[#9D978C] mb-6">
              Are you sure you want to permanently discard “{deletingNote.title}”? This cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingNote(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#9D978C] hover:text-[#EAE6DF] cursor-pointer"
              >
                Keep
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700 text-rose-200 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Discarding..." : "Discard"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Atmospheric Footer Seal */}
      <footer className="mt-12 text-center text-xs text-[#8C7A6B] flex items-center justify-center space-x-3 select-none pb-6">
        <span className="font-serif italic">The Little Attic</span>
        <span>•</span>
        <span className="font-doodle text-sm text-[#B3835B]/70">
          leave no thought forgotten
        </span>
      </footer>
    </main>
  );
}
