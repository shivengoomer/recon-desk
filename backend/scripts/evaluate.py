"""Compare open claims with seed_data/ground_truth.json (precision / recall per issue type)."""
import json
import sys
from collections import defaultdict
from pathlib import Path

from sqlalchemy import text

from app.db import SessionLocal

TYPE_MAP = {"short_paid": {"short_paid"}, "unpaid_prepaid": {"short_paid"}, "unremitted_cod": {"unremitted_cod"},
            "freight_overcharge": {"freight_overcharge"}}


def main(path: Path) -> None:
    truth = json.loads(path.read_text())["injected"]
    expected = defaultdict(set)  # claim_type -> {order_ref}
    for t in truth:
        for ct in TYPE_MAP.get(t["type"], ()):
            expected[ct].add(t["order_ref"].replace("-", ""))
    with SessionLocal() as db:
        got = defaultdict(set)
        for ref, ct in db.execute(text("SELECT o.order_ref, c.claim_type FROM claims c JOIN orders o ON o.id = c.order_id")):
            got[ct].add(ref)
    print(f"{'claim type':<20}{'truth':>7}{'found':>7}{'TP':>6}{'precision':>11}{'recall':>9}")
    for ct in sorted(set(expected) | set(got)):
        tp = len(expected[ct] & got[ct])
        p = tp / len(got[ct]) if got[ct] else 1.0
        r = tp / len(expected[ct]) if expected[ct] else 1.0
        print(f"{ct:<20}{len(expected[ct]):>7}{len(got[ct]):>7}{tp:>6}{p:>11.1%}{r:>9.1%}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "seed_data" / "ground_truth.json")
