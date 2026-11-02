"""Orders, partner money lines, rate cards, matching results and claims."""
from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger, CheckConstraint, Date, DateTime, Enum, ForeignKey, Index, Integer,
    Numeric, String, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.core import Money


class PaymentMode(str, enum.Enum):
    prepaid = "prepaid"
    cod = "cod"


class DeliveryStatus(str, enum.Enum):
    in_transit = "in_transit"
    delivered = "delivered"
    returned_to_warehouse = "returned_to_warehouse"
    cancelled = "cancelled"


class ReconStatus(str, enum.Enum):
    pending = "pending"  # not yet due
    settled = "settled"
    short_paid = "short_paid"
    over_paid = "over_paid"
    unpaid_past_due = "unpaid_past_due"
    freight_overcharged = "freight_overcharged"
    return_not_received = "return_not_received"


class MatchMethod(str, enum.Enum):
    exact = "exact"
    normalized = "normalized"
    ai_suggested = "ai_suggested"
    manual = "manual"


class SuggestionStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    rejected = "rejected"


class ClaimType(str, enum.Enum):
    short_paid = "short_paid"
    unremitted_cod = "unremitted_cod"
    freight_overcharge = "freight_overcharge"
    return_not_received = "return_not_received"


class ClaimStatus(str, enum.Enum):
    open = "open"
    filed = "filed"
    recovered = "recovered"
    rejected = "rejected"


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(ForeignKey("partners.id"))
    order_ref: Mapped[str] = mapped_column(String(64))  # normalised
    order_date: Mapped[date] = mapped_column(Date)
    value: Mapped[Decimal] = mapped_column(Money)
    payment_mode: Mapped[PaymentMode] = mapped_column(Enum(PaymentMode, name="payment_mode"))
    delivery_status: Mapped[DeliveryStatus] = mapped_column(Enum(DeliveryStatus, name="delivery_status"))
    delivered_on: Mapped[date | None] = mapped_column(Date)
    courier_id: Mapped[int | None] = mapped_column(ForeignKey("partners.id"))
    awb: Mapped[str | None] = mapped_column(String(64))
    weight_g: Mapped[int | None] = mapped_column(Integer)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("import_batches.id"))
    row_hash: Mapped[str] = mapped_column(String(64))
    __table_args__ = (
        UniqueConstraint("channel_id", "order_ref"),
        CheckConstraint("value >= 0"),
        Index("ix_orders_order_ref", "order_ref"),
        Index("ix_orders_awb", "awb"),
    )


class _Line:
    """Columns shared by every partner money line."""
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("import_batches.id"), index=True)
    order_ref_raw: Mapped[str | None] = mapped_column(String(64))
    order_ref: Mapped[str | None] = mapped_column(String(64), index=True)  # normalised
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), index=True)
    match_method: Mapped[MatchMethod | None] = mapped_column(Enum(MatchMethod, name="match_method"))
    row_hash: Mapped[str] = mapped_column(String(64), unique=True)


class SettlementLine(_Line, Base):
    """Marketplace / website settlement row. TCS and TDS are kept apart from fees."""
    __tablename__ = "settlement_lines"
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"))
    gross_amount: Mapped[Decimal] = mapped_column(Money)
    fee_amount: Mapped[Decimal] = mapped_column(Money, server_default="0")
    tcs_amount: Mapped[Decimal] = mapped_column(Money, server_default="0")
    tds_amount: Mapped[Decimal] = mapped_column(Money, server_default="0")
    net_amount: Mapped[Decimal] = mapped_column(Money)  # can be negative for returns
    settled_on: Mapped[date | None] = mapped_column(Date)
    __table_args__ = (CheckConstraint("fee_amount >= 0 AND tcs_amount >= 0 AND tds_amount >= 0"),)


class CodRemittance(_Line, Base):
    __tablename__ = "cod_remittances"
    courier_id: Mapped[int] = mapped_column(ForeignKey("partners.id"))
    cod_collected: Mapped[Decimal] = mapped_column(Money)
    remitted_amount: Mapped[Decimal] = mapped_column(Money)
    remitted_on: Mapped[date | None] = mapped_column(Date)
    __table_args__ = (CheckConstraint("cod_collected >= 0 AND remitted_amount >= 0"),)


