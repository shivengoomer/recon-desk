from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Partner
from app.security import ANY_STAFF

router = APIRouter(prefix="/api/partners", tags=["partners"], dependencies=[Depends(ANY_STAFF)])


class PartnerOut(BaseModel):
    id: int
    code: str
    name: str
    kind: str
    settlement_due_days: int


@router.get("", response_model=list[PartnerOut])
def list_partners(db: Session = Depends(get_db)):
    rows = db.scalars(select(Partner).order_by(Partner.kind, Partner.name))
    return [PartnerOut(id=p.id, code=p.code, name=p.name, kind=p.kind.value,
                       settlement_due_days=p.settlement_due_days) for p in rows]
