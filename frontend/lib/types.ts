export type Role = "finance_executive" | "cofounder";
export interface User { id: number; email: string; name: string; role: Role }
export interface Partner { id: number; code: string; name: string; kind: "channel" | "courier"; settlement_due_days: number }
export type ReconStatus = "pending" | "settled" | "short_paid" | "over_paid" | "unpaid_past_due" | "freight_overcharged" | "return_not_received";
export type FileKind = "orders" | "settlement" | "cod" | "freight";
export interface OrderRow {
  id: number; order_ref: string; channel: string; channel_id: number; order_date: string; payment_mode: string;
  delivery_status: string; value: string; status: ReconStatus | null; expected: string | null; received: string | null;
  difference: string | null; freight_difference: string | null;
}
export interface OrderPage { total: number; page: number; page_size: number; items: OrderRow[]; difference_total: string }
export interface ClaimRow {
  id: number; partner_id: number; partner: string; order_id: number; order_ref: string; claim_type: string; amount: string;
  status: "open" | "filed" | "recovered" | "rejected"; due_since: string | null; age_days: number | null; note: string | null;
}
export interface ClaimPage { total: number; page: number; page_size: number; amount_total: string; items: ClaimRow[] }
export interface Dashboard {
  orders: number; status_counts: Record<string, number>; auto_match_rate: number | null; money_at_risk: string;
  by_partner: { partner_id: number; partner: string; total: string; count: number; buckets: Record<string, string> }[];
  by_type: Record<string, string>; pending_suggestions: number; unlinked_lines: number;
  claims_pipeline: Record<"open" | "filed" | "recovered" | "rejected", { count: number; amount: string }>;
  claims_older_than_60: { count: number; amount: string };
  scorecard: { partner_id: number; partner: string; kind: "channel" | "courier"; orders: number; issues: number; settled_pct: number | null; at_risk: string }[];
  freshness: Record<FileKind, { last_import: string; days_ago: number; rows: number } | null>;
}
export interface TaxRow { partner_id: number; partner: string; gross: string; fees: string; tcs: string; tds: string; lines: number }
export interface Suggestion {
  id: number; line_table: string; line_id: number; line_amount: string | null; line_date: string | null; line_ref: string | null;
  candidate_order_id: number; candidate_order_ref: string; candidate_value: string; score: string; reason: string; status: string;
}
export interface FieldDef { name: string; label: string; required: boolean }
export interface Mapping {
  id: number; partner_id: number; file_kind: FileKind; version: number; mapping: Record<string, string>;
  status: "draft" | "approved" | "superseded"; ai_suggested: boolean; created_at: string;
}
export interface Inspect {
  headers: string[]; suggestion: Record<string, { column: string; confidence: number }>; active_mapping_id: number | null;
  active_matches_file: boolean; preview: { rows: { row: number; ok: boolean; values: Record<string, unknown>; error: string | null }[]; ok_count: number; error_count: number } | null;
  preview_error: string | null;
}
export interface Batch {
  id: number; partner_id: number; file_kind: string; file_name: string; row_count: number; accepted_count: number;
  duplicate_count: number; rejected_count: number; created_at: string; updated_count: number;
}
export interface RateLine {
  payment_mode: string | null; commission_pct: string | null; fixed_fee: string | null; shipping_fee: string | null;
  weight_min_g: number | null; weight_max_g: number | null; base_rate: string | null; cod_fee_pct: string | null; cod_fee_min: string | null;
}
export interface RateCard { id: number; partner_id: number; name: string; effective_from: string; effective_to: string | null; lines: RateLine[] }
