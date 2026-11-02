from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.db import get_db
from app.models import AppSetting, AuditLog, Partner, RateCard, RateCardLine, User
from app.models.core import PartnerKind
from app.models.ledger import PaymentMode
from app.security import ANY_STAFF, COFOUNDER

router = APIRouter(prefix="/api", tags=["rate-cards"])
Pct = Decimal | None


class LineIn(BaseModel):
    payment_mode: PaymentMode | None = None
    commission_pct: Decimal | None = Field(None, ge=0, le=100)
    fixed_fee: Decimal | None = Field(None, ge=0, le=1_000_000)
    shipping_fee: Decimal | None = Field(None, ge=0, le=1_000_000)
    weight_min_g: int | None = Field(None, ge=0, le=1_000_000)
    weight_max_g: int | None = Field(None, ge=0, le=1_000_000)
    base_rate: Decimal | None = Field(None, ge=0, le=1_000_000)
    cod_fee_pct: Decimal | None = Field(None, ge=0, le=100)
    cod_fee_min: Decimal | None = Field(None, ge=0, le=1_000_000)


class RateCardIn(BaseModel):
    partner_id: int
    name: str = Field(min_length=1, max_length=120)
    effective_from: date
    effective_to: date | None = None
    lines: list[LineIn] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def _dates(self):
        if self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to is before effective_from")
        return self


def _validate_lines(partner: Partner, lines: list[LineIn]) -> None:
    if partner.kind == PartnerKind.channel:
        for ln in lines:
            if ln.weight_min_g is not None or ln.base_rate is not None:
                raise HTTPException(422, "Channel rate cards use commission %, fixed fee and shipping fee only")
            if ln.commission_pct is None and ln.fixed_fee is None and ln.shipping_fee is None:
                raise HTTPException(422, "Each channel line needs a commission %, fixed fee or shipping fee")
    else:
        slabs = []
        for ln in lines:
            if ln.weight_min_g is None or ln.weight_max_g is None or ln.base_rate is None:
                raise HTTPException(422, "Courier lines need weight_min_g, weight_max_g and base_rate")
            if ln.weight_min_g > ln.weight_max_g:
                raise HTTPException(422, "weight_min_g must not exceed weight_max_g")
            slabs.append((ln.weight_min_g, ln.weight_max_g))
        slabs.sort()
        if any(b[0] <= a[1] for a, b in zip(slabs, slabs[1:])):
            raise HTTPException(422, "Weight slabs overlap")


def _out(db: Session, rc: RateCard) -> dict:
    lines = db.scalars(select(RateCardLine).where(RateCardLine.rate_card_id == rc.id).order_by(RateCardLine.id))
    return {"id": rc.id, "partner_id": rc.partner_id, "name": rc.name, "effective_from": rc.effective_from.isoformat(),
            "effective_to": rc.effective_to.isoformat() if rc.effective_to else None,
            "lines": [{c.name: (str(v) if isinstance(v := getattr(ln, c.name), Decimal) else
                                v.value if hasattr(v, "value") else v)
                       for c in RateCardLine.__table__.columns if c.name not in ("id", "rate_card_id")} for ln in lines]}


@router.get("/rate-cards")
def list_rate_cards(db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    return [_out(db, rc) for rc in db.scalars(select(RateCard).order_by(RateCard.partner_id, RateCard.effective_from.desc()))]


def _save(db: Session, user: User, rc: RateCard, body: RateCardIn) -> dict:
    partner = db.get(Partner, body.partner_id)
    if partner is None:
        raise HTTPException(404, "Partner not found")
    _validate_lines(partner, body.lines)
    rc.partner_id, rc.name, rc.effective_from, rc.effective_to = body.partner_id, body.name, body.effective_from, body.effective_to
    if rc.id is None:
        rc.created_by = user.id
        db.add(rc)
    db.flush()
    for old in db.scalars(select(RateCardLine).where(RateCardLine.rate_card_id == rc.id)):
        db.delete(old)
    db.flush()
    for ln in body.lines:
        db.add(RateCardLine(rate_card_id=rc.id, **ln.model_dump()))
    db.flush()
    return _out(db, rc)


@router.post("/rate-cards", status_code=201)
def create_rate_card(body: RateCardIn, db: Session = Depends(get_db), user: User = Depends(COFOUNDER)):
    out = _save(db, user, RateCard(), body)
    audit(db, user.id, "rate_card.create", "rate_card", out["id"], None, out)
    db.commit()
    return out


@router.put("/rate-cards/{card_id}")
def replace_rate_card(card_id: int, body: RateCardIn, db: Session = Depends(get_db), user: User = Depends(COFOUNDER)):
    rc = db.get(RateCard, card_id)
    if rc is None:
        raise HTTPException(404, "Rate card not found")
    before = _out(db, rc)
    out = _save(db, user, rc, body)
    audit(db, user.id, "rate_card.update", "rate_card", rc.id, before, out)
    db.commit()
    return out


@router.delete("/rate-cards/{card_id}", status_code=204)
def delete_rate_card(card_id: int, db: Session = Depends(get_db), user: User = Depends(COFOUNDER)):
    rc = db.get(RateCard, card_id)
    if rc is None:
        raise HTTPException(404, "Rate card not found")
    audit(db, user.id, "rate_card.delete", "rate_card", rc.id, _out(db, rc), None)
    for ln in db.scalars(select(RateCardLine).where(RateCardLine.rate_card_id == rc.id)):
        db.delete(ln)
    db.flush()
    db.delete(rc)
    db.commit()


class SettingsIn(BaseModel):
    tolerance_inr: int = Field(ge=0, le=10000)


@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    v = db.scalar(select(AppSetting.value).where(AppSetting.key == "tolerance_inr"))
    return {"tolerance_inr": int(v) if v else 10}


@router.put("/settings")
def put_settings(body: SettingsIn, db: Session = Depends(get_db), user: User = Depends(COFOUNDER)):
    row = db.get(AppSetting, "tolerance_inr")
    before = {"tolerance_inr": row.value if row else None}
    if row:
        row.value = str(body.tolerance_inr)
    else:
        db.add(AppSetting(key="tolerance_inr", value=str(body.tolerance_inr)))
    audit(db, user.id, "settings.update", "app_setting", "tolerance_inr", before, {"tolerance_inr": body.tolerance_inr})
    db.commit()
    return {"tolerance_inr": body.tolerance_inr}


@router.get("/audit-log")
def audit_log(page: int = 1, page_size: int = 50, db: Session = Depends(get_db), _: User = Depends(COFOUNDER)):
    page, page_size = max(1, page), max(1, min(page_size, 200))
    rows = db.execute(select(AuditLog, User.name).join(User, User.id == AuditLog.actor_id, isouter=True)
                      .order_by(AuditLog.id.desc()).limit(page_size).offset((page - 1) * page_size)).all()
    return [{"id": a.id, "actor": n, "action": a.action, "entity": a.entity, "entity_id": a.entity_id,
             "before": a.before, "after": a.after, "at": a.at.isoformat()} for a, n in rows]
