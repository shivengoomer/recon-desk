Build, each with loading/empty/error states and mobile layout:
1. Dashboard: orders, matched %, rupees at risk, open discrepancies, funnel (auto/review/unmatched), needs-attention list.
2. Import: drag-and-drop CSV per kind, preview, result summary, rejected rows download, "Run matching" with progress.
3. Review queue (hero): card per low-confidence match with payment, candidate orders, score breakdown, LLM suggestion + reason. Confirm / Reject / Pick another order; desktop keyboard shortcuts; undo toast.
4. Discrepancies: filterable table, detail drawer, resolve/ignore with required note (finance_admin only).
5. Order detail: timeline order -> payment -> return -> refund with discrepancy flagged.
6. Audit log (finance_admin only).
7. Report export.
No dead buttons. Commit per screen.
