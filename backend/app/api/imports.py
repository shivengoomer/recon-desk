import csv
import io
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.ingest import mappings as maps
from app.ingest import service
from app.ingest.parser import FileError, read_table
from app.ingest.suggest import suggest_mapping
from app.models import ImportBatch, ImportReject, Partner, User
from app.models.core import FileKind
from app.security import ANY_STAFF

router = APIRouter(prefix="/api/imports", tags=["imports"])


def _read_limited(file: UploadFile) -> bytes:
    limit = settings.upload_max_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {settings.upload_max_mb} MB")
    if not data:
        raise HTTPException(422, "The file is empty")
    return data


def _partner(db: Session, partner_id: int, kind: FileKind) -> Partner:
    partner = db.get(Partner, partner_id)
    if partner is None:
        raise HTTPException(404, "Partner not found")
    try:
        maps.check_partner(partner, kind)
    except maps.MappingError as e:
        raise HTTPException(422, str(e))
    return partner


class BatchOut(BaseModel):
    id: int
    partner_id: int
    file_kind: str
    file_name: str
    row_count: int
    accepted_count: int
    duplicate_count: int
    rejected_count: int
    created_at: str
    updated_count: int = 0


def _batch_out(b: ImportBatch, updated: int = 0) -> BatchOut:
    return BatchOut(id=b.id, partner_id=b.partner_id, file_kind=b.file_kind.value, file_name=b.file_name,
                    row_count=b.row_count, accepted_count=b.accepted_count, duplicate_count=b.duplicate_count,
                    rejected_count=b.rejected_count, created_at=b.created_at.isoformat() if b.created_at else "",
                    updated_count=updated)


@router.post("/inspect")
def inspect(file: UploadFile = File(...), partner_id: int = Form(...), file_kind: FileKind = Form(...),
            mapping: str | None = Form(None), db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    """Headers, a suggested mapping, and a 20-row preview of the mapping that would be used."""
    partner = _partner(db, partner_id, file_kind)
    data = _read_limited(file)
    try:
        headers, rows = read_table(file.filename or "upload", data)
    except FileError as e:
        raise HTTPException(422, str(e))
    active = maps.active_mapping(db, partner.id, file_kind)
    candidate: dict[str, str] | None = None
    if mapping:
        try:
            candidate = json.loads(mapping)
            if not isinstance(candidate, dict):
                raise ValueError
        except ValueError:
            raise HTTPException(422, "mapping must be a JSON object")
    elif active and all(c in headers for c in active.mapping.values()):
        candidate = active.mapping
    suggestion = suggest_mapping(file_kind, headers)
    result = {"headers": headers, "suggestion": suggestion,
              "active_mapping_id": active.id if active else None,
              "active_matches_file": bool(active and all(c in headers for c in active.mapping.values())),
              "preview": None, "preview_error": None}
    if candidate:
        try:
            maps.validate_mapping(file_kind, {k: v for k, v in candidate.items() if v})
            result["preview"] = service.preview(file_kind, partner, candidate, service.Lookups.load(db), headers, rows)
        except (maps.MappingError, service.ImportError_) as e:
            result["preview_error"] = str(e)
    return result


@router.post("", response_model=BatchOut, status_code=201)
def upload(file: UploadFile = File(...), partner_id: int = Form(...), file_kind: FileKind = Form(...),
           db: Session = Depends(get_db), user: User = Depends(ANY_STAFF)):
    partner = _partner(db, partner_id, file_kind)
    data = _read_limited(file)
    try:
        res = service.import_file(db, user.id, partner, file_kind, file.filename or "upload", data)
    except (service.ImportError_, FileError, maps.MappingError) as e:
        db.rollback()
        raise HTTPException(422, str(e))
    db.commit()
    return _batch_out(res.batch, res.updated)


@router.get("", response_model=list[BatchOut])
def recent(limit: int = 20, db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    limit = max(1, min(limit, 100))
    return [_batch_out(b) for b in db.scalars(select(ImportBatch).order_by(ImportBatch.id.desc()).limit(limit))]


@router.get("/{batch_id}/rejects.csv")
def rejects_csv(batch_id: int, db: Session = Depends(get_db), _: User = Depends(ANY_STAFF)):
    if db.get(ImportBatch, batch_id) is None:
        raise HTTPException(404, "Import not found")
    rows = db.scalars(select(ImportReject).where(ImportReject.batch_id == batch_id).order_by(ImportReject.row_number))
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["row_number", "reason", "raw"])
    for r in rows:
        w.writerow([r.row_number, r.reason, json.dumps(r.raw, ensure_ascii=False)])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="rejects-{batch_id}.csv"'})
