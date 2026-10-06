"use client";

import { useEffect, useState } from "react";
import { Goal, GoalCreateInput, GoalUpdateInput, Reminder } from "@/lib/api";

export interface ReminderConfigData {
  enabled: boolean;
  time: string;
  timezone: string;
}

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: GoalCreateInput | GoalUpdateInput,
    reminderData?: ReminderConfigData
  ) => Promise<void>;
  initialGoal?: Goal | null;
  initialReminder?: Reminder | null;
  targetPeriod?: "all" | "daily" | "weekly" | "monthly" | "long_term";
}

export default function GoalFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialGoal,
  initialReminder,
  targetPeriod = "daily",
}: GoalFormModalProps) {
  if (!isOpen) return null;

  return (
    <GoalFormInner
      key={initialGoal ? initialGoal.id : `new-${targetPeriod}`}
      onClose={onClose}
      onSubmit={onSubmit}
      initialGoal={initialGoal}
      initialReminder={initialReminder}
      targetPeriod={targetPeriod}
    />
  );
}

interface GoalFormInnerProps {
  onClose: () => void;
  onSubmit: (
    data: GoalCreateInput | GoalUpdateInput,
    reminderData?: ReminderConfigData
  ) => Promise<void>;
  initialGoal?: Goal | null;
  initialReminder?: Reminder | null;
  targetPeriod: "all" | "daily" | "weekly" | "monthly" | "long_term";
}

function GoalFormInner({
  onClose,
  onSubmit,
  initialGoal,
  initialReminder,
  targetPeriod,
}: GoalFormInnerProps) {
  const isEditing = Boolean(initialGoal);

  // User-visible notebook fields
  const [title, setTitle] = useState(initialGoal?.title || "");
  const [description, setDescription] = useState(initialGoal?.description || "");

  // Reminder configuration
  const [enableReminder, setEnableReminder] = useState(
    initialReminder ? initialReminder.is_enabled : false
  );
  const [reminderTime, setReminderTime] = useState(
    initialReminder?.reminder_time || "20:00"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Please enter what you are growing.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Determine sensible defaults based on targetPeriod if creating, or preserve existing if editing
      let cadence: string | null = null;
      let category = "seedling";

      if (isEditing && initialGoal) {
        cadence = initialGoal.recurrence_cadence ?? null;
        category = initialGoal.category;
      } else {
        switch (targetPeriod) {
          case "daily":
            cadence = "daily";
            category = "habit";
            break;
          case "weekly":
            cadence = "weekly";
            category = "seedling";
            break;
          case "monthly":
            cadence = "monthly";
            category = "seedling";
            break;
          case "long_term":
            cadence = "none";
            category = "aspiration";
            break;
          case "all":
          default:
            cadence = "daily";
            category = "habit";
            break;
        }
      }

      const payload: GoalCreateInput | GoalUpdateInput = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        category,
        recurrence_cadence: cadence !== "none" ? cadence : null,
        icon: initialGoal?.icon || "🌱",
        priority: initialGoal?.priority || "normal",
        progress_target: initialGoal?.progress_target || 1,
        target_date: initialGoal?.target_date || null,
      };

      const userTimezone =
        initialReminder?.timezone ||
        (typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
          : "Asia/Kolkata");

      const reminderData: ReminderConfigData = {
        enabled: enableReminder,
        time: reminderTime,
        timezone: userTimezone,
      };

      await onSubmit(payload, reminderData);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("An unexpected error occurred while saving.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const periodLabel =
    targetPeriod === "daily"
      ? "Daily"
      : targetPeriod === "weekly"
      ? "Weekly"
      : targetPeriod === "monthly"
      ? "Monthly"
      : targetPeriod === "long_term"
      ? "Long Term"
      : "Daily";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/80 backdrop-blur-xs overflow-y-auto select-text"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Notebook Sheet Container */}
      <div
        className="w-full max-w-md bg-[#141417] border border-[#2B2B32] rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden transition-all text-left my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle doodle mark in corner */}
        <span
          aria-hidden="true"
          className="absolute top-4 right-5 text-xs font-doodle text-[#77777D] select-none"
        >
          ✦ {isEditing ? "revise" : periodLabel.toLowerCase()}
        </span>

        {/* Modal Header */}
        <div className="mb-5">
          <h2
            id="modal-title"
            className="font-serif text-xl sm:text-2xl text-[#EAE6DF] font-medium"
          >
            {isEditing ? "Revise Intention" : "Write an Intention"}
          </h2>
          <p className="text-xs text-[#8E8E93] font-doodle mt-0.5">
            {isEditing
              ? "Quietly refine your intention or reminder."
              : `A quiet thought written into your ${periodLabel.toLowerCase()} notebook.`}
          </p>
        </div>

        {formError && (
          <div
            className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 font-sans"
            role="alert"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* What are you growing? / Intention */}
          <div>
            <label
              htmlFor="intention-title"
              className="block text-xs font-doodle text-[#A1A1AA] mb-1.5"
            >
              {isEditing ? "Intention" : "What are you growing?"}{" "}
              <span className="text-[#EAE6DF]">*</span>
            </label>
            <input
              id="intention-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Intention title..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#2B2B32] text-sm text-[#EAE6DF] placeholder-[#5C5C66] focus:outline-none focus:border-[#EAE6DF] transition-colors font-serif"
              autoFocus
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="intention-notes"
              className="block text-xs font-doodle text-[#A1A1AA] mb-1.5"
            >
              Notes (Optional)
            </label>
            <textarea
              id="intention-notes"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="optional notes..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#2B2B32] text-sm text-[#EAE6DF] placeholder-[#5C5C66] focus:outline-none focus:border-[#EAE6DF] transition-colors resize-none leading-relaxed font-sans"
            />
          </div>

          {/* Reminder */}
          <div className="p-3.5 rounded-xl bg-[#0E0E10] border border-[#2B2B32] space-y-2.5">
            <label
              htmlFor="enable-reminder-checkbox"
              className="flex items-center space-x-2 text-xs font-doodle text-[#EAE6DF] cursor-pointer select-none"
            >
              <input
                id="enable-reminder-checkbox"
                type="checkbox"
                checked={enableReminder}
                onChange={(e) => setEnableReminder(e.target.checked)}
                className="rounded border-[#3E3E48] bg-[#141417] accent-[#EAE6DF] cursor-pointer"
              />
              <span>Remind me</span>
            </label>

            {enableReminder && (
              <div className="pt-2 border-t border-[#232328] flex items-center justify-between gap-3">
                <label
                  htmlFor="reminder-time-input"
                  className="text-xs font-doodle text-[#8E8E93]"
                >
                  Time
                </label>
                <input
                  id="reminder-time-input"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#141417] border border-[#3E3E48] text-xs font-mono text-[#EAE6DF] focus:outline-none focus:border-[#EAE6DF] cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-full border border-[#3E3E48] text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-1.5 rounded-full border border-[#D4D4D8] bg-[#F5F5F5] text-[#0E0E10] hover:bg-[#FFFFFF] text-xs font-doodle font-semibold transition-all cursor-pointer disabled:opacity-40"
            >
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Writing..."
                : isEditing
                ? "Save Changes"
                : "Write Intention"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
