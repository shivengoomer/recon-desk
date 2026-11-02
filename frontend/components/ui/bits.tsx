import { cn } from "@/lib/cn";
import { cap, rupees, STATUS_LABEL } from "@/lib/format";
import { Badge, type BadgeTone } from "./badge";

const TONE: Record<string, BadgeTone> = {
  settled: "auto", pending: "neutral", short_paid: "unmatched", unpaid_past_due: "unmatched",
  freight_overcharged: "review", over_paid: "info", return_not_received: "unmatched",
  open: "review", filed: "info", recovered: "auto", rejected: "neutral",
};

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge tone="neutral">Not run</Badge>;
  return <Badge tone={TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? cap(status)}</Badge>;
}

/** Right-aligned tabular money; differences are signed and coloured. */
export function Money({ value, diff, className }: { value: string | null | undefined; diff?: boolean; className?: string }) {
  const n = Number(value);
  const tone = diff && value != null && Math.abs(n) >= 0.005 ? (n < 0 ? "font-semibold text-on-soft-red" : "font-semibold text-on-soft-blue") : "";
  return <span className={cn("tabular whitespace-nowrap text-right", tone, className)}>{diff && n > 0 ? "+" : ""}{rupees(value)}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-display-md md:text-display-lg">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-body-sm text-body-mid">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-eyebrow-sm uppercase text-body-mid">{children}</p>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border border-hairline bg-canvas p-5">
      <Eyebrow>{label}</Eyebrow>
      <p className="tabular mt-2 font-display text-display-sm text-ink">{value}</p>
      {hint && <p className="mt-1 text-body-sm text-body-mid">{hint}</p>}
    </div>
  );
}

/** Money cell with a proportional bar so the biggest gaps stand out at a glance. */
export function DiffBar({ value, max, tone = "red" }: { value: string | null | undefined; max: number; tone?: "red" | "ink" }) {
  const n = Math.abs(Number(value));
  const pct = max > 0 && Number.isFinite(n) ? Math.max(n > 0.005 ? 4 : 0, Math.min(100, (n / max) * 100)) : 0;
  return (
    <div className="flex flex-col items-end gap-1">
      <Money value={value} diff={tone === "red"} className={tone === "ink" ? "font-semibold text-ink" : ""} />
      <div className="h-1 w-20 overflow-hidden rounded-xs bg-soft" aria-hidden><div className={cn("h-full rounded-xs", tone === "red" ? "bg-accent-red/70" : "bg-primary/70")} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
