"""Set-based SQL for matching. One statement per stage so 1 lakh orders reconcile in seconds.

Money comparison: received = settlement net + TCS + TDS (+ COD remitted). TCS/TDS are added back so
statutory deductions are never counted as leakage.
"""

LINK_SETTLEMENT = """
UPDATE settlement_lines s
SET order_id = o.id,
    match_method = (CASE WHEN upper(btrim(s.order_ref_raw)) = o.order_ref THEN 'exact' ELSE 'normalized' END)::match_method
FROM orders o
WHERE s.order_id IS NULL AND s.order_ref IS NOT NULL
  AND o.channel_id = s.partner_id AND o.order_ref = s.order_ref
"""

# COD / freight files come from couriers, so the channel is unknown: link on a globally unique reference.
_UNIQUE_REF = "(SELECT order_ref, min(id) AS id FROM orders GROUP BY order_ref HAVING count(*) = 1)"
_UNIQUE_AWB = ("(SELECT awb, min(id) AS id FROM orders WHERE awb IS NOT NULL GROUP BY awb HAVING count(*) = 1)")

LINK_COD = f"""
UPDATE cod_remittances c
SET order_id = u.id,
    match_method = (CASE WHEN upper(btrim(c.order_ref_raw)) = c.order_ref THEN 'exact' ELSE 'normalized' END)::match_method
FROM {_UNIQUE_REF} u
WHERE c.order_id IS NULL AND c.order_ref IS NOT NULL AND u.order_ref = c.order_ref
"""

LINK_FREIGHT_REF = f"""
UPDATE freight_charges f
SET order_id = u.id,
    match_method = (CASE WHEN upper(btrim(f.order_ref_raw)) = f.order_ref THEN 'exact' ELSE 'normalized' END)::match_method
FROM {_UNIQUE_REF} u
WHERE f.order_id IS NULL AND f.order_ref IS NOT NULL AND u.order_ref = f.order_ref
"""

LINK_FREIGHT_AWB = f"""
UPDATE freight_charges f
SET order_id = u.id, match_method = 'normalized'::match_method
FROM {_UNIQUE_AWB} u
WHERE f.order_id IS NULL AND f.awb IS NOT NULL AND u.awb = f.awb
"""

DELETE_CANCELLED = """
DELETE FROM order_reconciliation r USING orders o
WHERE r.order_id = o.id AND o.delivery_status = 'cancelled'
"""

