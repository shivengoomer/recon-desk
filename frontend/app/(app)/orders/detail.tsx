"use client";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, Money, StatusBadge } from "@/components/ui/bits";
import { ErrorBanner, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { rupees, shortDate } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";

interface Detail {
  order: { order_ref: string; channel: string; courier: string | null; order_date: string; delivered_on: string | null; value: string; payment_mode: string; delivery_status: string; weight_g: number | null; awb: string | null };
  reconciliation: null | { status: string; expected: string; received: string; difference: string; expected_freight: string | null; billed_freight: string | null; freight_difference: string | null; tcs: string; tds: string; breakdown: Record<string, unknown> };
  settlement_lines: Record<string, string | null>[]; cod_remittances: Record<string, string | null>[]; freight_charges: Record<string, string | null>[];
}

const Row = ({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? "border-t border-hairline font-semibold text-ink" : ""}`}>
    <dt className="text-body-sm text-body-mid">{label}</dt><dd className="tabular text-body-sm text-ink">{children}</dd>
  </div>
);

export function OrderDetail({ id }: { id: number }) {
  const { data, error, loading, reload } = useFetch(() => api<Detail>(`/api/orders/${id}`), [id]);
  if (loading && !data) return <ListSkeleton rows={6} />;
  if (error || !data) return <ErrorBanner message={error ?? "Could not load order"} onRetry={reload} />;
  const { order: o, reconciliation: r } = data;
  const b = (r?.breakdown ?? {}) as Record<string, string | number | boolean | null>;
  const commission = b.commission_pct ? (Number(o.value) * Number(b.commission_pct)) / 100 : 0;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={r?.status ?? null} />
        <Badge tone="neutral">{o.payment_mode.toUpperCase()}</Badge>
        <Badge tone="neutral">{o.delivery_status.replace(/_/g, " ")}</Badge>
      </div>
      <dl className="rounded-md border border-hairline px-4 py-2">
        <Row label="Channel">{o.channel}</Row>
        <Row label="Order date">{shortDate(o.order_date)}</Row>
        <Row label="Delivered">{shortDate(o.delivered_on)}</Row>
        <Row label="Courier / AWB">{o.courier ?? "—"} {o.awb ? `· ${o.awb}` : ""}</Row>
      </dl>

      {r && (
        <section>
          <Eyebrow>Expected from the rate card</Eyebrow>
          <dl className="mt-2 rounded-md border border-hairline px-4 py-2">
            <Row label="Order value">{rupees(o.value)}</Row>
            {commission > 0 && <Row label={`Commission ${b.commission_pct}%`}>− {rupees(commission)}</Row>}
            {Number(b.fixed_fee) > 0 && <Row label="Fixed fee">− {rupees(b.fixed_fee as string)}</Row>}
            {Number(b.shipping_fee) > 0 && <Row label="Shipping fee">− {rupees(b.shipping_fee as string)}</Row>}
            <Row label="Expected" strong>{rupees(r.expected)}</Row>
          </dl>
          {b.rate_card_missing === true && <p className="mt-2 text-body-sm text-on-soft-yellow">No rate card covers this channel and date, so this order is not judged. Add one in Rate cards.</p>}

          <div className="mt-5"><Eyebrow>Received</Eyebrow></div>
          <dl className="mt-2 rounded-md border border-hairline px-4 py-2">
            <Row label="Settlement (net)">{rupees(Number(b.settlement_received) - Number(r.tcs) - Number(r.tds))}</Row>
            <Row label="TCS deducted">{rupees(r.tcs)}</Row>
            <Row label="TDS deducted">{rupees(r.tds)}</Row>
            <Row label="COD remitted">{rupees(b.cod_remitted as string)}</Row>
            <Row label="Received (TCS and TDS added back)" strong>{rupees(r.received)}</Row>
            <Row label="Difference" strong><Money value={r.difference} diff /></Row>
          </dl>
          <p className="mt-2 text-body-sm text-body-mid">TCS and TDS are statutory deductions and are not treated as a shortfall. Due {shortDate(b.due_date as string)}.</p>

          {r.billed_freight && (
            <>
              <div className="mt-5"><Eyebrow>Freight</Eyebrow></div>
              <dl className="mt-2 rounded-md border border-hairline px-4 py-2">
                <Row label="Expected">{rupees(r.expected_freight)}</Row>
                <Row label="Billed">{rupees(r.billed_freight)}</Row>
                <Row label="Difference" strong><Money value={r.freight_difference} diff /></Row>
              </dl>
              {b.freight_rate_missing === true && <p className="mt-2 text-body-sm text-on-soft-yellow">No courier rate card covers this weight, so freight is not judged.</p>}
            </>
          )}
        </section>
      )}

      {([["Settlement rows", data.settlement_lines], ["COD remittance rows", data.cod_remittances], ["Freight rows", data.freight_charges]] as const).map(([title, rows]) =>
        rows.length > 0 && (
          <section key={title}>
            <Eyebrow>{title}</Eyebrow>
            <div className="mt-2 overflow-x-auto rounded-md border border-hairline">
              <table className="w-full text-body-sm">
                <tbody>{rows.map((row, i) => (
                  <tr key={i} className="border-b border-hairline last:border-b-0">
                    <td className="px-3 py-2 align-top"><dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      {Object.entries(row).filter(([k, v]) => v !== null && !["id", "batch_id", "order_id", "order_ref", "partner_id", "courier_id"].includes(k)).map(([k, v]) => (
                        <div key={k} className="contents"><dt className="text-body-mid">{k.replace(/_/g, " ")}</dt><dd className="tabular break-all text-ink">{v}</dd></div>))}
                    </dl></td>
                  </tr>))}</tbody>
              </table>
            </div>
          </section>))}
    </div>
  );
}
