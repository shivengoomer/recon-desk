"use client";
import { ChevronDown } from "lucide-react";
import { useId, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface ExpandItem {
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  title: string;
  text: string;
  /** One concrete detail shown as a chip when the card is open. */
  detail: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Expanding vertical cards.
 * Desktop: one card is open and wide; the others are slim columns (icon on top, vertical title at the bottom).
 * Phone: cards stack as a tap-to-expand list. Hover (mouse only), focus, tap or arrow keys open a card.
 */
export function ExpandCards({ items, className }: { items: ExpandItem[]; className?: string }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();

  function onKeyDown(e: KeyboardEvent) {
    const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const i = (active + next + items.length) % items.length;
    refs.current[i]?.focus(); // focus opens the card
  }

  return (
    <div
      role="group"
      aria-label="What Recon Desk catches"
      onKeyDown={onKeyDown}
      className={cn("flex w-full flex-col gap-3 lg:h-[460px] lg:flex-row", className)}
    >
      {items.map(({ icon: Icon, title, text, detail }, i) => {
        const open = i === active;
        const descId = `${uid}-d${i}`;
        return (
          <button
            key={title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            aria-expanded={open}
            aria-label={title}
            aria-describedby={descId}
            onClick={() => setActive(i)}
            onFocus={() => setActive(i)}
            onMouseEnter={() => window.matchMedia("(hover: hover)").matches && setActive(i)}
            className={cn(
              "group relative min-w-0 overflow-hidden rounded-md border text-left",
              "transition-[flex-grow,height,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
              open
                ? "h-[300px] border-ink bg-ink text-on-primary shadow-layer-3 lg:h-auto lg:flex-[5_1_0%]"
                : "h-[84px] border-hairline bg-canvas text-ink hover:border-ink hover:bg-soft lg:h-auto lg:flex-[1_1_0%]",
            )}
          >
            {/* Corner blob: full glow on the open card, a faint one on hover for the others */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full blur-3xl transition-all duration-700",
                open ? "scale-110 bg-mint/45" : "scale-75 bg-mint/0 group-hover:bg-mint/30",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 rounded-full transition-all duration-700",
                open ? "scale-100 bg-mint/80 opacity-100" : "scale-50 bg-mint opacity-0 group-hover:opacity-70",
              )}
            />

            {/* ── Mobile / tablet: stacked row ───────────────────────────── */}
            <span aria-hidden className="relative flex h-full flex-col p-5 lg:hidden">
              <span className="flex items-center gap-4">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-500", open ? "bg-mint text-ink" : "bg-soft text-ink")}>
                  <Icon size={20} aria-hidden />
                </span>
                <span className="font-display min-w-0 flex-1 text-display-xs leading-tight">{title}</span>
                <ChevronDown size={20} className={cn("shrink-0 transition-transform duration-500", open ? "rotate-180 text-mint" : "text-body-mid")} />
              </span>
              <span className={cn("mt-4 flex flex-1 flex-col transition-opacity duration-500", open ? "opacity-100 delay-150" : "opacity-0")}>
                <span className="text-body-sm text-on-primary/80">{text}</span>
                <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-caption text-mint">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  {detail}
                </span>
              </span>
            </span>

            {/* ── Desktop: collapsed column ──────────────────────────────── */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 hidden flex-col items-center justify-between px-3 py-6 transition-opacity duration-300 lg:flex",
                open ? "pointer-events-none opacity-0" : "opacity-100 delay-200",
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-ink transition-colors group-hover:bg-mint">
                <Icon size={20} aria-hidden />
              </span>
              <span className="font-display whitespace-nowrap text-[19px] font-bold leading-none [writing-mode:vertical-rl] rotate-180">
                {title}
              </span>
            </span>

            {/* ── Desktop: open card ─────────────────────────────────────── */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 hidden min-w-[400px] flex-col justify-between p-8 transition-opacity duration-500 lg:flex",
                open ? "opacity-100 delay-150" : "pointer-events-none opacity-0",
              )}
            >
              <span className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint text-ink">
                  <Icon size={22} aria-hidden />
                </span>
                <span className="font-display select-none text-[88px] font-bold leading-[0.8] text-white/[0.07] tabular-nums">{pad(i + 1)}</span>
              </span>
              <span className="flex flex-col">
                <span className="text-eyebrow-sm uppercase text-mint">
                  Catch {pad(i + 1)} of {pad(items.length)}
                </span>
                <span className="font-display mt-2 text-display-md leading-[1.1]">{title}</span>
                <span className="mt-3 max-w-[460px] text-body-md text-on-primary/75">{text}</span>
                <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-caption text-mint">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  {detail}
                </span>
              </span>
            </span>
            {/* Screen readers: the description, exposed once, whichever layout is showing */}
            <span id={descId} className="sr-only">
              {text} {detail}
            </span>
          </button>
        );
      })}
    </div>
  );
}
