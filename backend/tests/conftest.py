import os

import psycopg
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url

# Tests run against a dedicated database so dev data is never touched.
_base = make_url(os.environ.get("DATABASE_URL", "postgresql+psycopg://recon:recon_local_only@localhost:5432/recon"))
TEST_DB = "recon_test"
TEST_URL = _base.set(database=TEST_DB).render_as_string(hide_password=False)
os.environ["DATABASE_URL"] = TEST_URL


def _ensure_database() -> None:
    admin = _base.set(drivername="postgresql", database="postgres").render_as_string(hide_password=False)
    with psycopg.connect(admin, autocommit=True) as conn:
        if not conn.execute("SELECT 1 FROM pg_database WHERE datname=%s", (TEST_DB,)).fetchone():
            conn.execute(f'CREATE DATABASE "{TEST_DB}"')


@pytest.fixture(scope="session")
def engine():
    _ensure_database()
    from sqlalchemy import create_engine

    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "alembic"))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    eng = create_engine(TEST_URL)
    yield eng
    eng.dispose()


@pytest.fixture()
def session(engine):
    """A session whose work is rolled back after each test."""
    from sqlalchemy.orm import Session

    conn = engine.connect()
    trans = conn.begin()
    s = Session(bind=conn, join_transaction_mode="create_savepoint")
    yield s
    s.close()
    trans.rollback()
    conn.close()
