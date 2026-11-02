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
import { CheckCheck, Ellipsis, FileText, LayoutDashboard, ListOrdered, Percent, Play, ScrollText, Search, Upload, type LucideIcon } from "lucide-react";

const ic = (C: LucideIcon) => <C size={20} strokeWidth={1.75} aria-hidden />;
const ICON = {
  dashboard: ic(LayoutDashboard), orders: ic(ListOrdered), claims: ic(FileText), review: ic(CheckCheck),
  import: ic(Upload), rates: ic(Percent), audit: ic(ScrollText), more: ic(Ellipsis),
  search: <Search size={18} aria-hidden />, play: <Play size={16} aria-hidden fill="currentColor" />,
};

interface Item { href: string; label: string; icon: React.ReactNode; cofounderOnly?: boolean; badge?: number }

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!ready || !user) {
    return <div className="flex min-h-screen items-center justify-center text-body-sm text-body-mid" role="status">Loading…</div>;
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

  useEffect(() => setSheet(false), [path]);
  useEffect(() => {
    api<Dashboard>("/api/dashboard").then((d) => setPending(d.pending_suggestions)).catch(() => {});
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
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  const link = (i: Item) => (
    <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
      className={cn("flex min-h-11 items-center gap-3 rounded-full px-4 text-body-sm font-semibold transition-colors",
        active(i.href) ? "bg-mint text-ink" : "text-body hover:bg-soft")}>
      {i.icon}
      <span className="flex-1">{i.label}</span>
      {!!i.badge && <span className={cn("tabular rounded-full px-2 py-0.5 text-caption", active(i.href) ? "bg-ink text-mint" : "bg-accent-yellow/25 text-on-soft-yellow")}>{num(i.badge)}</span>}
    </Link>
  );

  return (
    <div className="relative min-h-screen lg:flex">
      <Backdrop />
      <aside className="sticky top-0 z-10 hidden h-screen w-64 shrink-0 flex-col border-r border-hairline bg-canvas px-4 py-5 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 text-body-md font-semibold text-ink">
          <Logo />Recon Desk
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {PRIMARY.map(link)}
          <p className="mb-1 mt-6 px-3 text-eyebrow-sm uppercase text-mute">Work</p>
          {SECONDARY.map(link)}
        </nav>
        <div className="mt-auto border-t border-hairline pt-4">
          <div className="flex items-center gap-3 px-2 py-1">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-body-sm font-bold text-ink">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium text-ink">{user.name}</p>
              <p className="text-body-sm text-body-mid">{user.role === "cofounder" ? "Co-founder" : "Finance executive"}</p>
            </div>
          </div>
          <button onClick={logout} className="mt-2 flex min-h-11 w-full items-center rounded-full px-4 text-body-sm font-semibold text-body hover:bg-soft">Sign out</button>
        </div>
      </aside>

      <div className="relative z-10 min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-hairline bg-canvas/70 px-4 py-2.5 backdrop-blur-xl md:px-3xl">
          <Link href="/dashboard" className="flex items-center gap-2 text-body-md font-semibold text-ink lg:hidden"><Logo />Recon Desk</Link>
          <button onClick={() => setPalette(true)} aria-label="Search orders or jump to a page"
            className="relative hidden min-h-11 max-w-md flex-1 items-center gap-3 rounded-full border border-hairline bg-soft px-4 text-left text-body-sm text-mute transition-colors hover:border-ink hover:bg-canvas md:flex">
            {ICON.search}<span className="flex-1">Search orders, jump to…</span>
            <kbd className="rounded-full border border-hairline bg-canvas px-2 py-0.5 text-caption text-body-mid">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-body-sm text-body-mid md:block" aria-live="polite">
              {last ? <>Last matched <span className="font-medium text-ink">{timeAgo(last.finished_at)}</span> · <span className="tabular">{num(last.orders_processed)}</span> orders</> : "Not matched yet"}
            </p>
            <Button variant="mint" onClick={run} loading={running} className="!min-h-10 !px-5 !py-2">
              {!running && <span aria-hidden className="-ml-1">{ICON.play}</span>}Run matching
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-3xl md:pt-8 lg:pb-12">{children}</main>
      </div>

      <CommandPalette open={palette} onOpenChange={setPalette} />
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-hairline bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden">
        {[...PRIMARY, { href: "#more", label: "More", icon: ICON.more } as Item].map((i) => {
          const isMore = i.href === "#more";
          const on = isMore ? sheet || SECONDARY.some((s) => active(s.href)) : active(i.href);
          const cls = cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", on ? "text-ink" : "text-mute");
          return isMore ? (
            <button key="more" className={cls} onClick={() => setSheet((s) => !s)} aria-expanded={sheet}>{i.icon}{i.label}{pending > 0 && <span aria-hidden className="absolute right-6 top-2 h-2 w-2 rounded-full bg-accent-yellow" />}</button>
          ) : (
            <Link key={i.href} href={i.href} className={cls} aria-current={on ? "page" : undefined}><span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", on && "bg-mint")}>{i.icon}</span>{i.label}</Link>
          );
        })}
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-primary/40" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-14 rounded-t-md bg-canvas p-4 shadow-layer-4">
            <div className="flex flex-col gap-1">{SECONDARY.map(link)}</div>
            <div className="mt-3 border-t border-hairline pt-3">
              <p className="px-3 text-body-sm font-medium text-ink">{user.name}</p>
              <button onClick={logout} className="mt-1 flex min-h-11 w-full items-center rounded-full px-4 text-body-sm font-semibold text-body hover:bg-soft">Sign out</button>
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
      <path fill="currentColor" d="M 128 0 C 57.308 0 0 57.308 0 128 C 0 198.692 57.308 256 128 256 C 198.692 256 256 198.692 256 128 L 224 128 C 224 181.019 181.019 224 128 224 C 74.98 224 32 181.019 32 128 C 32 74.98 74.98 32 128 32 Z M 128 56 C 88.236 56 56 88.236 56 128 C 56 167.764 88.236 200 128 200 C 167.764 200 200 167.764 200 128 L 168 128 C 168 150.091 150.091 168 128 168 C 105.909 168 88 150.091 88 128 C 88 105.909 105.909 88 128 88 Z" />
    </svg>
  );
}
