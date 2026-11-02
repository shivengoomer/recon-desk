"""Generate synthetic data files, and optionally load them through the same service layer the upload API uses.

  python -m scripts.seed                       # write CSVs + ground_truth.json to backend/seed_data
  python -m scripts.seed --import --reset      # also reset the DB and load everything, then run matching
  python -m scripts.seed --orders 100000 --out /tmp/bench --import --reset   # 1 lakh benchmark
"""
import argparse
import csv
import json
import sys
import time
from datetime import date
from pathlib import Path

from sqlalchemy import select, text

from app.bootstrap import ensure_reference_data
from app.config import settings
from app.db import SessionLocal
from app.ingest import mappings as maps
from app.ingest import service
from app.ingest.parser import read_table
from app.ingest.suggest import suggest_mapping
from app.matching.engine import run_matching
from app.models import Partner, RateCard, RateCardLine, User
from app.models.core import FileKind, Role
from app.models.ledger import PaymentMode
from scripts import gen


def write_csv(path: Path, headers: list[str], rows: list[list]) -> bytes:
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)
    return path.read_bytes()


def reset(db) -> None:
    names = [r[0] for r in db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'alembic_version'"))]
    db.execute(text("TRUNCATE " + ",".join(names) + " RESTART IDENTITY CASCADE"))
    db.commit()


def seed_rate_cards(db, user_id: int, since: date) -> None:
    if db.scalar(select(RateCard.id).limit(1)):
        return
    by_code = {p.code: p for p in db.scalars(select(Partner))}
    for card in gen.rate_cards():
        rc = RateCard(partner_id=by_code[card["code"]].id, name=f"{card['code']} standard", effective_from=since, created_by=user_id)
        db.add(rc)
        db.flush()
        for ln in card["lines"]:
            ln = dict(ln)
            if "payment_mode" in ln:
                ln["payment_mode"] = PaymentMode(ln["payment_mode"])
            db.add(RateCardLine(rate_card_id=rc.id, **ln))
    db.flush()


def load(db, files: list[tuple[str, FileKind, str, Path]], user_id: int) -> None:
    """files: (partner code, kind, label, path). Mapping comes from the suggester, like a user would accept."""
    by_code = {p.code: p for p in db.scalars(select(Partner))}
    for code, kind, label, path in files:
        data = path.read_bytes()
        headers, _ = read_table(path.name, data)
        partner = by_code[code]
        if maps.active_mapping(db, partner.id, kind) is None:
            sug = suggest_mapping(kind, headers)
            mapping = {f: s["column"] for f, s in sug.items()}
            m = maps.create_draft(db, user_id, partner, kind, mapping, ai_suggested=True)
            maps.approve(db, user_id, m)
        t = time.perf_counter()
        res = service.import_file(db, user_id, partner, kind, path.name, data)
        b = res.batch
        print(f"  {label:<28} rows={b.row_count:>7} new={b.accepted_count:>7} dup={b.duplicate_count:>5} "
              f"rejected={b.rejected_count:>4}  {time.perf_counter() - t:5.1f}s")
        db.commit()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--orders", type=int, default=2000)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "seed_data")
    ap.add_argument("--import", dest="do_import", action="store_true")
    ap.add_argument("--reset", action="store_true", help="truncate all tables first (dev only)")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)

    g = gen.generate(a.orders, a.seed)
    files: list[tuple[str, FileKind, str, Path]] = []
    p = a.out / "orders.csv"
    write_csv(p, gen.ORDER_HEADERS, g["orders"])
    files.append(("WEB", FileKind.orders, "orders (all channels)", p))
    for ch, rows in g["settlement"].items():
        p = a.out / f"settlement_{ch.lower()}.csv"
        write_csv(p, gen.SETTLE[ch][0], rows)
        files.append((ch, FileKind.settlement, f"settlement {ch}", p))
    for c, rows in g["cod"].items():
        p = a.out / f"cod_{c.lower()}.csv"
        write_csv(p, gen.COD_HEADERS[c], rows)
        files.append((c, FileKind.cod, f"COD remittance {c}", p))
    for c, rows in g["freight"].items():
        p = a.out / f"freight_{c.lower()}.csv"
        write_csv(p, gen.FREIGHT_HEADERS[c], rows)
        files.append((c, FileKind.freight, f"freight invoice {c}", p))
    (a.out / "ground_truth.json").write_text(json.dumps(
        {"seed": a.seed, "orders": a.orders, "generated_on": g["today"], "injected": g["truth"]}, indent=1))
    print(f"wrote {len(files)} files + ground_truth.json ({len(g['truth'])} injected issues) to {a.out}")

    if not a.do_import:
        return
    with SessionLocal() as db:
        if a.reset:
            reset(db)
        ensure_reference_data(db, settings.demo_executive_password, settings.demo_cofounder_password)
        founder = db.scalar(select(User).where(User.role == Role.cofounder)) or db.scalar(select(User))
        uid = founder.id if founder else None
        seed_rate_cards(db, uid, date(2000, 1, 1))
        db.commit()
        print("importing:")
        load(db, files, uid)
        t = time.perf_counter()
        res = run_matching(db, uid)
        db.commit()
        print(f"matching: {res.orders_processed} orders in {time.perf_counter() - t:.1f}s "
              f"({res.claims_total} open claims)")


if __name__ == "__main__":
    sys.exit(main())
