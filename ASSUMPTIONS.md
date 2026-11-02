# Assumptions (copy into the TDD)
Format: N. [area/feature] assumption, and why.

1. [scope] Only the information in the problem statement was used; everything else below is an assumption.
2. [backend/pyproject.toml] Python 3.12+ with unpinned minimum dependency versions, because no lockfile exists until dependencies are first installed.
3. [docker-compose.yml] Only Postgres runs in Docker; backend and frontend run on the host, to keep local dev simple. Its credentials are local-only throwaway values.
4. [frontend/package.json] Next.js 15, Tailwind CSS 3.4 and npm, as stable defaults.
5. [backend/app/config.py] Config is read from env vars (names in `.env.example`); DB driver is psycopg 3 (`postgresql+psycopg://`).
6. [BRIEF.md] The brief has not been pasted yet; no domain features beyond the kit prompts are assumed.
7. [submission/] Kept in the working tree but git-ignored, because the starter kit says it is not part of the repo; it is zipped separately at the end.

## Known limits
(fill in during hardening)
