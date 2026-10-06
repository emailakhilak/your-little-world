import { getSupabaseClient } from "@/lib/supabase/client";

export interface DatabaseHealth {
  status: "connected" | "disconnected" | "unknown";
  dialect?: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: "healthy" | "degraded";
  app_name: string;
  version: string;
  environment: string;
  database: DatabaseHealth;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user_id: string;
  email: string | null;
  role: string | null;
  message: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  status: "active" | "completed" | "archived";
  icon: string;
  priority: string;
  target_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  progress_current: number;
  progress_target: number;
  recurrence_cadence: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalListResponse {
  items: Goal[];
  total: number;
  active_count: number;
  completed_count: number;
  archived_count: number;
}

export interface GoalBulkDeleteResponse {
  deleted_count: number;
  deleted_ids: string[];
}

export interface GoalCreateInput {
  title: string;
  description?: string | null;
  category?: string;
  icon?: string;
  priority?: string;
  target_date?: string | null;
  progress_current?: number;
  progress_target?: number;
  recurrence_cadence?: string | null;
}

export interface GoalUpdateInput {
  title?: string;
  description?: string | null;
  category?: string;
  status?: string;
  icon?: string;
  priority?: string;
  target_date?: string | null;
  progress_current?: number;
  progress_target?: number;
  recurrence_cadence?: string | null;
}

export interface GoalInstance {
  id: string;
  goal_id: string;
  user_id: string;
  period_key: string;
  scheduled_date: string;
  status: "active" | "completed" | "skipped";
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalInstanceListResponse {
  items: GoalInstance[];
  total: number;
}

export interface Reminder {
  id: string;
  goal_id: string;
  user_id: string;
  reminder_time: string;
  timezone: string;
  is_enabled: boolean;
  channel: string;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderListResponse {
  items: Reminder[];
  total: number;
}

export interface ReminderCreateInput {
  reminder_time: string;
  timezone?: string;
  is_enabled?: boolean;
  channel?: string;
}

export interface ReminderUpdateInput {
  reminder_time?: string;
  timezone?: string;
  is_enabled?: boolean;
  channel?: string;
}

export interface LivenessCheckResponse {
  status: string;
  app_name: string;
  environment: string;
}

export interface ReadinessCheckResponse {
  status: string;
  database: string;
  dialect: string;
}

/**
 * Normalizes backend API URL by:
 * - Stripping any trailing slashes
 * - Ensuring the '/api/v1' prefix is appended if omitted in configuration
 */
export function normalizeApiBaseUrl(rawUrl?: string): string {
  const url = (
    rawUrl ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api/v1"
  ).trim();
  const clean = url.replace(/\/+$/, "");
  if (!clean.endsWith("/api/v1") && !clean.includes("/api/")) {
    return `${clean}/api/v1`;
  }
  return clean;
}

const API_BASE_URL = normalizeApiBaseUrl();

let cachedAccessToken: string | null = null;
let isAuthListenerAttached = false;

export function setCachedAuthToken(token: string | null): void {
  cachedAccessToken = token;
}

/**
 * Retrieves the current authentication bearer token.
 * Defaults to Supabase session token, with local persistent fallback in dev mode.
 */
export async function getAuthToken(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    if (!isAuthListenerAttached) {
      isAuthListenerAttached = true;
      try {
        supabase.auth.onAuthStateChange((_event, session) => {
          cachedAccessToken = session?.access_token ?? null;
        });
      } catch {
        // Ignore listener error
      }
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        cachedAccessToken = data.session.access_token;
        return data.session.access_token;
      }
    } catch {
      // Ignore if supabase cannot be reached
    }
  }

