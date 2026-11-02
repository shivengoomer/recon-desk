"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow, PageHeader, Stat } from "@/components/ui/bits";
import { EmptyState, ErrorBanner, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { rupees, rupeesCompact, num, STATUS_LABEL, CLAIM_TYPE_LABEL } from "@/lib/format";
import type { Dashboard, TaxRow } from "@/lib/types";
import { useFetch } from "@/lib/use-fetch";

const BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;
const BUCKET_FILL: Record<string, string> = { "0-30": "bg-mute-soft", "31-60": "bg-accent-yellow", "61-90": "bg-accent-orange", "90+": "bg-accent-red" };
const STATUS_ORDER = ["unpaid_past_due", "short_paid", "freight_overcharged", "over_paid", "pending", "settled"];
const STATUS_FILL: Record<string, string> = {
  unpaid_past_due: "bg-accent-red", short_paid: "bg-accent-red", freight_overcharged: "bg-accent-yellow",
  over_paid: "bg-accent-blue-info", pending: "bg-mute-soft", settled: "bg-accent-green",
};

export default function DashboardPage() {
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const dash = useFetch(() => api<Dashboard>("/api/dashboard"), []);
  const tax = useFetch(() => api<TaxRow[]>("/api/tax-summary"), []);

  async function runMatching() {
    setRunning(true);
    try {
      const r = await api<{ orders_processed: number; duration_ms: number }>("/api/match-runs", { json: {} });
      toast(`Matched ${num(r.orders_processed)} orders in ${(r.duration_ms / 1000).toFixed(1)}s`);
      dash.reload();
      tax.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Matching failed", "error");
    } finally {
      setRunning(false);
    }
  }

  const header = (
    <PageHeader title="Money at risk" subtitle="Short, late or overcharged amounts across partners, aged from the date they fell due."
      actions={<Button onClick={runMatching} loading={running}>Run matching</Button>} />
  );

  if (dash.loading && !dash.data) {
    return (
      <>
        {header}
        <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-72 w-full" />
        </div>
      </>
    );
  }
  if (dash.error || !dash.data) return <>{header}<ErrorBanner message={dash.error ?? "Could not load the dashboard"} onRetry={dash.reload} /></>;

  const d = dash.data;
  if (d.orders === 0) {
    return (
      <>
        {header}
        <EmptyState title="Nothing reconciled yet" hint="Upload your order, settlement, COD and freight files, then run matching."
          action={<Link href="/imports" className="inline-flex min-h-11 items-center rounded-sm bg-primary px-5 text-body-md font-medium text-on-primary">Upload files</Link>} />
      </>
    );
  }

  const maxPartner = Math.max(...d.by_partner.map((p) => Number(p.total)), 1);
  const totalStatus = Object.values(d.status_counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <>
      {header}
      <Card className="mb-4 !p-6 md:!p-8">
        <Eyebrow>Open and filed claims</Eyebrow>
        <p className="tabular mt-2 text-[44px] font-semibold leading-none tracking-tight text-ink md:text-display-xl">{rupeesCompact(d.money_at_risk)}</p>
        <p className="tabular mt-2 text-body-sm text-body-mid">{rupees(d.money_at_risk)} across {num(d.by_partner.reduce((a, p) => a + p.count, 0))} claims</p>
        {Object.keys(d.by_type).length > 0 && (
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-hairline pt-4">
            {Object.entries(d.by_type).map(([k, v]) => (
              <div key={k}><dt className="text-body-sm text-body-mid">{CLAIM_TYPE_LABEL[k] ?? k}</dt><dd className="tabular text-body-md font-medium text-ink">{rupees(v, { decimals: false })}</dd></div>
            ))}
          </dl>
        )}
      </Card>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Orders reconciled" value={num(d.orders)} />
        <Stat label="Auto-matched" value={d.auto_match_rate === null ? "—" : `${d.auto_match_rate}%`} hint="of orders past due" />
        <Link href="/review" className="rounded-md hover:bg-soft"><Stat label="Matches to review" value={num(d.pending_suggestions)} hint="suggested, not applied" /></Link>
        <Stat label="Unlinked partner rows" value={num(d.unlinked_lines)} hint="no order ID found" />
      </div>

      <section aria-labelledby="by-partner" className="mb-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="by-partner" className="text-display-xs">By partner and age</h2>
          <ul className="flex flex-wrap gap-4" aria-label="Age legend">
            {BUCKETS.map((b) => <li key={b} className="flex items-center gap-1.5 text-body-sm text-body-mid"><span aria-hidden className={`h-2.5 w-2.5 rounded-xs ${BUCKET_FILL[b]}`} />{b} days</li>)}
          </ul>
        </div>
        {d.by_partner.length === 0 ? (
          <EmptyState title="No open claims" hint="Everything that is due has been paid correctly." />
        ) : (
          <div className="overflow-hidden rounded-md border border-hairline">
            {d.by_partner.map((p) => (
              <Link key={p.partner_id} href={`/claims?partner_id=${p.partner_id}`}
                className="grid grid-cols-1 gap-2 border-b border-hairline px-4 py-4 last:border-b-0 hover:bg-soft md:grid-cols-[200px_1fr_140px] md:items-center md:gap-6">
                <div><p className="text-body-md font-medium text-ink">{p.partner}</p><p className="text-body-sm text-body-mid">{p.count} claims</p></div>
                <div className="flex h-3 w-full overflow-hidden rounded-xs bg-soft" role="img"
                  aria-label={BUCKETS.map((b) => `${b} days ${rupees(p.buckets[b], { decimals: false })}`).join(", ")}>
                  <div className="flex h-full" style={{ width: `${(Number(p.total) / maxPartner) * 100}%` }}>
                    {BUCKETS.map((b) => Number(p.buckets[b]) > 0 && <div key={b} className={BUCKET_FILL[b]} style={{ width: `${(Number(p.buckets[b]) / Number(p.total)) * 100}%` }} />)}
                  </div>
                </div>
                <p className="tabular text-body-md font-semibold text-ink md:text-right">{rupees(p.total, { decimals: false })}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="by-status" className="mb-10">
        <h2 id="by-status" className="mb-3 text-display-xs">Order status</h2>
        <div className="flex h-3 w-full overflow-hidden rounded-xs bg-soft" role="img" aria-label="Order status mix">
          {STATUS_ORDER.map((s) => d.status_counts[s] > 0 && <div key={s} className={STATUS_FILL[s]} style={{ width: `${(d.status_counts[s] / totalStatus) * 100}%` }} />)}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-3">
          {STATUS_ORDER.filter((s) => d.status_counts[s]).map((s) => (
            <li key={s}>
              <Link href={`/orders?status=${s}`} className="flex min-h-11 items-center justify-between gap-3 rounded-sm px-2 hover:bg-soft">
                <span className="flex items-center gap-2 text-body-sm text-body"><span aria-hidden className={`h-2.5 w-2.5 rounded-xs ${STATUS_FILL[s]}`} />{STATUS_LABEL[s]}</span>
                <span className="tabular text-body-sm font-medium text-ink">{num(d.status_counts[s])}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tax">
        <h2 id="tax" className="text-display-xs">TCS and TDS deducted</h2>
        <p className="mb-3 mt-1 text-body-sm text-body-mid">Statutory deductions by partner. These are not counted as leakage.</p>
        {tax.loading && !tax.data ? <Skeleton className="h-32 w-full" /> : tax.error ? <ErrorBanner message={tax.error} onRetry={tax.reload} /> :
          !tax.data?.length ? <EmptyState title="No settlements yet" hint="Upload a settlement file to see deductions." /> : (
            <div className="overflow-x-auto rounded-md border border-hairline">
              <table className="w-full min-w-[520px] text-body-sm">
                <thead><tr className="border-b border-hairline bg-soft text-left text-eyebrow-sm uppercase text-body-mid">
                  <th className="px-4 py-3 font-medium">Partner</th><th className="px-4 py-3 text-right font-medium">Fees</th>
                  <th className="px-4 py-3 text-right font-medium">TCS</th><th className="px-4 py-3 text-right font-medium">TDS</th></tr></thead>
                <tbody>{tax.data.map((t) => (
                  <tr key={t.partner_id} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-3 font-medium text-ink">{t.partner}</td>
                    <td className="tabular px-4 py-3 text-right">{rupees(t.fees)}</td>
                    <td className="tabular px-4 py-3 text-right">{rupees(t.tcs)}</td>
                    <td className="tabular px-4 py-3 text-right">{rupees(t.tds)}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
      </section>
    </>
  );
}
