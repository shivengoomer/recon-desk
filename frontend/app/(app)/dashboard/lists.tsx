"use client";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, DatabaseZap, FileText, Link2Off, ListChecks, Percent, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/bits";
import { EmptyState, ErrorBanner, Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { CLAIM_TYPE_LABEL, KIND_LABEL, num, rupees } from "@/lib/format";
import type { ClaimPage, Dashboard, FileKind, TaxRow } from "@/lib/types";
import { Panel, PanelLink } from "./panel";
import { TYPE_ICON } from "./hero";

type Fetch<T> = { data: T | null; error: string | null; loading: boolean; reload: () => void };

const ageTone = (days: number | null) => (days === null ? "bg-soft text-body-mid" : days > 60 ? "bg-accent-red/10 text-on-soft-red" : days > 30 ? "bg-accent-yellow/25 text-on-soft-yellow" : "bg-soft text-body-mid");

export function Attention({ f }: { f: Fetch<ClaimPage> }) {
  return (
    <Panel icon={FileText} title="Needs attention" hint="Largest open claims" action={<PanelLink href="/claims">View all <ArrowRight size={14} aria-hidden /></PanelLink>}>
      {f.loading && !f.data ? <Skeleton className="h-60 w-full" /> : f.error ? <ErrorBanner message={f.error} onRetry={f.reload} /> : !f.data?.items.length ? <EmptyState title="No open claims" /> : (
        <ul className="-mx-2 divide-y divide-hairline">
          {f.data.items.map((c) => {
            const Icon = TYPE_ICON[c.claim_type] ?? FileText;
            return (
              <li key={c.id}>
                <Link href={`/claims?partner_id=${c.partner_id}`} className="group flex min-h-[68px] items-center gap-3 rounded-sm px-2 py-2.5 transition-colors hover:bg-soft">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-ink transition-colors group-hover:bg-mint"><Icon size={17} aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="truncate text-body-sm font-semibold text-ink">{c.partner}</span><span className="hidden rounded-full bg-soft px-2 py-0.5 font-mono text-[11px] text-body-mid sm:inline">{c.order_ref}</span></span>
                    <span className="mt-0.5 flex items-center gap-2 text-body-sm text-body-mid">{CLAIM_TYPE_LABEL[c.claim_type]}<span className={cn("rounded-full px-2 py-0.5 text-caption", ageTone(c.age_days))}>{c.age_days ?? "—"} days</span></span>
                  </span>
                  <span className="hidden sm:block"><StatusBadge status={c.status} /></span>
                  <span className="tabular w-24 text-right text-body-md font-bold text-ink">{rupees(c.amount, { decimals: false })}</span>
                  <ChevronRight size={16} className="hidden shrink-0 text-mute transition-transform group-hover:translate-x-0.5 md:block" aria-hidden />
                </Link>
              </li>);
          })}
        </ul>)}
    </Panel>
  );
}

export function Actions({ d }: { d: Dashboard }) {
  const stale = (Object.entries(d.freshness) as [FileKind, Dashboard["freshness"][FileKind]][]).filter(([, f]) => !f || f.days_ago > 7);
  const items: { icon: LucideIcon; title: string; sub: string; href: string; sev: "high" | "med" | "low" }[] = [];
  if (d.claims_older_than_60.count > 0) items.push({ icon: AlertTriangle, title: `${num(d.claims_older_than_60.count)} claims older than 60 days`, sub: `${rupees(d.claims_older_than_60.amount, { decimals: false })} at risk of going stale`, href: "/claims", sev: "high" });
  if (d.pending_suggestions > 0) items.push({ icon: ListChecks, title: `${num(d.pending_suggestions)} suggested matches to review`, sub: "Partner rows with no order ID", href: "/review", sev: "med" });
  if (stale.length > 0) items.push({ icon: DatabaseZap, title: `${stale.length} data source${stale.length > 1 ? "s" : ""} out of date`, sub: stale.map(([k]) => KIND_LABEL[k]).join(", "), href: "/imports", sev: "med" });
  if (d.unlinked_lines > 0) items.push({ icon: Link2Off, title: `${num(d.unlinked_lines)} partner rows not linked`, sub: "No matching order found yet", href: "/review", sev: "low" });
  const bar = { high: "bg-accent-red", med: "bg-accent-yellow", low: "bg-mute-soft" };
  const label = { high: "High", med: "Medium", low: "Low" };
  return (
    <Panel icon={ListChecks} title="Action centre" hint="What to do next, by priority">
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint"><CheckCircle2 size={24} aria-hidden /></span><p className="text-body-md font-semibold text-ink">All clear</p><p className="text-body-sm text-body-mid">Nothing needs your attention right now.</p></div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((it) => (
            <li key={it.title}>
              <Link href={it.href} className="group relative flex min-h-16 items-center gap-3 overflow-hidden rounded-sm border border-hairline bg-canvas py-3 pl-5 pr-3 transition-all hover:border-ink hover:shadow-layer-2">
                <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", bar[it.sev])} />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-ink"><it.icon size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold text-ink">{it.title}</span><span className="block text-body-sm text-body-mid">{it.sub}</span></span>
                <span className="sr-only">{label[it.sev]} priority</span>
                <ChevronRight size={16} className="shrink-0 text-mute transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>))}
        </ul>)}
    </Panel>
  );
}

