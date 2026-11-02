Read BRIEF.md, CLAUDE.md, ASSUMPTIONS.md.
Design the schema and write Alembic migrations + SQLAlchemy models for:
- users (id, email, password_hash, role: analyst|finance_admin, created_at)
- orders (order_id, channel, customer_ref, order_date, gross_amount, payment_mode: prepaid/COD, status)
- order_items (order_id, sku, qty, unit_price)
- payments (id, source: gateway/COD_remittance, reference, order_ref_raw, amount, fee, settled_at, raw_row JSONB)
- returns (id, order_id, sku, qty, refund_amount, reason, received_at, status)
- refunds (id, payment_ref, amount, issued_at)
- matches (id, payment_id, order_id, method: exact/fuzzy/manual, confidence NUMERIC, score_breakdown JSONB, band: auto/review/unmatched, status: pending/confirmed/rejected, llm_status, decided_by, decided_at)
- discrepancies (id, order_id, type: underpaid/overpaid/missing_payment/missing_return_refund/duplicate_refund/fee_mismatch, expected_amount, actual_amount, status: open/resolved/ignored, note)
- audit_log (append-only: id, actor_id, action, entity, entity_id, before JSONB, after JSONB, at)
- import_batches (id, file_name, kind, row_count, rejected_count, uploaded_by, at)
Rules: NUMERIC(12,2) for money; unique payment_id among confirmed matches; CHECK amount >= 0; FKs everywhere; Postgres trigger blocking UPDATE/DELETE on audit_log. Adjust to BRIEF.md and log each deviation in ASSUMPTIONS.md.
Commit: feat: schema and migrations.
