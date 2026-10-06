"use client";

import React from "react";
import { Achievement } from "@/lib/api";

interface AchievementSectionProps {
  achievements: Achievement[];
  isLoading: boolean;
}

export function AchievementSection({
  achievements,
  isLoading,
}: AchievementSectionProps) {
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <section
      aria-label="Garden Milestones and Keepsakes"
      className="w-full pt-6 pb-2"
    >
      {/* Section label */}
      <div className="flex items-center justify-between mb-3 select-none text-xs font-doodle text-[#8E8E93]">
        <div className="flex items-center gap-1.5">
          <span>✦</span>
          <span>keepsakes &amp; memories</span>
        </div>
        {achievements.length > 0 && (
          <span className="text-[#55555E]">
            {achievements.length}{" "}
            {achievements.length === 1 ? "preserved" : "preserved"}
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && achievements.length === 0 && (
        <div className="py-3 font-doodle text-xs text-[#6A6A72] italic">
          remembering milestones...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && achievements.length === 0 && (
        <p className="font-doodle text-xs text-[#6A6A72] italic">
          ~ quiet marks will appear here as intentions bloom ~
        </p>
      )}

      {/* Handwritten marks list */}
      {!isLoading && achievements.length > 0 && (
        <div className="space-y-1.5">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className="flex items-baseline gap-2 py-0.5 text-xs sm:text-sm"
            >
              <span
                className="font-doodle text-xs text-[#A1A1AA] select-none shrink-0"
                aria-hidden="true"
              >
                ✦
              </span>
              <span className="font-serif text-[#EAE6DF] font-medium">
                {ach.title}
              </span>
              <span className="text-[#77777D] font-doodle text-xs">
                — {ach.description}
              </span>
              <span className="text-[#55555E] text-[11px] font-mono shrink-0 ml-auto hidden sm:inline">
                {formatDate(ach.achieved_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
