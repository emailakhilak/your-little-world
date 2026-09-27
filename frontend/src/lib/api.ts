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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Retrieves the current authentication bearer token.
 * Defaults to Supabase session token, with local persistent fallback in dev mode.
 */
export async function getAuthToken(): Promise<string> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
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
  created_at: string;
  updated_at: string;
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
