# Your Little World (🌱 🪟 🕯️ 🌙 📖)

> A private, whimsical, and tactile personal digital sanctuary.

**Your Little World** is an illustrated web application designed to help you track goals, capture fleeting sparks, read curated discoveries, record daily reflections in private, and chronicle your life and career journey.

---

## 🏛️ System Architecture

* **Frontend (`/frontend`):** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS v4.
* **Backend (`/backend`):** Python 3.14, FastAPI, Pydantic Settings, SQLAlchemy 2.0 (Async), Alembic.
* **Database & Auth:** Supabase Cloud (PostgreSQL) + Supabase Auth (JWT verification).
* **AI Layer:** Pluggable Provider Abstraction (`LLMProvider`) designed for seamless multi-model switching (Gemini, Claude, OpenAI, Ollama).

---

## 🚀 Quickstart Guide

### 1. Environment Configuration

Copy the template environment files into place:

```bash
# In the root repository:
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

> **Note:** For local development and Phase 0 verification, `backend/.env` defaults to a local SQLite database (`sqlite+aiosqlite:///./test.db`). Once you create your Supabase Cloud project, replace `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_JWT_SECRET` with your cloud credentials.

---

### 2. Backend Setup & Execution

Open a terminal in `backend/`:

```powershell
# 1. Navigate to backend
cd backend

# 2. Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# 3. (Optional) Install dependencies if updating
pip install -r requirements.txt

# 4. Start the FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* **Interactive API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **System Health Check:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

#### Running Backend Tests & Linters
```powershell
# Run unit tests
pytest -v

# Run fast linter & code formatter
ruff check .
```

#### Running Database Migrations (Alembic)
```powershell
# Check current migration revision
alembic current

# Generate new migration from models
alembic revision --autogenerate -m "create_initial_tables"

# Upgrade database to latest revision
alembic upgrade head
```

---

### 3. Frontend Setup & Execution

Open a second terminal in `frontend/`:

```powershell
# 1. Navigate to frontend
cd frontend

# 2. (Optional) Install dependencies if updating
npm install

# 3. Start the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The Phase 0 verification screen will test real-time communication with the FastAPI backend on port 8000.

#### Running Frontend Type Checks & Linters
```powershell
# Check TypeScript types & build
npm run build

# Run ESLint
npm run lint
```

---

## 🗺️ Roadmap & Current Status

* [x] **Phase 0: Development Foundation**
  * [x] Next.js 15+ & TypeScript & Tailwind CSS v4 foundation
  * [x] FastAPI Python application with Pydantic Settings
  * [x] Async SQLAlchemy + Alembic migration configuration
  * [x] Supabase JWT verification dependency (`/api/v1/auth/me`)
  * [x] Pluggable AI provider abstraction interface (`app/ai/base.py`)
  * [x] Health check endpoint (`/api/v1/health`)
  * [x] Frontend ↔ Backend real-time handshake view
  * [x] Complete test suite and linter configurations
* [ ] **Phase 1: The Living Room Scene** (Interactive illustrated hub & 5 physical portals)
* [ ] **Phase 2: Garden of Tomorrow & Little Attic** (Goals, seeds, notes & search)
* [ ] **Phase 3: The Moon Room** (Encrypted private daily diary)
* [ ] **Phase 4: The Faraway Window** (Curated news ingestion worker)
* [ ] **Phase 5: The Storybook** (Milestones, career chronicles & portfolio exporter)
* [ ] **Phase 6: AI Magic** (Idea resurfacing & reflection features)