const paidTone = (p: number) => (p >= 85 ? "#00f0a0" : p >= 78 ? "#ffc857" : "#ff8f3d");

export function Scorecard({ d }: { d: Dashboard }) {
  const rows = [...d.scorecard].sort((a, b) => Number(b.at_risk) - Number(a.at_risk));
  const maxRisk = Math.max(...rows.map((r) => Number(r.at_risk)), 1);
  return (
    <Panel icon={Users} title="Partner scorecard" hint="How reliably each partner pays">
      {rows.length === 0 ? <EmptyState title="No partner data yet" /> : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead><tr className="border-b border-hairline text-left text-eyebrow-sm uppercase text-body-mid">
              <th className="px-1 pb-2.5 font-semibold">Partner</th><th className="hidden px-1 pb-2.5 text-right font-semibold md:table-cell">Orders</th>
              <th className="px-1 pb-2.5 font-semibold">Paid correctly</th><th className="hidden px-1 pb-2.5 text-right font-semibold sm:table-cell">Issues</th><th className="px-1 pb-2.5 text-right font-semibold">At risk</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.partner_id} className="group border-b border-hairline transition-colors last:border-b-0 hover:bg-soft/70">
                  <td className="px-1 py-3"><Link href={`/claims?partner_id=${r.partner_id}`} className="font-semibold text-ink hover:underline">{r.partner}</Link>
                    <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold", r.kind === "courier" ? "bg-accent-blue-info/10 text-on-soft-blue" : "bg-soft text-body-mid")}>{r.kind === "courier" ? "Courier" : "Channel"}</span></td>
                  <td className="tabular hidden px-1 py-3 text-right text-body-mid md:table-cell">{num(r.orders)}</td>
                  <td className="px-1 py-3">{r.settled_pct === null ? <span className="text-mute">—</span> : (
                    <div className="flex items-center gap-2.5"><div className="h-2 w-16 overflow-hidden rounded-full bg-soft sm:w-28" aria-hidden><div className="h-full rounded-full" style={{ width: `${r.settled_pct}%`, background: paidTone(r.settled_pct) }} /></div><span className="tabular w-12 font-semibold text-ink">{r.settled_pct}%</span></div>)}</td>
                  <td className="tabular hidden px-1 py-3 text-right text-body-mid sm:table-cell">{num(r.issues)}</td>
                  <td className="px-1 py-3"><div className="flex flex-col items-end gap-1"><span className="tabular font-bold text-ink">{rupees(r.at_risk, { decimals: false })}</span><span className="h-1 w-16 overflow-hidden rounded-full bg-soft" aria-hidden><span className="block h-full rounded-full bg-primary/70" style={{ width: `${(Number(r.at_risk) / maxRisk) * 100}%` }} /></span></div></td>
                </tr>))}
            </tbody>
          </table>
        </div>)}
    </Panel>
  );
}

