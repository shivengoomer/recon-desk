Add JWT auth (bcrypt, note token storage choice in ASSUMPTIONS.md).
analyst: upload, view, confirm/reject review matches, add notes.
finance_admin: all of that + resolve/ignore discrepancies, export reports, view audit log, manage thresholds.
Endpoints: login, me, matches (list/filter/paginate), confirm/reject/reassign, discrepancies (list/filter/resolve), dashboard summary, audit log, CSV export.
Every mutation writes audit_log before/after. Rate-limit login; CORS limited to FRONTEND_ORIGIN.
Tests: analyst gets 403 on admin routes, unauthenticated gets 401, validation errors return clean JSON.
Commit: feat: auth, roles and api.
