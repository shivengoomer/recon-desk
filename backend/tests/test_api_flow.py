"""End-to-end through the HTTP API: upload -> match -> orders/claims/dashboard/export + role guards."""
from tests.helpers import ORDER_HEADERS, approve_mapping, csv_bytes, partner_id, upload

CARD_WEB = {"name": "web", "effective_from": "2026-01-01", "lines": [
    {"payment_mode": "cod", "fixed_fee": "90"}, {"payment_mode": "prepaid", "commission_pct": "2"}]}
CARD_SW = {"name": "swift", "effective_from": "2026-01-01", "lines": [
    {"weight_min_g": 0, "weight_max_g": 500, "base_rate": "45", "cod_fee_pct": "2", "cod_fee_min": "30"}]}


def _cards(client, founder_h):
    for code, card in (("WEB", CARD_WEB), ("SWIFT", CARD_SW)):
        r = client.post("/api/rate-cards", headers=founder_h, json={"partner_id": partner_id(client, founder_h, code), **card})
        assert r.status_code == 201, r.text


def _load(client, h):
    web, sw = partner_id(client, h, "WEB"), partner_id(client, h, "SWIFT")
    from tests.helpers import ORDER_MAP
    approve_mapping(client, h, web, "orders", ORDER_MAP)
    approve_mapping(client, h, sw, "cod", {"order_ref": "Client Order", "cod_collected": "COD Amt", "remitted_amount": "Remitted", "remitted_on": "Date"})
    approve_mapping(client, h, sw, "freight", {"order_ref": "Client Order", "charged_amount": "Freight"})
    orders = [["ORD-W-1", "2026-09-01", "1499", "COD", "Delivered", "2026-09-03", "A1", "400"],
              ["ORD-W-2", "2026-09-01", "1499", "COD", "Delivered", "2026-09-03", "A2", "400"],
              ["ORD-W-3", "2026-09-01", "1000", "Prepaid", "Delivered", "2026-09-03", "A3", "400"]]
    assert upload(client, h, web, "orders", "o.csv", csv_bytes(ORDER_HEADERS, orders)).status_code == 201
    cod = [["ord-w-1", "1499", "1409", "2026-09-10"], ["ORD-W-2", "1499", "1300", "2026-09-10"]]
    assert upload(client, h, sw, "cod", "c.csv", csv_bytes(["Client Order", "COD Amt", "Remitted", "Date"], cod)).status_code == 201
    fr = [["ORD-W-1", "120"]]
    assert upload(client, h, sw, "freight", "f.csv", csv_bytes(["Client Order", "Freight"], fr)).status_code == 201


def test_full_flow(client, exec_h, founder_h):
    _cards(client, founder_h)
    _load(client, exec_h)
    run = client.post("/api/match-runs", headers=exec_h, json={"as_of": "2026-11-01"}).json()
    assert run["orders_processed"] == 3 and run["duration_ms"] >= 0
    sc = run["status_counts"]
    assert sc == {"freight_overcharged": 1, "short_paid": 1, "unpaid_past_due": 1}

    page = client.get("/api/orders", headers=exec_h, params={"status": "short_paid"}).json()
    assert page["total"] == 1 and page["items"][0]["difference"] == "-109.00" and page["difference_total"] == "-109.00"
    assert client.get("/api/orders", headers=exec_h, params={"q": "ord-w-2"}).json()["total"] == 1
    assert client.get("/api/orders", headers=exec_h, params={"status": "bogus"}).status_code == 422

    detail = client.get(f"/api/orders/{page['items'][0]['id']}", headers=exec_h).json()
    assert detail["cod_remittances"][0]["remitted_amount"] == "1300.00"

    claims = client.get("/api/claims", headers=exec_h).json()
    assert claims["total"] == 3
    by_type = {c["claim_type"]: c for c in claims["items"]}
    assert by_type["short_paid"]["amount"] == "109.00" and by_type["freight_overcharge"]["amount"] == "45.00"
    assert by_type["short_paid"]["partner"] == "SwiftShip"  # COD shortfall is chased from the courier
    assert client.get("/api/claims", headers=exec_h, params={"partner_id": partner_id(client, exec_h, "WEB")}).json()["total"] == 1

    dash = client.get("/api/dashboard", headers=exec_h).json()
    assert dash["orders"] == 3 and float(dash["money_at_risk"]) == 109 + 45 + 980
    for row in dash["by_partner"]:  # ageing buckets always add up to the partner total
        assert abs(sum(float(v) for v in row["buckets"].values()) - float(row["total"])) < 0.01

    assert dash["claims_pipeline"]["open"]["count"] == 3 and dash["claims_pipeline"]["recovered"]["count"] == 0
    assert dash["claims_older_than_60"]["count"] >= 0
    card = {r["partner"]: r for r in dash["scorecard"]}
    assert card["Website"]["orders"] == 3 and card["Website"]["settled_pct"] == 0.0 and card["SwiftShip"]["kind"] == "courier"
    assert dash["freshness"]["orders"]["rows"] == 3 and dash["freshness"]["settlement"] is None
    export = client.get("/api/claims/export.csv", headers=exec_h)
    assert export.status_code == 200 and "text/csv" in export.headers["content-type"]
    assert "ORDW2" in export.text and "settlement_lines" in export.text

    cid = by_type["freight_overcharge"]["id"]
    assert client.patch(f"/api/claims/{cid}", headers=exec_h, json={"status": "rejected"}).status_code == 422  # needs note
    ok = client.patch(f"/api/claims/{cid}", headers=exec_h, json={"status": "filed", "note": "raised with SwiftShip"})
    assert ok.status_code == 200 and ok.json()["status"] == "filed"
    assert client.patch(f"/api/claims/{cid}", headers=exec_h, json={}).status_code == 422
    assert client.patch("/api/claims/99999", headers=exec_h, json={"note": "x"}).status_code == 404


