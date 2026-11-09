"use client";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/cn";

export interface ExpandItem {
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  title: string;
  text: string;
  /** One concrete detail shown under the description when the card is open. */
  detail: string;
}

/**
 * Vertical flex cards: on desktop one card is open and wide, the rest collapse to a slim column
 * with a vertical title. On phones they stack and the open card grows taller. Hover, focus or tap opens a card.
 */
export function ExpandCards({ items, className }: { items: ExpandItem[]; className?: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className={cn("flex flex-col gap-3 lg:h-[440px] lg:flex-row", className)}>
      {items.map(({ icon: Icon, title, text, detail }, i) => {
        const open = i === active;
        return (
          <button
            key={title}
            type="button"
            aria-expanded={open}
            onClick={() => setActive(i)}
            onFocus={() => setActive(i)}
            onMouseEnter={() => window.matchMedia("(hover: hover)").matches && setActive(i)}
            className={cn(
              "group relative overflow-hidden rounded-lg border text-left transition-[flex-grow,height,background-color,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
              open
                ? "h-[290px] border-ink bg-ink text-on-primary lg:h-auto lg:flex-[5_1_0%]"
                : "h-[76px] border-hairline bg-canvas text-ink hover:border-ink lg:h-auto lg:flex-[1_1_0%]",
            )}
          >
            <span className="flex h-full flex-col p-5 lg:min-w-[330px] lg:p-7">
              <span className="flex items-center gap-4">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-500",
                    open ? "bg-mint text-ink" : "bg-soft text-ink",
                  )}
                >
                  <Icon size={20} aria-hidden />
                </span>
                <span className={cn("font-display text-display-xs lg:hidden", open ? "text-on-primary" : "text-ink")}>{title}</span>
                <span className="ml-auto font-mono text-body-sm tabular-nums opacity-60 lg:hidden">{String(i + 1).padStart(2, "0")}</span>
              </span>

              {/* Collapsed desktop column: vertical title */}
              <span
                aria-hidden={open}
                className={cn(
                  "font-display mt-auto hidden text-display-xs transition-opacity duration-300 lg:block lg:[writing-mode:vertical-rl] lg:rotate-180",
                  open ? "pointer-events-none absolute opacity-0" : "opacity-100 delay-200",
                )}
              >
                {title}
              </span>

              {/* Open: full content */}
              <span
                aria-hidden={!open}
                className={cn(
                  "mt-5 flex flex-1 flex-col transition-all duration-500 lg:mt-auto",
                  open ? "translate-y-0 opacity-100 delay-150" : "pointer-events-none translate-y-3 opacity-0",
                )}
              >
                <span className="font-display hidden text-display-sm leading-tight lg:block">{title}</span>
                <span className="mt-0 text-body-sm text-on-primary/80 lg:mt-3 lg:text-body-md">{text}</span>
                <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-caption text-mint lg:mt-6">
                  {detail}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
