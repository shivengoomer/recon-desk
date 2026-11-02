# recon-desk

Order, payment and return reconciliation tool for a D2C home brand.

- `backend/`: FastAPI + SQLAlchemy 2 + Alembic + Pytest
- `frontend/`: Next.js (App Router) + TypeScript + Tailwind

## Quick start

Using `make`:
```bash
make setup      # Bootstrap .env, install dependencies, start PostgreSQL, run migrations & seed
make dev        # Run both FastAPI backend (:8000) and Next.js frontend (:3000)
```

Manual setup:
```bash
cp .env.example .env   # fill in values (DATABASE_URL: postgresql+psycopg://recon:recon_local_only@localhost:5432/recon)
docker compose up -d db
cd backend && pip install -e ".[dev]" && alembic upgrade head && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

Run `make help` to inspect all available commands (tests, database management, migrations, seeds, builds).

See `CLAUDE.md` for project rules, `BRIEF.md` for the client brief, `ASSUMPTIONS.md` for assumptions.
