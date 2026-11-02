# Project rules (read every session)
- Read BRIEF.md and ASSUMPTIONS.md before any work.
- Product: D2C home brand order, payment and return reconciliation tool. Build the CORE BUILD slice end to end first.
- Keep it simple: one FastAPI service, one Postgres. No queues, microservices or Redis.
- Never commit secrets. Config via env vars; .env.example lists names only.
- Small commits with conventional messages (feat:, fix:, test:, docs:).
- Money is NUMERIC(12,2), never float.
- Every list screen has loading, empty and error states. Mobile-first.
- Every endpoint validates input (Pydantic) and enforces role-based access.
- No dead buttons: unbuilt features are removed, not shown.
- Log every assumption in ASSUMPTIONS.md.

## Stack
- `backend/`: FastAPI, Python 3.12, SQLAlchemy 2, Alembic, Pytest
- `frontend/`: Next.js (App Router), TypeScript, Tailwind
- Postgres via `docker-compose.yml` for local dev
- Task prompts live in `prompts/` (run in order, one per session)

## Commands
- DB: `docker compose up -d db`
- Backend: `cd backend && pip install -e ".[dev]" && alembic upgrade head && uvicorn app.main:app --reload`
- Tests: `cd backend && pytest`
- Frontend: `cd frontend && npm install && npm run dev`
