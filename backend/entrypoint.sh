#!/bin/sh
set -e

echo "==> Running database migrations..."
alembic upgrade head

echo "==> Starting application with Gunicorn/Uvicorn on port 8000..."
exec gunicorn -w 2 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000

