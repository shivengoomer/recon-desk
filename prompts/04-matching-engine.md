Build `backend/app/matching/` as a pure, well-tested module, deterministic first.
Stage 1 exact: normalize references (strip non-alphanumerics, uppercase), match by reference + amount within +/-1 rupee. Confidence 1.0, band=auto.
Stage 2 rules: for unmatched payments score candidates on amount (net of fee), date window, customer_ref, fuzzy reference similarity (rapidfuzz). Weighted 0-1. >=0.90 auto, 0.60-0.90 review, <0.60 unmatched. Store the score breakdown JSON so a reviewer sees WHY.
Stage 3 (env flag, off by default): for review-band rows only, ask Gemini to rank top 3 candidates with a short reason. The LLM can NEVER auto-confirm; it only suggests. On timeout/error/invalid JSON fall back to rules and record llm_status.
Discrepancy detection: underpaid/overpaid, missing_payment, duplicate_refund, refund without return, return without refund, fee_mismatch.
A payment matches one order; an order may have split payments summing to expected amount. All thresholds in one config file.
Tests: exact, typo reference, split payment, duplicate refund, rounding tolerance, two orders with same amount (must NOT auto-match), LLM failure fallback. Add a script printing precision/recall against ground_truth.json.
Commit: feat: matching engine with confidence bands.
