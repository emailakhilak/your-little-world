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
}

const AVAILABLE_ICONS = ["🌱", "🌿", "🌸", "🌻", "🌳", "🌾", "🍵", "🌙", "✨", "🕯️", "📖"];

export default function GoalFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialGoal,
  initialReminder,
}: GoalFormModalProps) {
  if (!isOpen) return null;

  return (
    <GoalFormInner
      key={initialGoal ? initialGoal.id : "new-seed"}
      onClose={onClose}
      onSubmit={onSubmit}
      initialGoal={initialGoal}
      initialReminder={initialReminder}
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
}

function GoalFormInner({
  onClose,
  onSubmit,
  initialGoal,
  initialReminder,
}: GoalFormInnerProps) {
  const isEditing = Boolean(initialGoal);

  const [title, setTitle] = useState(initialGoal?.title || "");
  const [description, setDescription] = useState(initialGoal?.description || "");
  const [category, setCategory] = useState(initialGoal?.category || "seedling");
  const [cadence, setCadence] = useState(initialGoal?.recurrence_cadence || "none");
  const [targetDate, setTargetDate] = useState(
    initialGoal?.target_date
      ? new Date(initialGoal.target_date).toISOString().split("T")[0]
      : ""
  );
  const [icon, setIcon] = useState(initialGoal?.icon || "🌱");
  const [priority, setPriority] = useState(initialGoal?.priority || "normal");
  const [progressTarget, setProgressTarget] = useState(initialGoal?.progress_target || 1);

  // Reminder configuration
  const [enableReminder, setEnableReminder] = useState(
    initialReminder ? initialReminder.is_enabled : false
  );
  const [reminderTime, setReminderTime] = useState(
    initialReminder?.reminder_time || "09:00"
  );
  const [reminderTimezone, setReminderTimezone] = useState(
    initialReminder?.timezone || "Asia/Kolkata"
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
      setFormError("Please give your intention a title.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: GoalCreateInput | GoalUpdateInput = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        category,
        recurrence_cadence: cadence !== "none" ? cadence : null,
        target_date: targetDate ? new Date(`${targetDate}T23:59:59Z`).toISOString() : null,
        icon,
        priority,
        progress_target: Math.max(1, progressTarget),
      };

      const reminderData: ReminderConfigData = {
        enabled: enableReminder,
        time: reminderTime,
        timezone: reminderTimezone,
      };

      await onSubmit(payload, reminderData);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("An unexpected error occurred while tending the garden.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/80 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Parchment Container */}
      <div
        className="w-full max-w-lg bg-[#181B22] border border-[#2D3340] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all text-left my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle doodle mark in corner */}
        <span
          aria-hidden="true"
          className="absolute top-4 right-5 text-xs font-doodle text-[#86A868]/50 select-none"
        >
          ✦ {isEditing ? "tending" : "planting"}
        </span>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#202722] border border-[#86A868]/30 flex items-center justify-center text-xl shadow-inner">
            {icon}
          </div>
          <div>
            <h2
              id="modal-title"
              className="font-serif text-xl sm:text-2xl text-[#EAE6DF] font-medium"
            >
              {isEditing ? "Tend to This Intention" : "Plant a New Seed"}
            </h2>
            <p className="text-xs text-[#9D978C] font-sans">
              {isEditing
                ? "Refine your recurring rhythm, details, or quiet reminder."
                : "Give form to a goal you wish to nurture into bloom."}
            </p>
          </div>
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
          {/* Title */}
          <div>
            <label
              htmlFor="goal-title"
              className="block text-xs font-medium uppercase tracking-wider text-[#9D978C] mb-1.5"
            >
              Intention / Title <span className="text-[#86A868]">*</span>
            </label>
            <input
              id="goal-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily morning tea & reading, Finish landscape painting"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#12141A] border border-[#2B303C] text-sm text-[#EAE6DF] placeholder-[#5C6475] focus:outline-none focus:border-[#86A868] focus:ring-1 focus:ring-[#86A868] transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="goal-desc"
              className="block text-xs font-medium uppercase tracking-wider text-[#9D978C] mb-1.5"
            >
              Notes or Motivation (Optional)
            </label>
            <textarea
              id="goal-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why does this matter? What quiet rhythm will support it?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#12141A] border border-[#2B303C] text-sm text-[#EAE6DF] placeholder-[#5C6475] focus:outline-none focus:border-[#86A868] focus:ring-1 focus:ring-[#86A868] transition-colors resize-none"
            />
          </div>

          {/* Two Columns: Category & Cadence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="goal-category"
                className="block text-xs font-medium uppercase tracking-wider text-[#9D978C] mb-1.5"
              >
                Category / Soil Type
              </label>
              <select
                id="goal-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#12141A] border border-[#2B303C] text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868] transition-colors cursor-pointer"
              >
                <option value="seedling">🌱 Seedling (Intention)</option>
                <option value="habit">🌿 Habit (Daily rhythm)</option>
                <option value="milestone">🌸 Milestone (Event)</option>
                <option value="aspiration">🌳 Aspiration (Horizon)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="goal-cadence"
                className="block text-xs font-medium uppercase tracking-wider text-[#9D978C] mb-1.5"
              >
                Recurrence Cadence
              </label>
              <select
                id="goal-cadence"
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#12141A] border border-[#2B303C] text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868] transition-colors cursor-pointer"
              >
                <option value="none">One-time / Standalone</option>
                <option value="daily">🌿 Daily Rhythm</option>
                <option value="weekly">🌸 Weekly Rhythm</option>
                <option value="monthly">🌳 Monthly Horizon</option>
              </select>
            </div>
          </div>

          {/* Three Columns: Target Date, Milestone Steps, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="goal-target-date"
                className="block text-xs font-medium uppercase tracking-wider text-[#9D978C] mb-1.5"
              >
                Target Date (Optional)
              </label>
              <input
                id="goal-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#12141A] border border-[#2B303C] text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868] transition-colors cursor-pointer"
              />
            </div>

            <div>
              <label
                htmlFor="goal-target-steps"
                className="block text-xs font-medium uppercase tracking-wider text-[#9D978C] mb-1.5"
              >
                Milestone Steps
              </label>
              <input
                id="goal-target-steps"
                type="number"
                min={1}
                max={100}
                value={progressTarget}
                onChange={(e) =>
                  setProgressTarget(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full px-3 py-2 rounded-xl bg-[#12141A] border border-[#2B303C] text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="goal-priority"
                className="block text-xs font-medium uppercase tracking-wider text-[#9D978C] mb-1.5"
              >
                Priority Level
              </label>
              <select
                id="goal-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#12141A] border border-[#2B303C] text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868] transition-colors cursor-pointer"
              >
                <option value="normal">Normal Pace</option>
                <option value="high">✦ Focal Point (High)</option>
                <option value="low">Gentle Breeze (Low)</option>
              </select>
            </div>
          </div>

          {/* Reminder Configuration Section */}
          <div className="p-3.5 rounded-2xl bg-[#13161C] border border-[#242A36]">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="enable-reminder-toggle"
                className="flex items-center space-x-2 text-xs font-medium text-[#EAE6DF] cursor-pointer select-none"
              >
                <input
                  id="enable-reminder-toggle"
                  type="checkbox"
                  checked={enableReminder}
                  onChange={(e) => setEnableReminder(e.target.checked)}
                  className="rounded border-[#3B4252] bg-[#14161C] text-[#86A868] focus:ring-0 cursor-pointer"
                />
                <span className="flex items-center space-x-1.5">
                  <span>🔔</span>
                  <span className="font-serif">Quiet Daily Reminder</span>
                </span>
              </label>
              <span className="text-[10px] text-[#86A868] font-doodle">
                {enableReminder ? "✦ bell active" : "✦ dormant"}
              </span>
            </div>

            {enableReminder && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1E232E]">
                <div>
                  <label
                    htmlFor="reminder-time-input"
                    className="block text-[11px] text-[#9D978C] mb-1"
                  >
                    Reminder Time (24h)
                  </label>
                  <input
                    id="reminder-time-input"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#181B22] border border-[#2B303C] text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reminder-tz-input"
                    className="block text-[11px] text-[#9D978C] mb-1"
                  >
                    Timezone
                  </label>
                  <select
                    id="reminder-tz-input"
                    value={reminderTimezone}
                    onChange={(e) => setReminderTimezone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#181B22] border border-[#2B303C] text-xs text-[#EAE6DF] focus:outline-none focus:border-[#86A868] cursor-pointer"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Icon / Emblem Choice */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#9D978C] mb-1.5">
              Botanical Emblem
            </label>
            <div className="flex items-center space-x-2 overflow-x-auto py-1">
              {AVAILABLE_ICONS.map((emblem) => (
                <button
                  type="button"
                  key={emblem}
                  onClick={() => setIcon(emblem)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-all cursor-pointer shrink-0 ${
                    icon === emblem
                      ? "bg-[#202722] border-[#86A868] scale-110 shadow-xs"
                      : "bg-[#14161C] border-[#252A34] hover:border-[#3D4556]"
                  }`}
                  aria-label={`Select emblem ${emblem}`}
                >
                  {emblem}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#252A34]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[#2B303C] bg-[#14161C] text-xs text-[#9D978C] hover:text-[#EAE6DF] hover:bg-[#1E222A] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-[#202722] border border-[#86A868] text-xs font-medium text-[#CDE6B5] hover:bg-[#28332A] transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span aria-hidden="true" className="font-doodle text-sm">
                ✦
              </span>
              <span className="font-serif">
                {isSubmitting
                  ? "Tending..."
                  : isEditing
                  ? "Save Changes"
                  : "Plant in Soil"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
