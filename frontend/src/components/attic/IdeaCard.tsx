"use client";

import React from "react";
import { Note } from "@/lib/api";

interface IdeaCardProps {
  note: Note;
  onClick: (note: Note) => void;
}

export default function IdeaCard({ note, onClick }: IdeaCardProps) {
  return (
    <article
      onClick={() => onClick(note)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(note);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Idea: ${note.title}. Click to view details and edit`}
      className="group relative bg-[#141417] border border-[#2B2B32] hover:border-[#D4D4D8] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] shadow-xs text-left"
    >
      {/* Corner Deckle / Fold Accent */}
      <div
        className="absolute top-2 right-2 text-[9px] font-mono text-[#3E3E48] group-hover:text-[#8E8E93] transition-colors pointer-events-none select-none"
        aria-hidden="true"
      >
        ◺
      </div>

      <div>
        {/* Header Line: Pin indicator & updated date */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#77777D] mb-1.5">
          <span>
            {note.is_pinned && <span title="Pinned to top" className="mr-1">📌</span>}
            {note.category !== "idea" && (
              <span className="font-doodle text-[#8E8E93]">{note.category}</span>
            )}
          </span>
          <span className="text-[10px]">
            {new Date(note.updated_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-base text-[#F5F5F5] font-normal group-hover:text-[#FFFFFF] leading-snug mb-2 transition-colors">
          {note.title}
        </h3>

        {/* Short Content Preview */}
        <p className="text-xs text-[#A1A1AA] leading-relaxed line-clamp-3 font-sans mb-3 whitespace-pre-line">
          {note.content}
        </p>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.tags.slice(0, 3).map((t, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono text-[#8E8E93] bg-[#0E0E10] px-1.5 py-0.5 rounded border border-[#232328]"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Subtle reading prompt */}
      <div className="pt-2.5 border-t border-[#232328] flex items-center justify-between text-[11px] font-doodle text-[#8E8E93]">
        <span className="text-[10px] text-[#77777D]">
          {note.is_archived ? "archived" : "open"}
        </span>
        <span className="group-hover:text-[#FFFFFF] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
          <span>read &amp; edit</span>
          <span>→</span>
        </span>
      </div>
    </article>
  );
}
