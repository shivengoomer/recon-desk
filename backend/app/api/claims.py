import csv
import io
import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.common import money
from app.audit import audit
from app.db import get_db
from app.models import Claim, Order, OrderReconciliation, Partner, User
from app.models.ledger import ClaimStatus, ClaimType
from app.security import ANY_STAFF

router = APIRouter(prefix="/api/claims", tags=["claims"])


class ClaimRow(BaseModel):
    id: int
    partner_id: int
    partner: str
    order_id: int
    order_ref: str
    claim_type: str
    amount: str
    status: str
    due_since: date | None
    age_days: int | None
    note: str | None


class ClaimPage(BaseModel):
    total: int
    page: int
    page_size: int
    amount_total: str
    items: list[ClaimRow]


def _filters(partner_id, status, claim_type):
    cond = []
    if partner_id:
        cond.append(Claim.partner_id == partner_id)
    if status:
        cond.append(Claim.status.in_(status))
    if claim_type:
        cond.append(Claim.claim_type.in_(claim_type))
    return cond


@router.get("", response_model=ClaimPage)
def list_claims(partner_id: int | None = None, status: list[ClaimStatus] | None = Query(None),
                claim_type: list[ClaimType] | None = Query(None), page: int = Query(1, ge=1, le=100000),
                page_size: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    cond = _filters(partner_id, status, claim_type)
    q = select(Claim, Partner.name, Order.order_ref).join(Partner, Partner.id == Claim.partner_id) \
        .join(Order, Order.id == Claim.order_id).where(*cond)
    total = db.scalar(select(func.count()).select_from(Claim).where(*cond)) or 0
    amount_total = db.scalar(select(func.coalesce(func.sum(Claim.amount), 0)).where(*cond))
    rows = db.execute(q.order_by(Claim.amount.desc(), Claim.id).limit(page_size).offset((page - 1) * page_size)).all()
    today = date.today()
    return ClaimPage(total=total, page=page, page_size=page_size, amount_total=money(amount_total), items=[
        ClaimRow(id=c.id, partner_id=c.partner_id, partner=pn, order_id=c.order_id, order_ref=ref,
                 claim_type=c.claim_type.value, amount=money(c.amount), status=c.status.value, due_since=c.due_since,
                 age_days=(today - c.due_since).days if c.due_since else None, note=c.note)
        for c, pn, ref in rows])


class ClaimPatch(BaseModel):
    status: ClaimStatus | None = None
    note: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def _need_something(self):
        if self.status is None and self.note is None:
            raise ValueError("Provide a status or a note")
        if self.status == ClaimStatus.rejected and not (self.note or "").strip():
            raise ValueError("A note is required when a claim is rejected")
        return self


@router.patch("/{claim_id}", response_model=ClaimRow)
def update_claim(claim_id: int, body: ClaimPatch, db: Session = Depends(get_db), user: User = Depends(ANY_STAFF)):
    c = db.get(Claim, claim_id)
    if c is None:
        raise HTTPException(404, "Claim not found")
    before = {"status": c.status.value, "note": c.note}
    if body.status is not None:
        c.status = body.status
    if body.note is not None:
        c.note = body.note.strip() or None
    audit(db, user.id, "claim.update", "claim", c.id, before, {"status": c.status.value, "note": c.note})
    db.commit()
    partner = db.get(Partner, c.partner_id)
    order = db.get(Order, c.order_id)
    return ClaimRow(id=c.id, partner_id=c.partner_id, partner=partner.name, order_id=c.order_id, order_ref=order.order_ref,
                    claim_type=c.claim_type.value, amount=money(c.amount), status=c.status.value, due_since=c.due_since,
                    age_days=(date.today() - c.due_since).days if c.due_since else None, note=c.note)


@router.get("/export.csv")
def export_csv(partner_id: int | None = None, status: list[ClaimStatus] | None = Query(None),
               claim_type: list[ClaimType] | None = Query(None), db: Session = Depends(get_db),
               user: User = Depends(ANY_STAFF)):
    """Evidence pack: one row per claim with the expected-vs-actual numbers and the source rows."""
    cond = _filters(partner_id, status, claim_type)
    q = (select(Claim, Partner.name, Order, OrderReconciliation).join(Partner, Partner.id == Claim.partner_id)
         .join(Order, Order.id == Claim.order_id).join(OrderReconciliation, OrderReconciliation.order_id == Order.id,
                                                       isouter=True).where(*cond).order_by(Claim.partner_id, Claim.amount.desc()))
    audit(db, user.id, "claim.export", "claim", None, None, {"partner_id": partner_id})
    db.commit()
    today = date.today()

    def gen():
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["claim_id", "partner", "order_ref", "claim_type", "claim_amount", "status", "due_since", "age_days",
                    "order_value", "payment_mode", "expected", "received", "difference", "expected_freight",
                    "billed_freight", "tcs", "tds", "settlement_lines", "cod_remittances", "freight_charges", "note"])
        yield buf.getvalue()
        for c, pn, o, r in db.execute(q.execution_options(yield_per=1000)):
            buf.seek(0), buf.truncate()
            ev = c.evidence or {}
            w.writerow([c.id, pn, o.order_ref, c.claim_type.value, money(c.amount), c.status.value, c.due_since or "",
                        (today - c.due_since).days if c.due_since else "", money(o.value), o.payment_mode.value,
                        money(r.expected_amount) if r else "", money(r.received_amount) if r else "",
                        money(r.difference) if r else "", money(r.expected_freight) if r else "",
                        money(r.billed_freight) if r else "", money(r.tcs_total) if r else "",
                        money(r.tds_total) if r else "",
                        json.dumps(ev.get("settlement_lines", [])), json.dumps(ev.get("cod_remittances", [])),
                        json.dumps(ev.get("freight_charges", [])), c.note or ""])
            yield buf.getvalue()

    return StreamingResponse(gen(), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="claims-{today.isoformat()}.csv"'})
