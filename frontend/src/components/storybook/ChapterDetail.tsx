"use client";

import React, { useState } from "react";
import { StoryChapter } from "@/lib/api";
import { DoodleDivider, DoodleQuill, DoodleSparkle } from "./StoryDoodles";

interface ChapterDetailProps {
  chapter: StoryChapter;
  onBackToAllStories: () => void;
  onUpdateChapter: (
    id: string,
    data: {
      title: string;
      description?: string | null;
      period?: string | null;
      reflections?: string | null;
      milestones?: Array<{ title: string; date?: string; notes?: string }>;
    }
  ) => Promise<void>;
  onDeleteChapter: (id: string) => Promise<void>;
}

export default function ChapterDetail({
  chapter,
  onBackToAllStories,
  onUpdateChapter,
  onDeleteChapter,
}: ChapterDetailProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form states for editing
  const [title, setTitle] = useState<string>(chapter.title);
  const [period, setPeriod] = useState<string>(chapter.period || "");
  const [description, setDescription] = useState<string>(chapter.description || "");
  const [reflections, setReflections] = useState<string>(chapter.reflections || "");
  const [milestones, setMilestones] = useState<Array<{ title: string; date?: string; notes?: string }>>(
    chapter.milestones || []
  );

  // New milestone draft input
  const [newMsTitle, setNewMsTitle] = useState<string>("");
  const [newMsDate, setNewMsDate] = useState<string>("");
  const [newMsNotes, setNewMsNotes] = useState<string>("");

  const handleStartEdit = () => {
    setTitle(chapter.title);
    setPeriod(chapter.period || "");
    setDescription(chapter.description || "");
    setReflections(chapter.reflections || "");
    setMilestones(chapter.milestones || []);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleAddMilestone = () => {
    if (!newMsTitle.trim()) return;
    setMilestones((prev) => [
      ...prev,
      {
        title: newMsTitle.trim(),
        date: newMsDate.trim() || undefined,
        notes: newMsNotes.trim() || undefined,
      },
    ]);
    setNewMsTitle("");
    setNewMsDate("");
    setNewMsNotes("");
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateChapter(chapter.id, {
        title: title.trim(),
        period: period.trim() || null,
        description: description.trim() || null,
        reflections: reflections.trim() || null,
        milestones,
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update chapter:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this chapter from your storybook?")) return;
    setIsDeleting(true);
    try {
      await onDeleteChapter(chapter.id);
      onBackToAllStories();
    } catch (err) {
      console.error("Failed to delete chapter:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Top Navigation Bar for Chapter Detail */}
      <div className="w-full flex items-center justify-between mb-6 pb-2 border-b border-[#232328]">
        <button
          type="button"
          onClick={onBackToAllStories}
          className="text-xs sm:text-sm font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-sm px-1 py-0.5 cursor-pointer"
          aria-label="Return to All Stories"
        >
          <span>←</span>
          <span>All Stories</span>
        </button>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-[#44444C] bg-[#141417] hover:border-[#D4D4D8] hover:bg-[#1A1A1E] text-xs font-doodle text-[#CCCCCC] hover:text-[#FFFFFF] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
            >
              <span>✎</span>
              <span>Edit Chapter</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs font-doodle text-[#77777D] hover:text-red-400 px-2 py-1 transition-colors cursor-pointer"
              title="Remove chapter"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </button>
          </div>
        )}
      </div>

      {/* Main Chapter Content Container (Quiet Hand-Drawn Parchment) */}
      <div className="w-full bg-[#141417] border border-[#2B2B32] rounded-2xl p-6 sm:p-10 shadow-md">
        {isEditing ? (
          /* =========================================================================
              EDIT MODE: In-place Hand-Drawn Editor (Updates existing chapter)
              ========================================================================= */
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#232328]">
              <div className="flex items-center gap-2 text-xs font-doodle text-[#8E8E93]">
                <DoodleQuill className="w-4 h-4" />
                <span>Editing Chapter {chapter.order_index}</span>
              </div>
              <span className="text-[10px] font-mono text-[#77777D]">
                Updates chapter in-place
              </span>
            </div>

            {/* Chapter Title */}
            <div>
              <label className="block text-xs font-doodle text-[#A1A1AA] mb-1">
                Chapter Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Sanctuary Foundation"
                className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3.5 py-2 text-sm text-[#F5F5F5] font-serif focus:outline-none focus:border-[#D4D4D8] transition-colors"
              />
            </div>

            {/* Period / Era */}
            <div>
              <label className="block text-xs font-doodle text-[#A1A1AA] mb-1">
                Time Period / Era
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. Autumn 2026, Year of Awakening"
                className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#F5F5F5] font-sans focus:outline-none focus:border-[#D4D4D8] transition-colors"
              />
            </div>

            {/* Narrative Description */}
            <div>
              <label className="block text-xs font-doodle text-[#A1A1AA] mb-1">
                Chapter Details &amp; Narrative
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What defined this chapter? Describe the events, architecture, work, or milestones..."
                className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#F5F5F5] font-sans focus:outline-none focus:border-[#D4D4D8] leading-relaxed transition-colors"
              />
            </div>

            {/* Learning Journey / Reflections */}
            <div>
              <label className="block text-xs font-doodle text-[#A1A1AA] mb-1">
                Learning Journey &amp; Personal Reflections
              </label>
              <textarea
                rows={4}
                value={reflections}
                onChange={(e) => setReflections(e.target.value)}
                placeholder="How did you grow? What surprised you? What quiet lesson will you carry forward?..."
                className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#F5F5F5] font-doodle italic focus:outline-none focus:border-[#D4D4D8] leading-relaxed transition-colors"
              />
            </div>

            {/* Milestones Manager */}
            <div className="pt-2 border-t border-[#232328]">
              <label className="block text-xs font-doodle text-[#A1A1AA] mb-2">
                Chapter Milestones ({milestones.length})
              </label>

              {milestones.length > 0 && (
                <div className="space-y-2 mb-3">
                  {milestones.map((ms, mIdx) => (
                    <div
                      key={mIdx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E0E10] border border-[#2B2B32] text-xs"
                    >
                      <div className="flex-1">
                        <span className="font-serif text-[#F5F5F5]">{ms.title}</span>
                        {ms.date && (
                          <span className="font-mono text-[10px] text-[#8E8E93] ml-2">
                            ({ms.date})
                          </span>
                        )}
                        {ms.notes && (
                          <p className="text-[11px] text-[#A1A1AA] mt-0.5 font-sans">
                            {ms.notes}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(mIdx)}
                        className="text-[#77777D] hover:text-red-400 p-1 transition-colors"
                        aria-label={`Remove milestone ${ms.title}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Milestone Inputs */}
              <div className="p-3 rounded-xl bg-[#0E0E10] border border-[#2B2B32] space-y-2">
                <span className="text-[11px] font-doodle text-[#8E8E93] block">
                  + Add milestone to chapter
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newMsTitle}
                    onChange={(e) => setNewMsTitle(e.target.value)}
                    placeholder="Milestone title"
                    className="w-full bg-[#141417] border border-[#3E3E48] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4D4D8]"
                  />
                  <input
                    type="text"
                    value={newMsDate}
                    onChange={(e) => setNewMsDate(e.target.value)}
                    placeholder="Date (e.g. 2026-10-02)"
                    className="w-full bg-[#141417] border border-[#3E3E48] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] font-mono focus:outline-none focus:border-[#D4D4D8]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMsNotes}
                    onChange={(e) => setNewMsNotes(e.target.value)}
                    placeholder="Optional notes or details"
                    className="flex-1 bg-[#141417] border border-[#3E3E48] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4D4D8]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-3 py-1.5 rounded-lg border border-[#3E3E48] hover:border-[#D4D4D8] bg-[#141417] text-xs font-doodle text-[#EAE6DF] hover:text-[#FFFFFF] transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-[#232328] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-1.5 rounded-full border border-[#3E3E48] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-1.5 rounded-full border border-[#D4D4D8] bg-[#F5F5F5] text-[#0E0E10] hover:bg-[#FFFFFF] text-xs font-doodle font-semibold transition-all cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          /* =========================================================================
              VIEW MODE: Quiet Personal Storybook Spread
              ========================================================================= */
          <div className="space-y-6">
            {/* Chapter Header */}
            <div>
              <div className="flex items-center gap-2 text-xs font-doodle text-[#8E8E93] tracking-wide mb-1">
                <span>Chapter {chapter.order_index}</span>
                {chapter.period && <span>• {chapter.period}</span>}
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif text-[#F5F5F5] font-normal tracking-wide leading-snug">
                {chapter.title}
              </h1>

              {/* Hand-drawn divider */}
              <div className="w-32 my-3">
                <DoodleDivider className="w-full h-2" />
              </div>
            </div>

            {/* Chapter Narrative Description */}
            {chapter.description ? (
              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-[#D4D4D8] font-sans leading-relaxed whitespace-pre-line">
                {chapter.description}
              </div>
            ) : (
              <p className="text-xs text-[#77777D] font-doodle italic">
                No narrative text inscribed for this chapter yet.
              </p>
            )}

            {/* Reflections & Learning Journey */}
            {chapter.reflections && (
              <div className="p-4 sm:p-5 rounded-xl bg-[#0E0E10] border border-[#2B2B32] space-y-2">
                <div className="flex items-center gap-2 text-xs font-doodle text-[#8E8E93]">
                  <DoodleQuill className="w-3.5 h-3.5" />
                  <span>Learning Journey &amp; Reflection</span>
                </div>
                <p className="text-xs sm:text-sm font-doodle text-[#EAE6DF] leading-relaxed italic whitespace-pre-line">
                  &ldquo;{chapter.reflections}&rdquo;
                </p>
              </div>
            )}

            {/* Milestones Timeline */}
            {chapter.milestones && chapter.milestones.length > 0 && (
              <div className="pt-4 border-t border-[#232328]">
                <h3 className="text-xs font-doodle text-[#8E8E93] tracking-wider mb-3 flex items-center gap-1.5">
                  <DoodleSparkle className="w-3.5 h-3.5" />
                  <span>Chapter Milestones</span>
                </h3>

                <div className="space-y-2.5">
                  {chapter.milestones.map((ms, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0E0E10] border border-[#2B2B32] flex items-start gap-3"
                    >
                      <span className="text-xs font-mono text-[#8E8E93] select-none pt-0.5">
                        ✦
                      </span>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between flex-wrap gap-1">
                          <h4 className="text-xs font-serif text-[#F5F5F5]">
                            {ms.title}
                          </h4>
                          {ms.date && (
                            <span className="text-[10px] font-mono text-[#77777D]">
                              {ms.date}
                            </span>
                          )}
                        </div>
                        {ms.notes && (
                          <p className="text-[11px] text-[#A1A1AA] mt-1 font-sans">
                            {ms.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chapter Metadata Footer */}
            <div className="pt-4 border-t border-[#232328] flex items-center justify-between text-[10px] font-mono text-[#77777D]">
              <span>Inscribed {new Date(chapter.created_at).toLocaleDateString()}</span>
              <span>Updated {new Date(chapter.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
