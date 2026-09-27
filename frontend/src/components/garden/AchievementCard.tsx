"use client";

import React from "react";
import { Achievement } from "@/lib/api";

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  // Format the achieved date cleanly
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(achievement.achieved_at);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Sometime ago";
    }
  }, [achievement.achieved_at]);

  const categoryLabel: Record<string, string> = {
    milestone: "Milestone",
    recurring: "Cadence",
    progress: "Deep Work",
    goal: "Intention",
    personal: "Keepsake",
  };

  return (
    <article
      aria-label={`Milestone: ${achievement.title}`}
      className="group relative bg-[#181B22]/80 hover:bg-[#1C2028] border border-[#2B303C]/70 hover:border-[#86A868]/40 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 sm:space-x-4 shadow-sm transition-all duration-200"
    >
      {/* Icon Emblem */}
      <div
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#202722] border border-[#86A868]/30 flex items-center justify-center text-xl sm:text-2xl shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200 select-none"
        aria-hidden="true"
      >
        {achievement.icon || "🌱"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-base sm:text-lg text-[#EAE6DF] font-medium leading-snug truncate">
            {achievement.title}
          </h3>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#252B36]/80 text-[#8C9AA8] font-sans font-medium shrink-0">
            {categoryLabel[achievement.category] || achievement.category}
          </span>
        </div>

        <p className="font-sans text-xs sm:text-sm text-[#9D978C] mt-1 leading-relaxed">
          {achievement.description}
        </p>

        {/* Milestone Date / Signature */}
        <div className="mt-2.5 flex items-center space-x-2 text-[11px] text-[#86A868]/80 font-doodle select-none">
          <span>✦</span>
          <span>Preserved on {formattedDate}</span>
        </div>
      </div>
    </article>
  );
}
