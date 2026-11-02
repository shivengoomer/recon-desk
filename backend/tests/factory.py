"""Direct DB builders for matching tests (ingestion is covered in test_ingest)."""
import itertools
from datetime import date
from decimal import Decimal as D

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Claim, CodRemittance, FreightCharge, Order, OrderReconciliation, Partner, RateCard, RateCardLine, SettlementLine,
)
from app.models.ledger import DeliveryStatus, PaymentMode

_n = itertools.count(1)
D1 = date(2026, 10, 1)
TODAY = date(2026, 11, 2)


def pid(s: Session, code: str) -> int:
    return s.scalar(select(Partner.id).where(Partner.code == code))


def rate_cards(s: Session) -> None:
    web = RateCard(partner_id=pid(s, "WEB"), name="web", effective_from=date(2026, 1, 1))
    mp1 = RateCard(partner_id=pid(s, "MP1"), name="mp1", effective_from=date(2026, 1, 1))
    sw = RateCard(partner_id=pid(s, "SWIFT"), name="swift", effective_from=date(2026, 1, 1))
    s.add_all([web, mp1, sw])
    s.flush()
    s.add_all([
        RateCardLine(rate_card_id=web.id, payment_mode=PaymentMode.cod, fixed_fee=D("90")),
        RateCardLine(rate_card_id=web.id, payment_mode=PaymentMode.prepaid, commission_pct=D("2")),
        RateCardLine(rate_card_id=mp1.id, commission_pct=D("25")),
        RateCardLine(rate_card_id=sw.id, weight_min_g=0, weight_max_g=500, base_rate=D("45"), cod_fee_pct=D("2"), cod_fee_min=D("30")),
        RateCardLine(rate_card_id=sw.id, weight_min_g=501, weight_max_g=1000, base_rate=D("70"), cod_fee_pct=D("2"), cod_fee_min=D("30")),
    ])
    s.flush()


def order(s, channel="WEB", ref="ORDW1", value="1499", mode="cod", status="delivered", delivered=D1,
          courier="SWIFT", weight=400, awb=None, order_date=D1) -> Order:
    o = Order(channel_id=pid(s, channel), order_ref=ref, order_date=order_date, value=D(value),
              payment_mode=PaymentMode(mode), delivery_status=DeliveryStatus(status), delivered_on=delivered,
              courier_id=pid(s, courier) if courier else None, awb=awb, weight_g=weight, row_hash=f"o{next(_n)}")
    s.add(o)
    s.flush()
    return o


def settle(s, partner, ref, gross, net, tcs="0", tds="0", fee="0", on=date(2026, 10, 12)) -> SettlementLine:
    from app.ingest.normalize import normalize_ref
    l = SettlementLine(batch_id=batch(s, partner, "settlement"), partner_id=pid(s, partner), order_ref_raw=ref,
                       order_ref=normalize_ref(ref), gross_amount=D(gross), net_amount=D(net), tcs_amount=D(tcs),
                       tds_amount=D(tds), fee_amount=D(fee), settled_on=on, row_hash=f"s{next(_n)}")
    s.add(l)
    s.flush()
    return l


def remit(s, courier, ref, collected, remitted, on=date(2026, 10, 10)) -> CodRemittance:
    from app.ingest.normalize import normalize_ref
    l = CodRemittance(batch_id=batch(s, courier, "cod"), courier_id=pid(s, courier), order_ref_raw=ref,
                      order_ref=normalize_ref(ref), cod_collected=D(collected), remitted_amount=D(remitted),
                      remitted_on=on, row_hash=f"c{next(_n)}")
    s.add(l)
    s.flush()
    return l


def freight(s, courier, ref, amount, awb=None) -> FreightCharge:
    from app.ingest.normalize import normalize_ref
    l = FreightCharge(batch_id=batch(s, courier, "freight"), courier_id=pid(s, courier), order_ref_raw=ref,
                      order_ref=normalize_ref(ref), awb=awb, charged_amount=D(amount), row_hash=f"f{next(_n)}")
    s.add(l)
    s.flush()
    return l


_batches: dict = {}


def batch(s, partner, kind) -> int:
    from app.models import ImportBatch
    from app.models.core import FileKind
    b = ImportBatch(partner_id=pid(s, partner), file_kind=FileKind(kind), file_name="x.csv", file_hash=str(next(_n)))
    s.add(b)
    s.flush()
    return b.id


def verdict(s, o: Order) -> OrderReconciliation:
    s.expire_all()
    return s.get(OrderReconciliation, o.id)


def claims(s, o: Order) -> dict[str, D]:
    return {c.claim_type.value: c.amount for c in s.scalars(select(Claim).where(Claim.order_id == o.id))}
