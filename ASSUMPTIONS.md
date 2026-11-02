# Assumptions

Format: `N. [file/feature] assumption`

1. [backend/pyproject.toml] Python 3.12 and dependency ranges are unpinned minimums; a lockfile will be added when dependencies are first installed.
2. [docker-compose.yml] Only Postgres runs in Docker; backend and frontend run on the host during local dev.
3. [frontend/package.json] Next.js 15 with Tailwind CSS 3.4, npm as package manager.
4. [backend/app/config.py] Database access is via a single `DATABASE_URL` env var using the `postgresql+psycopg` driver (psycopg 3).
5. [BRIEF.md] The brief is not yet provided; no domain features, models or roles have been assumed.
