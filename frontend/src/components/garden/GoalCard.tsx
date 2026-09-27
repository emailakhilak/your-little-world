"use client";

import { useState } from "react";
import { Goal, GoalInstance, Reminder } from "@/lib/api";

interface GoalCardProps {
  goal: Goal;
  currentInstance?: GoalInstance | null;
  reminder?: Reminder | null;
  onToggleComplete: (id: string) => Promise<void>;
  onToggleInstanceComplete?: (instanceId: string) => Promise<void>;
  onToggleReminder?: (reminder: Reminder) => Promise<void>;
  onEdit: (goal: Goal) => void;
  onArchive: (id: string) => Promise<void>;
  onRestore: (goal: Goal) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function GoalCard({
  goal,
  currentInstance,
  reminder,
  onToggleComplete,
  onToggleInstanceComplete,
  onToggleReminder,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: GoalCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isTogglingReminder, setIsTogglingReminder] = useState(false);

  const isRecurring = Boolean(
    goal.recurrence_cadence && goal.recurrence_cadence !== "none"
  );

  // If recurring and has an occurrence for this period, check occurrence status
  const isInstanceCompleted = currentInstance?.status === "completed";
  const isGoalCompleted = goal.status === "completed";
  const isCompleted = isRecurring
    ? isInstanceCompleted
    : isGoalCompleted;

  const isArchived = goal.status === "archived";

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      if (isRecurring && currentInstance && onToggleInstanceComplete) {
        // Toggle the recurring occurrence without completing the parent recurring goal!
        await onToggleInstanceComplete(currentInstance.id);
      } else {
        await onToggleComplete(goal.id);
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (isArchiving) return;
    setIsArchiving(true);
    try {
      if (isArchived) {
        await onRestore(goal);
      } else {
        await onArchive(goal.id);
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleReminderToggle = async () => {
    if (!reminder || !onToggleReminder || isTogglingReminder) return;
    setIsTogglingReminder(true);
    try {
      await onToggleReminder(reminder);
    } finally {
      setIsTogglingReminder(false);
    }
  };

  // Format date helper
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return null;
    }
  };

  const targetDateFormatted = formatDate(goal.target_date);
  const plantedDateFormatted = formatDate(goal.created_at);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "habit":
        return { label: "Habit", prefix: "🌿" };
      case "milestone":
        return { label: "Milestone", prefix: "🌸" };
      case "aspiration":
        return { label: "Aspiration", prefix: "🌳" };
      default:
        return { label: "Seedling", prefix: "🌱" };
    }
  };

  const catMeta = getCategoryLabel(goal.category);