  // Fallback for local development or standalone exploration
  if (typeof window !== "undefined") {
    let localToken = localStorage.getItem("ylw_dev_user_token");
    if (!localToken) {
      localToken = `dev-user-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("ylw_dev_user_token", localToken);
    }
    return localToken;
  }

  return "dev-user";
}

/**
 * Pings the backend liveness probe.
 */
export async function getBackendLiveness(): Promise<LivenessCheckResponse> {
  const res = await fetch(`${API_BASE_URL}/health/live`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Liveness probe returned HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Pings the backend readiness probe.
 */
export async function getBackendReadiness(): Promise<ReadinessCheckResponse> {
  const res = await fetch(`${API_BASE_URL}/health/ready`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Readiness probe returned HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Pings the backend health endpoint.
 */
export async function getBackendHealth(): Promise<HealthCheckResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Verifies Supabase authentication token with the backend.
 */
export async function verifyBackendAuth(token: string): Promise<AuthMeResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.detail || `Authentication verification failed: HTTP ${res.status}`
    );
  }

  return res.json();
}

/**
 * Fetch all goals for the user with optional filters.
 */
export async function fetchGoals(
  status?: string,
  category?: string
): Promise<GoalListResponse> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (category) params.append("category", category);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/goals${query}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch goals (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Plant a new goal in the garden.
 */
export async function createGoal(data: GoalCreateInput): Promise<Goal> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to plant goal (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Update an existing goal.
 */
export async function updateGoal(
  id: string,
  data: GoalUpdateInput
): Promise<Goal> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update goal (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Toggle a goal between active and completed.
 */
export async function toggleGoalComplete(id: string): Promise<Goal> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/${id}/complete`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to toggle goal (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Archive a goal (rest in soil).
 */
export async function archiveGoal(id: string): Promise<Goal> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/${id}/archive`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to archive goal (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Permanently delete a goal.
 */
export async function deleteGoal(id: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete goal (HTTP ${res.status})`);
  }
}

/**
 * Permanently bulk delete multiple goals in a single request and transaction.
 */
export async function bulkDeleteGoals(
  goalIds: string[]
): Promise<GoalBulkDeleteResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/bulk`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify({ goal_ids: goalIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.detail || `Failed to bulk delete goals (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Fetch goal instances (occurrences) with optional filters.
 */
export async function fetchGoalInstances(
  goalId?: string,
  status?: string,
  date?: string
): Promise<GoalInstanceListResponse> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (goalId) params.append("goal_id", goalId);
  if (status) params.append("status", status);
  if (date) params.append("date", date);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/goals/instances${query}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch instances (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Toggle completion of a specific goal instance.
 */
export async function toggleInstanceComplete(
  instanceId: string
): Promise<GoalInstance> {
  const token = await getAuthToken();
  const res = await fetch(
    `${API_BASE_URL}/goals/instances/${instanceId}/complete`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to toggle occurrence (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch all reminders for the authenticated user in a single request.
 */
export async function fetchUserReminders(): Promise<ReminderListResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/reminders`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch reminders (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch reminders attached to a goal.
 */
export async function fetchGoalReminders(
  goalId: string
): Promise<ReminderListResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/${goalId}/reminders`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch reminders (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Create a reminder for a goal.
 */
export async function createReminder(
  goalId: string,
  data: ReminderCreateInput
): Promise<Reminder> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/${goalId}/reminders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create reminder (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Update an existing reminder.
 */
export async function updateReminder(
  reminderId: string,
  data: ReminderUpdateInput
): Promise<Reminder> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/reminders/${reminderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update reminder (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Delete a reminder.
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/goals/reminders/${reminderId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete reminder (HTTP ${res.status})`);
  }
}

export interface Achievement {
  id: string;
  user_id: string;
  milestone_key: string;
  title: string;
  description: string;
  category: "milestone" | "goal" | "recurring" | "progress" | "personal" | string;
  icon: string;
  source_type: string | null;
  source_id: string | null;
  metadata?: Record<string, unknown> | null;
  achieved_at: string;
  created_at: string;
}

export interface AchievementListResponse {
  items: Achievement[];
  total: number;
}

/**
 * Fetch all milestones / achievements earned by the user.
 */
export async function fetchAchievements(
  category?: string
): Promise<AchievementListResponse> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (category) params.append("category", category);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/achievements${query}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch achievements (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch a single achievement by ID.
 */
export async function fetchAchievement(id: string): Promise<Achievement> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/achievements/${id}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch achievement (HTTP ${res.status})`);
  }

  return res.json();
}

// ==============================================================
// News Domain (The Faraway Window)
// ==============================================================

export type NewsCategoryType = "ai" | "mystery" | "science_defence" | "developer";

export interface NewsCategoryMeta {
  id: NewsCategoryType;
  label: string;
  description: string;
  icon: string;
}

export const NEWS_CATEGORIES: Record<NewsCategoryType, NewsCategoryMeta> = {
  ai: {
    id: "ai",
    label: "AI Tools & AI News",
    description: "Machine intelligence breakthroughs, tooling, and dispatches from the digital frontier.",
    icon: "⚡",
  },
  mystery: {
    id: "mystery",
    label: "Detective / Mystery / Investigation",
    description: "Puzzles, forensic inquiries, historical mysteries, and investigative dispatches.",
    icon: "🔍",
  },
  science_defence: {
    id: "science_defence",
    label: "Space / Science / Defence-Tech",
    description: "NASA, ISRO, deep space discoveries, planetary science, and advanced engineering.",
    icon: "🛰️",
  },
  developer: {
    id: "developer",
    label: "Software / Developer News",
    description: "Language evolutions, open source craft, software architectures, and developer stories.",
    icon: "💻",
  },
};

export interface NewsSource {
  id: string;
  name: string;
  base_url: string;
  feed_url: string;
  source_type: string;
  category: string;
  is_enabled: boolean;
  reliability_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface NewsSourceListResponse {
  items: NewsSource[];
  total: number;
}

export interface NewsArticle {
  id: string;
  source_id: string;
  source_name?: string | null;
  external_id?: string | null;
  canonical_url: string;
  title: string;
  description?: string | null;
  url: string;
  author?: string | null;
  published_at?: string | null;
  fetched_at: string;
  image_url?: string | null;
  category: string;
  summary?: string | null;
  key_points?: string[] | null;
  why_it_matters?: string | null;
  summary_status?: string;
  summary_provider?: string | null;
  is_read?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyEditionArticle {
  id: string;
  edition_id: string;
  article_id: string;
  category: string;
  position: number;
  article: NewsArticle;
}

export interface DailyEdition {
  id: string;
  edition_date: string;
  title: string;
  status: string;
  lead_summary?: string | null;
  metadata_json?: Record<string, unknown> | null;
  edition_articles: DailyEditionArticle[];
  created_at: string;
  updated_at: string;
}

export interface DailyEditionListResponse {
  items: DailyEdition[];
  total: number;
  limit: number;
  offset: number;
}

export interface NewsArticleListResponse {
  items: NewsArticle[];
  total: number;
  limit: number;
  offset: number;
}

export interface IngestionSourceDetail {
  source_id: string;
  source_name: string;
  category: string;
  status: "success" | "error" | string;
  articles_seen: number;
  articles_added: number;
  articles_skipped: number;
  error_message?: string | null;
}

export interface NewsIngestionStats {
  sources_processed: number;
  articles_seen: number;
  articles_added: number;
  articles_skipped: number;
  errors: string[];
  source_details?: IngestionSourceDetail[];
}

/**
 * Fetch news articles with category, source, and pagination filtering.
 */
export async function fetchNewsArticles(filters?: {
  category?: string;
  source_id?: string;
  limit?: number;
  offset?: number;
}): Promise<NewsArticleListResponse> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);
  if (filters?.source_id) params.append("source_id", filters.source_id);
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/news/articles${query}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch news articles (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch a single news article by ID.
 */
export async function fetchNewsArticle(id: string): Promise<NewsArticle> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/news/articles/${id}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch article (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch registered news sources.
 */
export async function fetchNewsSources(filters?: {
  category?: string;
  is_enabled?: boolean;
}): Promise<NewsSourceListResponse> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);
  if (filters?.is_enabled !== undefined) params.append("is_enabled", String(filters.is_enabled));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/news/sources${query}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch news sources (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Trigger an ingestion run across enabled sources (dev/admin endpoint).
 */
export async function triggerNewsIngestion(params?: {
  category?: string;
  sync_sources?: boolean;
}): Promise<NewsIngestionStats> {
  const token = await getAuthToken();
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append("category", params.category);
  if (params?.sync_sources !== undefined) queryParams.append("sync_sources", String(params.sync_sources));

  const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/news/ingest${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to trigger ingestion (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch today's curated Daily Edition.
 */
export async function fetchTodayEdition(forceRegenerate: boolean = false): Promise<DailyEdition> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/news/editions/today?force_regenerate=${forceRegenerate}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to load today's edition (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch list of past Daily Editions.
 */
export async function fetchDailyEditions(limit: number = 30, offset: number = 0): Promise<DailyEditionListResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/news/editions?limit=${limit}&offset=${offset}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to load editions (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Mark a news article as read.
 */
export async function markArticleAsRead(articleId: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/news/articles/${articleId}/read`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to mark article as read (HTTP ${res.status})`);
  }
}

/**
 * Trigger on-demand AI summarization for an article.
 */
export async function summarizeArticle(articleId: string, force: boolean = false): Promise<NewsArticle> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/news/articles/${articleId}/summarize?force=${force}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to summarize article (HTTP ${res.status})`);
  }

  return res.json();
}

/* =========================================================================
 * LITTLE ATTIC NOTES
 * ========================================================================= */

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteCreateInput {
  title: string;
  content: string;
  tags?: string[];
  category?: string;
  is_pinned?: boolean;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  tags?: string[];
  category?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface NoteListResponse {
  items: Note[];
  total: number;
  pinned_count: number;
  archived_count: number;
}

export interface NoteAISuggestion {
  suggested_category: string;
  suggested_tags: string[];
}

export async function fetchNotes(filters?: {
  category?: string;
  search?: string;
  tag?: string;
  is_archived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<NoteListResponse> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tag) params.append("tag", filters.tag);
  if (filters?.is_archived !== undefined) params.append("is_archived", String(filters.is_archived));
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.offset) params.append("offset", String(filters.offset));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/notes${query}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch notes (HTTP ${res.status})`);
  }

  return res.json();
}

export async function createNote(data: NoteCreateInput): Promise<Note> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create note (HTTP ${res.status})`);
  }

  return res.json();
}

export async function updateNote(noteId: string, data: NoteUpdateInput): Promise<Note> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update note (HTTP ${res.status})`);
  }

  return res.json();
}

export async function deleteNote(noteId: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete note (HTTP ${res.status})`);
  }
}

export async function togglePinNote(noteId: string, pinned?: boolean): Promise<Note> {
  if (pinned !== undefined) {
    return updateNote(noteId, { is_pinned: pinned });
  }
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/notes/${noteId}/pin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update note pin state (HTTP ${res.status})`);
  }

  return res.json();
}

export async function toggleArchiveNote(noteId: string, archived?: boolean): Promise<Note> {
  if (archived !== undefined) {
    return updateNote(noteId, { is_archived: archived });
  }
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/notes/${noteId}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update note archive state (HTTP ${res.status})`);
  }

  return res.json();
}

export async function suggestNoteTags(data: { title: string; content: string }): Promise<NoteAISuggestion> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/notes/suggest-tags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to get AI suggestions (HTTP ${res.status})`);
  }

  return res.json();
}

// ============================================================================
// MOON ROOM (DIARY) API
// ============================================================================

export interface DiaryEntry {
  id: string;
  user_id: string;
  entry_date: string;
  title: string | null;
  content: string;
  mood: string | null;
  entry_time?: string | null;
  tags: string[];
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface DiaryListResponse {
  items: DiaryEntry[];
  total: number;
}

export interface DiaryUpsertInput {
  entry_date: string;
  title?: string | null;
  content: string;
  mood?: string | null;
  entry_time?: string | null;
  tags?: string[];
}

export interface DiaryReflectionResponse {
  entry_id: string;
  reflection: string;
  themes: string[];
  questions_to_consider: string[];
  tone: string;
  provider: string;
}

export async function fetchDiaryEntries(params?: {
  search?: string;
  mood?: string;
  limit?: number;
  offset?: number;
}): Promise<DiaryListResponse> {
  const token = await getAuthToken();
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.mood) query.set("mood", params.mood);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const url = `${API_BASE_URL}/diary/entries${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch diary entries (HTTP ${res.status})`);
  }

  return res.json();
}

export async function fetchDiaryEntryByDate(dateStr: string): Promise<DiaryEntry | null> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/diary/entries/by-date/${dateStr}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch diary entry for date (HTTP ${res.status})`);
  }

  return res.json();
}

export async function upsertDiaryEntry(data: DiaryUpsertInput): Promise<DiaryEntry> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/diary/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to save diary entry (HTTP ${res.status})`);
  }

  return res.json();
}