class FreightCharge(_Line, Base):
    __tablename__ = "freight_charges"
    courier_id: Mapped[int] = mapped_column(ForeignKey("partners.id"))
    awb: Mapped[str | None] = mapped_column(String(64), index=True)
    billed_weight_g: Mapped[int | None] = mapped_column(Integer)
    charged_amount: Mapped[Decimal] = mapped_column(Money)
    invoice_no: Mapped[str | None] = mapped_column(String(64))
    invoice_date: Mapped[date | None] = mapped_column(Date)
    __table_args__ = (CheckConstraint("charged_amount >= 0"),)


class RateCard(Base):
    __tablename__ = "rate_cards"
    id: Mapped[int] = mapped_column(primary_key=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    effective_from: Mapped[date] = mapped_column(Date)
    effective_to: Mapped[date | None] = mapped_column(Date)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RateCardLine(Base):
    """Channel: commission_pct + fixed_fee + shipping_fee. Courier: weight slab + base_rate + cod fee."""
    __tablename__ = "rate_card_lines"
    id: Mapped[int] = mapped_column(primary_key=True)
    rate_card_id: Mapped[int] = mapped_column(ForeignKey("rate_cards.id", ondelete="CASCADE"), index=True)
    payment_mode: Mapped[PaymentMode | None] = mapped_column(Enum(PaymentMode, name="payment_mode"))
    commission_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 3))
    fixed_fee: Mapped[Decimal | None] = mapped_column(Money)
    shipping_fee: Mapped[Decimal | None] = mapped_column(Money)
    weight_min_g: Mapped[int | None] = mapped_column(Integer)
    weight_max_g: Mapped[int | None] = mapped_column(Integer)
    base_rate: Mapped[Decimal | None] = mapped_column(Money)
    cod_fee_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 3))
    cod_fee_min: Mapped[Decimal | None] = mapped_column(Money)
    __table_args__ = (
        CheckConstraint("commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 100)"),
        CheckConstraint("weight_min_g IS NULL OR weight_max_g IS NULL OR weight_min_g <= weight_max_g"),
    )


class MatchRun(Base):
    __tablename__ = "match_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    orders_processed: Mapped[int] = mapped_column(Integer, server_default="0")
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    triggered_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))


class OrderReconciliation(Base):
    """Latest computed verdict per order (one row per order, replaced on each run)."""
    __tablename__ = "order_reconciliation"
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("match_runs.id"))
    status: Mapped[ReconStatus] = mapped_column(Enum(ReconStatus, name="recon_status"))
    expected_amount: Mapped[Decimal] = mapped_column(Money)
    received_amount: Mapped[Decimal] = mapped_column(Money)
    difference: Mapped[Decimal] = mapped_column(Money)  # received - expected
    expected_freight: Mapped[Decimal | None] = mapped_column(Money)
    billed_freight: Mapped[Decimal | None] = mapped_column(Money)
    freight_difference: Mapped[Decimal | None] = mapped_column(Money)
    tcs_total: Mapped[Decimal] = mapped_column(Money, server_default="0")
    tds_total: Mapped[Decimal] = mapped_column(Money, server_default="0")
    breakdown: Mapped[dict] = mapped_column(JSONB)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (Index("ix_recon_status", "status"),)


class MatchSuggestion(Base):
    """AI/heuristic suggestion for a line with no usable order ID. Never auto-applied."""
    __tablename__ = "match_suggestions"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    line_table: Mapped[str] = mapped_column(String(32))
    line_id: Mapped[int] = mapped_column(BigInteger)
    candidate_order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    score: Mapped[Decimal] = mapped_column(Numeric(4, 3))
    reason: Mapped[str] = mapped_column(String(255))
    status: Mapped[SuggestionStatus] = mapped_column(
        Enum(SuggestionStatus, name="suggestion_status"), server_default="pending")
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 1"),
        UniqueConstraint("line_table", "line_id", "candidate_order_id"),
    )


class Claim(Base):
    __tablename__ = "claims"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"), index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    claim_type: Mapped[ClaimType] = mapped_column(Enum(ClaimType, name="claim_type"))
    amount: Mapped[Decimal] = mapped_column(Money)
    status: Mapped[ClaimStatus] = mapped_column(Enum(ClaimStatus, name="claim_status"), server_default="open")
    evidence: Mapped[dict] = mapped_column(JSONB)
    due_since: Mapped[date | None] = mapped_column(Date)  # ageing anchor
    note: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("order_id", "claim_type"),
        CheckConstraint("amount > 0"),
        Index("ix_claims_status", "status"),
    )
