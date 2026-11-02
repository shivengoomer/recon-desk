from datetime import date
from decimal import Decimal as D

import pytest
from sqlalchemy.orm import Session

from app.matching.engine import run_matching
from tests import factory as F


@pytest.fixture()
def s(db_clean):
    with Session(db_clean) as s:
        F.rate_cards(s)
        yield s
        s.rollback()


def run(s, as_of=F.TODAY):
    r = run_matching(s, None, as_of)
    s.flush()
    return r


def test_cod_paid_correctly_is_settled(s):
    o = F.order(s)  # 1499 COD, web COD fee 90 => expect 1409
    F.remit(s, "SWIFT", "ORD-W-1", "1499", "1409")
    run(s)
    v = F.verdict(s, o)
    assert v.status.value == "settled" and v.expected_amount == D("1409.00") and v.difference == 0
    assert F.claims(s, o) == {}


def test_cod_never_remitted_past_due_becomes_unremitted_claim(s):
    o = F.order(s)
    run(s)
    assert F.verdict(s, o).status.value == "unpaid_past_due"
    assert F.claims(s, o) == {"unremitted_cod": D("1409.00")}


def test_not_yet_due_is_pending(s):
    o = F.order(s, delivered=date(2026, 11, 1), order_date=date(2026, 10, 30))
    run(s)
    assert F.verdict(s, o).status.value == "pending" and F.claims(s, o) == {}


def test_short_paid_with_evidence(s):
    o = F.order(s, channel="MP1", ref="ORDM2", value="1199", mode="prepaid", courier=None)
    F.settle(s, "MP1", "ord-m-2", "1199", "862", tcs="12", tds="12")  # received 886 vs expected 899.25
    run(s)
    v = F.verdict(s, o)
    assert v.status.value == "short_paid" and v.difference == D("-13.25")
    assert F.claims(s, o) == {"short_paid": D("13.25")}
    from sqlalchemy import select
    from app.models import Claim
    ev = s.scalar(select(Claim.evidence).where(Claim.order_id == o.id))
    assert ev["settlement_lines"][0]["order_ref_raw"] == "ord-m-2" and ev["tcs"] == 12


def test_tcs_and_tds_are_not_leakage(s):
    o = F.order(s, channel="MP1", ref="ORDM3", value="1199", mode="prepaid", courier=None)
    F.settle(s, "MP1", "ORD-M-3", "1199", "875.25", tcs="12", tds="12")  # 875.25 + 24 = 899.25 exactly
    run(s)
    v = F.verdict(s, o)
    assert v.status.value == "settled" and v.tcs_total == 12 and v.tds_total == 12


def test_difference_within_tolerance_is_settled(s):
    o = F.order(s, channel="MP1", ref="ORDM4", value="1199", mode="prepaid", courier=None)
    F.settle(s, "MP1", "ORD-M-4", "1199", "890")  # -9.25 within Rs 10
    run(s)
    assert F.verdict(s, o).status.value == "settled"


def test_difference_just_over_tolerance_is_short(s):
    o = F.order(s, channel="MP1", ref="ORDM5", value="1199", mode="prepaid", courier=None)
    F.settle(s, "MP1", "ORD-M-5", "1199", "889")  # -10.25
    run(s)
    assert F.verdict(s, o).status.value == "short_paid"


def test_over_paid(s):
    o = F.order(s, channel="MP1", ref="ORDM6", value="1199", mode="prepaid", courier=None)
    F.settle(s, "MP1", "ORD-M-6", "1199", "950")
    run(s)
    assert F.verdict(s, o).status.value == "over_paid" and F.claims(s, o) == {}


def test_freight_overcharge_uses_weight_slab_and_cod_fee(s):
    o = F.order(s, weight=400, awb="A1")  # slab 0-500: 45 + COD max(30, 29.98) = 75
    F.remit(s, "SWIFT", "ORD-W-1", "1499", "1409")
    F.freight(s, "SWIFT", "ORD-W-1", "120")
    run(s)
    v = F.verdict(s, o)
    assert v.expected_freight == D("75.00") and v.freight_difference == D("45.00")
    assert v.status.value == "freight_overcharged"
    assert F.claims(s, o) == {"freight_overcharge": D("45.00")}


def test_freight_links_by_awb_when_ref_missing(s):
    o = F.order(s, awb="AWB9")
    F.remit(s, "SWIFT", "ORD-W-1", "1499", "1409")
    f = F.freight(s, "SWIFT", None, "75", awb="AWB9")
    run(s)
    s.refresh(f)
    assert f.order_id == o.id and F.verdict(s, o).freight_difference == 0


def test_ambiguous_courier_reference_is_not_linked(s):
    F.order(s, channel="WEB", ref="ORDX1")
    F.order(s, channel="MP1", ref="ORDX1", mode="prepaid")
    line = F.remit(s, "SWIFT", "ORDX1", "1499", "1409")
    run(s)
    s.refresh(line)
    assert line.order_id is None


def test_missing_rate_card_is_flagged_not_judged(s):
    o = F.order(s, channel="QC1", ref="ORDQ1", mode="prepaid", courier=None)
    F.settle(s, "QC1", "ORD-Q-1", "1499", "100")
    run(s)
    v = F.verdict(s, o)
    assert v.status.value == "pending" and v.breakdown["rate_card_missing"] is True and F.claims(s, o) == {}


def test_rerun_is_idempotent_and_keeps_worked_claims(s):
    from sqlalchemy import select
    from app.models import Claim
    from app.models.ledger import ClaimStatus
    o = F.order(s)
    run(s)
    run(s)
    assert len(list(s.scalars(select(Claim)))) == 1
    c = s.scalar(select(Claim))
    c.status, c.note = ClaimStatus.filed, "raised with SwiftShip"
    s.flush()
    F.remit(s, "SWIFT", "ORD-W-1", "1499", "1409")  # money arrives later
    run(s)
    assert s.scalar(select(Claim)) is not None  # worked claims are never auto-deleted


def test_untouched_open_claim_disappears_when_paid(s):
    o = F.order(s)
    run(s)
    assert F.claims(s, o)
    F.remit(s, "SWIFT", "ORD-W-1", "1499", "1409")
    run(s)
    assert F.claims(s, o) == {} and F.verdict(s, o).status.value == "settled"


def test_cancelled_orders_are_ignored(s):
    o = F.order(s, status="cancelled")
    run(s)
    assert F.verdict(s, o) is None


def test_missing_order_id_yields_suggestion_never_auto_match(s):
    from sqlalchemy import select
    from app.models import MatchSuggestion
    o = F.order(s, channel="MP1", ref="ORDM7", value="1199", mode="prepaid", courier=None)
    line = F.settle(s, "MP1", None, "1199", "899.25", on=date(2026, 10, 8))  # no order id in the partner file
    run(s)
    s.refresh(line)
    assert line.order_id is None  # never closed automatically
    sug = s.scalar(select(MatchSuggestion).where(MatchSuggestion.line_id == line.id))
    assert sug.candidate_order_id == o.id and sug.status.value == "pending" and sug.score >= D("0.5")
    assert F.verdict(s, o).status.value == "unpaid_past_due"
    assert F.claims(s, o) == {}  # claim is held until a person reviews the suggestion