export async function deleteDiaryEntry(entryId: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/diary/entries/${entryId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete diary entry (HTTP ${res.status})`);
  }
}

export async function reflectOnDiaryEntry(entryId: string): Promise<DiaryReflectionResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/diary/entries/${entryId}/reflect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to generate reflection (HTTP ${res.status})`);
  }

  return res.json();
}

// ============================================================================
// STORYBOOK API
// ============================================================================

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "in_progress" | "completed" | "archived" | "concept" | string;
  technologies: string[];
  github_url: string | null;
  live_url: string | null;
  start_date: string | null;
  completion_date: string | null;
  lessons_learned: string | null;
  is_featured: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateInput {
  title: string;
  description?: string | null;
  status?: string;
  technologies?: string[];
  github_url?: string | null;
  live_url?: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  lessons_learned?: string | null;
  is_featured?: boolean;
  order_index?: number;
}

export interface ProjectUpdateInput {
  title?: string;
  description?: string | null;
  status?: string;
  technologies?: string[];
  github_url?: string | null;
  live_url?: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  lessons_learned?: string | null;
  is_featured?: boolean;
  order_index?: number;
}

export interface StoryChapter {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  period: string | null;
  order_index: number;
  milestones: Array<{ title: string; date?: string; notes?: string }>;
  reflections: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryChapterCreateInput {
  title: string;
  description?: string | null;
  period?: string | null;
  order_index?: number;
  milestones?: Array<{ title: string; date?: string; notes?: string }>;
  reflections?: string | null;
}

export interface StoryChapterUpdateInput {
  title?: string;
  description?: string | null;
  period?: string | null;
  order_index?: number;
  milestones?: Array<{ title: string; date?: string; notes?: string }>;
  reflections?: string | null;
}

export interface StorybookAchievementItem {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlocked_at: string;
}

export interface StorybookOverview {
  projects_count: number;
  completed_projects_count: number;
  featured_projects_count: number;
  chapters_count: number;
  achievements_earned_count: number;
  featured_projects: Project[];
  recent_chapters: StoryChapter[];
  earned_achievements: StorybookAchievementItem[];
  all_technologies: string[];
}

export async function fetchStorybookOverview(): Promise<StorybookOverview> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/overview`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch storybook overview (HTTP ${res.status})`);
  }

  return res.json();
}