export function Freshness({ d }: { d: Dashboard }) {
  return (
    <Panel icon={DatabaseZap} title="Data freshness" hint="When each report was last uploaded">
      <ul className="flex flex-col gap-1">
        {(Object.entries(d.freshness) as [FileKind, Dashboard["freshness"][FileKind]][]).map(([k, f]) => {
          const tone = !f || f.days_ago > 30 ? "#ee1d36" : f.days_ago > 7 ? "#ffc857" : "#00f0a0";
          return (
            <li key={k}>
              <Link href="/imports" className="group flex min-h-14 items-center justify-between gap-3 rounded-sm px-2 transition-colors hover:bg-soft">
                <span className="flex items-center gap-3"><span aria-hidden className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 rounded-full opacity-40" style={{ background: tone, transform: "scale(2)" }} /><span className="relative h-2.5 w-2.5 rounded-full" style={{ background: tone }} /></span>
                  <span><span className="block text-body-sm font-semibold text-ink">{KIND_LABEL[k]}</span><span className="block text-caption font-medium text-mute">{f ? `${num(f.rows)} rows` : "No file yet"}</span></span></span>
                <span className="text-body-sm text-body-mid">{f ? (f.days_ago === 0 ? "Today" : `${f.days_ago} d ago`) : "Never"}</span>
              </Link>
            </li>);
        })}
      </ul>
      <p className="mt-auto pt-4 text-body-sm text-body-mid">Older than 7 days shows amber, older than 30 days red. Matching is only as current as the files behind it.</p>
    </Panel>
  );
}

export function Tax({ f }: { f: Fetch<TaxRow[]> }) {
  const rows = f.data ?? [];
  const sum = (k: "gross" | "fees" | "tcs" | "tds") => rows.reduce((a, r) => a + Number(r[k]), 0);
  return (
    <Panel icon={Percent} title="TCS and TDS deducted" hint="Statutory deductions by partner. Shown apart from leakage.">
      {f.loading && !f.data ? <Skeleton className="h-48 w-full" /> : f.error ? <ErrorBanner message={f.error} onRetry={f.reload} /> : !rows.length ? <EmptyState title="No settlements yet" /> : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead><tr className="border-b border-hairline text-left text-eyebrow-sm uppercase text-body-mid">
              <th className="px-1 pb-2.5 font-semibold">Partner</th><th className="hidden px-1 pb-2.5 text-right font-semibold md:table-cell">Gross settled</th><th className="hidden px-1 pb-2.5 text-right font-semibold md:table-cell">Fees</th>
              <th className="px-1 pb-2.5 text-right font-semibold">TCS</th><th className="px-1 pb-2.5 text-right font-semibold">TDS</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.partner_id} className="border-b border-hairline transition-colors hover:bg-soft/70">
                  <td className="px-1 py-2.5 font-semibold text-ink">{t.partner}</td>
                  <td className="tabular hidden px-1 py-2.5 text-right md:table-cell">{rupees(t.gross, { decimals: false })}</td>
                  <td className="tabular hidden px-1 py-2.5 text-right md:table-cell">{rupees(t.fees, { decimals: false })}</td>
                  <td className="tabular px-1 py-2.5 text-right">{rupees(t.tcs, { decimals: false })}</td>
                  <td className="tabular px-1 py-2.5 text-right">{rupees(t.tds, { decimals: false })}</td>
                </tr>))}
            </tbody>
            <tfoot><tr className="font-bold text-ink">
              <td className="px-1 pt-3">Total</td><td className="tabular hidden px-1 pt-3 text-right md:table-cell">{rupees(sum("gross"), { decimals: false })}</td><td className="tabular hidden px-1 pt-3 text-right md:table-cell">{rupees(sum("fees"), { decimals: false })}</td>
              <td className="tabular px-1 pt-3 text-right">{rupees(sum("tcs"), { decimals: false })}</td><td className="tabular px-1 pt-3 text-right">{rupees(sum("tds"), { decimals: false })}</td></tr></tfoot>
          </table>
        </div>)}
    </Panel>
  );
}
