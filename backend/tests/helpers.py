import csv
import io

from openpyxl import Workbook

ORDER_HEADERS = ["Order ID", "Order Date", "Value ₹", "Payment", "Delivery Status", "Delivered On", "AWB", "Weight"]


def csv_bytes(headers, rows) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    w.writerows(rows)
    return buf.getvalue().encode()


def xlsx_bytes(headers, rows) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def partner_id(client, headers, code):
    return next(p["id"] for p in client.get("/api/partners", headers=headers).json() if p["code"] == code)


def approve_mapping(client, h, partner, kind, mapping):
    r = client.post("/api/mappings", headers=h, json={"partner_id": partner, "file_kind": kind, "mapping": mapping})
    assert r.status_code == 201, r.text
    r = client.post(f"/api/mappings/{r.json()['id']}/approve", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


ORDER_MAP = {"order_ref": "Order ID", "order_date": "Order Date", "value": "Value ₹", "payment_mode": "Payment",
             "delivery_status": "Delivery Status", "delivered_on": "Delivered On", "awb": "AWB", "weight_g": "Weight"}


def upload(client, h, partner, kind, name, data):
    return client.post("/api/imports", headers=h, data={"partner_id": partner, "file_kind": kind},
                       files={"file": (name, data)})


def setup_orders(client, h, rows=None, code="WEB"):
    pid = partner_id(client, h, code)
    approve_mapping(client, h, pid, "orders", ORDER_MAP)
    rows = rows or [["ORD-W-1", "2026-10-01", "1499", "COD", "Delivered", "2026-10-04", "AWB1", "500"],
                    ["ORD-W-2", "2026-10-01", "1199", "Prepaid", "Delivered", "2026-10-03", "AWB2", "400"]]
    r = upload(client, h, pid, "orders", "orders.csv", csv_bytes(ORDER_HEADERS, rows))
    assert r.status_code == 201, r.text
    return pid
