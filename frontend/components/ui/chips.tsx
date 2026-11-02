import { cn } from "@/lib/cn";

export interface ChipOption { value: string; label: string; count?: number }

/** One-tap filter row: scrolls horizontally on phones, wraps on desktop. */
export function Chips({ label, options, value, onChange }: { label: string; options: ChipOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-body-sm font-semibold transition-colors",
              on ? "border-primary bg-primary text-on-primary" : "border-hairline bg-canvas text-ink hover:border-ink")}>
            {o.label}
            {o.count !== undefined && <span className={cn("tabular rounded-full px-2 py-0.5 text-caption", on ? "bg-mint text-ink" : "bg-soft text-body-mid")}>{o.count.toLocaleString("en-IN")}</span>}
          </button>
        );
      })}
    </div>
  );
}
