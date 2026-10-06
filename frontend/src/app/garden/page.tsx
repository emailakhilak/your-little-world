"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GardenEmptyState from "@/components/garden/GardenEmptyState";
import GoalCard from "@/components/garden/GoalCard";
import GoalDeleteDialog from "@/components/garden/GoalDeleteDialog";
import BulkGoalDeleteDialog from "@/components/garden/BulkGoalDeleteDialog";
import GoalFormModal, { ReminderConfigData } from "@/components/garden/GoalFormModal";
import { AchievementSection } from "@/components/garden/AchievementSection";
import {
  DoodleAddIcon,
  DoodleGardenDivider,
  DoodleNotebookBorder,
  DoodlePenCircle,
} from "@/components/garden/GardenDoodles";
import {
  Achievement,
  archiveGoal,
  bulkDeleteGoals,
  createGoal,
  createReminder,
  deleteGoal,
  fetchAchievements,
  fetchGoalInstances,
  fetchGoals,
  fetchUserReminders,
  Goal,
  GoalCreateInput,
  GoalInstance,
  GoalListResponse,
  GoalUpdateInput,
  Reminder,
  toggleGoalComplete,
  toggleInstanceComplete,
  updateGoal,
  updateReminder,
} from "@/lib/api";

type GoalPeriod = "all" | "daily" | "weekly" | "monthly" | "long_term";

