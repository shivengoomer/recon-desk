# Project rules (every session must follow)

1. **Read `BRIEF.md` and `ASSUMPTIONS.md` before any work.** Add new assumptions to `ASSUMPTIONS.md` (numbered, tagged with the file/feature affected).
2. **Scope:** order, payment and return reconciliation tool for a D2C home brand. Build the **CORE BUILD** slice from `BRIEF.md` end to end before anything else.
3. **Keep it simple:** one FastAPI service, one Postgres. No queues, no microservices, no Redis.
4. **Secrets:** never commit them. All config via env vars; `.env.example` lists names only (no real values).
5. **Git:** small, meaningful commits with conventional messages (`feat:`, `fix:`, `test:`, `docs:`).
6. **Frontend:** every list screen has loading, empty and error states. Mobile-first layout.
7. **Backend:** every endpoint validates input with Pydantic and enforces role-based access.

## Stack
- `backend/`: FastAPI, Python 3.12, SQLAlchemy 2, Alembic, Pytest
- `frontend/`: Next.js (App Router), TypeScript, Tailwind
- Postgres via `docker-compose.yml` for local dev

## Commands
- DB: `docker compose up -d db`
- Backend: `cd backend && pip install -e ".[dev]" && alembic upgrade head && uvicorn app.main:app --reload`
- Tests: `cd backend && pytest`
- Frontend: `cd frontend && npm install && npm run dev`
