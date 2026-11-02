import json

from app.ingest.suggest import suggest_mapping
from app.models.core import FileKind
from tests.helpers import (
    ORDER_HEADERS, ORDER_MAP, approve_mapping, csv_bytes, partner_id, setup_orders, upload, xlsx_bytes,
)


def test_suggest_mapping_from_messy_headers():
    s = suggest_mapping(FileKind.settlement, ["Order Item ID", "Settlement Amount", "Commission", "GST TCS", "TDS 194O", "Payout Date", "Sale Amount"])
    assert s["order_ref"]["column"] == "Order Item ID"
    assert s["net_amount"]["column"] == "Settlement Amount"
    assert s["tcs_amount"]["column"] == "GST TCS" and s["tds_amount"]["column"] == "TDS 194O"
    assert s["gross_amount"]["column"] == "Sale Amount"


def test_mapping_versioning_and_rollback(client, exec_h):
    pid = partner_id(client, exec_h, "WEB")
    v1 = approve_mapping(client, exec_h, pid, "orders", ORDER_MAP)
    v2 = approve_mapping(client, exec_h, pid, "orders", {**ORDER_MAP, "order_ref": "Order No"})
    vs = client.get("/api/mappings", headers=exec_h, params={"partner_id": pid, "file_kind": "orders"}).json()
    assert [(m["version"], m["status"]) for m in vs] == [(2, "approved"), (1, "superseded")]
    assert client.post(f"/api/mappings/{v2['id']}/approve", headers=exec_h).status_code == 409
    rb = client.post(f"/api/mappings/{v1['id']}/rollback", headers=exec_h).json()
    assert rb["version"] == 3 and rb["status"] == "approved" and rb["mapping"]["order_ref"] == "Order ID"
    assert client.post(f"/api/mappings/{rb['id']}/rollback", headers=exec_h).status_code == 409


def test_mapping_validation(client, exec_h):
    pid = partner_id(client, exec_h, "WEB")
    r = client.post("/api/mappings", headers=exec_h, json={"partner_id": pid, "file_kind": "orders", "mapping": {"order_ref": "A"}})
    assert r.status_code == 422 and "Required" in r.json()["detail"]
    r = client.post("/api/mappings", headers=exec_h, json={"partner_id": pid, "file_kind": "orders", "mapping": {**ORDER_MAP, "value": "Order ID"}})
    assert r.status_code == 422
    r = client.post("/api/mappings", headers=exec_h, json={"partner_id": pid, "file_kind": "cod", "mapping": {}})
    assert r.status_code == 422  # a website cannot send COD files


def test_inspect_previews_20_rows_and_suggests(client, exec_h):
    pid = partner_id(client, exec_h, "WEB")
    rows = [[f"ORD-W-{i}", "2026-10-01", "100", "COD", "Delivered", "", "", ""] for i in range(30)]
    rows[3][2] = "abc"
    r = client.post("/api/imports/inspect", headers=exec_h, data={"partner_id": pid, "file_kind": "orders", "mapping": json.dumps(ORDER_MAP)},
                    files={"file": ("o.csv", csv_bytes(ORDER_HEADERS, rows))})
    assert r.status_code == 200
    body = r.json()
    assert len(body["preview"]["rows"]) == 20 and body["preview"]["error_count"] == 1
    assert body["suggestion"]["value"]["column"] == "Value ₹"


def test_upload_requires_approved_mapping(client, exec_h):
    pid = partner_id(client, exec_h, "WEB")
    r = upload(client, exec_h, pid, "orders", "o.csv", csv_bytes(ORDER_HEADERS, [["A", "2026-10-01", "1", "COD", "", "", "", ""]]))
    assert r.status_code == 422 and "mapping" in r.json()["detail"].lower()


def test_upload_orders_idempotent_and_updates(client, exec_h):
    pid = setup_orders(client, exec_h)
    rows = [["ORD-W-1", "2026-10-01", "1499", "COD", "Delivered", "2026-10-04", "AWB1", "500"],
            ["ORD-W-2", "2026-10-01", "1199", "Prepaid", "Delivered", "2026-10-03", "AWB2", "400"]]
    r = upload(client, exec_h, pid, "orders", "o.csv", csv_bytes(ORDER_HEADERS, rows)).json()
    assert r["accepted_count"] == 0 and r["duplicate_count"] == 2  # exact re-upload changes nothing
    rows[0][4] = "Returned to warehouse"
    r = upload(client, exec_h, pid, "orders", "o.csv", csv_bytes(ORDER_HEADERS, rows)).json()
    assert r["updated_count"] == 1 and r["duplicate_count"] == 1


