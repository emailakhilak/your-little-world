"use client";

import React, { useState } from "react";
import { Note, NoteCreateInput, NoteUpdateInput, suggestNoteTags } from "@/lib/api";

interface IdeaModalProps {
  isOpen: boolean;
  editingNote: Note | null;
  onClose: () => void;
  onSave: (payload: NoteCreateInput | NoteUpdateInput) => Promise<void>;
  onTogglePin?: (note: Note) => Promise<void>;
  onToggleArchive?: (note: Note) => Promise<void>;
  onDelete?: (note: Note) => Promise<void>;
}

function IdeaForm({
  editingNote,
  onClose,
  onSave,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: {
  editingNote: Note | null;
  onClose: () => void;
  onSave: (payload: NoteCreateInput | NoteUpdateInput) => Promise<void>;
  onTogglePin?: (note: Note) => Promise<void>;
  onToggleArchive?: (note: Note) => Promise<void>;
  onDelete?: (note: Note) => Promise<void>;
}) {
  const [title, setTitle] = useState(editingNote?.title ?? "");
  const [content, setContent] = useState(editingNote?.content ?? "");
  const [category, setCategory] = useState(editingNote?.category ?? "idea");
  const [tags, setTags] = useState(editingNote?.tags.join(", ") ?? "");
  const [isPinned, setIsPinned] = useState(editingNote?.is_pinned ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSuggestTags = async () => {
    if (!title && !content) return;
    setIsSuggesting(true);
    try {
      const suggestion = await suggestNoteTags({ title, content });
      if (suggestion.suggested_category) setCategory(suggestion.suggested_category);
      if (suggestion.suggested_tags?.length) {
        const merged = Array.from(
          new Set([
            ...tags.split(",").map((t) => t.trim()).filter(Boolean),
            ...suggestion.suggested_tags,
          ])
        ).join(", ");
        setTags(merged);
      }
    } catch {
      // Non-critical, ignore
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleTogglePin = async () => {
    if (!editingNote || !onTogglePin || isActionLoading || isSaving) return;
    setActionError(null);
    setIsActionLoading(true);
    try {
      await onTogglePin(editingNote);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : editingNote.is_pinned
          ? "Failed to unpin idea."
          : "Failed to pin idea.";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!editingNote || !onToggleArchive || isActionLoading || isSaving) return;
    setActionError(null);
    setIsActionLoading(true);
    try {
      await onToggleArchive(editingNote);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : editingNote.is_archived
          ? "Failed to restore idea."
          : "Failed to archive idea.";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!editingNote || !onDelete || isActionLoading || isSaving) return;
    setActionError(null);
    setIsActionLoading(true);
    try {
      await onDelete(editingNote);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to discard idea.";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (isSaving || isActionLoading) return;
    setActionError(null);
    setIsSaving(true);
    const cleanTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        category,
        tags: cleanTags,
        is_pinned: isPinned,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save idea.";
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Title */}
        <div>
          <label className="block font-doodle text-[#A1A1AA] mb-1">
            Idea Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title of your spark or idea..."
            className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F5F5F5] font-serif focus:outline-none focus:border-[#D4D4D8]"
          />
        </div>

        {/* Category & Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-doodle text-[#A1A1AA] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] font-sans focus:outline-none focus:border-[#D4D4D8] cursor-pointer"
            >
              <option value="idea">💡 Idea</option>
              <option value="thought">🍃 Thought</option>
              <option value="snippet">📜 Snippet</option>
              <option value="reminder">📌 Reminder</option>
              <option value="project">🛠️ Project Spark</option>
            </select>
          </div>

          <div>
            <label className="block font-doodle text-[#A1A1AA] mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="systems, architecture, writing"
              className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] font-mono focus:outline-none focus:border-[#D4D4D8]"
            />
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-doodle text-[#A1A1AA]">
              Idea Content *
            </label>
            <button
              type="button"
              onClick={handleSuggestTags}
              disabled={isSuggesting || (!title && !content)}
              className="text-[11px] font-doodle text-[#8E8E93] hover:text-[#FFFFFF] disabled:opacity-40 cursor-pointer"
            >
              {isSuggesting ? "✦ Analyzing..." : "✦ Suggest Tags"}
            </button>
          </div>
          <textarea
            required
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Record your thoughts, notes, or ideas here..."
            className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F5F5F5] font-sans focus:outline-none focus:border-[#D4D4D8] leading-relaxed resize-none"
          />
        </div>

        {/* Pin Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_pinned"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded border-[#3E3E48] bg-[#0E0E10] accent-[#EAE6DF]"
          />
          <label htmlFor="is_pinned" className="font-doodle text-xs text-[#A1A1AA] cursor-pointer">
            Pin to top of attic
          </label>
        </div>

        {/* Error Notification if action fails */}
        {actionError && (
          <div className="p-2.5 rounded-xl bg-[#1A1414] border border-[#4A2020] text-xs text-[#E5A8A8] font-sans flex items-center justify-between">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-[#E5A8A8] hover:text-white ml-2 text-xs font-mono"
            >
              ✕
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#232328] flex items-center justify-between flex-wrap gap-2">
          {editingNote && (
            <div className="flex items-center gap-2">
              {onTogglePin && (
                <button
                  type="button"
                  disabled={isActionLoading || isSaving}
                  onClick={handleTogglePin}
                  className="px-2.5 py-1 rounded-lg border border-[#2B2B32] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingNote.is_pinned ? "Unpin" : "Pin"}
                </button>
              )}
              {onToggleArchive && (
                <button
                  type="button"
                  disabled={isActionLoading || isSaving}
                  onClick={handleToggleArchive}
                  className="px-2.5 py-1 rounded-lg border border-[#2B2B32] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingNote.is_archived ? "Restore" : "Archive"}
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  disabled={isActionLoading || isSaving}
                  onClick={() => setConfirmDelete(true)}
                  className="px-2.5 py-1 rounded-lg border border-[#2B2B32] text-xs font-doodle text-[#8E8E93] hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={isActionLoading || isSaving}
              onClick={onClose}
              className="px-4 py-1.5 rounded-full border border-[#3E3E48] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isActionLoading}
              className="px-5 py-1.5 rounded-full border border-[#D4D4D8] bg-[#F5F5F5] text-[#0E0E10] hover:bg-[#FFFFFF] text-xs font-doodle font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : editingNote ? "Save Changes" : "Inscribe Idea"}
            </button>
          </div>
        </div>
      </form>

      {/* Inline Delete Confirmation */}
      {confirmDelete && editingNote && onDelete && (
        <div className="p-4 rounded-xl bg-[#0E0E10] border border-red-900/50 mt-3 text-center space-y-2">
          <p className="text-xs font-serif text-[#F5F5F5]">
            Permanently discard &ldquo;{editingNote.title}&rdquo;?
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={isActionLoading || isSaving}
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded-lg border border-[#3E3E48] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Keep
            </button>
            <button
              type="button"
              disabled={isActionLoading || isSaving}
              onClick={handleDeleteConfirm}
              className="px-3 py-1 rounded-lg border border-red-700 bg-red-950/60 text-xs font-doodle text-red-200 hover:bg-red-900/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IdeaModal({
  isOpen,
  editingNote,
  onClose,
  onSave,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: IdeaModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs max-h-screen overflow-y-auto"
    >
      <div className="bg-[#141417] border border-[#2B2B32] rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-xs font-mono text-[#8E8E93] hover:text-[#FFFFFF] transition-colors p-1"
          aria-label="Close dialog"
        >
          ✕
        </button>

        <h2 id="idea-modal-title" className="font-serif text-xl text-[#F5F5F5] font-normal mb-1">
          {editingNote ? "Revise Idea" : "New Little Idea"}
        </h2>
        <p className="text-xs font-doodle text-[#8E8E93] mb-4">
          Write down whatever is lingering on your mind.
        </p>

        <IdeaForm
          key={editingNote?.id ?? "new-idea"}
          editingNote={editingNote}
          onClose={onClose}
          onSave={onSave}
          onTogglePin={onTogglePin}
          onToggleArchive={onToggleArchive}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
