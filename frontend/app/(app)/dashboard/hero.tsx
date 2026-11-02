"use client";
import { ArrowUpRight, FileWarning, Layers, Sparkles, Truck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/cn";
import { CLAIM_TYPE_LABEL, num, rupees, rupeesCompact } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { PANEL, Panel } from "./panel";
import { BUCKET_COLOR, BUCKETS, Ring } from "./viz";

export const TYPE_ICON: Record<string, LucideIcon> = { short_paid: Wallet, unremitted_cod: FileWarning, freight_overcharge: Truck };

function insight(d: Dashboard): string | null {
  const total = Number(d.money_at_risk);
  if (total <= 0) return null;
  const top = Object.entries(d.by_type).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const partners = d.by_partner.slice(0, 2);
  const share = Math.round((partners.reduce((a, p) => a + Number(p.total), 0) / total) * 100);
  const first = top ? `${CLAIM_TYPE_LABEL[top[0]] ?? top[0]} makes up ${Math.round((Number(top[1]) / total) * 100)}% of it. ` : "";
  return partners.length === 2 ? `${first}${partners[0].partner} and ${partners[1].partner} together account for ${share}%.` : first.trim() || null;
}

/** Black executive-summary card: the one number that matters, an insight, and the age mix. */
export function Hero({ d }: { d: Dashboard }) {
  const risk = Number(d.money_at_risk);
  const claims = d.by_partner.reduce((a, p) => a + p.count, 0);
  const lakh = risk >= 1e5;
  const age = BUCKETS.map((b) => ({ b, v: d.by_partner.reduce((a, p) => a + Number(p.buckets[b]), 0) }));
  const text = insight(d);
  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden rounded-md bg-primary p-6 text-on-primary shadow-layer-2 ring-1 ring-white/10 md:p-8">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-90" style={{ background: "radial-gradient(38rem 20rem at 85% -10%, rgba(0,240,160,0.22), transparent 65%)" }} />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-60" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.10) 1px, transparent 0)", backgroundSize: "22px 22px", WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 85% 0%, #000 20%, transparent 75%)", maskImage: "radial-gradient(ellipse 70% 80% at 85% 0%, #000 20%, transparent 75%)" }} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-eyebrow-sm uppercase text-on-primary/60">Open and filed claims</p>
        <Link href="/claims" className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white/10 px-3 text-body-sm font-semibold text-on-primary transition-colors hover:bg-white/20">
          {num(claims)} claims <ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>
      <p className="tabular font-display mt-5 flex items-start leading-none tracking-[-0.03em] text-mint" aria-label={rupees(risk)}>
        <span className="mr-1.5 mt-2 text-[28px] font-semibold text-mint/60 md:mt-3 md:text-[40px]">₹</span>
        <span className="text-[60px] font-bold md:text-[92px]"><AnimatedNumber value={risk} format={(n) => (lakh ? (n / 1e5).toFixed(2) : num(Math.round(n)))} /></span>
        {lakh && <span className="ml-2 mt-5 text-[22px] font-semibold text-mint/70 md:mt-8 md:text-[32px]">Lakh</span>}
      </p>
      <p className="tabular mt-3 text-body-sm text-on-primary/60">{rupees(risk)} exact</p>
      {text && <p className="mt-5 flex max-w-xl items-start gap-2 text-body-md text-on-primary/85"><Sparkles size={16} className="mt-1 shrink-0 text-mint" aria-hidden />{text}</p>}

      <div className="mt-auto pt-8">
        <div className="mb-3 flex items-center justify-between"><p className="text-body-sm font-semibold text-on-primary/70">Age of claims</p>
          {d.claims_older_than_60.count > 0 && <p className="text-body-sm text-on-primary/60">{d.claims_older_than_60.count} older than 60 days</p>}</div>
        <div className="flex h-3 gap-[3px]" role="img" aria-label="Claims by age">
          {age.map(({ b, v }) => v > 0 && <div key={b} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(v / risk) * 100}%`, background: BUCKET_COLOR[b] }} />)}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {age.map(({ b, v }) => (
            <li key={b}><p className="flex items-center gap-2 text-caption font-medium text-on-primary/60"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: BUCKET_COLOR[b] }} />{b} days</p>
              <p className="tabular mt-0.5 text-body-md font-semibold text-on-primary">{rupeesCompact(v)}</p></li>))}
        </ul>
      </div>
    </div>
  );
}

export function AutoMatch({ d }: { d: Dashboard }) {
  return (
    <div className={cn(PANEL, "relative flex h-full flex-col items-center overflow-hidden p-6 text-center")}>
      <div aria-hidden className="absolute inset-x-0 top-0 -z-0 h-32" style={{ background: "radial-gradient(18rem 9rem at 50% -2rem, rgba(0,240,160,0.20), transparent 70%)" }} />
      <p className="font-display relative text-[20px] font-bold">Auto-matched</p>
      <p className="relative mb-5 text-body-sm text-body-mid">of orders past due</p>
      {d.auto_match_rate === null ? <p className="py-8 text-body-sm text-body-mid">No orders are past due yet.</p> : <div className="relative"><Ring value={d.auto_match_rate} label="auto-matched" size={156} /></div>}
      <dl className="relative mt-auto grid w-full grid-cols-2 divide-x divide-hairline border-t border-hairline pt-4 text-left">
        <Link href="/review" className="group pr-4"><dt className="text-eyebrow-sm uppercase text-body-mid">To review</dt><dd className="tabular font-display mt-1 flex items-center gap-1 text-[28px] font-bold leading-none text-ink">{num(d.pending_suggestions)}<ArrowUpRight size={16} className="text-mute transition-colors group-hover:text-ink" aria-hidden /></dd></Link>
        <div className="pl-4"><dt className="text-eyebrow-sm uppercase text-body-mid">Unlinked</dt><dd className="tabular font-display mt-1 text-[28px] font-bold leading-none text-ink">{num(d.unlinked_lines)}</dd></div>
      </dl>
    </div>
  );
}

export function TypeCards({ d }: { d: Dashboard }) {
  const total = Object.values(d.by_type).reduce((a, v) => a + Number(v), 0) || 1;
  return (
    <>
      {Object.entries(d.by_type).map(([k, v]) => {
        const Icon = TYPE_ICON[k] ?? Layers;
        const share = Math.round((Number(v) / total) * 100);
        return (
          <Link key={k} href={`/claims?claim_type=${k}`} className="group hidden lg:col-span-4 lg:block">
            <div className={cn(PANEL, "flex h-full flex-col p-6 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-ink")}>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-ink"><Icon size={20} aria-hidden /></span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-on-primary"><ArrowUpRight size={16} aria-hidden /></span>
              </div>
              <p className="mt-6 text-body-sm font-semibold text-body-mid">{CLAIM_TYPE_LABEL[k] ?? k}</p>
              <p className="tabular font-display mt-1 text-[36px] font-bold leading-none tracking-tight text-ink">{rupees(v, { decimals: false })}</p>
              <div className="mt-5 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft" aria-hidden><div className="h-full rounded-full bg-mint" style={{ width: `${share}%` }} /></div><p className="tabular text-body-sm font-semibold text-body-mid">{share}%</p></div>
            </div>
          </Link>);
      })}
    </>
  );
}

/** Phones: ring on the left, the three claim types as rows on the right. */
export function MobileOverview({ d }: { d: Dashboard }) {
  return (
    <section aria-label="Auto-match and claims by type" className={cn(PANEL, "grid grid-cols-[auto_1fr] items-center gap-4 p-4 lg:hidden")}>
      <div className="flex flex-col items-center text-center">
        <p className="font-display mb-2 text-[18px] font-bold">Auto-matched</p>
        {d.auto_match_rate === null ? <p className="text-body-sm text-body-mid">No orders due yet</p> : <Ring value={d.auto_match_rate} label="auto-matched" size={112} />}
        <Link href="/review" className="mt-2 text-body-sm font-semibold text-ink underline-offset-2 hover:underline">{num(d.pending_suggestions)} to review</Link>
      </div>
      <ul className="flex min-w-0 flex-col gap-2">
        {Object.entries(d.by_type).map(([k, v]) => {
          const Icon = TYPE_ICON[k] ?? Layers;
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
  );
}

const STAGES = [
  { k: "open", label: "Open", sub: "To raise with the partner", dot: "#ffc857" },
  { k: "filed", label: "Filed", sub: "Raised, awaiting reply", dot: "#146ef5" },
  { k: "recovered", label: "Recovered", sub: "Money back", dot: "#00f0a0" },
  { k: "rejected", label: "Rejected", sub: "Closed without recovery", dot: "#b4bcc5" },
] as const;

export function Pipeline({ d }: { d: Dashboard }) {
  const p = d.claims_pipeline;
  const total = STAGES.reduce((a, s) => a + Number(p[s.k].amount), 0);
  const settled = Number(p.recovered.amount) + Number(p.rejected.amount);
  const rate = settled > 0 ? Math.round((Number(p.recovered.amount) / settled) * 100) : null;
  return (
    <Panel title="Recovery pipeline" hint="Where every claim stands" icon={Layers}
      action={rate !== null ? <span className="rounded-full bg-mint/25 px-3 py-1.5 text-body-sm font-semibold text-on-soft-green">{rate}% recovery rate</span> : undefined}>
      <ol className="relative grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
        <div aria-hidden className="absolute left-0 right-0 top-[7px] hidden h-px bg-hairline lg:block" />
        {STAGES.map((s) => {
          const st = p[s.k];
          const win = s.k === "recovered";
          return (
            <li key={s.k} className="relative">
              <span aria-hidden className="relative z-10 mb-4 block h-3.5 w-3.5 rounded-full ring-4 ring-canvas" style={{ background: s.dot }} />
              <p className="text-body-sm font-semibold text-body-mid">{s.label}</p>
              <p className={cn("tabular font-display mt-1 inline-block text-[30px] font-bold leading-none tracking-tight text-ink", win && st.count > 0 && "rounded-sm bg-mint px-2 py-1")}>{rupees(st.amount, { decimals: false })}</p>
              <p className="mt-2 text-body-sm text-body-mid">{num(st.count)} claim{st.count === 1 ? "" : "s"} · {s.sub}</p>
            </li>);
        })}
      </ol>
      {total > 0 && (
        <div className="mt-6 flex h-2.5 gap-[3px]" role="img" aria-label="Claim value by stage">
          {STAGES.map((s) => Number(p[s.k].amount) > 0 && <div key={s.k} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(Number(p[s.k].amount) / total) * 100}%`, background: s.dot }} />)}
        </div>)}
    </Panel>
  );
}
