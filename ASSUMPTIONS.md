# Assumptions (copy into the TDD)
Format: N. [area/feature] assumption, and why.

1. [scope] Only the information in the problem statement was used; everything else below is an assumption.
2. [backend/pyproject.toml] Python 3.12+ with unpinned minimum dependency versions, because no lockfile exists until dependencies are first installed.
3. [docker-compose.yml] Only Postgres runs in Docker; backend and frontend run on the host, to keep local dev simple. Its credentials are local-only throwaway values.
4. [frontend/package.json] Next.js 15, Tailwind CSS 3.4 and npm, as stable defaults.
5. [backend/app/config.py] Config is read from env vars (names in `.env.example`); DB driver is psycopg 3 (`postgresql+psycopg://`).
6. [BRIEF.md] The brief has not been pasted yet; no domain features beyond the kit prompts are assumed.
7. [submission/] Kept in the working tree but git-ignored, because the starter kit says it is not part of the repo; it is zipped separately at the end.
8. [frontend/ typography] Inter (variable) and DM Mono replace the proprietary WF Visual Sans, as DESIGN.md recommends; no licence is available for the original.
9. [frontend/ landing page] The home page has no sign-in button until auth exists, to honour "no dead buttons".
10. [frontend/ tooling] ESLint 8 with `eslint-config-next` 15 (legacy config) and `types: ["node"]` in tsconfig, so stray `@types` in parent folders don't break builds.
11. [scope / prompts] The brief differs from the starter-kit prompts (which assumed gateway payments, refunds and a review queue). The brief wins; prompts 01-05 and 07 are adapted to: orders, settlements, COD remittances, freight invoices, rate cards, claims, money at risk.
12. [roles] `finance_executive`: upload, approve mappings, view everything, create and update claims. `cofounder`: all of that, plus edit rate cards and settings, and view the audit log. The brief names only these two roles.
13. [orders / DPDP] Customer names, phones and addresses are never imported or stored; the column mapping has no target fields for them. Masking is therefore by omission.
14. [orders] Order identity is (channel, order_ref), where order_ref is stored normalised (trimmed, uppercased). Reports from partners that carry a different formatting of the same ID are matched on the normalised value.
15. [matching] Statuses implemented in core: settled, short_paid, unpaid_past_due, freight_overcharged, plus pending (not yet due) and over_paid. `return_not_received` needs warehouse scans, which are optional depth and deferred.
16. [matching] Settlement and COD "expected" is computed from the rate card (commission %, fixed fee, shipping fee) on order value; the gap tolerance is ₹10 (configurable in `app_settings`). TCS and TDS are subtracted from the expected net, not treated as a gap.
17. [matching] "Past due" uses `settlement_due_days` per partner (default 7 for marketplaces, 7 for COD remittance after delivery); the brief gives no numbers.
18. [rate cards] A rate card belongs to one partner with an effective date range; lines hold commission %, fixed fee, flat shipping fee for channels, and weight-slab base rate plus COD fee for couriers. Slab edges and zones are simplified (no zone dimension).
19. [AI] Suggestions (column mappings, missing-order-ID matches) are heuristics-first with an optional LLM behind `LLM_ENABLED`; mappings are previewed on 20 rows, approved before saving, and stored as versions that can be rolled back. Suggested matches sit in a pending state and never create claims or close an order.
20. [claims] A claim is unique per (order, type); evidence is a JSON snapshot of the expected-vs-actual breakdown plus source rows, exportable as CSV.
21. [files] CSV and Excel (.xlsx) are accepted; no .xls. Max upload 25 MB (about 1 lakh rows). Duplicate rows are skipped via row hash.
22. [frontend/ landing page] A public marketing page lives at `/`; its preview figures are illustrative (the three example orders come from the brief's sample data). There is no demo-request form, so the only call to action is Sign in.
23. [frontend/ matching] "Run matching" is a global action in the top bar (both roles); pages refresh themselves after a run.

## Known limits
- Benchmark (synthetic, 1 lakh orders + ~1.2 lakh partner lines, local Postgres 16): order import 4.4s, matching 8.9s, full seed-import-match 31s. Reproduce with `python -m scripts.seed --orders 100000 --out <dir> --import --reset`.
- At that scale `scripts.evaluate` shows 100% / 100% (precision / recall) for freight claims, 100% / 97.6% for unremitted COD and 98.2% / 95.8% for short-paid. The gap comes from settlement lines with no order ID: equal-amount orders become suggestion candidates, so their claims are held until a person reviews them, and the true order can fall outside the top 3 candidates. On the 2,000-order seed it is 100% / 100%.
- Match suggestions use heuristics (amount, date versus the partner's usual lag, reference tail); there is no LLM call yet, even though `LLM_ENABLED` exists.
- `return_not_received` needs warehouse scans (optional depth) and is not built.
- Login rate limiting is in-process memory, so it assumes one backend instance.
