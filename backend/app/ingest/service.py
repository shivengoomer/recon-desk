"""Parse + validate rows with an approved mapping, then bulk-load them in one transaction."""
import hashlib
import json
from collections import Counter
from collections.abc import Iterator
from dataclasses import dataclass, field
from decimal import Decimal
from itertools import islice

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.audit import audit
from app.ingest import normalize as N
from app.ingest.mappings import active_mapping, check_partner
from app.ingest.parser import read_table
from app.models import (
    CodRemittance, FreightCharge, ImportBatch, ImportReject, Order, Partner, SettlementLine,
)
from app.models.core import FileKind, PartnerKind

CHUNK = 5000
PREVIEW_ROWS = 20


class RowError(ValueError):
    pass


class ImportError_(ValueError):
    """Whole-file problem (bad headers, no mapping...)."""


@dataclass
class Lookups:
    """Partner lookups by lowercased code or name."""
    channels: dict[str, int] = field(default_factory=dict)
    couriers: dict[str, int] = field(default_factory=dict)

    @classmethod
    def load(cls, db: Session) -> "Lookups":
        lk = cls()
        for p in db.scalars(select(Partner)):
            target = lk.channels if p.kind == PartnerKind.channel else lk.couriers
            target[p.code.lower()] = p.id
            target[p.name.lower()] = p.id
        return lk


def _val(row: dict, mapping: dict, name: str):
    col = mapping.get(name)
    return row.get(col) if col else None


def _money(row, mapping, name, required=False, allow_negative=True) -> Decimal | None:
    try:
        v = N.parse_money(_val(row, mapping, name))
    except ValueError as e:
        raise RowError(f"{name}: {e}")
    if v is None and required:
        raise RowError(f"{name} is required")
    if v is not None and v < 0 and not allow_negative:
        raise RowError(f"{name} cannot be negative ({v})")
    return v


def _date(row, mapping, name, required=False):
    try:
        v = N.parse_date(_val(row, mapping, name))
    except ValueError as e:
        raise RowError(f"{name}: {e}")
    if v is None and required:
        raise RowError(f"{name} is required")
    return v


def _text(row, mapping, name, limit=64) -> str | None:
    v = _val(row, mapping, name)
    s = None if v is None else str(v).strip()
    if s and len(s) > limit:
        raise RowError(f"{name} is longer than {limit} characters")
    return s or None


def parse_row(kind: FileKind, partner: Partner, mapping: dict, lk: Lookups, row: dict) -> dict:
    """Validate one source row; returns the dict to store (without batch/hash). Raises RowError."""
    ref_raw = _text(row, mapping, "order_ref")
    ref = N.normalize_ref(ref_raw)
    if kind == FileKind.orders:
        if not ref:
            raise RowError("order_ref is required")
        chan_name = _text(row, mapping, "channel", 120)
        channel_id = partner.id
        if chan_name:
            channel_id = lk.channels.get(chan_name.lower())
            if channel_id is None:
                raise RowError(f"unknown channel {chan_name!r}")
        courier_name = _text(row, mapping, "courier", 120)
        courier_id = None
        if courier_name:
            courier_id = lk.couriers.get(courier_name.lower())
            if courier_id is None:
                raise RowError(f"unknown courier {courier_name!r}")
        try:
            mode = N.parse_payment_mode(_val(row, mapping, "payment_mode"))
            status = N.parse_delivery_status(_val(row, mapping, "delivery_status"))
            weight = N.parse_int(_val(row, mapping, "weight_g"))
        except ValueError as e:
            raise RowError(str(e))
        return dict(channel_id=channel_id, order_ref=ref, order_date=_date(row, mapping, "order_date", True),
                    value=_money(row, mapping, "value", True, allow_negative=False), payment_mode=mode,
                    delivery_status=status, delivered_on=_date(row, mapping, "delivered_on"),
                    courier_id=courier_id, awb=_text(row, mapping, "awb"), weight_g=weight)
    base = dict(order_ref_raw=ref_raw, order_ref=ref)
    if kind == FileKind.settlement:
        # Deductions may arrive as negatives in partner files; stored as positive amounts.
        def ded(n):
            v = _money(row, mapping, n)
            return abs(v) if v is not None else Decimal("0.00")
        return base | dict(partner_id=partner.id, gross_amount=_money(row, mapping, "gross_amount", True),
                           net_amount=_money(row, mapping, "net_amount", True), fee_amount=ded("fee_amount"),
                           tcs_amount=ded("tcs_amount"), tds_amount=ded("tds_amount"),
                           settled_on=_date(row, mapping, "settled_on"))
    if kind == FileKind.cod:
        return base | dict(courier_id=partner.id,
                           cod_collected=_money(row, mapping, "cod_collected", True, allow_negative=False),
                           remitted_amount=_money(row, mapping, "remitted_amount", True, allow_negative=False),
                           remitted_on=_date(row, mapping, "remitted_on"))
    awb = _text(row, mapping, "awb")
    if not ref and not awb:
        raise RowError("freight row needs an order_ref or an awb")
    try:
        bw = N.parse_int(_val(row, mapping, "billed_weight_g"))
    except ValueError as e:
        raise RowError(str(e))
    return base | dict(courier_id=partner.id, awb=awb, billed_weight_g=bw,
                       charged_amount=_money(row, mapping, "charged_amount", True, allow_negative=False),
                       invoice_no=_text(row, mapping, "invoice_no"), invoice_date=_date(row, mapping, "invoice_date"))