def test_rejected_rows_reported_and_downloadable(client, exec_h):
    pid = partner_id(client, exec_h, "WEB")
    approve_mapping(client, exec_h, pid, "orders", ORDER_MAP)
    rows = [["ORD-1", "2026-10-01", "-5", "COD", "", "", "", ""], ["ORD-2", "not a date", "10", "COD", "", "", "", ""],
            ["ORD-3", "2026-10-01", "10", "barter", "", "", "", ""], ["ORD-4", "2026-10-01", "10", "COD", "", "", "", ""]]
    r = upload(client, exec_h, pid, "orders", "o.csv", csv_bytes(ORDER_HEADERS, rows)).json()
    assert (r["accepted_count"], r["rejected_count"]) == (1, 3)
    csv_text = client.get(f"/api/imports/{r['id']}/rejects.csv", headers=exec_h).text
    assert "cannot be negative" in csv_text and "unrecognised date" in csv_text and "unknown payment mode" in csv_text


def test_changed_columns_give_clear_error(client, exec_h):
    pid = partner_id(client, exec_h, "WEB")
    approve_mapping(client, exec_h, pid, "orders", ORDER_MAP)
    r = upload(client, exec_h, pid, "orders", "o.csv", csv_bytes(["OrderNo", "Date"], [["A", "2026-10-01"]]))
    assert r.status_code == 422 and "columns changed" in r.json()["detail"]


def test_oversize_file_413(client, exec_h, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "upload_max_mb", 0)
    pid = partner_id(client, exec_h, "WEB")
    assert upload(client, exec_h, pid, "orders", "o.csv", b"a,b\n1,2\n").status_code == 413


def test_unsupported_and_empty_files(client, exec_h):
    pid = partner_id(client, exec_h, "WEB")
    approve_mapping(client, exec_h, pid, "orders", ORDER_MAP)
    assert upload(client, exec_h, pid, "orders", "o.pdf", b"%PDF").status_code == 422
    assert upload(client, exec_h, pid, "orders", "o.csv", b"").status_code == 422


def test_excel_upload(client, exec_h):
    pid = partner_id(client, exec_h, "WEB")
    approve_mapping(client, exec_h, pid, "orders", ORDER_MAP)
    data = xlsx_bytes(ORDER_HEADERS, [["ORD-X-1", "2026-10-01", 1499.5, "COD", "Delivered", None, None, 300]])
    r = upload(client, exec_h, pid, "orders", "o.xlsx", data)
    assert r.status_code == 201 and r.json()["accepted_count"] == 1


def test_settlement_negative_tax_stored_positive_and_idempotent(client, exec_h):
    pid = partner_id(client, exec_h, "MP1")
    m = {"order_ref": "Order Item ID", "gross_amount": "Sale", "net_amount": "Payout", "fee_amount": "Fees", "tcs_amount": "TCS", "tds_amount": "TDS"}
    approve_mapping(client, exec_h, pid, "settlement", m)
    data = csv_bytes(["Order Item ID", "Sale", "Payout", "Fees", "TCS", "TDS"],
                     [["ORD-M-1", "1199", "862", "-300", "-12", "-12"], ["ORD-M-1", "1199", "862", "-300", "-12", "-12"]])
    r = upload(client, exec_h, pid, "settlement", "s.csv", data).json()
    assert r["accepted_count"] == 2  # repeated identical rows in one file are both real
    r = upload(client, exec_h, pid, "settlement", "s.csv", data).json()
    assert r["accepted_count"] == 0 and r["duplicate_count"] == 2
    from sqlalchemy import text
    from sqlalchemy.orm import Session
    from app.db import engine
    with Session(engine) as s:
        assert s.execute(text("SELECT min(fee_amount), min(tcs_amount) FROM settlement_lines")).one() == (300, 12)
