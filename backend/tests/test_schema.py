from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.models import AuditLog, Claim, Order, Partner
from app.models.core import PartnerKind
from app.models.ledger import ClaimType, DeliveryStatus, PaymentMode


def _order(session) -> Order:
    p = Partner(code="WEB", name="Website", kind=PartnerKind.channel)
    session.add(p)
    session.flush()
    o = Order(channel_id=p.id, order_ref="ORDW204118", order_date=date(2026, 10, 1), value=Decimal("1499.00"),
              payment_mode=PaymentMode.cod, delivery_status=DeliveryStatus.delivered, row_hash="h1")
    session.add(o)
    session.flush()
    return o


def test_money_is_numeric_not_float(session):
    o = _order(session)
    session.refresh(o)
    assert o.value == Decimal("1499.00") and isinstance(o.value, Decimal)


def test_order_unique_per_channel(session):
    o = _order(session)
    session.add(Order(channel_id=o.channel_id, order_ref=o.order_ref, order_date=date(2026, 10, 2), value=Decimal("1"),
                      payment_mode=PaymentMode.cod, delivery_status=DeliveryStatus.delivered, row_hash="h2"))
    with pytest.raises(IntegrityError):
        session.flush()


def test_negative_order_value_rejected(session):
    o = _order(session)
    session.add(Order(channel_id=o.channel_id, order_ref="X1", order_date=date(2026, 10, 2), value=Decimal("-1"),
                      payment_mode=PaymentMode.cod, delivery_status=DeliveryStatus.delivered, row_hash="h3"))
    with pytest.raises(IntegrityError):
        session.flush()


def test_one_claim_per_order_and_type(session):
    o = _order(session)
    for _ in range(2):
        session.add(Claim(partner_id=o.channel_id, order_id=o.id, claim_type=ClaimType.short_paid,
                          amount=Decimal("37.00"), evidence={}))
    with pytest.raises(IntegrityError):
        session.flush()


def test_audit_log_is_append_only(session):
    session.add(AuditLog(action="test", entity="order", entity_id="1"))
    session.flush()
    with pytest.raises(DBAPIError, match="append-only"):
        session.execute(text("UPDATE audit_log SET action='x'"))
    session.rollback()


def test_audit_log_delete_blocked(session):
    session.add(AuditLog(action="test", entity="order", entity_id="1"))
    session.flush()
    with pytest.raises(DBAPIError, match="append-only"):
        session.execute(text("DELETE FROM audit_log"))
    session.rollback()