def _hash(kind: FileKind, partner_id: int, row: dict, mapping: dict, occurrence: int) -> str:
    """Stable per source row. `occurrence` keeps genuinely repeated rows distinct yet re-uploads idempotent."""
    vals = [str(row.get(c)) for c in sorted(set(mapping.values()))]
    return hashlib.sha256(json.dumps([kind.value, partner_id, vals, occurrence]).encode()).hexdigest()


def _jsonable(row: dict) -> dict:
    return {k: (v if isinstance(v, (str, int, float, bool, type(None))) else str(v)) for k, v in row.items()}


def preview(kind: FileKind, partner: Partner, mapping: dict, lk: Lookups, headers: list[str],
            rows: Iterator[dict]) -> dict:
    """Parse the first 20 rows with a candidate mapping so a person can approve it."""
    missing = [c for c in mapping.values() if c not in headers]
    if missing:
        raise ImportError_(f"Mapped columns not found in file: {', '.join(missing)}")
    out = []
    for i, row in enumerate(islice(rows, PREVIEW_ROWS), start=2):
        try:
            parsed = parse_row(kind, partner, mapping, lk, row)
            out.append({"row": i, "ok": True, "values": _jsonable(parsed), "error": None})
        except RowError as e:
            out.append({"row": i, "ok": False, "values": {}, "error": str(e)})
    return {"rows": out, "ok_count": sum(r["ok"] for r in out), "error_count": sum(not r["ok"] for r in out)}


_MODELS = {FileKind.orders: Order, FileKind.settlement: SettlementLine,
           FileKind.cod: CodRemittance, FileKind.freight: FreightCharge}


def _insert_lines(db: Session, model, rows: list[dict]) -> int:
    inserted = 0
    for i in range(0, len(rows), CHUNK):
        stmt = pg_insert(model).on_conflict_do_nothing(index_elements=["row_hash"]).returning(model.id)
        inserted += len(db.execute(stmt, rows[i:i + CHUNK]).all())
    return inserted


_ORDER_COLS = ["channel_id", "order_ref", "order_date", "value", "payment_mode", "delivery_status", "delivered_on",
               "courier_id", "awb", "weight_g", "batch_id", "row_hash"]


