import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from app.models.ledger import DeliveryStatus, PaymentMode

_REF_STRIP = re.compile(r"[^A-Z0-9]")


def normalize_ref(raw: object) -> str | None:
    """'ord-w-204118 ' -> 'ORDW204118'. Returns None for blank values."""
    if raw is None:
        return None
    s = _REF_STRIP.sub("", str(raw).strip().upper())
    return s or None


def parse_money(raw: object) -> Decimal | None:
    """Accepts '₹1,499.00', 'Rs 1499', '(37.00)' (negative), '-37', numbers. Blank -> None."""
    if raw is None:
        return None
    if isinstance(raw, (int, float, Decimal)):
        try:
            return Decimal(str(raw)).quantize(Decimal("0.01"))
        except InvalidOperation:
            raise ValueError(f"not a number: {raw!r}")
    s = str(raw).strip()
    if not s or s in {"-", "—", "NA", "N/A", "nan"}:
        return None
    neg = s.startswith("(") and s.endswith(")")
    s = re.sub(r"(?i)rs\.?|inr|₹|,|\s|[()]", "", s)
    try:
        d = Decimal(s).quantize(Decimal("0.01"))
    except InvalidOperation:
        raise ValueError(f"not a number: {raw!r}")
    if not d.is_finite():
        raise ValueError(f"not a number: {raw!r}")
    return -d if neg else d


_DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d-%b-%Y", "%d %b %Y", "%d/%m/%y", "%d-%m-%y", "%Y/%m/%d", "%d.%m.%Y")


def parse_date(raw: object) -> date | None:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw
    s = str(raw).strip()
    if not s or s in {"-", "NA", "N/A", "nan"}:
        return None
    s = s.split("T")[0] if re.match(r"^\d{4}-\d{2}-\d{2}T", s) else s
    s = re.sub(r"\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$", "", s, flags=re.I)
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"unrecognised date: {raw!r}")


def parse_int(raw: object) -> int | None:
    if raw is None or str(raw).strip() in {"", "-", "NA", "nan"}:
        return None
    try:
        return int(round(float(str(raw).replace(",", "").strip())))
    except ValueError:
        raise ValueError(f"not a whole number: {raw!r}")


def parse_payment_mode(raw: object) -> PaymentMode:
    s = str(raw or "").strip().lower()
    if s in {"cod", "cash on delivery", "cash_on_delivery", "c.o.d", "postpaid"}:
        return PaymentMode.cod
    if s in {"prepaid", "online", "upi", "card", "paid", "pre-paid", "netbanking", "wallet"}:
        return PaymentMode.prepaid
    raise ValueError(f"unknown payment mode: {raw!r}")


def parse_delivery_status(raw: object) -> DeliveryStatus:
    s = str(raw or "").strip().lower()
    if not s:
        return DeliveryStatus.in_transit
    if "return" in s or "rto" in s:
        return DeliveryStatus.returned_to_warehouse
    if "deliver" in s:
        return DeliveryStatus.delivered
    if "cancel" in s:
        return DeliveryStatus.cancelled
    return DeliveryStatus.in_transit
