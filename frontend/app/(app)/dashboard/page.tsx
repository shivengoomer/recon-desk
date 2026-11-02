"use client";
import { ArrowRight, FileWarning, Truck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Eyebrow, Money, PageHeader, StatusBadge } from "@/components/ui/bits";
import { EmptyState, ErrorBanner, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { CLAIM_TYPE_LABEL, num, rupees, rupeesCompact, STATUS_LABEL } from "@/lib/format";
import { useMatch } from "@/lib/match";
import type { ClaimPage, Dashboard, TaxRow } from "@/lib/types";
import { useFetch } from "@/lib/use-fetch";
import { BUCKET_COLOR, BUCKETS, PartnerAgeChart, Ring, STATUS_COLOR, STATUS_ORDER, StatusDonut } from "./charts";

const TYPE_ICON: Record<string, LucideIcon> = { short_paid: Wallet, unremitted_cod: FileWarning, freight_overcharge: Truck };

const Panel = ({ title, hint, action, children, className = "" }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-md border border-hairline bg-canvas p-5 md:p-6 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h2 className="font-display text-display-xs">{title}</h2>{hint && <p className="mt-0.5 text-body-sm text-body-mid">{hint}</p>}</div>{action}
    </div>
    {children}
  </section>
);

export default function DashboardPage() {
  const { version } = useMatch();
  const dash = useFetch(() => api<Dashboard>("/api/dashboard"), [version]);
  const tax = useFetch(() => api<TaxRow[]>("/api/tax-summary"), [version]);
  const top = useFetch(() => api<ClaimPage>("/api/claims?status=open&page_size=5"), [version]);
  const header = <PageHeader title="Money at risk" subtitle="Short, late or overcharged amounts across partners, aged from the date they fell due." />;

  if (dash.loading && !dash.data) {
    return (
      <>{header}
        <div role="status" aria-label="Loading dashboard" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-56 lg:col-span-8" /><Skeleton className="h-56 lg:col-span-4" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 lg:col-span-4" />)}
          <Skeleton className="h-80 lg:col-span-7" /><Skeleton className="h-80 lg:col-span-5" />
        </div></>
    );
  }
  if (dash.error || !dash.data) return <>{header}<ErrorBanner message={dash.error ?? "Could not load the dashboard"} onRetry={dash.reload} /></>;
  const d = dash.data;
  if (d.orders === 0) {
    return (<>{header}<EmptyState title="Nothing reconciled yet" hint="Upload your order, settlement, COD and freight files, then run matching."
      action={<Link href="/imports" className={buttonClass("primary")}>Upload files</Link>} /></>);
  }

  const risk = Number(d.money_at_risk);
  const claimCount = d.by_partner.reduce((a, p) => a + p.count, 0);
  const ageTotals = BUCKETS.map((b) => ({ b, v: d.by_partner.reduce((a, p) => a + Number(p.buckets[b]), 0) }));
  const typeTotal = Object.values(d.by_type).reduce((a, v) => a + Number(v), 0) || 1;

  return (
    <>
      {header}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card dark featured className="flex flex-col !p-6 md:!p-8 lg:col-span-8">
          <p className="text-eyebrow-sm uppercase text-on-primary/60">Open and filed claims</p>
          <p className="tabular font-display mt-3 text-[56px] font-bold leading-none tracking-tight text-mint md:text-[84px]"><AnimatedNumber value={risk} format={(n) => (n >= 1e5 ? rupeesCompact(n) : rupees(Math.round(n), { decimals: false }))} /></p>
          <p className="tabular mt-3 text-body-sm text-on-primary/70">{rupees(d.money_at_risk)} across {num(claimCount)} claims</p>
          <div className="mt-auto pt-8"><p className="mb-3 text-body-sm text-on-primary/60">Age of claims</p></div>
          <div className="flex h-3 overflow-hidden rounded-xs bg-white/10" role="img" aria-label="Claims by age">
            {ageTotals.map(({ b, v }) => v > 0 && <div key={b} style={{ width: `${(v / risk) * 100}%`, background: BUCKET_COLOR[b] }} />)}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            {ageTotals.map(({ b, v }) => <li key={b} className="flex items-center gap-2 text-body-sm text-on-primary/70"><span aria-hidden className="h-2 w-2 rounded-xs" style={{ background: BUCKET_COLOR[b] }} />{b} days <span className="tabular text-on-primary">{rupeesCompact(v)}</span></li>)}
          </ul>
        </Card>

        <section aria-label="Auto-match and claims by type" className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-md border border-hairline bg-canvas p-4 lg:hidden">
          <div className="flex flex-col items-center text-center">
            <p className="font-display mb-2 text-display-xs">Auto-matched</p>
            {d.auto_match_rate === null ? <p className="text-body-sm text-body-mid">No orders due yet</p> : <Ring value={d.auto_match_rate} label="auto-matched" size={112} />}
            <Link href="/review" className="mt-2 text-body-sm font-semibold text-ink underline-offset-2 hover:underline">{num(d.pending_suggestions)} to review</Link>
          </div>
          <ul className="flex min-w-0 flex-col gap-2">
            {Object.entries(d.by_type).map(([k, v]) => {
              const Icon = TYPE_ICON[k] ?? Wallet;
              return (
                <li key={k}>
                  <Link href={`/claims?claim_type=${k}`} className="flex min-h-14 items-center gap-2.5 rounded-sm bg-soft px-2.5 py-2 transition-colors active:bg-mint/30">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-ink"><Icon size={16} aria-hidden /></span>
                    <span className="min-w-0"><span className="block text-[12px] font-semibold leading-tight text-body-mid">{CLAIM_TYPE_LABEL[k] ?? k}</span><span className="tabular font-display mt-0.5 block text-[19px] font-bold leading-tight text-ink">{rupees(v, { decimals: false })}</span></span>
                  </Link>
                </li>);
            })}
          </ul>
        </section>

        <Panel title="Auto-matched" hint="of orders past due" className="hidden flex-col items-center text-center lg:col-span-4 lg:flex">
          {d.auto_match_rate === null ? <p className="text-body-sm text-body-mid">No orders are past due yet.</p> : <Ring value={d.auto_match_rate} label="auto-matched" />}
          <div className="mt-4 grid w-full grid-cols-2 gap-3 border-t border-hairline pt-4 text-left">
            <Link href="/review" className="rounded-sm p-2 hover:bg-soft"><Eyebrow>To review</Eyebrow><p className="tabular font-display text-display-xs text-ink">{num(d.pending_suggestions)}</p></Link>
            <div className="p-2"><Eyebrow>Unlinked</Eyebrow><p className="tabular font-display text-display-xs text-ink">{num(d.unlinked_lines)}</p></div>
          </div>
        </Panel>

        {Object.entries(d.by_type).map(([k, v]) => {
          const Icon = TYPE_ICON[k] ?? Wallet;
          const share = Math.round((Number(v) / typeTotal) * 100);
          return (
            <Link key={k} href={`/claims?claim_type=${k}`} className="group hidden lg:col-span-4 lg:block">
              <div className="flex h-full flex-col justify-between rounded-md border border-hairline bg-canvas p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-ink group-hover:shadow-layer-2 md:p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-ink"><Icon size={20} aria-hidden /></span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-on-primary"><ArrowRight size={16} aria-hidden /></span>
                </div>
                <div className="mt-6">
                  <p className="text-body-sm font-semibold text-body-mid">{CLAIM_TYPE_LABEL[k] ?? k}</p>
                  <p className="tabular font-display mt-1 text-display-md">{rupees(v, { decimals: false })}</p>
                  <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft" aria-hidden><div className="h-full rounded-full bg-mint" style={{ width: `${share}%` }} /></div><p className="tabular text-body-sm text-body-mid">{share}%</p></div>
                </div>
              </div>
            </Link>);
        })}

        <Panel title="By partner and age" hint="Who owes you, and for how long" className="lg:col-span-7"
          action={<Link href="/claims" className="inline-flex min-h-11 items-center gap-1 text-body-sm font-medium text-ink hover:underline">All claims <ArrowRight size={14} aria-hidden /></Link>}>
          {d.by_partner.length === 0 ? <EmptyState title="No open claims" hint="Everything due has been paid correctly." /> : <PartnerAgeChart data={d.by_partner} />}
        </Panel>

        <Panel title="Order status" hint="Every order, after the latest run" className="lg:col-span-5">
          <StatusDonut counts={d.status_counts} total={d.orders} />
          <ul className="mt-4 grid grid-cols-1 gap-x-4">
            {STATUS_ORDER.filter((s) => d.status_counts[s]).map((s) => (
              <li key={s}><Link href={`/orders?status=${s}`} className="flex min-h-11 items-center justify-between gap-3 rounded-sm px-2 hover:bg-soft">
                <span className="flex items-center gap-2 text-body-sm text-body"><span aria-hidden className="h-2.5 w-2.5 rounded-xs" style={{ background: STATUS_COLOR[s] }} />{STATUS_LABEL[s]}</span>
                <span className="tabular text-body-sm font-medium text-ink">{num(d.status_counts[s])}</span></Link></li>))}
          </ul>
        </Panel>

        <Panel title="Needs attention" hint="Largest open claims" className="lg:col-span-7"
          action={<Link href="/claims" className="inline-flex min-h-11 items-center gap-1 text-body-sm font-medium text-ink hover:underline">View all <ArrowRight size={14} aria-hidden /></Link>}>
          {top.loading && !top.data ? <Skeleton className="h-48 w-full" /> : top.error ? <ErrorBanner message={top.error} onRetry={top.reload} /> : !top.data?.items.length ? <EmptyState title="No open claims" /> : (
            <ul className="-mx-2 divide-y divide-hairline">
              {top.data.items.map((c) => (
                <li key={c.id}><Link href={`/claims?partner_id=${c.partner_id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-sm px-2 py-2 hover:bg-soft">
                  <div className="min-w-0"><p className="truncate text-body-sm font-medium text-ink">{c.partner} <span className="font-mono text-caption-mono font-normal text-body-mid">{c.order_ref}</span></p>
                    <p className="text-body-sm text-body-mid">{CLAIM_TYPE_LABEL[c.claim_type]} · {c.age_days ?? "—"} days</p></div>
                  <div className="flex items-center gap-3"><StatusBadge status={c.status} /><Money value={c.amount} className="font-semibold text-ink" /></div></Link></li>))}
            </ul>)}
        </Panel>

        <Panel title="TCS and TDS deducted" hint="Statutory deductions by partner, not leakage" className="lg:col-span-5">
          {tax.loading && !tax.data ? <Skeleton className="h-48 w-full" /> : tax.error ? <ErrorBanner message={tax.error} onRetry={tax.reload} /> : !tax.data?.length ? <EmptyState title="No settlements yet" /> : (
            <table className="w-full text-body-sm">
              <thead><tr className="border-b border-hairline text-left text-eyebrow-sm uppercase text-body-mid"><th className="pb-2 font-medium">Partner</th><th className="pb-2 text-right font-medium">TCS</th><th className="pb-2 text-right font-medium">TDS</th></tr></thead>
              <tbody>{tax.data.map((t) => (<tr key={t.partner_id} className="border-b border-hairline last:border-b-0"><td className="py-2.5 font-medium text-ink">{t.partner}</td><td className="tabular py-2.5 text-right">{rupees(t.tcs, { decimals: false })}</td><td className="tabular py-2.5 text-right">{rupees(t.tds, { decimals: false })}</td></tr>))}</tbody>
            </table>)}
        </Panel>
      </div>
    </>
  );
}
