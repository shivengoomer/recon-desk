"""Deterministic synthetic data for a D2C home-textiles brand. No personal data is generated at all.

Rate cards here mirror what the seed stores, so every injected leak has a known ground truth.
"""
import random
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal as D

PRODUCTS = [("Cotton bedsheet set", 1299), ("Cushion cover pack", 599), ("Linen curtains", 1899),
            ("Quilted comforter", 2999), ("Bath towel set", 899), ("Table runner", 449), ("Throw blanket", 1599)]
# channel code -> (share, commission %, fixed fee, shipping fee, settlement header style)
CHANNELS = {"WEB": (0.40, None, None, 0), "MP1": (0.20, 25, 0, 0), "MP2": (0.15, 18, 25, 40), "MP3": (0.10, 22, 0, 0),
            "QC1": (0.10, 28, 0, 0), "QC2": (0.05, 30, 0, 0)}
WEB_COD_FEE, WEB_PREPAID_PCT = D(90), D(2)
COURIERS = {"SWIFT": {"slabs": [(0, 500, 45), (501, 1000, 70), (1001, 3000, 110)], "cod_pct": 2, "cod_min": 30},
            "KARGO": {"slabs": [(0, 500, 42), (501, 1000, 66), (1001, 3000, 104)], "cod_pct": D("1.8"), "cod_min": 28}}
DUE = {"WEB": 7, "MP1": 10, "MP2": 8, "MP3": 7, "QC1": 5, "QC2": 5, "SWIFT": 7, "KARGO": 8}
Q = D("0.01")


def r2(x) -> D:
    return D(x).quantize(Q, rounding=ROUND_HALF_UP)


def expected_net(ch, value, mode, status) -> D:
    if ch == "WEB":
        fee = WEB_COD_FEE if mode == "COD" else value * WEB_PREPAID_PCT / 100
        return r2(value - fee) if status != "Returned to warehouse" else r2(0)
    _, pct, fixed, ship = CHANNELS[ch]
    if status == "Returned to warehouse":
        return r2(-D(ship))
    return r2(value - (value * D(pct) / 100 + D(fixed) + D(ship)))


def freight_expected(courier, weight, mode, value) -> D:
    c = COURIERS[courier]
    base = next(b for lo, hi, b in c["slabs"] if lo <= weight <= hi)
    cod = max(D(c["cod_min"]), value * D(c["cod_pct"]) / 100) if mode == "COD" else D(0)
    return r2(D(base) + cod)


def rate_cards() -> list[dict]:
    cards = [{"code": "WEB", "lines": [{"payment_mode": "cod", "fixed_fee": WEB_COD_FEE},
                                       {"payment_mode": "prepaid", "commission_pct": WEB_PREPAID_PCT}]}]
    for code, (_, pct, fixed, ship) in CHANNELS.items():
        if code != "WEB":
            cards.append({"code": code, "lines": [{"commission_pct": D(pct), "fixed_fee": D(fixed), "shipping_fee": D(ship)}]})
    for code, c in COURIERS.items():
        cards.append({"code": code, "lines": [{"weight_min_g": lo, "weight_max_g": hi, "base_rate": D(b),
                                               "cod_fee_pct": D(c["cod_pct"]), "cod_fee_min": D(c["cod_min"])} for lo, hi, b in c["slabs"]]})
    return cards


def _fmt_date(d: date, style: str) -> str:
    return {"iso": d.isoformat(), "mon": d.strftime("%d-%b-%Y"), "slash": d.strftime("%d/%m/%Y")}[style]


def _fmt_money(v: D, style: str) -> str:
    return f"₹{v:,.2f}" if style == "rupee" else f"{v:.2f}"


def _messy_ref(rng, ref: str) -> str:
    """Partner formatting differences: 'ORD-M-12' vs 'ord-m-12' vs 'ORD M 12'."""
    r = rng.random()
    return ref.lower() if r < 0.04 else ref.replace("-", " ") if r < 0.06 else ref.replace("-", "") if r < 0.08 else ref


