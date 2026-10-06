"use client";

import React, { useState } from "react";
import { StoryChapter } from "@/lib/api";
import { DoodleDivider, DoodleQuill } from "./StoryDoodles";

interface StoryBookCoverProps {
  chapters: StoryChapter[];
  onSelectChapter: (chapter: StoryChapter) => void;
  onNewChapter: () => void;
}

export default function StoryBookCover({
  chapters,
  onSelectChapter,
  onNewChapter,
}: StoryBookCoverProps) {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const chapter = chapters.length > 0 ? chapters[Math.min(activeIdx, chapters.length - 1)] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : chapters.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev < chapters.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {chapter ? (
        <article
          onClick={() => onSelectChapter(chapter)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectChapter(chapter);
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`Story: ${chapter.title}. Click to read chapter details`}
          className="group relative w-full bg-[#141417] text-[#EAE6DF] rounded-2xl p-6 sm:p-10 border border-[#2B2B32] hover:border-[#D4D4D8] transition-all duration-300 shadow-md cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
        >
          {/* Hand-drawn Spine / Binding Stitch (Left Edge) */}
          <div
            className="absolute left-2.5 top-6 bottom-6 w-0.5 border-r border-dashed border-[#3E3E48] hidden sm:block"
            aria-hidden="true"
          />

          {/* Hand-drawn Corner Accents */}
          <div
            className="absolute top-2.5 left-2.5 text-[10px] font-doodle text-[#3E3E48] group-hover:text-[#8E8E93] transition-colors pointer-events-none select-none"
            aria-hidden="true"
          >
            ┌
          </div>
          <div
            className="absolute top-2.5 right-2.5 text-[10px] font-doodle text-[#3E3E48] group-hover:text-[#8E8E93] transition-colors pointer-events-none select-none"
            aria-hidden="true"
          >
            ┐
          </div>
          <div
            className="absolute bottom-2.5 left-2.5 text-[10px] font-doodle text-[#3E3E48] group-hover:text-[#8E8E93] transition-colors pointer-events-none select-none"
            aria-hidden="true"
          >
            └
          </div>
          <div
            className="absolute bottom-2.5 right-2.5 text-[10px] font-doodle text-[#3E3E48] group-hover:text-[#8E8E93] transition-colors pointer-events-none select-none"
            aria-hidden="true"
          >
            ┘
          </div>

          <div className="sm:pl-4">
            {/* Chapter Header Line */}
            <div className="flex items-center justify-between text-xs font-doodle text-[#8E8E93] tracking-wide mb-2">
              <span>
                Chapter {chapter.order_index || activeIdx + 1}
                {chapter.period ? ` • ${chapter.period}` : ""}
              </span>
              {chapters.length > 1 && (
                <span className="text-[11px] font-mono text-[#77777D]">
                  {activeIdx + 1} of {chapters.length}
                </span>
              )}
            </div>

            {/* Chapter Title */}
            <h2 className="text-xl sm:text-2xl font-serif text-[#F5F5F5] font-normal leading-snug group-hover:text-[#FFFFFF] transition-colors">
              {chapter.title}
            </h2>

            {/* Subtle Sketch Divider */}
            <div className="w-24 sm:w-32 my-3">
              <DoodleDivider className="w-full h-2" />
            </div>

            {/* Chapter Description Excerpt */}
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed line-clamp-4 font-sans mb-4">
              {chapter.description || "A quiet chapter in your journey."}
            </p>

            {/* Reflection Excerpt */}
            {chapter.reflections && (
              <div className="p-3 rounded-xl bg-[#0E0E10] border border-[#2B2B32] text-xs font-doodle text-[#CCCCCC] italic mb-4 leading-relaxed">
                &ldquo;{chapter.reflections}&rdquo;
              </div>
            )}

            {/* Bottom Story Action & Navigation */}
            <div className="flex items-center justify-between pt-3 border-t border-[#232328] text-xs">
              <span className="font-doodle text-[#EAE6DF] group-hover:underline flex items-center gap-1">
                <span>Read Chapter</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>

              {chapters.length > 1 && (
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous story in preview"
                    className="px-2 py-0.5 rounded border border-[#2B2B32] hover:border-[#8E8E93] bg-[#0E0E10] text-[#A1A1AA] hover:text-[#FFFFFF] text-xs font-mono transition-colors"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next story in preview"
                    className="px-2 py-0.5 rounded border border-[#2B2B32] hover:border-[#8E8E93] bg-[#0E0E10] text-[#A1A1AA] hover:text-[#FFFFFF] text-xs font-mono transition-colors"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </article>
      ) : (
        /* Empty State / Unwritten Storybook Spread */
        <div className="w-full bg-[#141417] text-[#EAE6DF] rounded-2xl p-8 sm:p-12 border border-[#2B2B32] text-center shadow-md">
          <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center text-[#8E8E93]">
            <DoodleQuill className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif text-[#F5F5F5] font-normal mb-2">
            The Story Begins
          </h2>
          <p className="text-xs sm:text-sm text-[#8E8E93] font-doodle max-w-sm mx-auto mb-5 leading-relaxed">
            The parchment is quiet and waiting. Inscribe your first milestone, lesson, or chapter.
          </p>
          <button
            type="button"
            onClick={onNewChapter}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-dashed border-[#5A5A62] bg-[#0E0E10] hover:border-[#FFFFFF] hover:bg-[#1A1A1E] text-xs sm:text-sm font-doodle text-[#F5F5F5] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
          >
            <span>+</span>
            <span>Inscribe Chapter One</span>
          </button>
        </div>
      )}
    </div>
  );
}