export async function fetchProjects(params?: {
  status?: string;
  featured_only?: boolean;
}): Promise<{ items: Project[]; total: number }> {
  const token = await getAuthToken();
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.featured_only) query.set("featured_only", "true");

  const url = `${API_BASE_URL}/storybook/projects${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch projects (HTTP ${res.status})`);
  }

  return res.json();
}

export async function createProject(data: ProjectCreateInput): Promise<Project> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create project (HTTP ${res.status})`);
  }

  return res.json();
}

export async function updateProject(id: string, data: ProjectUpdateInput): Promise<Project> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/projects/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update project (HTTP ${res.status})`);
  }

  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/projects/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete project (HTTP ${res.status})`);
  }
}

export async function toggleProjectFeatured(id: string): Promise<Project> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/projects/${id}/featured`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to toggle project featured status (HTTP ${res.status})`);
  }

  return res.json();
}

export async function fetchChapters(): Promise<{ items: StoryChapter[]; total: number }> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/chapters`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch story chapters (HTTP ${res.status})`);
  }

  return res.json();
}

export async function createChapter(data: StoryChapterCreateInput): Promise<StoryChapter> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/chapters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create chapter (HTTP ${res.status})`);
  }

  return res.json();
}

export async function updateChapter(id: string, data: StoryChapterUpdateInput): Promise<StoryChapter> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/chapters/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update chapter (HTTP ${res.status})`);
  }

  return res.json();
}

export async function deleteChapter(id: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/storybook/chapters/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete chapter (HTTP ${res.status})`);
  }
}

