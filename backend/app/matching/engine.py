import time
from dataclasses import dataclass
from datetime import date

from sqlalchemy import BigInteger, bindparam, func, select, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Session

from app.audit import audit
from app.matching import config as C
from app.matching import sql
from app.models import AppSetting, MatchRun


@dataclass
class RunResult:
    run_id: int
    orders_processed: int
    duration_ms: int
    claims_total: int


def tolerance(db: Session) -> int:
    v = db.scalar(select(AppSetting.value).where(AppSetting.key == "tolerance_inr"))
    try:
        return int(v) if v is not None else C.DEFAULT_TOLERANCE_INR
    except ValueError:
        return C.DEFAULT_TOLERANCE_INR


def run_matching(db: Session, user_id: int | None, as_of: date | None = None,
                 order_ids: list[int] | None = None) -> RunResult:
    """Link lines to orders, recompute verdicts, queue suggestions, then refresh claims. Caller commits."""
    started = time.perf_counter()
    as_of = as_of or date.today()
    tol = tolerance(db)
    run = MatchRun(triggered_by=user_id)
    db.add(run)
    db.flush()

    # Bulk loads leave stale planner statistics; without fresh ones the big joins pick nested loops.
    for table in ("orders", "settlement_lines", "cod_remittances", "freight_charges", "rate_cards", "rate_card_lines"):
        db.execute(text(f"ANALYZE {table}"))
    for stmt in (sql.LINK_SETTLEMENT, sql.LINK_COD, sql.LINK_FREIGHT_REF, sql.LINK_FREIGHT_AWB, sql.DELETE_CANCELLED):
        db.execute(text(stmt))
    reconcile = text(sql.RECONCILE).bindparams(bindparam("order_ids", type_=ARRAY(BigInteger)))
    db.execute(reconcile, {"order_ids": order_ids, "run_id": run.id, "tol": tol, "as_of": as_of})
    processed = db.scalar(text("SELECT count(*) FROM order_reconciliation WHERE run_id = :r"), {"r": run.id}) or 0

    # Suggestions first: an unpaid order with a pending suggestion must not raise a claim yet.
    sp = {"tol": tol, "max_lines": C.SUGGESTION_MAX_LINES_PER_RUN, "per_line": C.SUGGESTION_CANDIDATES_PER_LINE,
          "min_score": C.SUGGESTION_MIN_SCORE, "window": C.SUGGESTION_WINDOW_DAYS,
          "w_amount": C.SCORE_WEIGHTS["amount"], "w_date": C.SCORE_WEIGHTS["date"], "w_ref": C.SCORE_WEIGHTS["reference"]}
    db.execute(text(sql.SUGGEST_SETTLEMENT), sp)
    db.execute(text(sql.SUGGEST_COD), sp)
    cp = {"tol": tol, "user_id": user_id}
    db.execute(text(sql.DELETE_STALE_CLAIMS), cp)
    db.execute(text(sql.UPSERT_CLAIMS), cp)

    claims_total = db.scalar(text("SELECT count(*) FROM claims WHERE status = 'open'")) or 0
    run.orders_processed = processed
    run.duration_ms = int((time.perf_counter() - started) * 1000)
    run.finished_at = func.now()
    audit(db, user_id, "match.run", "match_run", run.id, None,
          {"orders": processed, "duration_ms": run.duration_ms, "as_of": as_of.isoformat()})
    return RunResult(run.id, processed, run.duration_ms, claims_total)
