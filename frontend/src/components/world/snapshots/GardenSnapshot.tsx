"use client";

import Link from "next/link";
import { GardenSnapshotState } from "@/lib/useDailySnapshot";

interface GardenSnapshotProps {
  garden: GardenSnapshotState;
}

export default function GardenSnapshot({ garden }: GardenSnapshotProps) {
  const {
    status,
    error,
    displayGoals,
    completedCount,
    totalCount,
    nearestDeadline,
    toggleGoal,
  } = garden;

  return (
    <div className="w-full max-w-sm mx-auto mt-3">
      {/* Environmental Container: The Seedling Slate / Slate Calendar */}
      <div className="relative rounded-2xl p-4 bg-[#18201A]/90 border border-[#2D3C2F]/80 shadow-md backdrop-blur-xs transition-all hover:border-[#86A868]/40">
        {/* Subtle woodgrain / slate texture accent */}
        <div className="absolute top-2 right-3 text-xs font-doodle text-[#86A868]/60 select-none pointer-events-none">
          ~ today&apos;s steps ~
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-sm select-none" role="img" aria-hidden="true">
              🌱
            </span>
            <h3 className="font-serif text-xs font-medium uppercase tracking-wider text-[#C8DCB8]">
              Today&apos;s Little Steps
            </h3>
          </div>

          {/* Simple Progress Indicator */}
          {status === "success" && totalCount > 0 && (
            <span className="text-[11px] font-sans text-[#A8C496] bg-[#233025] px-2 py-0.5 rounded-full border border-[#354837]">
              {completedCount} of {totalCount} nurtured
            </span>
          )}
        </div>

        {/* Nearest Deadline (if present) */}
        {status === "success" && nearestDeadline && (
          <div className="mb-2.5 px-2.5 py-1 rounded-lg bg-[#243026]/70 border border-[#374C3A]/60 flex items-center justify-between text-[11px] text-[#A6C492]">
            <span className="truncate pr-2">
              <span className="text-[#E5B458] mr-1">⏳</span>
              <span className="text-[#C5D9B6] font-medium">{nearestDeadline.goalTitle}</span>
            </span>
            <span
              className={`shrink-0 font-medium ${
                nearestDeadline.isToday
                  ? "text-[#E5B458]"
                  : nearestDeadline.isPast
                  ? "text-[#DE7A68]"
                  : "text-[#9EB88D]"
              }`}
            >
              {nearestDeadline.isToday ? "Due today" : nearestDeadline.formattedDate}
            </span>
          </div>
        )}

        {/* Dynamic Content States */}
        {status === "loading" && (
          <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading garden snapshot">
            <div className="h-6 rounded-md bg-[#253227]/60 animate-pulse" />
            <div className="h-6 rounded-md bg-[#253227]/40 animate-pulse" />
          </div>
        )}

        {status === "empty" && (
          <div className="py-2.5 text-center">
            <p className="text-xs text-[#9D978C] font-sans mb-2">
              The soil is quiet and ready for new seeds.
            </p>
            <Link
              href="/garden"
              className="inline-flex items-center text-xs text-[#86A868] hover:text-[#B6D695] font-serif transition-colors"
            >
              Plant a seedling in the Garden →
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="py-2 text-center">
            <p className="text-xs text-[#9D978C] mb-1.5 font-sans">
              {error || "The garden rests quietly."}
            </p>
            <Link
              href="/garden"
              className="inline-flex items-center text-xs text-[#86A868] hover:text-[#B6D695] font-serif transition-colors"
            >
              Open Garden of Tomorrow →
            </Link>
          </div>
        )}

        {status === "success" && displayGoals.length > 0 && (
          <ul className="space-y-1.5 mb-2.5" role="list">
            {displayGoals.map((goal) => {
              const isCompleted = goal.status === "completed";
              return (
                <li
                  key={goal.id}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-[#141A15]/60 hover:bg-[#1A231C] border border-[#263428]/60 transition-colors group"
                >
                  <label className="flex items-center space-x-2 text-xs cursor-pointer select-none flex-1 min-w-0 pr-2">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => toggleGoal(goal.id)}
                      aria-label={`Mark "${goal.title}" as ${isCompleted ? "incomplete" : "complete"}`}
                      className="w-3.5 h-3.5 rounded-xs accent-[#86A868] bg-[#1F2B21] border-[#3F5542] cursor-pointer focus:ring-1 focus:ring-[#86A868]"
                    />
                    <span
                      className={`truncate transition-colors ${
                        isCompleted
                          ? "line-through text-[#6F7F68]"
                          : "text-[#E0DCCE] group-hover:text-[#F2EFE8]"
                      }`}
                    >
                      {goal.title}
                    </span>
                  </label>

                  {goal.category && (
                    <span className="shrink-0 text-[10px] uppercase font-sans tracking-wider px-1.5 py-0.5 rounded-xs bg-[#243126] text-[#93B082] border border-[#334535]">
                      {goal.category}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-[#263428]/70 flex items-center justify-between text-xs">
          <Link
            href="/garden"
            className="text-xs text-[#86A868] hover:text-[#A7CE84] transition-colors inline-flex items-center gap-1 font-serif group"
          >
            <span>Tend in the Garden</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>

          {status === "success" && totalCount > 0 && (
            <span className="text-[11px] text-[#9D978C] font-sans">
              {completedCount === totalCount ? "✦ all nurtured" : `${completedCount}/${totalCount}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
