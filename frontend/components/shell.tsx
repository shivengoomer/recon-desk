"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MatchProvider, timeAgo, useMatch } from "@/lib/match";
import { num } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { Backdrop } from "@/components/backdrop";
import {
  CheckCheck,
  Ellipsis,
  FileText,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Percent,
  Play,
  RefreshCw,
  ScrollText,
  Search,
  Upload,
  type LucideIcon,
} from "lucide-react";

const ic = (C: LucideIcon) => <C size={20} strokeWidth={1.75} aria-hidden />;
const ICON = {
  dashboard: ic(LayoutDashboard),
  orders: ic(ListOrdered),
  claims: ic(FileText),
  review: ic(CheckCheck),
  import: ic(Upload),
  rates: ic(Percent),
  audit: ic(ScrollText),
  more: ic(Ellipsis),
  search: <Search size={18} aria-hidden />,
  play: <Play size={16} aria-hidden fill="currentColor" />,
};

interface Item {
  href: string;
  label: string;
  icon: React.ReactNode;
  cofounderOnly?: boolean;
  badge?: number;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-body-sm text-body-mid" role="status">
        Loading…
      </div>
    );
  }

  return (
    <MatchProvider>
      <Frame>{children}</Frame>
    </MatchProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { run, running, last, version } = useMatch();
  const path = usePathname();
  const [sheet, setSheet] = useState(false);
  const [palette, setPalette] = useState(false);
  const [pending, setPending] = useState(0);
  const [shortcutKey, setShortcutKey] = useState("⌘K");

  useEffect(() => {
    if (typeof navigator !== "undefined" && !/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent)) {
      setShortcutKey("Ctrl+K");
    }
  }, []);

  useEffect(() => setSheet(false), [path]);

  useEffect(() => {
    api<Dashboard>("/api/dashboard")
      .then((d) => setPending(d.pending_suggestions))
      .catch(() => {});
  }, [version]);

  if (!user) return null;

  const PRIMARY: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: ICON.dashboard },
    { href: "/orders", label: "Orders", icon: ICON.orders },
    { href: "/claims", label: "Claims", icon: ICON.claims },
    { href: "/imports", label: "Import", icon: ICON.import },
  ];

  const SECONDARY: Item[] = [
    { href: "/review", label: "Review matches", icon: ICON.review, badge: pending },
    { href: "/rate-cards", label: "Rate cards", icon: ICON.rates },
    { href: "/audit", label: "Audit log", icon: ICON.audit, cofounderOnly: true },
  ].filter((i) => !i.cofounderOnly || user.role === "cofounder");

  const active = (h: string) => path === h || path.startsWith(h + "/");
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const link = (i: Item) => {
    const isCurrent = active(i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={isCurrent ? "page" : undefined}
        className={cn(
          "group relative flex min-h-11 items-center gap-3 rounded-full px-4 text-body-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
          isCurrent ? "bg-mint text-ink shadow-xs" : "text-body hover:bg-soft hover:text-ink"
        )}
      >
        <span
          className={cn(
            "shrink-0 transition-transform duration-150 group-hover:scale-105",
            isCurrent ? "text-ink" : "text-body-mid group-hover:text-ink"
          )}
        >
          {i.icon}
        </span>
        <span className="flex-1 truncate">{i.label}</span>
        {!!i.badge && (
          <span
            className={cn(
              "tabular rounded-full px-2 py-0.5 text-caption font-bold transition-colors",
              isCurrent ? "bg-ink text-mint" : "bg-accent-yellow/25 text-on-soft-yellow border border-accent-yellow/30"
            )}
          >
            {num(i.badge)}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="relative min-h-screen lg:flex">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-body-sm focus:font-semibold focus:text-on-primary focus:shadow-layer-3 focus:outline-none"
      >
        Skip to main content
      </a>

      <Backdrop />

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 z-10 hidden h-screen w-64 shrink-0 flex-col border-r border-hairline bg-canvas px-4 py-5 lg:flex">
        {/* Workspace Brand Header */}
        <div className="flex items-center justify-between px-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-body-md font-semibold text-ink transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded-sm"
          >
            <Logo />
            <span className="font-display text-[20px] font-bold tracking-tight">Recon Desk</span>
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-body-mid">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden />
            Live
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main">
          <p className="mb-1.5 px-3 text-eyebrow-sm uppercase tracking-wider text-mute">Core</p>
          {PRIMARY.map(link)}

          <p className="mb-1.5 mt-6 px-3 text-eyebrow-sm uppercase tracking-wider text-mute">Work</p>
          {SECONDARY.map(link)}
        </nav>

        {/* Desktop User Profile Footer */}
        <div className="mt-auto border-t border-hairline pt-4">
          <div className="flex items-center gap-3 rounded-card border border-hairline/60 bg-soft/50 p-2.5 transition-colors hover:bg-soft">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-body-sm font-bold text-ink ring-2 ring-white shadow-xs"
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-caption text-body-mid">
                {user.role === "cofounder" ? "Co-founder" : "Finance executive"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-hairline/80 bg-canvas px-4 text-body-sm font-semibold text-body transition-colors hover:border-ink hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <LogOut size={16} aria-hidden />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area + Top Header */}
      <div className="relative z-10 min-w-0 flex-1 overflow-x-hidden">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-canvas/80 px-4 backdrop-blur-xl md:px-3xl">
          {/* Mobile Brand Link */}
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 text-body-md font-semibold text-ink lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-sm"
          >
            <Logo className="h-7 w-7" />
            <span className="font-display text-[17px] font-bold">Recon Desk</span>
          </Link>

          {/* Search Button (Tablet & Desktop) */}
          <button
            onClick={() => setPalette(true)}
            aria-label="Search orders or jump to a page"
            className="group relative hidden min-h-10 max-w-xs flex-1 items-center gap-2.5 rounded-full border border-hairline bg-soft/70 px-4 text-left text-body-sm text-mute transition-all hover:border-ink/30 hover:bg-canvas hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink md:flex lg:max-w-sm"
          >
            <Search size={16} className="text-mute transition-colors group-hover:text-ink" aria-hidden />
            <span className="flex-1 truncate text-[13px]">Search orders, jump to…</span>
            <kbd className="inline-flex items-center rounded-md border border-hairline bg-canvas px-1.5 py-0.5 font-mono text-[11px] font-semibold text-body-mid shadow-xs">
              {shortcutKey}
            </kbd>
          </button>

          {/* Mobile Search Icon Button */}
          <button
            onClick={() => setPalette(true)}
            aria-label="Search orders or jump to a page"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-soft text-body hover:border-ink hover:bg-canvas hover:text-ink md:hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <Search size={16} aria-hidden />
          </button>

          {/* Right Controls Container */}
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3 md:ml-auto">
            {/* Live System Status Indicator */}
            <div className="hidden shrink-0 items-center gap-2 rounded-full border border-hairline bg-soft/60 px-3 py-1.5 text-body-sm shadow-xs transition-colors md:flex">
              <span className="relative flex h-2 w-2 shrink-0">
                {running ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
                  </>
                ) : last ? (
                  <span className="inline-flex h-2 w-2 rounded-full bg-mint ring-2 ring-mint/20" />
                ) : (
                  <span className="inline-flex h-2 w-2 rounded-full bg-mute/40" />
                )}
              </span>
              <p className="truncate text-caption text-body-mid" aria-live="polite">
                {running ? (
                  <span className="font-semibold text-on-soft-green">Running matching…</span>
                ) : last ? (
                  <>
                    Last matched <span className="font-medium text-ink">{timeAgo(last.finished_at)}</span> ·{" "}
                    <span className="tabular">{num(last.orders_processed)}</span> orders
                  </>
                ) : (
                  "Not matched yet"
                )}
              </p>
            </div>

            {/* Signature Mint Action Button */}
            <button
              type="button"
              onClick={run}
              disabled={running}
              aria-busy={running || undefined}
              className={cn(
                "group relative inline-flex h-10 shrink-0 select-none items-center gap-2 overflow-hidden rounded-full px-4 text-[13px] font-semibold text-ink whitespace-nowrap",
                "bg-gradient-to-b from-[#38ffb8] via-mint to-[#00d68f]",
                "border border-ink/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,240,160,0.30)]",
                "transition-all duration-200 ease-out",
                "hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_0_20px_rgba(0,240,160,0.55),0_2px_10px_rgba(0,0,0,0.12)]",
                "hover:scale-[1.02] active:scale-[0.97] active:brightness-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
                "disabled:cursor-wait disabled:opacity-90 disabled:hover:scale-100 disabled:hover:shadow-none"
              )}
            >
              {/* Ambient sheen sweep on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-full top-0 block -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:animate-shimmer"
              />

              {/* Icon micro-disc */}
              {running ? (
                <span
                  aria-hidden
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/15 text-ink"
                >
                  <RefreshCw size={12} className="animate-spin text-ink" />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/10 transition-all duration-200 group-hover:bg-ink group-hover:text-mint group-hover:scale-110"
                >
                  <Play size={10} className="ml-0.5 fill-current transition-colors" />
                </span>
              )}

              {/* Action label */}
              <span className="relative z-10 tracking-tight">
                {running ? "Matching orders…" : "Run matching"}
              </span>

              {/* Ambient readiness beacon */}
              {!running && (
                <span aria-hidden className="relative ml-0.5 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-30" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink/50" />
                </span>
              )}
            </button>
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-3xl md:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      <CommandPalette open={palette} onOpenChange={setPalette} />

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-hairline bg-canvas/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden shadow-layer-2"
      >
        {[...PRIMARY, { href: "#more", label: "More", icon: ICON.more } as Item].map((i) => {
          const isMore = i.href === "#more";
          const on = isMore ? sheet || SECONDARY.some((s) => active(s.href)) : active(i.href);
          const cls = cn(
            "relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
            on ? "text-ink font-bold" : "text-mute hover:text-body"
          );
          return isMore ? (
            <button
              key="more"
              className={cls}
              onClick={() => setSheet((s) => !s)}
              aria-expanded={sheet}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  (sheet || SECONDARY.some((s) => active(s.href))) && "bg-mint text-ink"
                )}
              >
                {i.icon}
              </span>
              <span>{i.label}</span>
              {pending > 0 && (
                <span
                  aria-hidden
                  className="absolute right-5 top-2 h-2 w-2 rounded-full bg-accent-yellow ring-2 ring-canvas animate-pulse"
                />
              )}
            </button>
          ) : (
            <Link
              key={i.href}
              href={i.href}
              className={cls}
              aria-current={on ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  on && "bg-mint text-ink shadow-xs"
                )}
              >
                {i.icon}
              </span>
              <span>{i.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Sheet / Drawer for More Items */}
      {sheet && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSheet(false)}
          />
          <div className="absolute inset-x-0 bottom-14 rounded-t-[28px] border-t border-hairline bg-canvas p-5 shadow-layer-4 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-hairline" aria-hidden />
            <p className="mb-2 px-3 text-eyebrow-sm uppercase tracking-wider text-mute">Operations</p>
            <div className="flex flex-col gap-1.5">{SECONDARY.map(link)}</div>
            <div className="mt-4 border-t border-hairline pt-4">
              <div className="flex items-center gap-3 px-3 py-2">
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-body-sm font-bold text-ink shadow-xs"
                >
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-caption text-body-mid">
                    {user.role === "cofounder" ? "Co-founder" : "Finance executive"}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-hairline bg-soft px-4 text-body-sm font-semibold text-body transition-colors hover:bg-accent-red/10 hover:text-on-soft-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <LogOut size={16} aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Brand mark: a double ring. Uses currentColor so it follows the surrounding text colour. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 256 256" fill="none" className={cn("h-8 w-8 shrink-0 text-ink", className)}>
      <path
        fill="currentColor"
        d="M 128 0 C 57.308 0 0 57.308 0 128 C 0 198.692 57.308 256 128 256 C 198.692 256 256 198.692 256 128 L 224 128 C 224 181.019 181.019 224 128 224 C 74.98 224 32 181.019 32 128 C 32 74.98 74.98 32 128 32 Z M 128 56 C 88.236 56 56 88.236 56 128 C 56 167.764 88.236 200 128 200 C 167.764 200 200 167.764 200 128 L 168 128 C 168 150.091 150.091 168 128 168 C 105.909 168 88 150.091 88 128 C 88 105.909 105.909 88 128 88 Z"
      />
    </svg>
  );
}
