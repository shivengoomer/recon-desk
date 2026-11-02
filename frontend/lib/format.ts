const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function rupees(v: string | number | null | undefined, opts: { decimals?: boolean } = {}): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const body = (opts.decimals === false ? inr0 : inr).format(Math.abs(n));
  return `${n < 0 ? "−" : ""}₹${body}`;
}

/** Compact Indian units for big headline numbers: ₹1.2 Cr, ₹64.8 L. */
export function rupeesCompact(v: string | number): string {
  const n = Number(v);
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`;
  return `${sign}₹${inr0.format(a)}`;
}

export const num = (n: number) => inr0.format(n);

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", settled: "Settled", short_paid: "Short-paid", over_paid: "Over-paid",
  unpaid_past_due: "Unpaid past due", freight_overcharged: "Freight overcharged", return_not_received: "Return not received",
};
export const CLAIM_TYPE_LABEL: Record<string, string> = {
  short_paid: "Short-paid", unremitted_cod: "Unremitted COD", freight_overcharge: "Freight overcharge", return_not_received: "Return not received",
};
export const KIND_LABEL: Record<string, string> = { orders: "Orders", settlement: "Settlement", cod: "COD remittance", freight: "Freight invoice" };
