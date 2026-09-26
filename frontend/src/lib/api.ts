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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
export async function verifyBackendAuth(
  token: string
): Promise<AuthMeResponse> {
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