RECONCILE = """
WITH sl AS (
  SELECT order_id, sum(net_amount + tcs_amount + tds_amount) AS recv, sum(tcs_amount) AS tcs,
         sum(tds_amount) AS tds, count(*) AS n
  FROM settlement_lines WHERE order_id IS NOT NULL GROUP BY order_id
), cr AS (
  SELECT order_id, sum(remitted_amount) AS recv, sum(cod_collected) AS coll, count(*) AS n, min(courier_id) AS courier_id
  FROM cod_remittances WHERE order_id IS NOT NULL GROUP BY order_id
), fr AS (
  SELECT order_id, sum(charged_amount) AS billed, min(courier_id) AS courier_id
  FROM freight_charges WHERE order_id IS NOT NULL GROUP BY order_id
), base AS (
  SELECT o.id, o.value, o.payment_mode, o.delivery_status,
         COALESCE(o.delivered_on, o.order_date) AS ref_date,
         COALESCE(o.courier_id, cr.courier_id, fr.courier_id) AS courier_id,
         cl.commission_pct, cl.fixed_fee, cl.shipping_fee, (cl.id IS NOT NULL) AS has_card,
         kl.base_rate, kl.cod_fee_pct, kl.cod_fee_min, (kl.id IS NOT NULL) AS has_freight_card,
         CASE WHEN o.payment_mode = 'cod' THEN COALESCE(cu.settlement_due_days, ch.settlement_due_days)
              ELSE ch.settlement_due_days END AS due_days,
         COALESCE(sl.recv, 0) AS sl_recv, COALESCE(cr.recv, 0) AS cr_recv, COALESCE(cr.coll, 0) AS cod_collected,
         COALESCE(sl.tcs, 0) AS tcs, COALESCE(sl.tds, 0) AS tds,
         (COALESCE(sl.n, 0) + COALESCE(cr.n, 0)) > 0 AS has_money,
         fr.billed
  FROM orders o
  JOIN partners ch ON ch.id = o.channel_id
  LEFT JOIN sl ON sl.order_id = o.id
  LEFT JOIN cr ON cr.order_id = o.id
  LEFT JOIN fr ON fr.order_id = o.id
  LEFT JOIN partners cu ON cu.id = COALESCE(o.courier_id, cr.courier_id, fr.courier_id)
  LEFT JOIN LATERAL (
    SELECT rl.* FROM rate_cards rc JOIN rate_card_lines rl ON rl.rate_card_id = rc.id
    WHERE rc.partner_id = o.channel_id AND o.order_date >= rc.effective_from
      AND (rc.effective_to IS NULL OR o.order_date <= rc.effective_to)
      AND (rl.payment_mode IS NULL OR rl.payment_mode = o.payment_mode) AND rl.weight_min_g IS NULL
    ORDER BY (rl.payment_mode IS NULL), rc.effective_from DESC, rl.id LIMIT 1
  ) cl ON true
  LEFT JOIN LATERAL (
    SELECT rl.* FROM rate_cards rc JOIN rate_card_lines rl ON rl.rate_card_id = rc.id
    WHERE rc.partner_id = COALESCE(o.courier_id, cr.courier_id, fr.courier_id) AND o.order_date >= rc.effective_from
      AND (rc.effective_to IS NULL OR o.order_date <= rc.effective_to) AND rl.weight_min_g IS NOT NULL
      AND COALESCE(o.weight_g, 0) BETWEEN rl.weight_min_g AND COALESCE(rl.weight_max_g, 2147483647)
    ORDER BY rc.effective_from DESC, rl.id LIMIT 1
  ) kl ON true
  WHERE o.delivery_status <> 'cancelled' AND (:order_ids IS NULL OR o.id = ANY(:order_ids))
), calc AS (
  SELECT b.*,
    -- expected net to receive; without a rate card fall back to the full order value (flagged, never judged)
    round(CASE
      WHEN NOT b.has_card THEN b.value
      WHEN b.delivery_status = 'returned_to_warehouse' THEN -COALESCE(b.shipping_fee, 0)
      ELSE b.value - (COALESCE(b.value * b.commission_pct / 100, 0) + COALESCE(b.fixed_fee, 0) + COALESCE(b.shipping_fee, 0))
    END, 2) AS expected,
    CASE WHEN b.has_freight_card THEN round(COALESCE(b.base_rate, 0) + CASE WHEN b.payment_mode = 'cod'
         THEN GREATEST(COALESCE(b.cod_fee_min, 0), b.value * COALESCE(b.cod_fee_pct, 0) / 100) ELSE 0 END, 2) END AS exp_freight,
    (b.ref_date + COALESCE(b.due_days, 7)) AS due_date
  FROM base b
), judged AS (
  SELECT c.*, (c.sl_recv + c.cr_recv) AS received,
         (c.sl_recv + c.cr_recv - c.expected) AS diff,
         CASE WHEN c.billed IS NOT NULL AND c.exp_freight IS NOT NULL THEN c.billed - c.exp_freight END AS fdiff
  FROM calc c
), final AS (
  SELECT j.*,
    CASE
      WHEN NOT j.has_money AND j.delivery_status = 'in_transit' THEN 'pending'
      WHEN NOT j.has_money AND j.expected <= :tol THEN 'settled'
      WHEN NOT j.has_money AND :as_of > j.due_date THEN 'unpaid_past_due'
      WHEN NOT j.has_money THEN 'pending'
      WHEN NOT j.has_card THEN 'pending'
      WHEN j.diff < -:tol THEN 'short_paid'
      WHEN j.fdiff > :tol THEN 'freight_overcharged'
      WHEN j.diff > :tol THEN 'over_paid'
      ELSE 'settled'
    END AS status
  FROM judged j
)
INSERT INTO order_reconciliation
  (order_id, run_id, status, expected_amount, received_amount, difference, expected_freight, billed_freight,
   freight_difference, tcs_total, tds_total, breakdown, computed_at)
SELECT f.id, :run_id, f.status::recon_status, f.expected, f.received, f.diff, f.exp_freight, f.billed, f.fdiff,
       f.tcs, f.tds,
       jsonb_build_object(
         'order_value', f.value, 'commission_pct', f.commission_pct, 'fixed_fee', f.fixed_fee,
         'shipping_fee', f.shipping_fee, 'settlement_received', f.sl_recv, 'cod_remitted', f.cr_recv,
         'cod_collected', f.cod_collected, 'tcs', f.tcs, 'tds', f.tds, 'due_date', f.due_date,
         'rate_card_missing', NOT f.has_card, 'freight_rate_missing', (f.billed IS NOT NULL AND NOT f.has_freight_card),
         'tolerance', :tol),
       now()
FROM final f
ON CONFLICT (order_id) DO UPDATE SET
  run_id = EXCLUDED.run_id, status = EXCLUDED.status, expected_amount = EXCLUDED.expected_amount,
  received_amount = EXCLUDED.received_amount, difference = EXCLUDED.difference,
  expected_freight = EXCLUDED.expected_freight, billed_freight = EXCLUDED.billed_freight,
  freight_difference = EXCLUDED.freight_difference, tcs_total = EXCLUDED.tcs_total, tds_total = EXCLUDED.tds_total,
  breakdown = EXCLUDED.breakdown, computed_at = EXCLUDED.computed_at
"""

