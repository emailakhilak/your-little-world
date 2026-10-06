# Production Deployment Infrastructure Guide — Your Little World

This document outlines the deployment topology, environment configuration, database migration workflows, and operational best practices for deploying **Your Little World** to production.

---

## 1. System Architecture

```text
  [ Client Browser / Mobile Web ]
                 │
      HTTPS      │  Supabase Auth (login / signup / JWT session)
                 ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                    Supabase Cloud                               │
  │  - Auth Service: Issues user JWTs (HS256 secret or JWKS RS256)  │
  │  - PostgreSQL Database: Cloud relational database with SSL      │
  │  - Transaction Pooler: PgBouncer (Port 6543, statement_cache=0) │
  └─────────────────────────────────────────────────────────────────┘
                 ▲                                  ▲
                 │ API Requests                     │ AsyncPG
                 │ (Bearer <JWT>)                   │ (Port 6543 / 5432)
  ┌──────────────┴──────────────────┐  ┌────────────┴───────────────┐
  │         Frontend App            │  │        Backend API         │
  │  - Next.js (App Router)         │  │  - FastAPI (Python 3.12+)  │
  │  - SSR / Static Optimization    │  │  - Production ASGI server  │
  │  - Tailwind CSS + Framer Motion │  │  - Faraway Scheduler       │
  │  - Config: NEXT_PUBLIC_API_URL  │  │  - Strict JWT Verification │
  └─────────────────────────────────┘  └────────────────────────────┘
```

---

## 2. Supabase Cloud Configuration

### A. Database Connection Strings
Supabase provides two connection types in **Project Settings -> Database -> Connection string**:

1. **Transaction Pooler (Recommended for Serverless / Scalable Backends)**:
   - **Port**: `6543`
   - **Host**: `aws-0-[region].pooler.supabase.com`
   - **Format**: `postgresql+asyncpg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`
   - *Note*: The application automatically sets `statement_cache_size=0` for port `6543` and handles `ssl=require`.

2. **Session Pooler or Direct Connection**:
   - **Port**: `5432`
   - **Host**: `db.[project-ref].supabase.co`
   - **Format**: `postgresql+asyncpg://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require`

### B. Supabase Auth & JWT Settings
Found in **Project Settings -> API -> JWT Settings**:
- `SUPABASE_URL`: `https://[project-ref].supabase.co`
- `SUPABASE_ANON_KEY`: Public anon key for client-side authentication.
- `SUPABASE_JWT_ALGORITHM`: `ES256` (Supabase ECC/P-256 asymmetric signing via JWKS), `RS256`, or `HS256` (legacy symmetric shared secret).
- `SUPABASE_JWKS_URL`: `https://[project-ref].supabase.co/auth/v1/.well-known/jwks.json` (asymmetric JWKS verification endpoint).
- `SUPABASE_JWT_SECRET`: Shared secret used for verifying `HS256` signatures (only needed if using legacy `HS256`).

---

## 3. Database Migration Workflow (Alembic)

Database migrations must run before starting the updated backend web processes:

```bash
# Navigate to backend directory
cd backend

# Execute database migrations to latest schema head
alembic upgrade head

# Verify current revision
alembic current
```

- **Safety Guarantee**: The migration environment automatically applies database URL normalization, sets `statement_cache_size=0` on pooler connections, and enforces SSL requirements.
- **Dry Run Verification**: To generate the complete SQL script without applying it:
  ```bash
  alembic upgrade head --sql
  ```

---

## 4. Backend Deployment (FastAPI)

### A. ASGI Server Configuration
Run FastAPI using Uvicorn with standard production configurations:

```bash
cd backend
python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port ${PORT:-8000} \
  --workers 1 \
  --proxy-headers \
  --forwarded-allow-ips "*"
```

### B. In-Process Scheduler Considerations
- The Faraway Window daily news compiler, goal reminders, and recurring goal generator run via `GardenScheduler` within the FastAPI lifespan.
- **Single-Worker Deployments**: Running `--workers 1` safely hosts both web API and scheduler tasks.
- **Multi-Worker Deployments**: In horizontally scaled or multi-worker setups, set `ENABLE_SCHEDULER=true` on exactly one instance or a dedicated background process, and `ENABLE_SCHEDULER=false` on auxiliary web workers to avoid redundant scheduling loops. Database unique constraints prevent duplicate data creation.

### C. Health Probes
Configure container orchestrators or hosting load balancers (e.g. AWS ECS, GCP Cloud Run, Render, Railway, Kubernetes) with the dedicated probes:
- **Liveness Probe**: `GET /api/v1/health/live` (Returns HTTP 200 `{"status": "alive", ...}`)
- **Readiness Probe**: `GET /api/v1/health/ready` (Returns HTTP 200 when database connectivity succeeds; returns HTTP 503 if unreachable, without exposing credentials or internal connection strings)

---

## 5. Frontend Deployment (Next.js)

### A. Production Build & Start
```bash
cd frontend

# Build optimized production bundle
npm run build

# Start Next.js production server
npm run start -p ${PORT:-3000}
```

### B. Environment Variables
- `NEXT_PUBLIC_API_URL`: Points to the deployed backend HTTPS URL (e.g., `https://api.yourlittleworld.com/api/v1`). Trailing slashes and missing `/api/v1` prefixes are automatically handled.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key for browser authentication.
- **Security**: Do NOT include `SUPABASE_JWT_SECRET`, database passwords, or LLM API keys in frontend environment variables.

---

## 6. Security & Operational Checklist

| Item | Requirement | Production Status |
| :--- | :--- | :--- |
| **Authentication** | Real signed Supabase JWTs required | Enforced in `ENVIRONMENT=production`. Dev/test tokens rejected. |
| **CORS** | Explicit frontend origin domains required | Wildcard `*` strictly disallowed with credentials. |
| **Credential Safety** | Zero credentials in logs or responses | Sanitized exception handler, no JWT/key logging, masked provider `repr()`. |
| **Health Checks** | Non-leaking readiness probe | `GET /api/v1/health/ready` returns safe status without connection strings. |
| **Pooler Handling** | AsyncPG prepared statement compatibility | `statement_cache_size=0` on port 6543 automatically configured. |
| **User Isolation** | Cross-tenant data partition | All database queries filtered strictly by authenticated `user_id`. |
