"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchGoals,
  toggleGoalComplete,
  fetchTodayEdition,
  fetchNewsArticles,
  fetchNotes,
  fetchDiaryEntryByDate,
  fetchStorybookOverview,
  fetchUserPreferences,
  Goal,
  NewsArticle,
  DailyEdition,
  Note,
  UserPreferences,
  StorybookAchievementItem,
  Project,
  StoryChapter,
} from "./api";

export interface NearestDeadlineToDisplay {
  goalTitle: string;
  targetDate: string;
  formattedDate: string;
  isToday: boolean;
  isPast: boolean;
}

export interface GardenSnapshotState {
  status: "loading" | "success" | "empty" | "error";
  error: string | null;
  displayGoals: Goal[];
  completedCount: number;
  activeCount: number;
  totalCount: number;
  nearestDeadline: NearestDeadlineToDisplay | null;
  toggleGoal: (id: string) => Promise<void>;
}

export interface NewsSnapshotState {
  status: "loading" | "success" | "empty" | "error";
  error: string | null;
  edition: DailyEdition | null;
  articles: NewsArticle[];
}

export interface AtticSnapshotState {
  status: "loading" | "success" | "empty" | "error";
  error: string | null;
  note: Note | null;
}

export interface MoonSnapshotState {
  status: "loading" | "success" | "empty" | "error";
  error: string | null;
  hasEntry: boolean;
  mood: string | null;
  wordCount: number;
}

export interface StorybookSnapshotState {
  status: "loading" | "success" | "empty" | "error";
  error: string | null;
  recentAchievement: StorybookAchievementItem | null;
  recentProject: Project | null;
  recentChapter: StoryChapter | null;
}

export interface DailySnapshotGreeting {
  greeting: string;
  subtitle: string;
  formattedDate: string;
  timezone: string;
}

export interface DailySnapshot {
  greeting: DailySnapshotGreeting;
  garden: GardenSnapshotState;
  news: NewsSnapshotState;
  attic: AtticSnapshotState;
  moon: MoonSnapshotState;
  storybook: StorybookSnapshotState;
  preferences: UserPreferences | null;
  refreshAll: () => Promise<void>;
}

/**
 * Computes contextual greeting, date, and quiet subtitle for a given timezone and optional display name.
 */
function computeGreetingDetails(
  timezone: string,
  displayName?: string | null
): DailySnapshotGreeting {
  const now = new Date();

  let hour = 12;
  let formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  try {
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now);
    hour = parseInt(hourStr, 10);

    formattedDate = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
  } catch {
    // Fallback gracefully to system local
  }

  const namePart = displayName ? `, ${displayName}` : "";

  let greeting = `Good day${namePart}.`;
  let subtitle = "A small day, still yours. Here is what is waiting in your world.";

  if (hour >= 5 && hour < 12) {
    greeting = `Good morning${namePart}.`;
    subtitle = "A small day, still yours. Here is what is waiting for you today.";
  } else if (hour >= 12 && hour < 17) {
    greeting = `Good afternoon${namePart}.`;
    subtitle = "The quiet middle of the day. A few small things to tend.";
  } else if (hour >= 17 && hour < 21) {
    greeting = `Good evening${namePart}.`;
    subtitle = "The light softens. Take your time with what remains.";
  } else {
    greeting = `Quiet night${namePart}.`;
    subtitle = "The world is quiet and still. A peaceful close to the day.";
  }

  return {
    greeting,
    subtitle,
    formattedDate,
    timezone,
  };
}

/**
 * Formats a calendar date string (YYYY-MM-DD) for display in a specific timezone.
 */
function getTodayDateString(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }
}