# Claim candidates derived from the verdict. Reused for delete-stale and upsert so they can never disagree.
CLAIM_CANDIDATES = """
SELECT o.id AS order_id,
       CASE WHEN r.status = 'short_paid' THEN
              CASE WHEN o.payment_mode = 'cod' THEN COALESCE(o.courier_id, (SELECT courier_id FROM cod_remittances WHERE order_id = o.id LIMIT 1), (SELECT courier_id FROM freight_charges WHERE order_id = o.id LIMIT 1), o.channel_id) ELSE o.channel_id END
            WHEN r.status = 'unpaid_past_due' THEN
              CASE WHEN o.payment_mode = 'cod' THEN COALESCE(o.courier_id, (SELECT courier_id FROM cod_remittances WHERE order_id = o.id LIMIT 1), (SELECT courier_id FROM freight_charges WHERE order_id = o.id LIMIT 1), o.channel_id) ELSE o.channel_id END
       END AS partner_id,
       CASE WHEN r.status = 'short_paid' THEN 'short_paid'
            WHEN r.status = 'unpaid_past_due' AND o.payment_mode = 'cod' THEN 'unremitted_cod'
            WHEN r.status = 'unpaid_past_due' THEN 'short_paid' END AS claim_type,
       CASE WHEN r.status = 'short_paid' THEN -r.difference
            WHEN r.status = 'unpaid_past_due' THEN r.expected_amount END AS amount,
       (r.breakdown->>'due_date')::date AS due_since, r.breakdown, r.freight_difference, o.courier_id
FROM order_reconciliation r JOIN orders o ON o.id = r.order_id
WHERE r.status IN ('short_paid', 'unpaid_past_due')
  -- an unpaid order with a pending suggested match may already be paid: hold the claim until a person decides
  AND NOT (r.status = 'unpaid_past_due' AND EXISTS (
        SELECT 1 FROM match_suggestions ms WHERE ms.candidate_order_id = o.id AND ms.status = 'pending'))
UNION ALL
SELECT o.id, COALESCE(o.courier_id, (SELECT courier_id FROM freight_charges WHERE order_id = o.id LIMIT 1), (SELECT courier_id FROM cod_remittances WHERE order_id = o.id LIMIT 1)),
       'freight_overcharge', r.freight_difference, COALESCE(o.delivered_on, o.order_date), r.breakdown,
       r.freight_difference, o.courier_id
FROM order_reconciliation r JOIN orders o ON o.id = r.order_id
WHERE r.freight_difference > :tol
"""

DELETE_STALE_CLAIMS = f"""
DELETE FROM claims c
WHERE c.status = 'open' AND c.note IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM ({CLAIM_CANDIDATES}) k
    WHERE k.order_id = c.order_id AND k.claim_type::claim_type = c.claim_type AND k.amount > :tol AND k.partner_id IS NOT NULL)
"""

