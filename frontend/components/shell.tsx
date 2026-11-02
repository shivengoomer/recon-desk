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

const I = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);
const ICON = {
  dashboard: I("M3 10.5 10 4l7 6.5M5 9v7h4v-4h2v4h4V9"),
  orders: I("M4 5h12M4 10h12M4 15h8"),
  claims: I("M5 3h7l3 3v11H5zM12 3v3h3M8 10h4M8 13h4"),
  review: I("M4 10l4 4 8-8"),
  import: I("M10 13V3m0 0L6 7m4-4 4 4M4 15v2h12v-2"),
  rates: I("M4 16 16 4M6 6h.01M14 14h.01"),
  audit: I("M10 5v5l3 2M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"),
  more: I("M5 10h.01M10 10h.01M15 10h.01"),
  search: I("M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zM17 17l-3.5-3.5"),
  play: I("M6 4l10 6-10 6z"),
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
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [q, setQ] = useState("");
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
      className={cn("flex min-h-11 items-center gap-3 rounded-sm px-3 text-body-sm font-medium transition-colors",
        active(i.href) ? "bg-primary text-on-primary" : "text-body hover:bg-soft")}>
      {i.icon}
      <span className="flex-1">{i.label}</span>
      {!!i.badge && <span className={cn("tabular rounded-xs px-1.5 py-0.5 text-caption", active(i.href) ? "bg-white/20" : "bg-accent-yellow/25 text-on-soft-yellow")}>{num(i.badge)}</span>}
    </Link>
  );

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/orders?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-hairline bg-canvas px-4 py-5 lg:flex">
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
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-body-sm font-semibold text-ink">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium text-ink">{user.name}</p>
              <p className="text-body-sm text-body-mid">{user.role === "cofounder" ? "Co-founder" : "Finance executive"}</p>
            </div>
          </div>
          <button onClick={logout} className="mt-2 flex min-h-11 w-full items-center rounded-sm px-3 text-body-sm font-medium text-body hover:bg-soft">Sign out</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-hairline bg-canvas/95 px-4 py-2.5 backdrop-blur md:px-3xl">
          <Link href="/dashboard" className="flex items-center gap-2 text-body-md font-semibold text-ink lg:hidden"><Logo />Recon Desk</Link>
          <form onSubmit={search} role="search" className="relative hidden max-w-md flex-1 md:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute">{ICON.search}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find an order" placeholder="Find an order, e.g. ORD-W-204118"
              className="min-h-11 w-full rounded-sm border border-hairline bg-soft pl-10 pr-3 text-body-sm text-ink focus:bg-canvas" />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <p className="hidden text-body-sm text-body-mid md:block" aria-live="polite">
              {last ? <>Last matched <span className="font-medium text-ink">{timeAgo(last.finished_at)}</span> · <span className="tabular">{num(last.orders_processed)}</span> orders</> : "Not matched yet"}
            </p>
            <Button onClick={run} loading={running} className="!min-h-10 !px-4 !py-2">
              {!running && <span aria-hidden className="-ml-1">{ICON.play}</span>}Run matching
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-3xl md:pt-8 lg:pb-12">{children}</main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-hairline bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden">
        {[...PRIMARY, { href: "#more", label: "More", icon: ICON.more } as Item].map((i) => {
          const isMore = i.href === "#more";
          const on = isMore ? sheet || SECONDARY.some((s) => active(s.href)) : active(i.href);
          const cls = cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", on ? "text-ink" : "text-mute");
          return isMore ? (
            <button key="more" className={cls} onClick={() => setSheet((s) => !s)} aria-expanded={sheet}>{i.icon}{i.label}{pending > 0 && <span aria-hidden className="absolute right-6 top-2 h-2 w-2 rounded-full bg-accent-yellow" />}</button>
          ) : (
            <Link key={i.href} href={i.href} className={cls} aria-current={on ? "page" : undefined}>{i.icon}{i.label}</Link>
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
              <button onClick={logout} className="mt-1 flex min-h-11 w-full items-center rounded-sm px-3 text-body-sm font-medium text-body hover:bg-soft">Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span aria-hidden className={cn("flex h-7 w-7 items-center justify-center rounded-sm", light ? "bg-canvas text-primary" : "bg-primary text-on-primary")}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5 6.5 12 13 4.5" /></svg>
    </span>
  );
}
