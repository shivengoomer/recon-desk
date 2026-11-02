"use client";
import { BarChart3, Clock, PieChart } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, ErrorBanner, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMatch } from "@/lib/match";
import type { ClaimPage, Dashboard, TaxRow } from "@/lib/types";
import { useFetch } from "@/lib/use-fetch";
import { AutoMatch, Hero, MobileOverview, Pipeline, TypeCards } from "./hero";
import { Actions, Attention, Freshness, Scorecard, Tax } from "./lists";
import { Panel, PanelLink, Reveal } from "./panel";
import { AgeBars, StatusDonut } from "./viz";

function Header() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = `${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}${user ? `, ${user.name.split(" ")[0]}` : ""}`;
  return (
    <div className="mb-6 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-eyebrow-sm uppercase text-body-mid">{greeting}</p>
        <h1 className="font-display mt-1 text-display-md md:text-display-lg">Money at risk</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-body-mid">Short, late or overcharged amounts across partners, aged from the date they fell due.</p>
      </div>
      <p className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-hairline bg-canvas px-4 py-2 text-body-sm font-semibold text-ink md:mt-0">
        <Clock size={14} aria-hidden />As of {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { version } = useMatch();
  const dash = useFetch(() => api<Dashboard>("/api/dashboard"), [version]);
  const tax = useFetch(() => api<TaxRow[]>("/api/tax-summary"), [version]);
  const top = useFetch(() => api<ClaimPage>("/api/claims?status=open&page_size=5"), [version]);

  if (dash.loading && !dash.data) {
    return (
      <>
        <Header />
        <div role="status" aria-label="Loading dashboard" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-80 rounded-md lg:col-span-8" /><Skeleton className="h-80 rounded-md lg:col-span-4" />
          <Skeleton className="h-52 rounded-md lg:col-span-12" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-md lg:col-span-4" />)}
          <Skeleton className="h-96 rounded-md lg:col-span-7" /><Skeleton className="h-96 rounded-md lg:col-span-5" />
        </div>
      </>
    );
  }
  if (dash.error || !dash.data) return <><Header /><ErrorBanner message={dash.error ?? "Could not load the dashboard"} onRetry={dash.reload} /></>;
  const d = dash.data;
  if (d.orders === 0) {
    return (
      <><Header /><EmptyState title="Nothing reconciled yet" hint="Upload your order, settlement, COD and freight files, then run matching."
        action={<Link href="/imports" className={buttonClass("primary")}>Upload files</Link>} /></>
    );
  }

  return (
    <>
      <Header />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Reveal i={0} className="lg:col-span-8"><Hero d={d} /></Reveal>
        <Reveal i={1} className="hidden lg:col-span-4 lg:block"><AutoMatch d={d} /></Reveal>
        <Reveal i={1} className="lg:hidden"><MobileOverview d={d} /></Reveal>
        <Reveal i={2} className="lg:col-span-12"><Pipeline d={d} /></Reveal>
        <TypeCards d={d} />
        <Reveal i={3} className="lg:col-span-7">
          <Panel icon={BarChart3} title="By partner and age" hint="Who owes you, and for how long" action={<PanelLink href="/claims">All claims</PanelLink>}>
            {d.by_partner.length === 0 ? <EmptyState title="No open claims" hint="Everything due has been paid correctly." /> : <AgeBars data={d.by_partner} />}
          </Panel>
        </Reveal>
        <Reveal i={4} className="lg:col-span-5">
          <Panel icon={PieChart} title="Order status" hint="Every order, after the latest run">
            <StatusDonut counts={d.status_counts} total={d.orders} />
          </Panel>
        </Reveal>
        <Reveal i={5} className="lg:col-span-7"><Attention f={top} /></Reveal>
        <Reveal i={6} className="lg:col-span-5"><Actions d={d} /></Reveal>
        <Reveal i={7} className="lg:col-span-8"><Scorecard d={d} /></Reveal>
        <Reveal i={8} className="lg:col-span-4"><Freshness d={d} /></Reveal>
        <Reveal i={9} className="lg:col-span-12"><Tax f={tax} /></Reveal>
      </div>
    </>
  );
}
