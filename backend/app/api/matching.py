from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.common import money
from app.audit import audit
from app.db import get_db
from app.matching.engine import run_matching
from app.models import CodRemittance, MatchRun, MatchSuggestion, Order, OrderReconciliation, SettlementLine, User
from app.models.ledger import MatchMethod, SuggestionStatus
from app.security import ANY_STAFF

router = APIRouter(prefix="/api", tags=["matching"])


class RunIn(BaseModel):
    as_of: date | None = None


def _status_counts(db: Session) -> dict[str, int]:
    rows = db.execute(select(OrderReconciliation.status, func.count()).group_by(OrderReconciliation.status))
    return {s.value: n for s, n in rows}


@router.post("/match-runs", status_code=201)
def start_run(body: RunIn | None = None, db: Session = Depends(get_db), user: User = Depends(ANY_STAFF)):
    res = run_matching(db, user.id, (body.as_of if body else None))
    db.commit()
    return {"run_id": res.run_id, "orders_processed": res.orders_processed, "duration_ms": res.duration_ms,
            "open_claims": res.claims_total, "status_counts": _status_counts(db)}


@router.get("/match-runs/latest")
def latest_run(db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    run = db.scalar(select(MatchRun).where(MatchRun.finished_at.is_not(None)).order_by(MatchRun.id.desc()).limit(1))
    if run is None:
        return None
    return {"run_id": run.id, "finished_at": run.finished_at.isoformat(), "orders_processed": run.orders_processed,
            "duration_ms": run.duration_ms}


class SuggestionOut(BaseModel):
    id: int
    line_table: str
    line_id: int
    line_amount: str | None
    line_date: str | None
    line_ref: str | None
    candidate_order_id: int
    candidate_order_ref: str
    candidate_value: str
    score: str
    reason: str
    status: str


_LINES = {"settlement_lines": SettlementLine, "cod_remittances": CodRemittance}


@router.get("/suggestions", response_model=list[SuggestionOut])
def suggestions(status: SuggestionStatus = SuggestionStatus.pending, limit: int = 100,
                db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    rows = db.execute(select(MatchSuggestion, Order).join(Order, Order.id == MatchSuggestion.candidate_order_id)
                      .where(MatchSuggestion.status == status)
                      .order_by(MatchSuggestion.line_id, MatchSuggestion.score.desc()).limit(max(1, min(limit, 500)))).all()
    out = []
    for sug, order in rows:
        line = db.get(_LINES[sug.line_table], sug.line_id)
        amount = getattr(line, "gross_amount", None) or getattr(line, "cod_collected", None)
        when = getattr(line, "settled_on", None) or getattr(line, "remitted_on", None)
        out.append(SuggestionOut(id=sug.id, line_table=sug.line_table, line_id=sug.line_id, line_amount=money(amount),
                                 line_date=when.isoformat() if when else None, line_ref=line.order_ref_raw,
                                 candidate_order_id=order.id, candidate_order_ref=order.order_ref,
                                 candidate_value=money(order.value), score=str(sug.score), reason=sug.reason,
                                 status=sug.status.value))
    return out


def _decide(db: Session, user: User, suggestion_id: int, confirm: bool) -> dict:
    sug = db.get(MatchSuggestion, suggestion_id)
    if sug is None:
        raise HTTPException(404, "Suggestion not found")
    if sug.status != SuggestionStatus.pending:
        raise HTTPException(409, f"Already {sug.status.value}")
    before = {"status": sug.status.value}
    sug.decided_by, sug.decided_at = user.id, func.now()
    if confirm:
        line = db.get(_LINES[sug.line_table], sug.line_id)
        if line.order_id is not None:
            raise HTTPException(409, "That line is already matched")
        line.order_id, line.match_method = sug.candidate_order_id, MatchMethod.ai_suggested
        sug.status = SuggestionStatus.confirmed
        for other in db.scalars(select(MatchSuggestion).where(
                MatchSuggestion.line_table == sug.line_table, MatchSuggestion.line_id == sug.line_id,
                MatchSuggestion.id != sug.id, MatchSuggestion.status == SuggestionStatus.pending)):
            other.status, other.decided_by, other.decided_at = SuggestionStatus.rejected, user.id, func.now()
    else:
        sug.status = SuggestionStatus.rejected
    audit(db, user.id, "suggestion.confirm" if confirm else "suggestion.reject", "match_suggestion", sug.id,
          before, {"status": sug.status.value, "order_id": sug.candidate_order_id})
    db.flush()
    if confirm:
        run_matching(db, user.id, order_ids=[sug.candidate_order_id])
    db.commit()
    return {"id": sug.id, "status": sug.status.value}


@router.post("/suggestions/{suggestion_id}/confirm")
def confirm(suggestion_id: int, db: Session = Depends(get_db), user: User = Depends(ANY_STAFF)):
    return _decide(db, user, suggestion_id, True)


@router.post("/suggestions/{suggestion_id}/reject")
def reject(suggestion_id: int, db: Session = Depends(get_db), user: User = Depends(ANY_STAFF)):
    return _decide(db, user, suggestion_id, False)
