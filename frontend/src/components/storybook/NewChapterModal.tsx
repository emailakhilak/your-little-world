"use client";

import React, { useState } from "react";
import { StoryChapterCreateInput } from "@/lib/api";
import { DoodleQuill } from "./StoryDoodles";

interface NewChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StoryChapterCreateInput) => Promise<void>;
  orderIndex: number;
}

export default function NewChapterModal({
  isOpen,
  onClose,
  onSubmit,
  orderIndex,
}: NewChapterModalProps) {
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");
  const [reflections, setReflections] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        period: period.trim() || null,
        description: description.trim() || null,
        reflections: reflections.trim() || null,
        order_index: orderIndex,
      });
      setTitle("");
      setPeriod("");
      setDescription("");
      setReflections("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-chapter-title"
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none"
    >
      <div className="bg-[#141417] border border-[#2B2B32] rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-xs font-mono text-[#8E8E93] hover:text-[#FFFFFF] transition-colors p-1"
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-1">
          <DoodleQuill className="w-5 h-5 text-[#EAE6DF]" />
          <h2 id="new-chapter-title" className="font-serif text-xl text-[#F5F5F5] font-normal">
            Inscribe a New Chapter
          </h2>
        </div>
        <p className="text-xs font-doodle text-[#8E8E93] mb-6">
          Mark a new milestone in your journey — personal, technical, or creative.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-doodle text-[#A1A1AA] mb-1">
              Chapter Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Venturing into Systems Architecture"
              className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F5F5F5] font-serif focus:outline-none focus:border-[#D4D4D8]"
            />
          </div>

          <div>
            <label className="block font-doodle text-[#A1A1AA] mb-1">
              Time Period / Era
            </label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. Autumn 2026, Year of Awakening"
              className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] font-sans focus:outline-none focus:border-[#D4D4D8]"
            />
          </div>

          <div>
            <label className="block font-doodle text-[#A1A1AA] mb-1">
              Chapter Narrative &amp; Details
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What defined this chapter of work, craft, and life?..."
              className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] font-sans focus:outline-none focus:border-[#D4D4D8]"
            />
          </div>

          <div>
            <label className="block font-doodle text-[#A1A1AA] mb-1">
              Personal Reflection &amp; Lessons
            </label>
            <textarea
              rows={3}
              value={reflections}
              onChange={(e) => setReflections(e.target.value)}
              placeholder="How did you grow? What surprised you?..."
              className="w-full bg-[#0E0E10] border border-[#3E3E48] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] font-doodle italic focus:outline-none focus:border-[#D4D4D8]"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#232328]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full border border-[#3E3E48] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-1.5 rounded-full border border-[#D4D4D8] bg-[#F5F5F5] text-[#0E0E10] hover:bg-[#FFFFFF] text-xs font-doodle font-semibold transition-all cursor-pointer"
            >
              {isSubmitting ? "Inscribing..." : "Inscribe Chapter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