export function useDailySnapshot(): DailySnapshot {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [greeting, setGreeting] = useState<DailySnapshotGreeting>(() =>
    computeGreetingDetails("Asia/Kolkata")
  );

  // 1. Garden State
  const [garden, setGarden] = useState<GardenSnapshotState>({
    status: "loading",
    error: null,
    displayGoals: [],
    completedCount: 0,
    activeCount: 0,
    totalCount: 0,
    nearestDeadline: null,
    toggleGoal: async () => {},
  });

  // 2. News State
  const [news, setNews] = useState<NewsSnapshotState>({
    status: "loading",
    error: null,
    edition: null,
    articles: [],
  });

  // 3. Attic State
  const [attic, setAttic] = useState<AtticSnapshotState>({
    status: "loading",
    error: null,
    note: null,
  });

  // 4. Moon State
  const [moon, setMoon] = useState<MoonSnapshotState>({
    status: "loading",
    error: null,
    hasEntry: false,
    mood: null,
    wordCount: 0,
  });

  // 5. Storybook State
  const [storybook, setStorybook] = useState<StorybookSnapshotState>({
    status: "loading",
    error: null,
    recentAchievement: null,
    recentProject: null,
    recentChapter: null,
  });

  // Toggle goal completion with optimistic UI
  const handleToggleGoal = useCallback(
    async (goalId: string) => {
      // Find goal in display list
      const previousGoals = [...garden.displayGoals];
      const targetGoal = previousGoals.find((g) => g.id === goalId);
      if (!targetGoal) return;

      const willBeCompleted = targetGoal.status !== "completed";

      // Optimistic update
      setGarden((prev) => {
        const nextGoals = prev.displayGoals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                status: willBeCompleted ? ("completed" as const) : ("active" as const),
                completed_at: willBeCompleted ? new Date().toISOString() : null,
              }
            : g
        );
        const nextCompleted = willBeCompleted
          ? prev.completedCount + 1
          : Math.max(0, prev.completedCount - 1);
        const nextActive = willBeCompleted
          ? Math.max(0, prev.activeCount - 1)
          : prev.activeCount + 1;

        return {
          ...prev,
          displayGoals: nextGoals,
          completedCount: nextCompleted,
          activeCount: nextActive,
        };
      });

      try {
        const updated = await toggleGoalComplete(goalId);
        // Sync with actual returned goal
        setGarden((prev) => ({
          ...prev,
          displayGoals: prev.displayGoals.map((g) => (g.id === goalId ? updated : g)),
        }));
      } catch (err: unknown) {
        // Rollback on failure
        const msg = err instanceof Error ? err.message : "Failed to toggle goal";
        setGarden((prev) => ({
          ...prev,
          displayGoals: previousGoals,
          error: msg,
        }));
      }
    },
    [garden.displayGoals]
  );

  const loadPreferencesAndGreeting = useCallback(async (): Promise<string> => {
    let tz = "Asia/Kolkata";
    let dispName: string | null = null;
    try {
      const prefs = await fetchUserPreferences();
      setPreferences(prefs);
      if (prefs.timezone) tz = prefs.timezone;
      if (prefs.display_name) dispName = prefs.display_name;
    } catch {
      // Ignore if user preferences endpoint is unreachable or uses default
    }
    setGreeting(computeGreetingDetails(tz, dispName));
    return tz;
  }, []);

  const loadGarden = useCallback(
    async (tz: string) => {
      try {
        const data = await fetchGoals();
        const items = data.items || [];
        const todayStr = getTodayDateString(tz);

        if (items.length === 0) {
          setGarden({
            status: "empty",
            error: null,
            displayGoals: [],
            completedCount: 0,
            activeCount: 0,
            totalCount: 0,
            nearestDeadline: null,
            toggleGoal: handleToggleGoal,
          });
          return;
        }

        // Active items first, then completed
        const activeItems = items.filter((g) => g.status === "active");
        const completedItems = items.filter((g) => g.status === "completed");

        // Display up to 3 goals (prefer active ones, then completed)
        const display = [...activeItems, ...completedItems].slice(0, 3);

        // Find nearest upcoming deadline among active goals
        let nearest: NearestDeadlineToDisplay | null = null;
        const goalsWithDates = activeItems
          .filter((g) => Boolean(g.target_date))
          .sort((a, b) => (a.target_date || "").localeCompare(b.target_date || ""));

        if (goalsWithDates.length > 0 && goalsWithDates[0].target_date) {
          const targetStr = goalsWithDates[0].target_date;
          const isToday = targetStr === todayStr;
          const isPast = targetStr < todayStr;
          let formattedDate = targetStr;
          try {
            const parts = targetStr.split("-");
            if (parts.length === 3) {
              const d = new Date(
                parseInt(parts[0], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[2], 10)
              );
              formattedDate = d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }
          } catch {
            // Keep targetStr
          }

          nearest = {
            goalTitle: goalsWithDates[0].title,
            targetDate: targetStr,
            formattedDate,
            isToday,
            isPast,
          };
        }

        setGarden({
          status: "success",
          error: null,
          displayGoals: display,
          completedCount: data.completed_count,
          activeCount: data.active_count,
          totalCount: data.total,
          nearestDeadline: nearest,
          toggleGoal: handleToggleGoal,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load garden";
        setGarden({
          status: "error",
          error: message,
          displayGoals: [],
          completedCount: 0,
          activeCount: 0,
          totalCount: 0,
          nearestDeadline: null,
          toggleGoal: handleToggleGoal,
        });
      }
    },
    [handleToggleGoal]
  );

  const loadNews = useCallback(async () => {
    try {
      // First try fetching today's edition
      let edition: DailyEdition | null = null;
      let articles: NewsArticle[] = [];

      try {
        edition = await fetchTodayEdition();
        if (edition && edition.edition_articles && edition.edition_articles.length > 0) {
          articles = edition.edition_articles
            .map((ea) => ea.article)
            .filter(Boolean)
            .slice(0, 3);
        }
      } catch {
        // If today's edition isn't available yet or fails, fallback to recent news articles
      }

      if (articles.length === 0) {
        const articleList = await fetchNewsArticles({ limit: 3 });
        articles = articleList.items || [];
      }

      if (articles.length === 0 && !edition) {
        setNews({
          status: "empty",
          error: null,
          edition: null,
          articles: [],
        });
      } else {
        setNews({
          status: "success",
          error: null,
          edition,
          articles,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load news dispatch";
      setNews({
        status: "error",
        error: message,
        edition: null,
        articles: [],
      });
    }
  }, []);

  const loadAttic = useCallback(async () => {
    try {
      const data = await fetchNotes({ limit: 5 });
      const items = data.items || [];

      if (items.length === 0) {
        setAttic({
          status: "empty",
          error: null,
          note: null,
        });
        return;
      }

      // Check for first pinned note, otherwise first unarchived note
      const pinned = items.find((n) => n.is_pinned && !n.is_archived);
      const chosenNote = pinned || items.find((n) => !n.is_archived) || items[0];

      setAttic({
        status: "success",
        error: null,
        note: chosenNote,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load notes";
      setAttic({
        status: "error",
        error: message,
        note: null,
      });
    }
  }, []);

  const loadMoon = useCallback(async (tz: string) => {
    try {
      const todayStr = getTodayDateString(tz);
      const entry = await fetchDiaryEntryByDate(todayStr);

      if (entry) {
        setMoon({
          status: "success",
          error: null,
          hasEntry: true,
          mood: entry.mood || null,
          wordCount: entry.word_count || 0,
        });
      } else {
        setMoon({
          status: "empty",
          error: null,
          hasEntry: false,
          mood: null,
          wordCount: 0,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load reflection";
      setMoon({
        status: "error",
        error: message,
        hasEntry: false,
        mood: null,
        wordCount: 0,
      });
    }
  }, []);

  const loadStorybook = useCallback(async () => {
    try {
      const overview = await fetchStorybookOverview();

      const recentAchievement =
        overview.earned_achievements && overview.earned_achievements.length > 0
          ? overview.earned_achievements[0]
          : null;

      const recentProject =
        overview.featured_projects && overview.featured_projects.length > 0
          ? overview.featured_projects[0]
          : null;

      const recentChapter =
        overview.recent_chapters && overview.recent_chapters.length > 0
          ? overview.recent_chapters[0]
          : null;

      const hasContent = Boolean(recentAchievement || recentProject || recentChapter);

      if (!hasContent) {
        setStorybook({
          status: "empty",
          error: null,
          recentAchievement: null,
          recentProject: null,
          recentChapter: null,
        });
      } else {
        setStorybook({
          status: "success",
          error: null,
          recentAchievement,
          recentProject,
          recentChapter,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load storybook progress";
      setStorybook({
        status: "error",
        error: message,
        recentAchievement: null,
        recentProject: null,
        recentChapter: null,
      });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setGarden((prev) => ({ ...prev, status: "loading", error: null }));
    setNews((prev) => ({ ...prev, status: "loading", error: null }));
    setAttic((prev) => ({ ...prev, status: "loading", error: null }));
    setMoon((prev) => ({ ...prev, status: "loading", error: null }));
    setStorybook((prev) => ({ ...prev, status: "loading", error: null }));

    const localTz =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
        : "Asia/Kolkata";

    await Promise.allSettled([
      loadPreferencesAndGreeting(),
      loadGarden(localTz),
      loadNews(),
      loadAttic(),
      loadMoon(localTz),
      loadStorybook(),
    ]);
  }, [loadPreferencesAndGreeting, loadGarden, loadNews, loadAttic, loadMoon, loadStorybook]);

  useEffect(() => {
    let ignore = false;

    async function initialize() {
      const localTz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
          : "Asia/Kolkata";

      const prefPromise = fetchUserPreferences()
        .then((prefs) => {
          if (!ignore) {
            setPreferences(prefs);
            const tz = prefs.timezone || localTz;
            setGreeting(computeGreetingDetails(tz, prefs.display_name));
          }
        })
        .catch(() => {
          // Fallback to local timezone greeting
          if (!ignore) {
            setGreeting(computeGreetingDetails(localTz, null));
          }
        });

      const roomsPromise = Promise.allSettled([
        loadGarden(localTz),
        loadNews(),
        loadAttic(),
        loadMoon(localTz),
        loadStorybook(),
      ]);

      await Promise.allSettled([prefPromise, roomsPromise]);
    }

    void initialize();

    return () => {
      ignore = true;
    };
  }, [loadGarden, loadNews, loadAttic, loadMoon, loadStorybook]);

  return {
    greeting,
    garden,
    news,
    attic,
    moon,
    storybook,
    preferences,
    refreshAll,
  };
}