REF_PREFIX = {"WEB": "W", "MP1": "M1", "MP2": "M2", "MP3": "M3", "QC1": "Q1", "QC2": "Q2"}
SETTLE = {  # channel -> (headers, date style, money style)
    "WEB": (["Order Reference", "Gross Amount", "Fees", "TCS", "TDS", "Net Payout", "Payout Date"], "iso", "plain"),
    "MP1": (["Order Item ID", "Sale Amount", "Commission", "GST TCS", "Income Tax TDS", "Settlement Amount", "Settled On"], "mon", "plain"),
    "MP2": (["order_id", "gross", "total_deductions", "tcs", "tds", "net", "payment_date"], "slash", "plain"),
    "MP3": (["Reference", "Item Price", "Marketplace Fee", "TCS Deducted", "TDS Deducted", "Amount Settled", "Date"], "iso", "rupee"),
    "QC1": (["Order No", "Invoice Value", "Commission", "TCS", "TDS", "Payout", "Payout Date"], "slash", "plain"),
    "QC2": (["Order ID", "Order Value ₹", "Fees ₹", "TCS ₹", "TDS ₹", "Net Payout ₹", "Date"], "mon", "plain"),
}
COD_HEADERS = {"SWIFT": ["Client Order ID", "COD Amount", "Remitted Amount", "Remittance Date"],
               "KARGO": ["Order No", "COD Collected", "Net Remittance", "UTR Date"]}
FREIGHT_HEADERS = {"SWIFT": ["AWB No", "Client Order ID", "Total Freight", "Billed Weight", "Invoice No", "Invoice Date"],
                   "KARGO": ["Waybill", "Reference", "Total Charge", "Chargeable Weight", "Invoice Number", "Billing Date"]}
ORDER_HEADERS = ["Order ID", "Order Date", "Channel", "Value ₹", "Payment", "Delivery Status", "Delivered On", "Courier",
                 "AWB", "Weight (g)"]
CHANNEL_NAMES = {"WEB": "Website", "MP1": "Marketplace 1", "MP2": "Marketplace 2", "MP3": "Marketplace 3",
                 "QC1": "Quick-commerce 1", "QC2": "Quick-commerce 2"}
COURIER_NAMES = {"SWIFT": "SwiftShip", "KARGO": "KargoLink"}