export default function GardenPage() {
  const [data, setData] = useState<GoalListResponse | null>(null);
  const [instances, setInstances] = useState<GoalInstance[]>([]);
  const [remindersMap, setRemindersMap] = useState<Record<string, Reminder>>({});
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period filter matching notebook sketch: Daily, Weekly, Monthly, Long term, All
  const [selectedPeriod, setSelectedPeriod] = useState<GoalPeriod>("all");

  // Selection & Bulk Deletion state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Switch period filter and safely clear selection to prevent accidental cross-filter deletion
  const handlePeriodChange = (period: GoalPeriod) => {
    setSelectedPeriod(period);
    setSelectedIds(new Set());
  };

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load goals, recurring instances, reminders, and achievements
  useEffect(() => {
    let ignore = false;

    Promise.all([
      fetchGoals(),
      fetchGoalInstances(),
      fetchAchievements(),
      fetchUserReminders().catch(() => ({ items: [], total: 0 })),
    ])
      .then(([goalsRes, instancesRes, achRes, remRes]) => {
        if (!ignore) {
          setData(goalsRes);
          setInstances(instancesRes.items);
          setAchievements(achRes.items);
          const remMap: Record<string, Reminder> = {};
          for (const rem of remRes.items) {
            remMap[rem.goal_id] = rem;
          }
          setRemindersMap(remMap);
          setIsLoading(false);
          setIsLoadingAchievements(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to connect to the garden soil. Please try again."
          );
          setIsLoading(false);
          setIsLoadingAchievements(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const refreshAll = async () => {
    try {
      const [goalsRes, instancesRes, achRes, remRes] = await Promise.all([
        fetchGoals(),
        fetchGoalInstances(),
        fetchAchievements(),
        fetchUserReminders().catch(() => ({ items: [], total: 0 })),
      ]);
      setData(goalsRes);
      setInstances(instancesRes.items);
      setAchievements(achRes.items);
      setIsLoadingAchievements(false);

      const remMap: Record<string, Reminder> = {};
      for (const rem of remRes.items) {
        remMap[rem.goal_id] = rem;
      }
      setRemindersMap(remMap);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh the garden soil."
      );
    }
  };

  // Handle Plant or Edit submit
  const handleFormSubmit = async (
    formData: GoalCreateInput | GoalUpdateInput,
    reminderData?: ReminderConfigData
  ) => {
    let savedGoal: Goal;

    if (editingGoal) {
      savedGoal = await updateGoal(editingGoal.id, formData);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === savedGoal.id ? savedGoal : item
          ),
        };
      });
    } else {
      savedGoal = await createGoal(formData as GoalCreateInput);
      setData((prev) => {
        if (!prev) return prev;
        const newItems = [savedGoal, ...prev.items];
        return {
          ...prev,
          items: newItems,
          total: prev.total + 1,
          active_count: prev.active_count + 1,
        };
      });
    }

    // Configure reminder if set
    if (reminderData) {
      const existingReminder = remindersMap[savedGoal.id];
      if (reminderData.enabled) {
        if (existingReminder) {
          const updatedRem = await updateReminder(existingReminder.id, {
            reminder_time: reminderData.time,
            timezone: reminderData.timezone,
            is_enabled: true,
          });
          setRemindersMap((prev) => ({ ...prev, [savedGoal.id]: updatedRem }));
        } else {
          const newRem = await createReminder(savedGoal.id, {
            reminder_time: reminderData.time,
            timezone: reminderData.timezone,
            is_enabled: true,
          });
          setRemindersMap((prev) => ({ ...prev, [savedGoal.id]: newRem }));
        }
      } else if (existingReminder) {
        await updateReminder(existingReminder.id, { is_enabled: false });
        setRemindersMap((prev) => {
          const next = { ...prev };
          delete next[savedGoal.id];
          return next;
        });
      }
    }

    // Non-blocking background sync for recurring instances and achievements
    fetchGoalInstances().then((res) => setInstances(res.items)).catch(() => {});
    fetchAchievements().then((res) => setAchievements(res.items)).catch(() => {});
  };

  // Toggle complete for a one-off goal (Optimistic with rollback)
  const handleToggleComplete = async (id: string) => {
    const previousData = data;
    setData((prev) => {
      if (!prev) return prev;
      const target = prev.items.find((item) => item.id === id);
      if (!target) return prev;
      const nextStatus: "active" | "completed" =
        target.status === "completed" ? "active" : "completed";
      const newItems = prev.items.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item
      );
      return {
        ...prev,
        items: newItems,
        active_count: newItems.filter((i) => i.status === "active").length,
        completed_count: newItems.filter((i) => i.status === "completed").length,
      };
    });

    try {
      const updated = await toggleGoalComplete(id);
      setData((prev) => {
        if (!prev) return prev;
        const newItems = prev.items.map((item) =>
          item.id === updated.id ? updated : item
        );
        return {
          ...prev,
          items: newItems,
          active_count: newItems.filter((i) => i.status === "active").length,
          completed_count: newItems.filter((i) => i.status === "completed").length,
        };
      });
      // Quiet background refresh of achievements only
      fetchAchievements().then((achRes) => setAchievements(achRes.items)).catch(() => {});
    } catch (err: unknown) {
      setData(previousData);
      const msg = err instanceof Error ? err.message : "Failed to toggle goal.";
      setError(msg);
    }
  };

  // Toggle complete for a recurring instance (Optimistic with rollback)
  const handleToggleInstanceComplete = async (instanceId: string) => {
    const previousInstances = instances;
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instanceId
          ? {
              ...inst,
              status: (inst.status === "completed" ? "active" : "completed") as "active" | "completed",
            }
          : inst
      )
    );

    try {
      const updatedInst = await toggleInstanceComplete(instanceId);
      setInstances((prev) =>
        prev.map((i) => (i.id === updatedInst.id ? updatedInst : i))
      );
      // Quiet background refresh of achievements only
      fetchAchievements().then((achRes) => setAchievements(achRes.items)).catch(() => {});
    } catch (err: unknown) {
      setInstances(previousInstances);
      const msg =
        err instanceof Error ? err.message : "Failed to toggle occurrence.";
      setError(msg);
    }
  };

  // Toggle reminder enable/disable (Optimistic with rollback)
  const handleToggleReminder = async (reminder: Reminder) => {
    const prevReminder = remindersMap[reminder.goal_id];
    setRemindersMap((prev) => ({
      ...prev,
      [reminder.goal_id]: { ...reminder, is_enabled: !reminder.is_enabled },
    }));

    try {
      const updated = await updateReminder(reminder.id, {
        is_enabled: !reminder.is_enabled,
      });
      setRemindersMap((prev) => ({
        ...prev,
        [updated.goal_id]: updated,
      }));
    } catch (err: unknown) {
      if (prevReminder) {
        setRemindersMap((prev) => ({ ...prev, [reminder.goal_id]: prevReminder }));
      }
      const msg =
        err instanceof Error ? err.message : "Failed to update reminder.";
      setError(msg);
    }
  };

  // Archive goal (Optimistic with rollback)
  const handleArchive = async (id: string) => {
    const previousData = data;
    setData((prev) => {
      if (!prev) return prev;
      const newItems = prev.items.map((item) =>
        item.id === id ? { ...item, status: "archived" as const, archived_at: new Date().toISOString() } : item
      );
      return {
        ...prev,
        items: newItems,
        active_count: newItems.filter((i) => i.status === "active").length,
        completed_count: newItems.filter((i) => i.status === "completed").length,
        archived_count: newItems.filter((i) => i.status === "archived").length,
      };
    });

    try {
      const updated = await archiveGoal(id);
      setData((prev) => {
        if (!prev) return prev;
        const newItems = prev.items.map((item) =>
          item.id === updated.id ? updated : item
        );
        return {
          ...prev,
          items: newItems,
          active_count: newItems.filter((i) => i.status === "active").length,
          completed_count: newItems.filter((i) => i.status === "completed").length,
          archived_count: newItems.filter((i) => i.status === "archived").length,
        };
      });
    } catch (err: unknown) {
      setData(previousData);
      const msg = err instanceof Error ? err.message : "Failed to archive goal.";
      setError(msg);
    }
  };

  // Restore goal from archive (Optimistic with rollback)
  const handleRestore = async (goal: Goal) => {
    const previousData = data;
    setData((prev) => {
      if (!prev) return prev;
      const newItems = prev.items.map((item) =>
        item.id === goal.id ? { ...item, status: "active" as const, archived_at: null } : item
      );
      return {
        ...prev,
        items: newItems,
        active_count: newItems.filter((i) => i.status === "active").length,
        completed_count: newItems.filter((i) => i.status === "completed").length,
        archived_count: newItems.filter((i) => i.status === "archived").length,
      };
    });

    try {
      const updated = await updateGoal(goal.id, { status: "active" });
      setData((prev) => {
        if (!prev) return prev;
        const newItems = prev.items.map((item) =>
          item.id === updated.id ? updated : item
        );
        return {
          ...prev,
          items: newItems,
          active_count: newItems.filter((i) => i.status === "active").length,
          completed_count: newItems.filter((i) => i.status === "completed").length,
          archived_count: newItems.filter((i) => i.status === "archived").length,
        };
      });
    } catch (err: unknown) {
      setData(previousData);
      const msg = err instanceof Error ? err.message : "Failed to restore goal.";
      setError(msg);
    }
  };

  // Individual delete confirmation (fast local update without slow N+1 refetches)
  const confirmDelete = async () => {
    if (!deletingGoalId) return;
    const targetId = deletingGoalId;
    setIsDeleting(true);
    try {
      await deleteGoal(targetId);
      setData((prev) => {
        if (!prev) return prev;
        const newItems = prev.items.filter((item) => item.id !== targetId);
        return {
          ...prev,
          items: newItems,
          total: Math.max(0, prev.total - 1),
          active_count: newItems.filter((i) => i.status === "active").length,
          completed_count: newItems.filter((i) => i.status === "completed").length,
          archived_count: newItems.filter((i) => i.status === "archived").length,
        };
      });
      setInstances((prev) => prev.filter((i) => i.goal_id !== targetId));
      setRemindersMap((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      setSelectedIds((prev) => {
        if (!prev.has(targetId)) return prev;
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      setDeletingGoalId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete goal.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete confirmation (single API request + single DB transaction)
  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const targetIds = Array.from(selectedIds);
    setIsBulkDeleting(true);
    try {
      const res = await bulkDeleteGoals(targetIds);
      const deletedSet = new Set(res.deleted_ids);

      setData((prev) => {
        if (!prev) return prev;
        const newItems = prev.items.filter((item) => !deletedSet.has(item.id));
        return {
          ...prev,
          items: newItems,
          total: Math.max(0, prev.total - res.deleted_count),
          active_count: newItems.filter((i) => i.status === "active").length,
          completed_count: newItems.filter((i) => i.status === "completed").length,
          archived_count: newItems.filter((i) => i.status === "archived").length,
        };
      });

      setInstances((prev) => prev.filter((i) => !deletedSet.has(i.goal_id)));
      setRemindersMap((prev) => {
        const next = { ...prev };
        res.deleted_ids.forEach((id) => delete next[id]);
        return next;
      });

      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setIsBulkDeleteDialogOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete selected intentions.";
      setError(msg);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const deletingGoal = data?.items.find((i) => i.id === deletingGoalId);

  // Filter goals according to the notebook period tabs
  const filteredGoals = (data?.items || []).filter((goal) => {
    if (selectedPeriod === "daily") {
      return goal.recurrence_cadence === "daily" || goal.category === "habit";
    }
    if (selectedPeriod === "weekly") {
      return goal.recurrence_cadence === "weekly";
    }
    if (selectedPeriod === "monthly") {
      return goal.recurrence_cadence === "monthly";
    }
    if (selectedPeriod === "long_term") {
      return (
        goal.category === "aspiration" ||
        goal.category === "milestone" ||
        goal.recurrence_cadence === "yearly" ||
        ((!goal.recurrence_cadence || goal.recurrence_cadence === "none") &&
          goal.category !== "habit")
      );
    }
    return true; // "all"
  });

  const visibleGoalIds = filteredGoals.map((g) => g.id);
  const isAllVisibleSelected =
    visibleGoalIds.length > 0 &&
    visibleGoalIds.every((id) => selectedIds.has(id));

  // Multi-select helpers
  const handleToggleSelectGoal = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleGoalIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all visible in current filter
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleGoalIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleCancelSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const totalGoalsCount = data?.items.length || 0;
  const completedGoalsCount =
    data?.items.filter((g) => g.status === "completed").length || 0;

  return (
    <main className="min-h-screen bg-[#0E0E10] text-[#EAE6DF] flex flex-col items-center px-4 py-8 sm:py-12 select-text font-sans">
      {/* Discreet doodle return navigation to living room */}
      <div className="w-full max-w-3xl flex justify-start mb-4">
        <Link
          href="/"
          className="text-xs font-doodle text-[#77777D] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-sm px-1 py-0.5"
          aria-label="Return to The Living Room"
        >
          <span>←</span>
          <span>living room</span>
        </Link>
      </div>

      {/* =========================================================================
          MAIN NOTEBOOK CONTAINER:
          One large hand-drawn notebook page with imperfect sketched borders.
          ========================================================================= */}
      <div className="w-full max-w-3xl bg-[#141417] relative p-6 sm:p-10 rounded-2xl sm:rounded-3xl border border-[#2B2B32]/70 shadow-2xl flex flex-col">
        {/* Subtle hand-drawn border overlay */}
        <DoodleNotebookBorder />

        {/* Small handwritten room identifier */}
        <div
          aria-hidden="true"
          className="text-[11px] font-doodle text-[#55555E] select-none text-right -mt-2 mb-2"
        >
          page 2 · intentions
        </div>

        {/* Header:
            🌱  The Garden of Tomorrow
                somewhere to grow
        */}
        <header className="w-full flex flex-col text-left">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl select-none" aria-hidden="true">
              🌱
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#EAE6DF] font-medium tracking-tight">
              The Garden of Tomorrow
            </h1>
          </div>
          <p className="font-doodle text-xs sm:text-sm text-[#77777D] ml-9 mt-0.5">
            somewhere to grow
          </p>
        </header>

        {/* Hand-drawn divider line */}
        <DoodleGardenDivider className="w-full my-4" />

        {/* Error notice if present */}
        {error && (
          <div
            className="w-full mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-between gap-3 text-rose-200 text-xs font-sans"
            role="alert"
          >
            <span>⚠️ {error}</span>
            <button
              onClick={() => refreshAll()}
              className="px-2.5 py-1 rounded-lg border border-rose-700 bg-rose-900/60 hover:bg-rose-800 text-[11px] cursor-pointer"
            >
              tend again
            </button>
          </div>
        )}

        {/* Goal Period Navigation:
            ( Daily )   ( Weekly )   ( Monthly )   ( Long Term Goals )   ( All )
        */}
        <nav
          className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-5 my-3 select-none"
          aria-label="Goal Periods"
        >
          {[
            { id: "daily", label: "Daily" },
            { id: "weekly", label: "Weekly" },
            { id: "monthly", label: "Monthly" },
            { id: "long_term", label: "Long term" },
            { id: "all", label: "All" },
          ].map((tab) => {
            const isActive = selectedPeriod === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handlePeriodChange(tab.id as GoalPeriod)}
                className={`relative px-3.5 py-1 font-doodle text-xs sm:text-sm cursor-pointer transition-colors group focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-sm ${
                  isActive
                    ? "text-[#EAE6DF] font-medium"
                    : "text-[#77777D] hover:text-[#B4B4BB]"
                }`}
              >
                <DoodlePenCircle active={isActive} />
                <span className="relative z-10 px-1">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Handwritten Quiet Progress Representation */}
        {totalGoalsCount > 0 && (
          <div className="w-full my-2 flex flex-col items-center justify-center text-center select-none">
            <div className="flex items-center space-x-2 text-[#44444C] text-xs">
              <span className="tracking-widest">───────</span>
              <span className="text-[#8E8E93] text-xs">●</span>
              <span className="tracking-widest">───────</span>
            </div>
            <span className="font-doodle text-[11px] text-[#77777D] mt-0.5">
              {completedGoalsCount} of {totalGoalsCount} bloomed · growing
            </span>
          </div>
        )}

        {/* Sketched Divider */}
        <DoodleGardenDivider className="w-full my-3" />

        {/* Goals Checklist Area */}
        <section
          className="w-full flex flex-col my-2 min-h-[140px]"
          aria-label="Intentions list"
        >
          {/* Loading State: Quiet handwritten note */}
          {isLoading && !data && (
            <div className="py-12 text-center font-doodle text-xs text-[#77777D] animate-pulse">
              opening notebook pages...
            </div>
          )}

          {/* Empty State */}
          {!isLoading && data && filteredGoals.length === 0 && (
            <GardenEmptyState
              filterStatus={selectedPeriod}
              onPlantSeed={() => {
                setEditingGoal(null);
                setIsFormOpen(true);
              }}
            />
          )}

          {/* Subtle Select Toggle or Selection Action Row */}
          {!isLoading && filteredGoals.length > 0 && (
            <div className="w-full mb-3">
              {!isSelectionMode ? (
                <div className="w-full flex items-center justify-between px-1 py-0.5">
                  <span className="font-doodle text-[11px] text-[#55555E]">
                    {filteredGoals.length}{" "}
                    {filteredGoals.length === 1 ? "intention" : "intentions"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSelectionMode(true)}
                    className="font-doodle text-xs text-[#77777D] hover:text-[#EAE6DF] transition-colors cursor-pointer px-2 py-0.5 rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
                    aria-label="Enter selection mode"
                  >
                    <span>[ </span>
                    <span className="underline decoration-dotted underline-offset-4">
                      Select
                    </span>
                    <span> ]</span>
                  </button>
                </div>
              ) : (
                <div className="w-full py-2 px-3 rounded-xl border border-[#2B2B32]/90 bg-[#121216] flex flex-wrap items-center justify-between gap-2.5 font-doodle text-xs text-[#8E8E93] select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-[#EAE6DF] font-medium">
                      {selectedIds.size} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-[#8E8E93] hover:text-[#EAE6DF] transition-colors cursor-pointer px-1.5 py-0.5 rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
                    >
                      [ {isAllVisibleSelected ? "Deselect All" : "Select All"} ]
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsBulkDeleteDialogOpen(true)}
                      disabled={selectedIds.size === 0}
                      className={`transition-colors cursor-pointer px-1.5 py-0.5 rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-400 ${
                        selectedIds.size > 0
                          ? "text-rose-400 hover:text-rose-300 font-medium"
                          : "text-[#55555E] cursor-not-allowed opacity-40"
                      }`}
                    >
                      [ Delete Selected ]
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelSelection}
                      className="text-[#8E8E93] hover:text-[#EAE6DF] transition-colors cursor-pointer px-1.5 py-0.5 rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF]"
                    >
                      [ Cancel ]
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checklist Items */}
          {!isLoading &&
            filteredGoals.length > 0 &&
            filteredGoals.map((goal) => {
              const goalInstances = instances.filter((i) => i.goal_id === goal.id);
              const currentInst = goalInstances.length > 0 ? goalInstances[0] : null;
              const reminder = remindersMap[goal.id] || null;

              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currentInstance={currentInst}
                  reminder={reminder}
                  onToggleComplete={handleToggleComplete}
                  onToggleInstanceComplete={handleToggleInstanceComplete}
                  onToggleReminder={handleToggleReminder}
                  onEdit={(g) => {
                    setEditingGoal(g);
                    setIsFormOpen(true);
                  }}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                  onDelete={(id) => setDeletingGoalId(id)}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.has(goal.id)}
                  onToggleSelect={handleToggleSelectGoal}
                />
              );
            })}
        </section>

        {/* Add Goal Control: Hand-drawn (+)
            From sketch:
                          (+)
        */}
        <div className="w-full flex flex-col items-center justify-center mt-6 mb-4">
          <button
            type="button"
            onClick={() => {
              setEditingGoal(null);
              setIsFormOpen(true);
            }}
            className="group flex flex-col items-center gap-1 text-[#77777D] hover:text-[#EAE6DF] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-sm p-2"
            aria-label="Add new intention"
            title="Write new intention (+)"
          >
            <div className="w-8 h-8 flex items-center justify-center border border-[#3A3A42] group-hover:border-[#EAE6DF] rounded-full transition-colors">
              <DoodleAddIcon className="w-4 h-4" />
            </div>
            <span className="font-doodle text-xs tracking-wider">add</span>
          </button>
        </div>

        {/* Subtle divider before achievements */}
        <DoodleGardenDivider className="w-full my-3" />

        {/* Achievements / Milestones */}
        <AchievementSection
          achievements={achievements}
          isLoading={isLoadingAchievements}
        />
      </div>

      {/* Goal Create / Edit Form Modal */}
      <GoalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialGoal={editingGoal}
        initialReminder={editingGoal ? remindersMap[editingGoal.id] : null}
        targetPeriod={selectedPeriod}
      />

      {/* Individual Delete Confirmation Dialog */}
      <GoalDeleteDialog
        isOpen={Boolean(deletingGoalId)}
        goalTitle={deletingGoal?.title || "this seed"}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingGoalId(null)}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkGoalDeleteDialog
        isOpen={isBulkDeleteDialogOpen}
        count={selectedIds.size}
        onConfirm={confirmBulkDelete}
        onCancel={() => setIsBulkDeleteDialogOpen(false)}
        isDeleting={isBulkDeleting}
      />

      {/* Atmospheric Footer Seal */}
      <footer className="mt-8 text-center text-xs text-[#55555E] flex items-center justify-center space-x-2 select-none font-doodle pb-4">
        <span>~</span>
        <span>somewhere to grow</span>
        <span>~</span>
      </footer>
    </main>
  );
}