// ============================================================================
// SETTINGS / PREFERENCES API
// ============================================================================

export interface UserPreferences {
  id: string;
  user_id: string;
  display_name: string | null;
  timezone: string;
  news_daily_update: boolean;
  news_update_time: string;
  notifications_enabled: boolean;
  notification_channels: string[];
  reduced_motion: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesUpdateInput {
  display_name?: string | null;
  timezone?: string;
  news_daily_update?: boolean;
  news_update_time?: string;
  notifications_enabled?: boolean;
  notification_channels?: string[];
  reduced_motion?: boolean;
}

export async function fetchUserPreferences(): Promise<UserPreferences> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/settings/preferences`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch preferences (HTTP ${res.status})`);
  }

  return res.json();
}

export async function updateUserPreferences(data: UserPreferencesUpdateInput): Promise<UserPreferences> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/settings/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update preferences (HTTP ${res.status})`);
  }

  return res.json();
}

/* =========================================================================
   THE LITTLE LEDGER (Money Diary)
   ========================================================================= */

export interface LedgerEntry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  content: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntryCreateInput {
  entry_date: string;
  content: string;
}

export interface LedgerEntryUpdateInput {
  content: string;
}

export interface LedgerEntryListResponse {
  items: LedgerEntry[];
  total: number;
}

/**
 * Fetch recent money diary entries for The Little Ledger.
 */
export async function fetchLedgerEntries(params?: {
  limit?: number;
  offset?: number;
}): Promise<LedgerEntryListResponse> {
  const token = await getAuthToken();
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.append("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.append("offset", String(params.offset));

  const url = `${API_BASE_URL}/ledger/entries${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch ledger entries (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Get a ledger entry by specific calendar date (YYYY-MM-DD), or null if none exists.
 */
export async function fetchLedgerEntryByDate(
  entryDate: string
): Promise<LedgerEntry | null> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/ledger/entries/by-date/${entryDate}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch ledger entry for ${entryDate} (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Get a specific ledger entry by its unique ID.
 */
export async function fetchLedgerEntryById(id: string): Promise<LedgerEntry> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/ledger/entries/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch ledger entry (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Create or save a money diary note for a calendar date.
 */
export async function createLedgerEntry(
  data: LedgerEntryCreateInput
): Promise<LedgerEntry> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/ledger/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to save ledger entry (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Update an existing money diary note.
 */
export async function updateLedgerEntry(
  id: string,
  data: LedgerEntryUpdateInput
): Promise<LedgerEntry> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/ledger/entries/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update ledger entry (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Delete a money diary note.
 */
export async function deleteLedgerEntry(id: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/ledger/entries/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete ledger entry (HTTP ${res.status})`);
  }
}