def generate(n_orders: int, seed: int = 42, today: date | None = None) -> dict:
    rng = random.Random(seed)
    today = today or date.today()
    codes = list(CHANNELS)
    weights = [CHANNELS[c][0] for c in codes]
    orders, settle, cod, freight, truth = [], {c: [] for c in codes}, {c: [] for c in COURIERS}, {c: [] for c in COURIERS}, []
    seq = {c: 200000 for c in codes}
    inv = 0
    for _ in range(n_orders):
        ch = rng.choices(codes, weights)[0]
        seq[ch] += rng.randint(1, 3)
        ref = f"ORD-{REF_PREFIX[ch]}-{seq[ch]}"
        prod, price = rng.choice(PRODUCTS)
        value = D(price * rng.choice([1, 1, 1, 2, 3]) - rng.choice([0, 0, 100, 150]))
        mode = ("COD" if rng.random() < 0.55 else "Prepaid") if ch == "WEB" else "Prepaid"
        odate = today - timedelta(days=rng.randint(1, 90))
        roll = rng.random()
        status = ("Cancelled" if roll < 0.02 else "Returned to warehouse" if roll < 0.12 else
                  "In transit" if (today - odate).days < 5 else "Delivered")
        ddate = odate + timedelta(days=rng.randint(2, 6)) if status in ("Delivered", "Returned to warehouse") else None
        courier = rng.choice(list(COURIERS)) if ch == "WEB" and status != "Cancelled" else None
        weight = rng.choice([250, 400, 480, 650, 900, 1200, 1700])
        awb = f"{courier[:2]}{rng.randint(10**9, 10**10 - 1)}" if courier else ""
        orders.append([ref, odate.isoformat(), CHANNEL_NAMES[ch], f"{value:.2f}", mode, status,
                       ddate.isoformat() if ddate else "", COURIER_NAMES.get(courier, ""), awb, weight])
        if status in ("Cancelled", "In transit"):
            continue
        exp = expected_net(ch, value, mode, status)
        due_party = courier if mode == "COD" else ch
        due = (ddate or odate) + timedelta(days=DUE[due_party])
        overdue = due + timedelta(days=3) < today  # old enough that a leak is real, not just pending
        pay_date = min(due - timedelta(days=rng.randint(0, 2)), today - timedelta(days=1))
        # ---- money arriving
        if mode == "COD":
            received_expected = exp
            leak = rng.random()
            if overdue and leak < 0.03 and exp > 0:
                truth.append({"order_ref": ref, "type": "unremitted_cod", "amount": str(exp)})  # never remitted
            else:
                remitted = received_expected
                if overdue and 0.03 <= leak < 0.07 and exp > 100:
                    cut = r2(min(rng.randint(60, 300), exp / 2))
                    remitted = r2(received_expected - cut)
                    truth.append({"order_ref": ref, "type": "short_paid", "amount": str(cut)})
                if due <= today:
                    cod[courier].append([_messy_ref(rng, ref), f"{value:.2f}", f"{remitted:.2f}",
                                         (pay_date).isoformat() if courier == "SWIFT" else pay_date.strftime("%d-%b-%Y")])
        else:
            hs, dstyle, mstyle = SETTLE[ch]
            tcs, tds = r2(value * D("0.005")), r2(value * D("0.001"))
            net = r2(exp - tcs - tds) if status != "Returned to warehouse" else exp
            if status == "Returned to warehouse":
                tcs = tds = D(0)
            leak = rng.random()
            gross = value if status != "Returned to warehouse" else -value
            fee = r2(value - exp) if exp > 0 else D(0)
            missing_id = rng.random() < 0.006
            if overdue and leak < 0.03 and exp > 0:
                truth.append({"order_ref": ref, "type": "unpaid_prepaid", "amount": str(exp)})
                continue
            if overdue and leak < 0.07 and exp > 0:
                cut = r2(rng.randint(20, 220))
                net = r2(net - cut)
                truth.append({"order_ref": ref, "type": "short_paid", "amount": str(cut)})
            if pay_date <= today - timedelta(days=1) and due <= today:
                shown_ref = "" if missing_id else _messy_ref(rng, ref)
                if missing_id:
                    truth.append({"order_ref": ref, "type": "missing_order_id", "amount": "0.00"})
                settle[ch].append([shown_ref, _fmt_money(gross, mstyle), _fmt_money(fee, mstyle), _fmt_money(tcs, mstyle),
                                   _fmt_money(tds, mstyle), _fmt_money(net, mstyle), _fmt_date(pay_date, dstyle)])
        # ---- freight invoice (our own couriers only)
        if courier and ddate and ddate < today - timedelta(days=2):
            charged = freight_expected(courier, weight, mode, value)
            if rng.random() < 0.05:
                extra = r2(rng.randint(20, 90))
                charged += extra  # wrong weight slab / surcharge
                truth.append({"order_ref": ref, "type": "freight_overcharge", "amount": str(extra)})
            inv += 1
            idate = ddate + timedelta(days=3)
            freight[courier].append([awb, _messy_ref(rng, ref), f"{charged:.2f}", weight + (200 if charged > freight_expected(courier, weight, mode, value) else 0),
                                     f"INV-{courier[:2]}-{inv // 200 + 1000}", idate.isoformat()])
    return {"orders": orders, "settlement": settle, "cod": cod, "freight": freight, "truth": truth, "today": today.isoformat()}
