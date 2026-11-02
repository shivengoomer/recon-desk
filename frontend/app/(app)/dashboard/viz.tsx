"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { num, rupees, rupeesCompact, STATUS_LABEL } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { Tip } from "@/components/ui/tip";

export const BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;
export const BUCKET_COLOR: Record<string, string> = { "0-30": "#cdd5dc", "31-60": "#ffc857", "61-90": "#ff8f3d", "90+": "#ee1d36" };
export const STATUS_COLOR: Record<string, string> = {
  settled: "#00f0a0", pending: "#d9dee3", unpaid_past_due: "#ee1d36", short_paid: "#ff8f3d", freight_overcharged: "#ffc857", over_paid: "#146ef5",
};
export const STATUS_ORDER = ["unpaid_past_due", "short_paid", "freight_overcharged", "over_paid", "pending", "settled"];

/** Hand-built horizontal stacked bars: partner, age mix, total. */
export function AgeBars({ data, onDark }: { data: Dashboard["by_partner"]; onDark?: boolean }) {
  const max = Math.max(...data.map((p) => Number(p.total)), 1);
  return (
    <div className="flex flex-col" role="group" aria-label="Money at risk by partner and age">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1" aria-label="Age legend">
        {BUCKETS.map((b) => <li key={b} className="flex items-center gap-2 text-body-sm text-body-mid"><span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: BUCKET_COLOR[b] }} />{b} days</li>)}
      </ul>
      {data.map((p) => {
        const total = Number(p.total);
        return (
          <Tip key={p.partner_id} label={BUCKETS.map((b) => `${b} days: ${rupees(p.buckets[b], { decimals: false })}`).join("  ·  ")}>
            <a href={`/claims?partner_id=${p.partner_id}`}
              className="group grid min-h-12 grid-cols-[88px_1fr_64px] items-center gap-3 rounded-sm px-2 transition-colors hover:bg-soft sm:grid-cols-[130px_1fr_76px]">
              <span className="min-w-0"><span className="block truncate text-body-sm font-semibold text-ink">{p.partner}</span><span className="block text-caption font-medium text-mute">{p.count} claims</span></span>
              <span className="flex h-3 overflow-hidden rounded-full bg-soft" style={{ width: "100%" }}>
                <span className="flex h-full gap-[2px]" style={{ width: `${(total / max) * 100}%`, minWidth: 6 }}>
                  {BUCKETS.map((b) => Number(p.buckets[b]) > 0 && (
                    <span key={b} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(Number(p.buckets[b]) / total) * 100}%`, background: BUCKET_COLOR[b] }} />))}
                </span>
              </span>
              <span className={cn("tabular text-right text-body-sm font-semibold", onDark ? "text-on-primary" : "text-ink")}>{rupeesCompact(total)}</span>
            </a>
          </Tip>);
      })}
    </div>
  );
}

/** SVG donut with linked legend: hover either side to focus a status. */
export function StatusDonut({ counts, total }: { counts: Dashboard["status_counts"]; total: number }) {
  const [active, setActive] = useState<string | null>(null);
  const rows = STATUS_ORDER.filter((s) => counts[s]).map((s) => ({ key: s, n: counts[s] }));
  const R = 82, C = 2 * Math.PI * R, GAP = 3;
  let offset = 0;
  const shown = active ? rows.find((r) => r.key === active) : null;
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-[200px] w-[200px] shrink-0" role="img" aria-label="Order status mix">
        <svg viewBox="0 0 200 200" className="-rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#f2f4f5" strokeWidth="18" />
          {rows.map((r) => {
            const len = Math.max((r.n / total) * C - GAP, 2);
            const el = (
              <circle key={r.key} cx="100" cy="100" r={R} fill="none" stroke={STATUS_COLOR[r.key]} strokeWidth={active === r.key ? 24 : 18}
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="round"
                style={{ transition: "stroke-width 160ms, opacity 160ms", opacity: active && active !== r.key ? 0.35 : 1, cursor: "pointer" }}
                onMouseEnter={() => setActive(r.key)} onMouseLeave={() => setActive(null)} />);
            offset += (r.n / total) * C;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="tabular font-display text-[34px] font-bold leading-none text-ink">{num(shown ? shown.n : total)}</p>
          <p className="mt-1 max-w-[110px] text-body-sm text-body-mid">{shown ? STATUS_LABEL[shown.key] : "orders"}</p>
          {shown && <p className="tabular text-caption text-mute">{((shown.n / total) * 100).toFixed(1)}%</p>}
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1">
        {rows.map((r) => (
          <li key={r.key}>
            <a href={`/orders?status=${r.key}`} onMouseEnter={() => setActive(r.key)} onMouseLeave={() => setActive(null)}
              className={cn("flex min-h-11 items-center justify-between gap-3 rounded-sm px-2 transition-colors", active === r.key ? "bg-soft" : "hover:bg-soft")}>
              <span className="flex items-center gap-2.5 text-body-sm text-body"><span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[r.key] }} />{STATUS_LABEL[r.key]}</span>
              <span className="tabular text-body-sm font-semibold text-ink">{num(r.n)}<span className="ml-2 font-medium text-mute">{((r.n / total) * 100).toFixed(0)}%</span></span>
            </a>
          </li>))}
      </ul>
    </div>
  );
}

export function Ring({ value, label, size = 144 }: { value: number; label: string; size?: number }) {
  const sw = size < 130 ? 10 : 12, r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}% ${label}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f2f4f5" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#00f0a0" strokeWidth={sw} strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 1000ms cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className={cn("tabular font-display font-bold leading-none text-ink", size < 130 ? "text-[24px]" : "text-[34px]")}>{value}<span className="text-[0.55em] text-body-mid">%</span></p>
      </div>
    </div>
  );
}
