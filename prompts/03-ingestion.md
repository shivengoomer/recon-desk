Build POST /api/imports/{kind} (orders|payments|returns) accepting CSV.
- Validate headers, types, negative amounts, duplicate rows (idempotent via row hash), max 5 MB.
- Rejected rows stored with reason and downloadable as CSV; valid rows imported in one transaction.
- Return summary: imported, skipped duplicates, rejected with reasons.
- Log to import_batches and audit_log. Analyst and finance_admin may upload.
Tests: bad headers, idempotent re-upload, negative amount, oversize file.
Commit: feat: csv ingestion with validation.
