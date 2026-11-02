from datetime import date
from decimal import Decimal

import pytest

from app.ingest.normalize import normalize_ref, parse_date, parse_money, parse_payment_mode


@pytest.mark.parametrize("raw,exp", [("ORD-W-204118", "ORDW204118"), (" ord-w-204118 ", "ORDW204118"),
                                     ("ord_w 204118", "ORDW204118"), ("", None), (None, None)])
def test_normalize_ref(raw, exp):
    assert normalize_ref(raw) == exp


@pytest.mark.parametrize("raw,exp", [("₹1,499.00", Decimal("1499.00")), ("Rs. 899", Decimal("899.00")),
                                     ("(37.00)", Decimal("-37.00")), ("-142", Decimal("-142.00")),
                                     (1409, Decimal("1409.00")), ("", None), ("N/A", None)])
def test_parse_money(raw, exp):
    assert parse_money(raw) == exp


def test_parse_money_rejects_garbage():
    with pytest.raises(ValueError):
        parse_money("abc")


@pytest.mark.parametrize("raw", ["2026-10-05", "05/10/2026", "05-Oct-2026", "05-10-2026", "2026-10-05T10:00:00"])
def test_parse_date_formats(raw):
    assert parse_date(raw) == date(2026, 10, 5)


def test_parse_date_rejects_garbage():
    with pytest.raises(ValueError):
        parse_date("soon")


def test_payment_mode():
    assert parse_payment_mode("COD").value == "cod"
    assert parse_payment_mode("UPI").value == "prepaid"
    with pytest.raises(ValueError):
        parse_payment_mode("barter")