def test_role_guards(client, exec_h, founder_h):
    card = {"partner_id": partner_id(client, exec_h, "WEB"), **CARD_WEB}
    assert client.post("/api/rate-cards", headers=exec_h, json=card).status_code == 403
    assert client.put("/api/settings", headers=exec_h, json={"tolerance_inr": 5}).status_code == 403
    assert client.get("/api/audit-log", headers=exec_h).status_code == 403
    assert client.put("/api/settings", headers=founder_h, json={"tolerance_inr": 5}).json() == {"tolerance_inr": 5}
    assert client.get("/api/audit-log", headers=founder_h).status_code == 200
    # every guarded route rejects anonymous callers
    for method, path in (("get", "/api/orders"), ("get", "/api/claims"), ("get", "/api/dashboard"),
                         ("get", "/api/rate-cards"), ("post", "/api/match-runs"), ("get", "/api/suggestions"),
                         ("get", "/api/tax-summary"), ("get", "/api/claims/export.csv")):
        assert getattr(client, method)(path).status_code == 401, path


def test_rate_card_validation(client, founder_h):
    web, sw = partner_id(client, founder_h, "WEB"), partner_id(client, founder_h, "SWIFT")
    bad = [
        {"partner_id": web, **{**CARD_WEB, "lines": [{"weight_min_g": 0, "weight_max_g": 5, "base_rate": "1"}]}},
        {"partner_id": web, **{**CARD_WEB, "lines": [{"payment_mode": "cod"}]}},
        {"partner_id": sw, **{**CARD_SW, "lines": [{"weight_min_g": 0, "weight_max_g": 500, "base_rate": "1"},
                                                  {"weight_min_g": 400, "weight_max_g": 900, "base_rate": "2"}]}},
        {"partner_id": web, **{**CARD_WEB, "effective_to": "2025-01-01"}},
        {"partner_id": web, **{**CARD_WEB, "lines": [{"commission_pct": "150"}]}},
        {"partner_id": 9999, **CARD_WEB},
    ]
    codes = [client.post("/api/rate-cards", headers=founder_h, json=b).status_code for b in bad]
    assert codes == [422, 422, 422, 422, 422, 404]


def test_suggestion_confirm_flow(client, exec_h, founder_h):
    from tests.helpers import ORDER_MAP
    _cards(client, founder_h)
    mp1 = partner_id(client, exec_h, "MP1")
    web = partner_id(client, exec_h, "WEB")
    approve_mapping(client, exec_h, web, "orders", ORDER_MAP)
    upload(client, exec_h, web, "orders", "o.csv", csv_bytes(ORDER_HEADERS, [["ORD-W-3", "2026-09-01", "1000", "Prepaid", "Delivered", "2026-09-03", "", "400"]]))
    approve_mapping(client, exec_h, web, "settlement", {"order_ref": "Ref", "gross_amount": "Gross", "net_amount": "Net", "settled_on": "Date"})
    upload(client, exec_h, web, "settlement", "s.csv", csv_bytes(["Ref", "Gross", "Net", "Date"], [["", "1000", "980", "2026-09-08"]]))
    client.post("/api/match-runs", headers=exec_h, json={"as_of": "2026-11-01"})
    sugg = client.get("/api/suggestions", headers=exec_h).json()
    assert len(sugg) == 1 and sugg[0]["candidate_order_ref"] == "ORDW3"
    assert client.get("/api/claims", headers=exec_h).json()["total"] == 0  # held while the suggestion is pending
    assert client.post(f"/api/suggestions/{sugg[0]['id']}/confirm", headers=exec_h).json()["status"] == "confirmed"
    assert client.post(f"/api/suggestions/{sugg[0]['id']}/confirm", headers=exec_h).status_code == 409
    order = client.get("/api/orders", headers=exec_h).json()["items"][0]
    assert order["status"] == "settled" and order["received"] == "980.00"
    assert mp1  # partner exists


def test_tax_summary_separate_from_leakage(client, exec_h):
    web = partner_id(client, exec_h, "WEB")
    approve_mapping(client, exec_h, web, "settlement", {"order_ref": "Ref", "gross_amount": "Gross", "net_amount": "Net", "tcs_amount": "TCS", "tds_amount": "TDS"})
    upload(client, exec_h, web, "settlement", "s.csv", csv_bytes(["Ref", "Gross", "Net", "TCS", "TDS"], [["A", "1000", "950", "10", "10"], ["B", "500", "480", "5", "5"]]))
    row = client.get("/api/tax-summary", headers=exec_h).json()[0]
    assert (row["tcs"], row["tds"], row["lines"]) == ("15.00", "15.00", 2)
