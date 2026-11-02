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
os.environ["JWT_SECRET"] = "test-secret-not-for-prod-0123456789"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"


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


def _truncate(engine) -> None:
    from sqlalchemy import text

    with engine.begin() as c:
        names = [r[0] for r in c.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'alembic_version'"))]
        c.execute(text("TRUNCATE " + ",".join(names) + " RESTART IDENTITY CASCADE"))


@pytest.fixture()
def session(engine):
    """A session whose work is rolled back after each test."""
    from sqlalchemy.orm import Session

    _truncate(engine)
    conn = engine.connect()
    trans = conn.begin()
    s = Session(bind=conn, join_transaction_mode="create_savepoint")
    yield s
    s.close()
    trans.rollback()
    conn.close()


EXEC_PW, FOUNDER_PW = "exec-pass-123", "founder-pass-123"


@pytest.fixture()
def db_clean(engine):
    """Empty every table, then load reference data. Commits for real (API tests need that)."""
    from sqlalchemy.orm import Session

    from app.bootstrap import ensure_reference_data

    _truncate(engine)
    with Session(engine) as s:
        ensure_reference_data(s, EXEC_PW, FOUNDER_PW)
        s.commit()
    return engine


@pytest.fixture()
def client(db_clean):
    from fastapi.testclient import TestClient

    from app.api import auth
    from app.main import app

    auth._FAILS.clear()
    return TestClient(app)


def login(client, who: str = "exec") -> dict:
    email, pw = ("exec@recon.example", EXEC_PW) if who == "exec" else ("founder@recon.example", FOUNDER_PW)
    r = client.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def exec_h(client):
    return login(client, "exec")


@pytest.fixture()
def founder_h(client):
    return login(client, "founder")
