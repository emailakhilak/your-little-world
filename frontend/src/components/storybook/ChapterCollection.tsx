"use client";

import React from "react";
import { StoryChapter } from "@/lib/api";
import { DoodleQuill } from "./StoryDoodles";

interface ChapterCollectionProps {
  chapters: StoryChapter[];
  onSelectChapter: (chapter: StoryChapter) => void;
  onNewChapter: () => void;
  onBackToHome: () => void;
}

export default function ChapterCollection({
  chapters,
  onSelectChapter,
  onNewChapter,
  onBackToHome,
}: ChapterCollectionProps) {
  return (
    <section className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Navigation Sub-bar */}
      <div className="w-full flex items-center justify-between mb-6 pb-2 border-b border-[#232328]">
        <button
          type="button"
          onClick={onBackToHome}
          className="text-xs sm:text-sm font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-sm px-1 py-0.5"
          aria-label="Return to StoryBook Home"
        >
          <span>←</span>
          <span>StoryBook Home</span>
        </button>

        <button
          type="button"
          onClick={onNewChapter}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-[#44444C] bg-[#141417] hover:border-[#D4D4D8] hover:bg-[#1A1A1E] text-xs font-doodle text-[#CCCCCC] hover:text-[#FFFFFF] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
        >
          <span>+</span>
          <span>Inscribe Chapter</span>
        </button>
      </div>

      {/* Collection Heading */}
      <div className="w-full text-left mb-6">
        <h2 className="text-xl sm:text-2xl font-serif text-[#F5F5F5] font-normal tracking-wide">
          All Stories
        </h2>
        <p className="text-xs font-doodle text-[#8E8E93] tracking-wide mt-1">
          {chapters.length === 1
            ? "1 personal chapter recorded in quiet ink"
            : `${chapters.length} personal chapters recorded in quiet ink`}
        </p>
      </div>

      {/* Chapters Grid */}
      {chapters.length === 0 ? (
        <div className="w-full bg-[#141417] border border-[#2B2B32] rounded-2xl p-10 text-center my-6">
          <DoodleQuill className="w-8 h-8 mx-auto text-[#77777D] mb-3" />
          <h3 className="text-base font-serif text-[#EAE6DF] mb-2 font-normal">
            No chapters penned yet
          </h3>
          <p className="text-xs font-doodle text-[#8E8E93] mb-5">
            Your collection is waiting for its first story.
          </p>
          <button
            type="button"
            onClick={onNewChapter}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-dashed border-[#5A5A62] bg-[#0E0E10] hover:border-[#FFFFFF] text-xs font-doodle text-[#F5F5F5] transition-all"
          >
            <span>+</span>
            <span>Inscribe Chapter One</span>
          </button>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((ch, idx) => (
            <article
              key={ch.id}
              onClick={() => onSelectChapter(ch)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectChapter(ch);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Chapter ${ch.order_index || idx + 1}: ${ch.title}`}
              className="group relative bg-[#141417] border border-[#2B2B32] hover:border-[#D4D4D8] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] shadow-xs"
            >
              {/* Paper Deckle Corner Doodle Accent */}
              <div
                className="absolute top-2 right-2 text-[9px] font-mono text-[#3E3E48] group-hover:text-[#8E8E93] transition-colors select-none pointer-events-none"
                aria-hidden="true"
              >
                ◺
              </div>

              <div>
                {/* Chapter Number & Period */}
                <div className="flex items-center justify-between text-[11px] font-doodle text-[#8E8E93] mb-1.5">
                  <span>Chapter {ch.order_index || idx + 1}</span>
                  {ch.period && <span className="font-sans text-[10px] text-[#77777D]">{ch.period}</span>}
                </div>

                {/* Chapter Title */}
                <h3 className="font-serif text-base text-[#F5F5F5] font-normal group-hover:text-[#FFFFFF] transition-colors leading-snug mb-2">
                  {ch.title}
                </h3>

                {/* Description Snippet */}
                {ch.description && (
                  <p className="text-xs text-[#A1A1AA] leading-relaxed line-clamp-3 mb-3 font-sans">
                    {ch.description}
                  </p>
                )}

                {/* Reflection Snippet */}
                {ch.reflections && (
                  <p className="text-[11px] font-doodle text-[#8E8E93] italic line-clamp-2 mb-3">
                    &ldquo;{ch.reflections}&rdquo;
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-[#232328] flex items-center justify-between text-[11px]">
                <span className="font-mono text-[10px] text-[#77777D]">
                  {ch.milestones && ch.milestones.length > 0
                    ? `✦ ${ch.milestones.length} milestone${ch.milestones.length === 1 ? "" : "s"}`
                    : "milestone"}
                </span>

                <span className="font-doodle text-[#CCCCCC] group-hover:text-[#FFFFFF] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                  <span>open</span>
                  <span>→</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
