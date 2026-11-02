from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.common import money
from app.db import get_db
from app.models import Claim, MatchSuggestion, OrderReconciliation, Partner, SettlementLine, User
from app.models.ledger import ClaimStatus, SuggestionStatus
from app.security import ANY_STAFF

router = APIRouter(prefix="/api", tags=["dashboard"])

BUCKETS = ["0-30", "31-60", "61-90", "90+"]


def _bucket(age: int | None) -> str:
    if age is None or age <= 30:
        return "0-30"
    return "31-60" if age <= 60 else "61-90" if age <= 90 else "90+"


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    R = OrderReconciliation
    counts = {s.value: n for s, n in db.execute(select(R.status, func.count()).group_by(R.status))}
    total_orders = sum(counts.values())
    judged = total_orders - counts.get("pending", 0)
    auto_matched = judged - counts.get("unpaid_past_due", 0)
    today = date.today()
    open_claims = db.execute(select(Claim.partner_id, Claim.due_since, Claim.amount, Claim.claim_type)
                             .where(Claim.status.in_([ClaimStatus.open, ClaimStatus.filed]))).all()
    names = {p.id: p.name for p in db.scalars(select(Partner))}
    by_partner: dict[int, dict] = {}
    by_type: dict[str, float] = {}
    total = 0.0
    for pid, since, amount, ctype in open_claims:
        age = (today - since).days if since else None
        row = by_partner.setdefault(pid, {"partner_id": pid, "partner": names[pid], "total": 0.0, "count": 0,
                                          "buckets": {b: 0.0 for b in BUCKETS}})
        row["total"] += float(amount)
        row["count"] += 1
        row["buckets"][_bucket(age)] += float(amount)
        by_type[ctype.value] = by_type.get(ctype.value, 0.0) + float(amount)
        total += float(amount)
    fmt = lambda v: f"{v:.2f}"
    return {
        "orders": total_orders,
        "status_counts": counts,
        "auto_match_rate": round(100 * auto_matched / judged, 1) if judged else None,
        "money_at_risk": fmt(total),
        "by_partner": sorted(({**r, "total": fmt(r["total"]), "buckets": {k: fmt(v) for k, v in r["buckets"].items()}}
                              for r in by_partner.values()), key=lambda r: -float(r["total"])),
        "by_type": {k: fmt(v) for k, v in by_type.items()},
        "pending_suggestions": db.scalar(select(func.count()).select_from(MatchSuggestion)
                                         .where(MatchSuggestion.status == SuggestionStatus.pending)) or 0,
        "unlinked_lines": db.scalar(text("SELECT (SELECT count(*) FROM settlement_lines WHERE order_id IS NULL) + "
                                         "(SELECT count(*) FROM cod_remittances WHERE order_id IS NULL) + "
                                         "(SELECT count(*) FROM freight_charges WHERE order_id IS NULL)")) or 0,
    }


@router.get("/tax-summary")
def tax_summary(db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    """TCS / TDS deducted per partner. Shown separately from leakage by design."""
    S = SettlementLine
    rows = db.execute(select(S.partner_id, func.sum(S.gross_amount), func.sum(S.fee_amount), func.sum(S.tcs_amount),
                             func.sum(S.tds_amount), func.count()).group_by(S.partner_id)).all()
    names = {p.id: p.name for p in db.scalars(select(Partner))}
    return [{"partner_id": pid, "partner": names[pid], "gross": money(g), "fees": money(f), "tcs": money(t),
             "tds": money(d), "lines": n} for pid, g, f, t, d, n in sorted(rows, key=lambda r: names[r[0]])]
