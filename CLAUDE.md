# Project rules (read every session)
- Read BRIEF.md and ASSUMPTIONS.md before any work. Read DESIGN.md before any UI work (it overrides prompts/06).
- Product: order, settlement, COD and freight reconciliation for a D2C home-textiles brand (see BRIEF.md). Build the CORE BUILD slice end to end first: upload with saved column mapping, order-level matching, rate-card expected amounts, claims list, money-at-risk view. Roles: finance_executive and cofounder.
- BRIEF.md overrides `prompts/` wherever they disagree (the kit assumed a different problem: gateway payments and refunds).
- Matching and expected amounts are rules, never AI. AI only proposes column mappings and order-ID-less match suggestions; both need human approval and never auto-close.
- Performance target: 1 lakh rows matched in under a minute. Use set-based SQL / bulk inserts, never per-row ORM loops.
- TCS and TDS are shown separately, never counted as leakage. Mask personal data (DPDP Act 2023); do not ingest names, phones or addresses.
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

## Git
- Commit messages are conventional and written as plain project history: no `Co-Authored-By` trailers, no "Generated with" lines, no tool attribution.
- One logical change per commit.
