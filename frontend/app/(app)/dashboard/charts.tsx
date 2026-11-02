"use client";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupees, rupeesCompact, STATUS_LABEL, num } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export const BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;
export const BUCKET_COLOR: Record<string, string> = { "0-30": "#ababab", "31-60": "#ffae13", "61-90": "#ff6b00", "90+": "#ee1d36" };
export const STATUS_COLOR: Record<string, string> = {
  settled: "#00f0a0", pending: "#d8d8d8", unpaid_past_due: "#ee1d36", short_paid: "#ff6b00", freight_overcharged: "#ffae13", over_paid: "#146ef5",
};
export const STATUS_ORDER = ["unpaid_past_due", "short_paid", "freight_overcharged", "over_paid", "pending", "settled"];

export function PartnerAgeChart({ data }: { data: Dashboard["by_partner"] }) {
  const rows = data.map((p) => ({ name: p.partner, id: p.partner_id, ...Object.fromEntries(BUCKETS.map((b) => [b, Number(p.buckets[b])])) }));
  const h = Math.max(220, rows.length * 44 + 40);
  return (
    <div role="img" aria-label="Money at risk by partner and age" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }} barSize={18}>
          <XAxis type="number" tickFormatter={(v) => rupeesCompact(v)} tick={{ fontSize: 12, fill: "#898989" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 13, fill: "#222" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#f6f6f6" }} content={({ active, payload, label }) => active && payload?.length ? (
            <div className="rounded-md border border-hairline bg-canvas p-3 text-body-sm shadow-layer-3">
              <p className="mb-1.5 font-medium text-ink">{label}</p>
              {payload.map((p) => <p key={String(p.dataKey)} className="flex items-center justify-between gap-6 text-body-mid"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-xs" style={{ background: p.color }} />{String(p.dataKey)} days</span><span className="tabular text-ink">{rupees(p.value as number, { decimals: false })}</span></p>)}
            </div>) : null} />
          {BUCKETS.map((b, i) => <Bar key={b} dataKey={b} stackId="a" fill={BUCKET_COLOR[b]} radius={i === BUCKETS.length - 1 ? [0, 3, 3, 0] : 0} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonut({ counts, total }: { counts: Dashboard["status_counts"]; total: number }) {
  const data = STATUS_ORDER.filter((s) => counts[s]).map((s) => ({ key: s, name: STATUS_LABEL[s], value: counts[s] }));
  return (
    <div className="relative mx-auto h-56 w-56" role="img" aria-label="Order status mix">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={68} outerRadius={100} paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d) => <Cell key={d.key} fill={STATUS_COLOR[d.key]} />)}
          </Pie>
          <Tooltip content={({ active, payload }) => active && payload?.length ? (
            <div className="rounded-md border border-hairline bg-canvas px-3 py-2 text-body-sm shadow-layer-3"><span className="font-medium text-ink">{payload[0].name}</span> <span className="tabular text-body-mid">{num(payload[0].value as number)}</span></div>) : null} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="tabular font-display text-display-sm text-ink">{num(total)}</p><p className="text-body-sm text-body-mid">orders</p>
      </div>
    </div>
  );
}

export function Ring({ value, label, size = 144 }: { value: number; label: string; size?: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}% ${label}`}>
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f2f4f5" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#00f0a0" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><p className={`tabular font-display text-ink ${size < 130 ? "text-display-xs" : "text-display-sm"}`}>{value}%</p></div>
    </div>
  );
}