UPSERT_CLAIMS = f"""
INSERT INTO claims (partner_id, order_id, claim_type, amount, status, evidence, due_since, created_by)
SELECT k.partner_id, k.order_id, k.claim_type::claim_type, k.amount, 'open',
  k.breakdown || jsonb_build_object(
    'settlement_lines', COALESCE((SELECT jsonb_agg(to_jsonb(s) - 'row_hash') FROM settlement_lines s WHERE s.order_id = k.order_id), '[]'::jsonb),
    'cod_remittances', COALESCE((SELECT jsonb_agg(to_jsonb(c) - 'row_hash') FROM cod_remittances c WHERE c.order_id = k.order_id), '[]'::jsonb),
    'freight_charges', COALESCE((SELECT jsonb_agg(to_jsonb(f) - 'row_hash') FROM freight_charges f WHERE f.order_id = k.order_id), '[]'::jsonb)),
  k.due_since, :user_id
FROM ({CLAIM_CANDIDATES}) k
WHERE k.amount > :tol AND k.partner_id IS NOT NULL
ON CONFLICT (order_id, claim_type) DO UPDATE
  SET amount = EXCLUDED.amount, evidence = EXCLUDED.evidence, due_since = EXCLUDED.due_since, updated_at = now()
  WHERE claims.status = 'open'
"""

SUGGEST_SETTLEMENT = """
INSERT INTO match_suggestions (line_table, line_id, candidate_order_id, score, reason)
SELECT 'settlement_lines', s.id, c.id, c.score, c.reason
FROM (SELECT * FROM settlement_lines WHERE order_id IS NULL AND NOT EXISTS (
        SELECT 1 FROM match_suggestions ms WHERE ms.line_table = 'settlement_lines' AND ms.line_id = settlement_lines.id)
      ORDER BY id LIMIT :max_lines) s
CROSS JOIN LATERAL (
  SELECT o.id,
    round((:w_amount * (CASE WHEN o.value = s.gross_amount THEN 1.0 ELSE 0.8 END)
         + :w_date * 1.0
         + :w_ref * (CASE WHEN s.order_ref IS NOT NULL AND length(s.order_ref) >= 4
                          AND o.order_ref LIKE '%' || right(s.order_ref, 4) || '%' THEN 1.0 ELSE 0 END))::numeric, 3) AS score,
    format('Amount %s vs order value %s; %s days after delivery', s.gross_amount, o.value,
           (s.settled_on - COALESCE(o.delivered_on, o.order_date))) AS reason
  FROM orders o
  WHERE o.channel_id = s.partner_id AND abs(o.value - s.gross_amount) <= :tol
    AND s.settled_on IS NOT NULL
    AND s.settled_on - COALESCE(o.delivered_on, o.order_date) BETWEEN 0 AND :window
    AND NOT EXISTS (SELECT 1 FROM settlement_lines x WHERE x.order_id = o.id)
  ORDER BY 2 DESC, o.id LIMIT :per_line
) c
WHERE c.score >= :min_score
ON CONFLICT DO NOTHING
"""

SUGGEST_COD = """
INSERT INTO match_suggestions (line_table, line_id, candidate_order_id, score, reason)
SELECT 'cod_remittances', s.id, c.id, c.score, c.reason
FROM (SELECT * FROM cod_remittances WHERE order_id IS NULL AND NOT EXISTS (
        SELECT 1 FROM match_suggestions ms WHERE ms.line_table = 'cod_remittances' AND ms.line_id = cod_remittances.id)
      ORDER BY id LIMIT :max_lines) s
CROSS JOIN LATERAL (
  SELECT o.id,
    round((:w_amount * (CASE WHEN o.value = s.cod_collected THEN 1.0 ELSE 0.8 END)
         + :w_date * 1.0
         + :w_ref * (CASE WHEN s.order_ref IS NOT NULL AND length(s.order_ref) >= 4
                          AND o.order_ref LIKE '%' || right(s.order_ref, 4) || '%' THEN 1.0 ELSE 0 END))::numeric, 3) AS score,
    format('COD collected %s vs order value %s; %s days after delivery', s.cod_collected, o.value,
           (s.remitted_on - COALESCE(o.delivered_on, o.order_date))) AS reason
  FROM orders o
  WHERE o.payment_mode = 'cod' AND abs(o.value - s.cod_collected) <= :tol
    AND s.remitted_on IS NOT NULL
    AND s.remitted_on - COALESCE(o.delivered_on, o.order_date) BETWEEN 0 AND :window
    AND NOT EXISTS (SELECT 1 FROM cod_remittances x WHERE x.order_id = o.id)
  ORDER BY 2 DESC, o.id LIMIT :per_line
) c
WHERE c.score >= :min_score
ON CONFLICT DO NOTHING
"""
