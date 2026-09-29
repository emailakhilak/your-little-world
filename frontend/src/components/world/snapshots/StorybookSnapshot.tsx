"use client";

import Link from "next/link";
import { StorybookSnapshotState } from "@/lib/useDailySnapshot";

interface StorybookSnapshotProps {
  storybook: StorybookSnapshotState;
}

export default function StorybookSnapshot({ storybook }: StorybookSnapshotProps) {
  const { status, error, recentAchievement, recentProject, recentChapter } = storybook;

  return (
    <div className="w-full max-w-sm mx-auto mt-3">
      {/* Environmental Container: Chronicle Silk Ribbon on the Wooden Lectern */}
      <div className="relative rounded-2xl p-4 bg-[#201817]/90 border border-[#382522]/80 shadow-md backdrop-blur-xs transition-all hover:border-[#BA533C]/40">
        {/* Subtle Milestone Ribbon Doodle Accent */}
        <div className="absolute top-2 right-3 text-xs font-doodle text-[#BA533C]/70 select-none pointer-events-none">
          ~ chronicle ~
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-sm select-none" role="img" aria-hidden="true">
              📖
            </span>
            <h3 className="font-serif text-xs font-medium uppercase tracking-wider text-[#E8B2A7]">
              Journey &amp; Progress
            </h3>
          </div>

          <span className="text-[11px] font-sans text-[#D98777] bg-[#2E1E1C] px-2 py-0.5 rounded-full border border-[#442824]">
            pathway
          </span>
        </div>

        {/* Dynamic Content States */}
        {status === "loading" && (
          <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading storybook progress">
            <div className="h-6 rounded-md bg-[#2D201E]/60 animate-pulse" />
            <div className="h-6 rounded-md bg-[#2D201E]/40 animate-pulse" />
          </div>
        )}

        {status === "empty" && (
          <div className="py-2.5 text-center">
            <p className="text-xs text-[#9D978C] font-sans mb-2">
              The chronicle is open to its first page. Projects and milestones will appear here.
            </p>
            <Link
              href="/storybook"
              className="inline-flex items-center text-xs text-[#BA533C] hover:text-[#E87A64] font-serif transition-colors"
            >
              Open the Storybook →
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="py-2 text-center">
            <p className="text-xs text-[#9D978C] mb-1.5 font-sans">
              {error || "The chronicle rests in quiet ink."}
            </p>
            <Link
              href="/storybook"
              className="inline-flex items-center text-xs text-[#BA533C] hover:text-[#E87A64] font-serif transition-colors"
            >
              View the Storybook →
            </Link>
          </div>
        )}

        {status === "success" && (recentAchievement || recentProject || recentChapter) && (
          <Link
            href="/storybook"
            className="block p-2.5 rounded-xl bg-[#140F0E]/60 hover:bg-[#221715] border border-[#2D1B18]/60 transition-colors group mb-2.5"
          >
            {/* Priority 1: Recent Achievement Earned */}
            {recentAchievement && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1 text-[#E5B458]">
                  <span className="flex items-center space-x-1 font-sans">
                    <span>{recentAchievement.icon || "🏆"}</span>
                    <span>Recent Milestone</span>
                  </span>
                  <span className="text-[10px] text-[#A89880] font-sans">
                    earned
                  </span>
                </div>
                <h4 className="text-xs font-serif text-[#EAE6DF] group-hover:text-[#F0B0A2] transition-colors line-clamp-1">
                  {recentAchievement.title}
                </h4>
                <p className="text-[11px] text-[#A89F93] line-clamp-1 font-sans mt-0.5">
                  {recentAchievement.description}
                </p>
              </div>
            )}

            {/* Priority 2: Recent Project (if no achievement) */}
            {!recentAchievement && recentProject && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1 text-[#D98777]">
                  <span className="flex items-center space-x-1 font-sans">
                    <span>🌿</span>
                    <span>Project in Progress</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#A89880] font-sans">
                    {recentProject.status.replace("_", " ")}
                  </span>
                </div>
                <h4 className="text-xs font-serif text-[#EAE6DF] group-hover:text-[#F0B0A2] transition-colors line-clamp-1">
                  {recentProject.title}
                </h4>
                {recentProject.technologies && recentProject.technologies.length > 0 && (
                  <p className="text-[11px] text-[#A89F93] line-clamp-1 font-sans mt-0.5">
                    {recentProject.technologies.slice(0, 3).join(" • ")}
                  </p>
                )}
              </div>
            )}

            {/* Priority 3: Recent Chapter (if neither) */}
            {!recentAchievement && !recentProject && recentChapter && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1 text-[#D98777]">
                  <span className="flex items-center space-x-1 font-sans">
                    <span>📜</span>
                    <span>Chapter Milestone</span>
                  </span>
                  {recentChapter.period && (
                    <span className="text-[10px] text-[#A89880] font-sans">
                      {recentChapter.period}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-serif text-[#EAE6DF] group-hover:text-[#F0B0A2] transition-colors line-clamp-1">
                  {recentChapter.title}
                </h4>
              </div>
            )}
          </Link>
        )}

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-[#2D1B18]/70 flex items-center justify-between text-xs">
          <Link
            href="/storybook"
            className="text-xs text-[#BA533C] hover:text-[#E87A64] transition-colors inline-flex items-center gap-1 font-serif group"
          >
            <span>Read your Storybook</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>

          <span className="text-[11px] text-[#9D978C] font-sans">
            milestones
          </span>
        </div>
      </div>
    </div>
  );
}
