from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.api.common import money
from app.db import get_db
from app.ingest.normalize import normalize_ref
from app.models import CodRemittance, FreightCharge, Order, OrderReconciliation, Partner, SettlementLine, User
from app.models.ledger import ReconStatus
from app.security import ANY_STAFF

router = APIRouter(prefix="/api/orders", tags=["orders"])


class OrderRow(BaseModel):
    id: int
    order_ref: str
    channel: str
    channel_id: int
    order_date: date
    payment_mode: str
    delivery_status: str
    value: str
    status: str | None
    expected: str | None
    received: str | None
    difference: str | None
    freight_difference: str | None


class OrderPage(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[OrderRow]
    difference_total: str


@router.get("", response_model=OrderPage)
def list_orders(
    status: list[ReconStatus] | None = Query(None), channel_id: int | None = None,
    q: str | None = Query(None, max_length=64), only_issues: bool = False,
    sort: str = Query("difference", pattern="^(difference|date|value)$"),
    page: int = Query(1, ge=1, le=100000), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), _: User = Depends(ANY_STAFF),
):
    R = OrderReconciliation
    cond = []
    if status:
        cond.append(R.status.in_(status))
    if only_issues:
        cond.append(R.status.in_([ReconStatus.short_paid, ReconStatus.unpaid_past_due, ReconStatus.freight_overcharged]))
    if channel_id:
        cond.append(Order.channel_id == channel_id)
    if q and (nq := normalize_ref(q)):
        cond.append(Order.order_ref.like(f"%{nq}%"))
    base = select(Order, R, Partner.name).join(R, R.order_id == Order.id).join(Partner, Partner.id == Order.channel_id)
    if cond:
        base = base.where(and_(*cond))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    order_by = {"difference": [func.abs(R.difference).desc(), Order.id], "date": [Order.order_date.desc(), Order.id],
                "value": [Order.value.desc(), Order.id]}[sort]
    rows = db.execute(base.order_by(*order_by).limit(page_size).offset((page - 1) * page_size)).all()
    sums = db.execute(select(func.coalesce(func.sum(R.difference), 0)).select_from(Order)
                      .join(R, R.order_id == Order.id).where(*cond)).scalar_one()
    return OrderPage(total=total, page=page, page_size=page_size, difference_total=money(sums), items=[
        OrderRow(id=o.id, order_ref=o.order_ref, channel=ch, channel_id=o.channel_id, order_date=o.order_date,
                 payment_mode=o.payment_mode.value, delivery_status=o.delivery_status.value, value=money(o.value),
                 status=r.status.value, expected=money(r.expected_amount), received=money(r.received_amount),
                 difference=money(r.difference), freight_difference=money(r.freight_difference))
        for o, r, ch in rows])


@router.get("/{order_id}")
def order_detail(order_id: int, db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    o = db.get(Order, order_id)
    if o is None:
        raise HTTPException(404, "Order not found")
    r = db.get(OrderReconciliation, order_id)
    channel = db.get(Partner, o.channel_id)
    courier = db.get(Partner, o.courier_id) if o.courier_id else None

    def rows(model):
        return [{c.name: (str(getattr(x, c.name)) if getattr(x, c.name) is not None else None)
                 for c in model.__table__.columns if c.name != "row_hash"}
                for x in db.scalars(select(model).where(model.order_id == order_id).order_by(model.id))]

    return {
        "order": {"id": o.id, "order_ref": o.order_ref, "channel": channel.name, "courier": courier.name if courier else None,
                  "order_date": o.order_date.isoformat(), "delivered_on": o.delivered_on.isoformat() if o.delivered_on else None,
                  "value": money(o.value), "payment_mode": o.payment_mode.value, "delivery_status": o.delivery_status.value,
                  "weight_g": o.weight_g, "awb": o.awb},
        "reconciliation": None if r is None else {
            "status": r.status.value, "expected": money(r.expected_amount), "received": money(r.received_amount),
            "difference": money(r.difference), "expected_freight": money(r.expected_freight),
            "billed_freight": money(r.billed_freight), "freight_difference": money(r.freight_difference),
            "tcs": money(r.tcs_total), "tds": money(r.tds_total), "breakdown": r.breakdown},
        "settlement_lines": rows(SettlementLine), "cod_remittances": rows(CodRemittance), "freight_charges": rows(FreightCharge),
    }
