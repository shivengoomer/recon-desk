"""Users, partners, mappings, imports, settings and audit log."""
from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Index, Integer,
    Numeric, String, Text, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

Money = Numeric(12, 2)


class Role(str, enum.Enum):
    finance_executive = "finance_executive"
    cofounder = "cofounder"


class PartnerKind(str, enum.Enum):
    channel = "channel"
    courier = "courier"


class FileKind(str, enum.Enum):
    orders = "orders"
    settlement = "settlement"
    cod = "cod"
    freight = "freight"


class MappingStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    superseded = "superseded"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role, name="role"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Partner(Base):
    """A sales channel or a courier aggregator."""
    __tablename__ = "partners"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[PartnerKind] = mapped_column(Enum(PartnerKind, name="partner_kind"))
    settlement_due_days: Mapped[int] = mapped_column(Integer, server_default="7")
    __table_args__ = (CheckConstraint("settlement_due_days >= 0"),)


class AppSetting(Base):
    __tablename__ = "app_settings"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(String(255))


class ColumnMapping(Base):
    """Versioned source-column -> target-field mapping per (partner, file kind)."""
    __tablename__ = "column_mappings"
    id: Mapped[int] = mapped_column(primary_key=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"))
    file_kind: Mapped[FileKind] = mapped_column(Enum(FileKind, name="file_kind"))
    version: Mapped[int] = mapped_column(Integer)
    mapping: Mapped[dict] = mapped_column(JSONB)  # {target_field: source_column}
    status: Mapped[MappingStatus] = mapped_column(Enum(MappingStatus, name="mapping_status"))
    ai_suggested: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        UniqueConstraint("partner_id", "file_kind", "version"),
        # at most one live mapping per source
        Index("uq_mapping_active", "partner_id", "file_kind", unique=True,
              postgresql_where=text("status = 'approved'")),
    )


class ImportBatch(Base):
    __tablename__ = "import_batches"
    id: Mapped[int] = mapped_column(primary_key=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"))
    file_kind: Mapped[FileKind] = mapped_column(Enum(FileKind, name="file_kind"))
    file_name: Mapped[str] = mapped_column(String(255))
    file_hash: Mapped[str] = mapped_column(String(64))
    mapping_id: Mapped[int | None] = mapped_column(ForeignKey("column_mappings.id"))
    row_count: Mapped[int] = mapped_column(Integer, server_default="0")
    accepted_count: Mapped[int] = mapped_column(Integer, server_default="0")
    duplicate_count: Mapped[int] = mapped_column(Integer, server_default="0")
    rejected_count: Mapped[int] = mapped_column(Integer, server_default="0")
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (Index("ix_batches_partner_kind", "partner_id", "file_kind"),)


class ImportReject(Base):
    __tablename__ = "import_rejects"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    row_number: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(Text)
    raw: Mapped[dict] = mapped_column(JSONB)


class AuditLog(Base):
    """Append-only; a DB trigger blocks UPDATE/DELETE."""
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(64))
    entity: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str | None] = mapped_column(String(64))
    before: Mapped[dict | None] = mapped_column(JSONB)
    after: Mapped[dict | None] = mapped_column(JSONB)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (Index("ix_audit_entity", "entity", "entity_id"),)