  return (
    <article
      className={`group relative w-full bg-[#181B22] border rounded-2xl p-5 sm:p-6 transition-all duration-200 shadow-sm flex flex-col justify-between ${
        isCompleted
          ? "border-[#252A34] bg-[#15171D]/90"
          : isArchived
          ? "border-[#2A2622] bg-[#161514]/90 opacity-80"
          : "border-[#2B303C] hover:border-[#86A868]/40 hover:bg-[#1A1D25]"
      }`}
      aria-label={`Goal: ${goal.title}`}
    >
      <div>
        {/* Top Header: Completion button, Emblem, Title, Action menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3.5 flex-1 min-w-0">
            {/* Tactile Completion Blossom Button */}
            {!isArchived ? (
              <button
                type="button"
                onClick={handleToggle}
                disabled={isToggling}
                role="checkbox"
                aria-checked={isCompleted}
                aria-label={
                  isCompleted
                    ? `Mark ${goal.title} occurrence as active`
                    : `Mark ${goal.title} occurrence as completed`
                }
                className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86A868] ${
                  isCompleted
                    ? "bg-[#252E22] border-[#86A868] text-[#86A868] shadow-xs"
                    : "bg-[#14161C] border-[#3B4252] text-transparent hover:border-[#86A868] hover:text-[#86A868]/40"
                }`}
              >
                {isCompleted ? (
                  <span className="text-xs select-none">🌸</span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current transition-colors select-none" />
                )}
              </button>
            ) : (
              <span className="mt-0.5 w-6 h-6 flex items-center justify-center text-sm select-none shrink-0">
                🍂
              </span>
            )}

            {/* Title & Notes */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-base select-none shrink-0" aria-hidden="true">
                  {goal.icon || "🌱"}
                </span>
                <h3
                  className={`font-serif text-base sm:text-lg font-medium leading-snug break-words ${
                    isCompleted
                      ? "line-through text-[#8C867B]"
                      : isArchived
                      ? "text-[#A89886]"
                      : "text-[#EAE6DF]"
                  }`}
                >
                  {goal.title}
                </h3>
              </div>

              {/* Description / Notes */}
              {goal.description && (
                <p className="mt-1.5 text-xs sm:text-sm text-[#9D978C] font-sans leading-relaxed line-clamp-3">
                  {goal.description}
                </p>
              )}

              {/* Recurring Occurrence Context Pill */}
              {isRecurring && currentInstance && !isArchived && (
                <div className="mt-2 flex items-center space-x-2 text-[11px] font-sans">
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full border ${
                      isInstanceCompleted
                        ? "bg-[#1C251D] border-[#86A868]/40 text-[#A4C982]"
                        : "bg-[#232018] border-[#E5B458]/40 text-[#E5B458]"
                    }`}
                  >
                    <span>{isInstanceCompleted ? "🌸" : "🌱"}</span>
                    <span>
                      {isInstanceCompleted
                        ? `Today's rhythm bloomed (${currentInstance.period_key})`
                        : `Today's rhythm ready to water`}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
            {!isArchived && (
              <button
                onClick={() => onEdit(goal)}
                className="p-1.5 rounded-lg text-[#9D978C] hover:text-[#EAE6DF] hover:bg-[#252B36] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#86A868]"
                aria-label={`Edit ${goal.title}`}
                title="Edit intention"
              >
                <span aria-hidden="true" className="text-xs">
                  ✏️
                </span>
              </button>
            )}

            <button
              onClick={handleArchiveToggle}
              disabled={isArchiving}
              className="p-1.5 rounded-lg text-[#9D978C] hover:text-[#D4AA85] hover:bg-[#2A231C] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#B3835B]"
              aria-label={
                isArchived
                  ? `Awaken ${goal.title} back to active plot`
                  : `Rest ${goal.title} in soil (archive)`
              }
              title={isArchived ? "Awaken to soil" : "Rest in soil (archive)"}
            >
              <span aria-hidden="true" className="text-xs">
                {isArchived ? "🌱" : "🍂"}
              </span>
            </button>

            <button
              onClick={() => onDelete(goal.id)}
              className="p-1.5 rounded-lg text-[#9D978C] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
              aria-label={`Delete ${goal.title}`}
              title="Pull seed (delete permanently)"
            >
              <span aria-hidden="true" className="text-xs">
                🗑️
              </span>
            </button>
          </div>
        </div>

        {/* Progress bar if multi-step goal (progress_target > 1) */}
        {goal.progress_target > 1 && (
          <div className="mt-3.5 pt-2.5 border-t border-[#232732]">
            <div className="flex justify-between items-center text-xs text-[#9D978C] mb-1">
              <span className="font-sans">Milestone Progress</span>
              <span className="font-serif italic text-[#86A868]">
                {goal.progress_current} / {goal.progress_target}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#12141A] rounded-full overflow-hidden border border-[#252A34]">
              <div
                className="h-full bg-[#86A868] transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((goal.progress_current / goal.progress_target) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Metadata Badges (Category, Cadence, Reminder, Dates) */}
      <div className="mt-4 pt-3 border-t border-[#232732] flex flex-wrap items-center justify-between gap-2 text-xs text-[#9D978C]">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Category Chip */}
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#14161C] border border-[#272C38] text-[#86A868] font-sans">
            <span aria-hidden="true">{catMeta.prefix}</span>
            <span>{catMeta.label}</span>
          </span>

          {/* Recurrence Cadence if set */}
          {goal.recurrence_cadence && goal.recurrence_cadence !== "none" && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#161C24] border border-[#2A3444] text-[#859FD4]">
              <span aria-hidden="true">⟳</span>
              <span className="capitalize">{goal.recurrence_cadence} Rhythm</span>
            </span>
          )}

          {/* Reminder Pill if configured */}
          {reminder && (
            <button
              type="button"
              onClick={handleReminderToggle}
              disabled={isTogglingReminder}
              title={`Click to ${reminder.is_enabled ? "mute" : "enable"} reminder`}
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                reminder.is_enabled
                  ? "bg-[#25231C] border-[#E5B458]/40 text-[#E5B458] hover:border-[#E5B458]"
                  : "bg-[#14161C] border-[#2A2B33] text-[#787D8A] line-through"
              }`}
            >
              <span>{reminder.is_enabled ? "🔔" : "🔕"}</span>
              <span className="font-mono text-[11px]">{reminder.reminder_time}</span>
            </button>
          )}

          {/* Priority chip if non-normal */}
          {goal.priority === "high" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#2A1D1C] border border-[#4D2725] text-amber-300 text-[10px] uppercase font-semibold tracking-wider">
              ✦ Focus
            </span>
          )}
        </div>

        {/* Target or Planted date */}
        <div className="flex items-center space-x-2 text-[11px] font-sans">
          {targetDateFormatted && (
            <span
              className={`inline-flex items-center space-x-1 ${
                isCompleted ? "text-[#8C867B]" : "text-[#E5B458]"
              }`}
            >
              <span aria-hidden="true">⏳</span>
              <span>Target: {targetDateFormatted}</span>
            </span>
          )}
          {!targetDateFormatted && plantedDateFormatted && (
            <span className="text-[#8C867B] italic font-serif">
              Planted {plantedDateFormatted}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
