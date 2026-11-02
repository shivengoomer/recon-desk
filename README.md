# recon-desk

Order, payment and return reconciliation tool for a D2C home brand.

- `backend/`: FastAPI + SQLAlchemy 2 + Alembic + Pytest
- `frontend/`: Next.js (App Router) + TypeScript + Tailwind

## Quick start
```bash
cp .env.example .env   # fill in values (DATABASE_URL: postgresql+psycopg://recon:recon_local_only@localhost:5432/recon)
docker compose up -d db
cd backend && pip install -e ".[dev]" && alembic upgrade head && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

See `CLAUDE.md` for project rules, `BRIEF.md` for the client brief, `ASSUMPTIONS.md` for assumptions.
