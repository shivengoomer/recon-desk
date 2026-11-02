"""Versioned column mappings: draft -> approved (supersedes previous) -> rollback creates a new version."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import audit
from app.ingest.fields import field_names, required_names
from app.models import ColumnMapping, Partner
from app.models.core import FileKind, MappingStatus, PartnerKind

KIND_PARTNER = {
    FileKind.orders: PartnerKind.channel,
    FileKind.settlement: PartnerKind.channel,
    FileKind.cod: PartnerKind.courier,
    FileKind.freight: PartnerKind.courier,
}


class MappingError(ValueError):
    pass


def check_partner(partner: Partner, kind: FileKind) -> None:
    if partner.kind != KIND_PARTNER[kind]:
        raise MappingError(f"{kind.value} files come from a {KIND_PARTNER[kind].value}, not {partner.name}")


def validate_mapping(kind: FileKind, mapping: dict[str, str]) -> None:
    unknown = set(mapping) - field_names(kind)
    if unknown:
        raise MappingError(f"Unknown fields: {', '.join(sorted(unknown))}")
    missing = [f for f in required_names(kind) if not mapping.get(f)]
    if missing:
        raise MappingError(f"Required fields not mapped: {', '.join(missing)}")
    if kind == FileKind.freight and not (mapping.get("order_ref") or mapping.get("awb")):
        raise MappingError("Freight files need an Order ID or AWB column")
    cols = [c for c in mapping.values() if c]
    if len(cols) != len(set(cols)):
        raise MappingError("A source column can only be mapped to one field")


def active_mapping(db: Session, partner_id: int, kind: FileKind) -> ColumnMapping | None:
    return db.scalar(select(ColumnMapping).where(
        ColumnMapping.partner_id == partner_id, ColumnMapping.file_kind == kind,
        ColumnMapping.status == MappingStatus.approved))


def list_versions(db: Session, partner_id: int, kind: FileKind) -> list[ColumnMapping]:
    return list(db.scalars(select(ColumnMapping).where(
        ColumnMapping.partner_id == partner_id, ColumnMapping.file_kind == kind
    ).order_by(ColumnMapping.version.desc())))


def create_draft(db: Session, user_id: int, partner: Partner, kind: FileKind,
                 mapping: dict[str, str], ai_suggested: bool) -> ColumnMapping:
    check_partner(partner, kind)
    mapping = {k: v for k, v in mapping.items() if v}
    validate_mapping(kind, mapping)
    nxt = (db.scalar(select(func.max(ColumnMapping.version)).where(
        ColumnMapping.partner_id == partner.id, ColumnMapping.file_kind == kind)) or 0) + 1
    m = ColumnMapping(partner_id=partner.id, file_kind=kind, version=nxt, mapping=mapping,
                      status=MappingStatus.draft, ai_suggested=ai_suggested, created_by=user_id)
    db.add(m)
    db.flush()
    audit(db, user_id, "mapping.create", "column_mapping", m.id, None, {"version": nxt, "ai": ai_suggested})
    return m


def approve(db: Session, user_id: int, m: ColumnMapping) -> ColumnMapping:
    if m.status != MappingStatus.draft:
        raise MappingError("Only a draft mapping can be approved")
    current = active_mapping(db, m.partner_id, m.file_kind)
    if current:
        current.status = MappingStatus.superseded
        db.flush()  # free the unique 'one approved' slot before promoting the draft
    m.status = MappingStatus.approved
    m.approved_by = user_id
    db.flush()
    audit(db, user_id, "mapping.approve", "column_mapping", m.id,
          {"previous_version": current.version if current else None}, {"version": m.version})
    return m


def rollback(db: Session, user_id: int, target: ColumnMapping) -> ColumnMapping:
    """Re-activate an older mapping as a NEW version (history is never rewritten)."""
    if target.status == MappingStatus.approved:
        raise MappingError("That version is already active")
    draft = ColumnMapping(partner_id=target.partner_id, file_kind=target.file_kind, mapping=dict(target.mapping),
                          version=(db.scalar(select(func.max(ColumnMapping.version)).where(
                              ColumnMapping.partner_id == target.partner_id,
                              ColumnMapping.file_kind == target.file_kind)) or 0) + 1,
                          status=MappingStatus.draft, ai_suggested=False, created_by=user_id)
    db.add(draft)
    db.flush()
    approve(db, user_id, draft)
    audit(db, user_id, "mapping.rollback", "column_mapping", draft.id, {"from_version": target.version},
          {"version": draft.version})
    return draft
