import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import { useId, type SelectHTMLAttributes } from "react";

export function Select({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        <select
          id={id}
          {...rest}
          className={cn(
            "min-h-11 w-full appearance-none rounded-sm border border-hairline bg-canvas pl-3.5 pr-10 text-body-sm text-ink transition-colors focus:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
            className
          )}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-mute"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = "min-h-11 rounded-full border border-hairline bg-canvas px-5 text-body-sm font-semibold text-ink hover:border-ink disabled:opacity-40 disabled:hover:border-hairline";
  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="text-body-sm text-body-mid tabular">{from}–{to} of {total.toLocaleString("en-IN")}</p>
      <div className="flex gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