def _upsert_orders(db: Session, rows: list[dict]) -> tuple[int, int]:
    """COPY into a staging table, then one INSERT..SELECT..ON CONFLICT. Returns (inserted, updated).

    Row-by-row ON CONFLICT through the ORM took ~77s for 1 lakh orders; COPY + a single statement is a few seconds.
    """
    if not rows:
        return 0, 0
    raw = db.connection().connection.driver_connection
    with raw.cursor() as cur:
        cur.execute("CREATE TEMP TABLE stg_orders (LIKE orders INCLUDING DEFAULTS) ON COMMIT DROP")
        with cur.copy(f"COPY stg_orders ({', '.join(_ORDER_COLS)}) FROM STDIN") as cp:
            for r in rows:
                cp.write_row([getattr(r[c], "value", r[c]) for c in _ORDER_COLS])
    cols = ", ".join(_ORDER_COLS)
    res = db.execute(text(f"""
        WITH up AS (
          INSERT INTO orders ({cols}) SELECT {cols} FROM stg_orders
          ON CONFLICT (channel_id, order_ref) DO UPDATE SET
            delivery_status = EXCLUDED.delivery_status, delivered_on = EXCLUDED.delivered_on,
            courier_id = EXCLUDED.courier_id, awb = EXCLUDED.awb, weight_g = EXCLUDED.weight_g,
            value = EXCLUDED.value, payment_mode = EXCLUDED.payment_mode, batch_id = EXCLUDED.batch_id
          WHERE orders.delivery_status <> EXCLUDED.delivery_status OR orders.value <> EXCLUDED.value
             OR orders.delivered_on IS DISTINCT FROM EXCLUDED.delivered_on OR orders.awb IS DISTINCT FROM EXCLUDED.awb
          RETURNING (xmax = 0) AS inserted)
        SELECT count(*) FILTER (WHERE inserted), count(*) FILTER (WHERE NOT inserted) FROM up""")).one()
    db.execute(text("DROP TABLE stg_orders"))
    return res[0], res[1]


@dataclass
class ImportResult:
    batch: ImportBatch
    updated: int = 0


def import_file(db: Session, user_id: int, partner: Partner, kind: FileKind, file_name: str, data: bytes) -> ImportResult:
    check_partner(partner, kind)
    mapping_row = active_mapping(db, partner.id, kind)
    if mapping_row is None:
        raise ImportError_(f"No approved column mapping for {partner.name} / {kind.value}. Create and approve one first.")
    mapping = mapping_row.mapping
    headers, rows = read_table(file_name, data)
    missing = [c for c in mapping.values() if c not in headers]
    if missing:
        raise ImportError_("The file's columns changed. Not found: " + ", ".join(missing)
                           + ". Create a new column mapping for this format.")
    lk = Lookups.load(db)
    batch = ImportBatch(partner_id=partner.id, file_kind=kind, file_name=file_name[:255],
                        file_hash=hashlib.sha256(data).hexdigest(), mapping_id=mapping_row.id, uploaded_by=user_id)
    db.add(batch)
    db.flush()

    good: list[dict] = []
    rejects: list[dict] = []
    seen: Counter = Counter()
    total = 0
    for n, row in enumerate(rows, start=2):
        total += 1
        try:
            parsed = parse_row(kind, partner, mapping, lk, row)
        except RowError as e:
            rejects.append(dict(batch_id=batch.id, row_number=n, reason=str(e), raw=_jsonable(row)))
            continue
        h = _hash(kind, partner.id, row, mapping, 0)
        seen[h] += 1
        h = _hash(kind, partner.id, row, mapping, seen[h] - 1)
        parsed.update(batch_id=batch.id, row_hash=h)
        good.append(parsed)

    updated = 0
    if kind == FileKind.orders:
        # last occurrence wins when an order repeats inside one file
        latest = {(r["channel_id"], r["order_ref"]): r for r in good}
        good = list(latest.values())
        inserted, updated = _upsert_orders(db, good)
        dup = len(good) - inserted - updated
    else:
        inserted = _insert_lines(db, _MODELS[kind], good)
        dup = len(good) - inserted
    for i in range(0, len(rejects), CHUNK):
        db.execute(pg_insert(ImportReject), rejects[i:i + CHUNK])
    batch.row_count, batch.accepted_count = total, inserted
    batch.duplicate_count, batch.rejected_count = max(dup, 0), len(rejects)
    audit(db, user_id, "import.create", "import_batch", batch.id, None,
          {"file": file_name, "kind": kind.value, "partner": partner.code, "rows": total, "accepted": inserted,
           "updated": updated, "duplicates": batch.duplicate_count, "rejected": len(rejects)})
    return ImportResult(batch, updated)
