"use client";

import { useState } from "react";
import { Goal, GoalInstance, Reminder } from "@/lib/api";
import {
  DoodleCheckbox,
  DoodleDeleteIcon,
  DoodleEditIcon,
  DoodleScratchThrough,
  DoodleSelectCheckbox,
} from "./GardenDoodles";

interface GoalCardProps {
  goal: Goal;
  currentInstance?: GoalInstance | null;
  reminder?: Reminder | null;
  onToggleComplete: (id: string) => Promise<void>;
  onToggleInstanceComplete?: (instanceId: string) => Promise<void>;
  onToggleReminder?: (reminder: Reminder) => Promise<void>;
  onEdit: (goal: Goal) => void;
  onArchive?: (id: string) => Promise<void>;
  onRestore?: (goal: Goal) => Promise<void>;
  onDelete: (id: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

/**
 * Formats a 24-hr time string (e.g. "20:00" or "09:00") into a friendly 12-hr format (e.g. "8:00 PM" or "9:00 AM").
 */
function formatReminderTime(timeStr?: string | null): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minPad = minute < 10 ? `0${minute}` : `${minute}`;
  return `${hour12}:${minPad} ${ampm}`;
}

export default function GoalCard({
  goal,
  currentInstance,
  reminder,
  onToggleComplete,
  onToggleInstanceComplete,
  onEdit,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: GoalCardProps) {
  const [isToggling, setIsToggling] = useState(false);

  const isRecurring = Boolean(
    goal.recurrence_cadence && goal.recurrence_cadence !== "none"
  );

  // If recurring and has an occurrence for this period, check occurrence status
  const isInstanceCompleted = currentInstance?.status === "completed";
  const isGoalCompleted = goal.status === "completed";
  const isCompleted = isRecurring ? isInstanceCompleted : isGoalCompleted;
  const isArchived = goal.status === "archived";

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      if (isRecurring && currentInstance && onToggleInstanceComplete) {
        await onToggleInstanceComplete(currentInstance.id);
      } else {
        await onToggleComplete(goal.id);
      }
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      onClick={
        isSelectionMode
          ? () => onToggleSelect?.(goal.id)
          : undefined
      }
      className={`w-full py-3.5 sm:py-4 px-3 sm:px-4 rounded-xl border transition-all flex items-start justify-between gap-3 group my-1.5 ${
        isSelected
          ? "border-[#5E5E6C] bg-[#16161C]/90 shadow-md ring-1 ring-[#5E5E6C]/50"
          : "border-[#2B2B32]/70 bg-[#101014]/50 hover:border-[#3E3E48]"
      } ${isArchived ? "opacity-60" : "opacity-100"} ${
        isSelectionMode ? "cursor-pointer" : ""
      }`}
      aria-label={`Intention: ${goal.title}`}
    >
      <div className="flex items-start space-x-3 sm:space-x-3.5 flex-1 min-w-0">
        {/* Selection Checkbox (visible during selection mode) */}
        {isSelectionMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(goal.id);
            }}
            role="checkbox"
            aria-checked={isSelected}
            aria-label={
              isSelected
                ? `Deselect "${goal.title}"`
                : `Select "${goal.title}"`
            }
            className={`mt-0.5 p-0.5 rounded-xs transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#EAE6DF] ${
              isSelected
                ? "text-[#EAE6DF]"
                : "text-[#55555E] hover:text-[#9D978C]"
            }`}
            title={isSelected ? "Deselect" : "Select"}
          >
            <DoodleSelectCheckbox selected={Boolean(isSelected)} className="w-5 h-5" />
          </button>
        )}

        {/* Doodle-style Completion Checkbox (☐ / ☑) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          disabled={isToggling}
          role="checkbox"
          aria-checked={isCompleted}
          aria-label={
            isCompleted
              ? `Mark "${goal.title}" as incomplete`
              : `Mark "${goal.title}" as completed`
          }
          className={`mt-0.5 p-0.5 rounded-xs transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#86A868] ${
            isCompleted
              ? "text-[#86A868] hover:text-[#9ECB7C]"
              : "text-[#737885] hover:text-[#CDE6B5]"
          }`}
          title={isCompleted ? "Mark incomplete" : "Mark complete"}
        >
          <DoodleCheckbox checked={isCompleted} className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Title Row with Hand-written Scratch-Through when completed */}
          <div className="relative inline-block max-w-full">
            <span
              className={`font-serif text-base sm:text-lg leading-snug break-words transition-colors ${
                isCompleted
                  ? "text-[#8C867B]"
                  : isArchived
                  ? "text-[#8E8E93]"
                  : "text-[#EAE6DF]"
              }`}
            >
              {goal.title}
            </span>

            {/* Hand-written pen scratch across title */}
            {isCompleted && <DoodleScratchThrough />}
          </div>

          {/* Optional Notes */}
          {goal.description && (
            <p className="text-xs font-doodle text-[#8E8E93] italic whitespace-pre-wrap leading-relaxed">
              {goal.description}
            </p>
          )}

          {/* Optional Reminder */}
          {reminder && reminder.is_enabled && (
            <div className="flex items-center gap-1.5 text-xs font-doodle text-[#8E8E93] pt-0.5 select-none">
              <span>🔔</span>
              <span>{formatReminderTime(reminder.reminder_time)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Obvious but subtle Edit (✎) and Delete (🗑) controls */}
      <div className="flex items-center space-x-1.5 shrink-0 pt-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(goal);
          }}
          className="p-1.5 rounded-md text-[#77777D] hover:text-[#FFFFFF] hover:bg-[#1E1E24] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
          aria-label={`Edit ${goal.title}`}
          title="Edit intention (✎)"
        >
          <DoodleEditIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(goal.id);
          }}
          className="p-1.5 rounded-md text-[#77777D] hover:text-[#E07A7A] hover:bg-[#251616] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
          aria-label={`Delete ${goal.title}`}
          title="Delete intention (🗑)"
        >
          <DoodleDeleteIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
