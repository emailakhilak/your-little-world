"use client";

import { useEffect, useState } from "react";
import ReturnButton from "@/components/ui/ReturnButton";
import GardenEmptyState from "@/components/garden/GardenEmptyState";
import GoalCard from "@/components/garden/GoalCard";
import GoalDeleteDialog from "@/components/garden/GoalDeleteDialog";
import GoalFormModal, { ReminderConfigData } from "@/components/garden/GoalFormModal";
import GoalProgressRibbon from "@/components/garden/GoalProgressRibbon";
import {
  archiveGoal,
  createGoal,
  createReminder,
  deleteGoal,
  fetchGoalInstances,
  fetchGoalReminders,
  fetchGoals,
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

export default function GardenPage() {
  const [data, setData] = useState<GoalListResponse | null>(null);
  const [instances, setInstances] = useState<GoalInstance[]>([]);
  const [remindersMap, setRemindersMap] = useState<Record<string, Reminder>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "active" | "completed" | "archived"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load goals, recurring instances, and reminders when filters change
  useEffect(() => {
    let ignore = false;
    const statusParam = selectedStatus !== "all" ? selectedStatus : undefined;
    const categoryParam = selectedCategory !== "all" ? selectedCategory : undefined;

    Promise.all([
      fetchGoals(statusParam, categoryParam),
      fetchGoalInstances(),
    ])
      .then(async ([goalsRes, instancesRes]) => {
        if (!ignore) {
          setData(goalsRes);
          setInstances(instancesRes.items);
          setIsLoading(false);

          // Fetch reminders for active goals
          const remMap: Record<string, Reminder> = {};
          await Promise.all(
            goalsRes.items.map(async (g) => {
              try {
                const rRes = await fetchGoalReminders(g.id);
                if (rRes.items.length > 0) {
                  remMap[g.id] = rRes.items[0];
                }
              } catch {
                // Ignore silent reminder fetch error
              }
            })
          );
          if (!ignore) {
            setRemindersMap(remMap);
          }
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
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedStatus, selectedCategory]);

  const refreshAll = async () => {
    try {
      const statusParam = selectedStatus !== "all" ? selectedStatus : undefined;
      const categoryParam = selectedCategory !== "all" ? selectedCategory : undefined;

      const [goalsRes, instancesRes] = await Promise.all([
        fetchGoals(statusParam, categoryParam),
        fetchGoalInstances(),
      ]);
      setData(goalsRes);
      setInstances(instancesRes.items);

      const remMap: Record<string, Reminder> = {};
      await Promise.all(
        goalsRes.items.map(async (g) => {
          try {
            const rRes = await fetchGoalReminders(g.id);
            if (rRes.items.length > 0) {
              remMap[g.id] = rRes.items[0];
            }
          } catch {
            // Ignore
          }
        })
      );
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
    }

    // Configure reminder if set
    if (reminderData) {
      const existingReminder = remindersMap[savedGoal.id];
      if (reminderData.enabled) {
        if (existingReminder) {
          await updateReminder(existingReminder.id, {
            reminder_time: reminderData.time,
            timezone: reminderData.timezone,
            is_enabled: true,
          });
        } else {
          await createReminder(savedGoal.id, {
            reminder_time: reminderData.time,
            timezone: reminderData.timezone,
            is_enabled: true,
          });
        }
      } else if (existingReminder) {
        await updateReminder(existingReminder.id, { is_enabled: false });
      }
    }

    await refreshAll();
  };

  // Toggle complete for a one-off goal
  const handleToggleComplete = async (id: string) => {
    try {
      const updated = await toggleGoalComplete(id);
      setData((prev) => {
        if (!prev) return prev;
        const newItems = prev.items.map((item) =>
          item.id === updated.id ? updated : item
        );
        const activeCount = newItems.filter((i) => i.status === "active").length;
        const completedCount = newItems.filter(
          (i) => i.status === "completed"
        ).length;
        return {
          ...prev,
          items: newItems,
          active_count: activeCount,
          completed_count: completedCount,
        };
      });
      await refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle goal.";
      setError(msg);
    }
  };

  // Toggle complete for a recurring instance
  const handleToggleInstanceComplete = async (instanceId: string) => {
    try {
      const updatedInst = await toggleInstanceComplete(instanceId);
      setInstances((prev) =>
        prev.map((i) => (i.id === updatedInst.id ? updatedInst : i))
      );
      await refreshAll();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to toggle occurrence.";
      setError(msg);
    }
  };

  // Toggle reminder enable/disable
  const handleToggleReminder = async (reminder: Reminder) => {
    try {
      const updated = await updateReminder(reminder.id, {
        is_enabled: !reminder.is_enabled,
      });
      setRemindersMap((prev) => ({
        ...prev,
        [updated.goal_id]: updated,
      }));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update reminder.";
      setError(msg);
    }
  };

  // Archive goal
  const handleArchive = async (id: string) => {
    try {
      await archiveGoal(id);
      await refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to archive goal.";
      setError(msg);
    }
  };

  // Restore goal from archive
  const handleRestore = async (goal: Goal) => {
    try {
      await updateGoal(goal.id, { status: "active" });
      await refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to restore goal.";
      setError(msg);
    }
  };

  // Delete confirmation
  const confirmDelete = async () => {
    if (!deletingGoalId) return;
    setIsDeleting(true);
    try {
      await deleteGoal(deletingGoalId);
      setDeletingGoalId(null);
      await refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete goal.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const deletingGoal = data?.items.find((i) => i.id === deletingGoalId);

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 flex flex-col items-center max-w-4xl mx-auto">
      {/* Return navigation bar */}
      <div className="w-full flex items-center justify-between mb-6">
        <ReturnButton label="Return to Living Room" />
        <span
          aria-hidden="true"
          className="text-xs font-doodle text-[#86A868]/60 select-none hidden sm:inline"
        >
          ✦ garden of intentions &amp; rhythms
        </span>
      </div>

      {/* Chamber Header Card */}
      <section className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center mb-6">
        {/* Subtle decorative doodle mark */}
        <div
          aria-hidden="true"
          className="absolute top-5 right-6 text-xs font-doodle text-[#86A868]/50 select-none"
        >
          ✦ little seeds
        </div>

        {/* Botanical Pot Emblem */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#202722] border border-[#86A868]/30 flex items-center justify-center text-3xl mb-4 sm:mb-5 shadow-inner">
          🌱
        </div>

        {/* Title & Atmosphere */}
        <span className="text-xs uppercase tracking-widest text-[#86A868] font-semibold">
          Chamber of Intentions
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#EAE6DF] mt-1.5 mb-3 font-medium">
          Garden of Tomorrow
        </h1>
        <p className="text-[#9D978C] text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-sans">
          “A quiet plot of soil for your daily rhythms, habits, deadlines, and the
          long-term aspirations you wish to nurture into bloom.”
        </p>
      </section>

      {/* Error Banner if any */}
      {error && (
        <div
          className="w-full mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-200 text-sm font-sans"
          role="alert"
        >
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => refreshAll()}
            className="px-3 py-1.5 rounded-xl bg-rose-900/60 border border-rose-700 hover:bg-rose-800 text-xs font-medium cursor-pointer transition-colors shrink-0"
          >
            Tend Soil Again
          </button>
        </div>
      )}

      {/* Progress & Filter Navigation Ribbon */}
      <GoalProgressRibbon
        activeCount={data?.active_count || 0}
        completedCount={data?.completed_count || 0}
        archivedCount={data?.archived_count || 0}
        totalCount={data?.total || 0}
        selectedStatus={selectedStatus}
        onSelectStatus={(status) => setSelectedStatus(status)}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        onPlantSeed={() => {
          setEditingGoal(null);
          setIsFormOpen(true);
        }}
      />

      {/* Main Content Area */}
      <section className="w-full flex flex-col space-y-4" aria-label="Goals and Intentions list">
        {/* Loading State: Cozy botanical skeletons */}
        {isLoading && !data && (
          <div className="w-full space-y-3 py-4" aria-live="polite">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="w-full bg-[#181B22]/70 border border-[#252A34] rounded-2xl p-6 flex items-start space-x-4 animate-pulse"
              >
                <div className="w-6 h-6 rounded-full bg-[#252B36] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#252B36] rounded w-2/5" />
                  <div className="h-3 bg-[#1F232D] rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data && data.items.length === 0 && (
          <GardenEmptyState
            filterStatus={selectedStatus}
            onPlantSeed={() => {
              setEditingGoal(null);
              setIsFormOpen(true);
            }}
          />
        )}

        {/* Goals List */}
        {!isLoading &&
          data &&
          data.items.length > 0 &&
          data.items.map((goal) => {
            // Find most recent occurrence for recurring goals
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
              />
            );
          })}
      </section>

      {/* Goal Create / Edit Form Modal */}
      <GoalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialGoal={editingGoal}
        initialReminder={editingGoal ? remindersMap[editingGoal.id] : null}
      />

      {/* Delete Confirmation Dialog */}
      <GoalDeleteDialog
        isOpen={Boolean(deletingGoalId)}
        goalTitle={deletingGoal?.title || "this seed"}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingGoalId(null)}
        isDeleting={isDeleting}
      />

      {/* Atmospheric Footer Seal */}
      <footer className="mt-12 text-center text-xs text-[#8C7A6B] flex items-center justify-center space-x-3 select-none pb-6">
        <span className="font-serif italic">Garden of Tomorrow</span>
        <span>•</span>
        <span className="font-doodle text-sm text-[#86A868]/70">
          tend gently each day
        </span>
      </footer>
    </main>
  );
}
