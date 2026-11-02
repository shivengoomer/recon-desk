from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.ingest import mappings as svc
from app.ingest.fields import FIELDS
from app.models import ColumnMapping, Partner, User
from app.models.core import FileKind
from app.security import ANY_STAFF

router = APIRouter(prefix="/api/mappings", tags=["mappings"])


class MappingIn(BaseModel):
    partner_id: int
    file_kind: FileKind
    mapping: dict[str, str] = Field(max_length=30)
    ai_suggested: bool = False


class MappingOut(BaseModel):
    id: int
    partner_id: int
    file_kind: str
    version: int
    mapping: dict
    status: str
    ai_suggested: bool
    created_at: str


def _out(m: ColumnMapping) -> MappingOut:
    return MappingOut(id=m.id, partner_id=m.partner_id, file_kind=m.file_kind.value, version=m.version,
                      mapping=m.mapping, status=m.status.value, ai_suggested=m.ai_suggested,
                      created_at=m.created_at.isoformat() if m.created_at else "")


def _get(db: Session, mapping_id: int) -> ColumnMapping:
    m = db.get(ColumnMapping, mapping_id)
    if m is None:
        raise HTTPException(404, "Mapping not found")
    return m


@router.get("/fields")
def target_fields(_: User = Depends(ANY_STAFF)):
    return {k.value: [{"name": f.name, "label": f.label, "required": f.required} for f in v]
            for k, v in FIELDS.items()}


@router.get("", response_model=list[MappingOut])
def versions(partner_id: int, file_kind: FileKind, db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    return [_out(m) for m in svc.list_versions(db, partner_id, file_kind)]


@router.post("", response_model=MappingOut, status_code=201)
def create(body: MappingIn, db: Session = Depends(get_db), user: User = Depends(ANY_STAFF)):
    partner = db.get(Partner, body.partner_id)
    if partner is None:
        raise HTTPException(404, "Partner not found")
    try:
        m = svc.create_draft(db, user.id, partner, body.file_kind, body.mapping, body.ai_suggested)
    except svc.MappingError as e:
        raise HTTPException(422, str(e))
    db.commit()
    return _out(m)


@router.post("/{mapping_id}/approve", response_model=MappingOut)
def approve(mapping_id: int, db: Session = Depends(get_db), user: User = Depends(ANY_STAFF)):
    try:
        m = svc.approve(db, user.id, _get(db, mapping_id))
    except svc.MappingError as e:
        raise HTTPException(409, str(e))
    db.commit()
    return _out(m)


@router.post("/{mapping_id}/rollback", response_model=MappingOut)
def rollback(mapping_id: int, db: Session = Depends(get_db), user: User = Depends(ANY_STAFF)):
    try:
        m = svc.rollback(db, user.id, _get(db, mapping_id))
    except svc.MappingError as e:
        raise HTTPException(409, str(e))
    db.commit()
    return _out(m)
