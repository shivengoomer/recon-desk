# Recon Desk

Order, settlement, COD and freight reconciliation for a D2C home-textiles brand. Upload every partner's reports, see per order whether the brand was paid the right amount, and turn anything short, late or overcharged into a claim with evidence.

Built for a client brief (see [BRIEF.md](BRIEF.md)): 30,000 orders a month across a website, 3 marketplaces and 2 quick-commerce apps, 2 courier aggregators, about 1.5% of order value leaking.

## What it does

- **Import** CSV or Excel files (orders, settlements, COD remittances, freight invoices). Column mapping is saved per partner and file kind, previewed on 20 rows, approved by a person and versioned with rollback. Re-uploading a file is idempotent; rejected rows are downloadable.
- **Match** every order against rate-card expected amounts with set-based SQL. Statuses: settled, short-paid, unpaid past due, freight overcharged, plus pending and over-paid. Gaps over a configurable ₹10 tolerance are flagged.
- **Claims** by partner with an evidence snapshot (expected-vs-received breakdown plus source rows) and CSV export.
- **Money at risk** dashboard by partner and age. GST TCS and income-tax TDS are shown separately and never counted as leakage.
- **Review queue** for settlement and COD lines with no order ID: suggested matches wait for a person and never close an order.
- **Roles**: finance executive (upload, approve mappings, run matching, work claims) and co-founder (all of that, plus rate cards, settings and the audit log).

Matching and expected amounts are rules, not AI. The "AI" parts (mapping and match suggestions) are heuristics today, always human-approved. Personal data (names, phones, addresses) is never imported.

Performance (synthetic, local Postgres 16): 1 lakh orders plus about 1.2 lakh partner lines import in 4.4 s and match in 8.9 s. Details and accuracy figures are in [ASSUMPTIONS.md](ASSUMPTIONS.md).

Not built: the returns tracker ("return not received", needs warehouse scan files).

## Stack

| | |
|---|---|
| Backend | FastAPI, Python 3.12, SQLAlchemy 2, Alembic, Pydantic v2, pytest |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, Radix, Playwright |
| Database | PostgreSQL 16 (Docker locally, Neon in production) |
| Deploy | Backend in Docker on an Azure VM via GitHub Actions; frontend hosted separately |

## Repository layout

```
backend/
  app/api/        routes (auth, imports, mappings, matching, orders, claims, dashboard, rate cards)
  app/ingest/     parsing, normalisation, mapping suggestions, bulk import
  app/matching/   engine and the set-based SQL
  app/models/     SQLAlchemy models
  alembic/        migrations
  scripts/        seed data generator, import and precision/recall evaluation
  tests/          pytest suite
frontend/
  app/            landing page, login, app shell (dashboard, orders, claims, imports, review, rate cards, audit)
  e2e/            Playwright tests and screenshots
prompts/          build prompts used while developing
BRIEF.md  ASSUMPTIONS.md  DESIGN.md  CLAUDE.md
```

## Run locally

Requirements: Python 3.12+, Node 20+, Docker, `make` (optional).

```bash
make setup   # .env from template, dependencies, Postgres, migrations, seed data
make dev     # backend :8000, frontend :3000
```

Edit `.env` before `make dev` (see below). `make help` lists every command.

Manual steps:

```bash
cp .env.example .env
docker compose up -d db
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m scripts.seed --import --reset      # sample data + matching
uvicorn app.main:app --reload                # API docs at http://localhost:8000/docs
# in another terminal
cd frontend && npm install && npm run dev
```

## Configuration

Names only; set values in `.env` (git-ignored).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://user:pass@host:5432/db` |
| `JWT_SECRET` | 16+ random characters |
| `JWT_EXPIRE_MINUTES` | Token lifetime (default 60) |
| `FRONTEND_ORIGIN` | Allowed CORS origin, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Backend URL the frontend calls, e.g. `http://localhost:8000` |
| `DEMO_EXECUTIVE_PASSWORD`, `DEMO_COFOUNDER_PASSWORD` | Create the demo users on startup/seed; users are skipped when unset |
| `REGISTRATION_INVITE_CODE` | Optional; registration is off when unset |
| `LLM_ENABLED`, `GEMINI_API_KEY` | Optional, off by default; no model call is implemented yet |

## Demo accounts

Created from the two `DEMO_*_PASSWORD` variables:

| Role | Email |
|---|---|
| Finance executive | `exec@recon.example` |
| Co-founder | `founder@recon.example` |

Sample files to try in **Import** are in `backend/seed_data/` (synthetic, with planted leaks; ground truth in `ground_truth.json`).

## Tests

```bash
cd backend && pytest                          # needs Postgres (docker compose up -d db)
cd frontend && npx playwright test            # needs both servers running with seeded data
cd backend && python -m scripts.evaluate      # precision/recall against planted ground truth
```

## Deployment

- **Backend**: `docker-compose.prod.yml` builds `backend/Dockerfile`; the entrypoint runs `alembic upgrade head` then Gunicorn with Uvicorn workers. `.github/workflows/backend-cd.yml` runs pytest on pull requests, and on push to `main` runs the tests, SSHes to the Azure VM, writes `.env` from GitHub secrets, rebuilds the container and checks `GET /health`.
- **Database**: Neon Postgres, supplied through `DATABASE_URL`.
- **Frontend**: deployed separately with `NEXT_PUBLIC_API_URL` pointing at the backend.

Required GitHub secrets: `AZURE_VM_HOST`, `AZURE_VM_USER`, `AZURE_VM_SSH_KEY`, optional `AZURE_VM_PORT`, plus `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `DEMO_EXECUTIVE_PASSWORD`, `DEMO_COFOUNDER_PASSWORD`, `REGISTRATION_INVITE_CODE`.

VM prerequisites: Docker with the Compose plugin, port 8000 open (or a TLS reverse proxy in front), and the CI public key in `~/.ssh/authorized_keys`.

## Further reading

- [BRIEF.md](BRIEF.md): the client brief
- [ASSUMPTIONS.md](ASSUMPTIONS.md): every assumption and known limit
- [DESIGN.md](DESIGN.md): design system
- [CLAUDE.md](CLAUDE.md): project rules
