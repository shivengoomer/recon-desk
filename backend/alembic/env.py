from alembic import context
from sqlalchemy import create_engine

from app.config import settings
from app.db import Base
import app.models  # noqa: F401  (register tables)

target_metadata = Base.metadata

if not settings.database_url:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Add NEON_PROD_DATABASE_URL to GitHub Secrets and ensure it maps to DATABASE_URL in the workflow."
    )


def run_migrations_offline() -> None:
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
