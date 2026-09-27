"use client";

import React from "react";
import { Achievement } from "@/lib/api";
import { AchievementCard } from "./AchievementCard";

interface AchievementSectionProps {
  achievements: Achievement[];
  isLoading: boolean;
}

export function AchievementSection({
  achievements,
  isLoading,
}: AchievementSectionProps) {
  return (
    <section
      aria-label="Garden Milestones and Keepsakes"
      className="w-full mt-10 sm:mt-14 pt-8 border-t border-[#252A34]/70"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-doodle text-[#86A868] select-none">
            <span>✦</span>
            <span>little milestones</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#EAE6DF] font-medium mt-1">
            Garden Keepsakes
          </h2>
          <p className="text-xs sm:text-sm text-[#9D978C] font-sans mt-1 max-w-xl leading-relaxed">
            Quiet memories of intentions fulfilled, cadences kept, and growth nurtured over time.
          </p>
        </div>

        {achievements.length > 0 && (
          <div className="text-xs text-[#8C9AA8] font-sans bg-[#1A1D24] border border-[#2B303C]/80 px-3 py-1 rounded-full shrink-0 self-start sm:self-auto">
            <span className="text-[#86A868] font-medium font-serif">{achievements.length}</span>{" "}
            {achievements.length === 1 ? "milestone preserved" : "milestones preserved"}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && achievements.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4" aria-live="polite">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-[#181B22]/70 border border-[#252A34] rounded-2xl p-5 flex items-start space-x-4 animate-pulse"
            >
              <div className="w-10 h-10 rounded-xl bg-[#252B36] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#252B36] rounded w-2/5" />
                <div className="h-3 bg-[#1F232D] rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && achievements.length === 0 && (
        <div className="w-full bg-[#181B22]/40 border border-[#252A34]/60 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
          <div
            className="w-12 h-12 mx-auto rounded-full bg-[#202722]/50 border border-[#86A868]/20 flex items-center justify-center text-xl mb-3 text-[#86A868]/80 select-none shadow-inner"
            aria-hidden="true"
          >
            ✦
          </div>
          <h3 className="font-serif text-lg text-[#EAE6DF] font-medium mb-1">
            Nothing tucked away here yet.
          </h3>
          <p className="text-xs sm:text-sm text-[#9D978C] font-sans max-w-sm mx-auto leading-relaxed">
            Keep growing. Little milestones will find their way here as you complete intentions and gentle daily cadences.
          </p>
        </div>
      )}

      {/* Achievements Grid */}
      {!isLoading && achievements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {achievements.map((ach) => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      )}
    </section>
  );
}
