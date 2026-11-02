"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { DiffBar, Money, PageHeader, StatusBadge } from "@/components/ui/bits";
import { Pagination } from "@/components/ui/fields";
import { Chips } from "@/components/ui/chips";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/ui/states";
import { api, qs } from "@/lib/api";
import { rupees, shortDate, STATUS_LABEL } from "@/lib/format";
import type { Dashboard, OrderPage, OrderRow, Partner } from "@/lib/types";
import { useMatch } from "@/lib/match";
import { useFetch } from "@/lib/use-fetch";
import { OrderDetail } from "./detail";

const PAGE = 50;

function Orders() {
  const sp = useSearchParams();
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<OrderRow | null>(null);
  const { version } = useMatch();
  const partners = useFetch(() => api<Partner[]>("/api/partners"), []);
  const counts = useFetch(() => api<Dashboard>("/api/dashboard"), [version]);
  const list = useFetch(
    () => api<OrderPage>(`/api/orders${qs({ status: status || undefined, channel_id: channel, q, page, page_size: PAGE })}`),
    [status, channel, q, page, version],
  );
  const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };
  const d = list.data;
  const maxDiff = Math.max(0, ...(d?.items.map((o) => Math.abs(Number(o.difference))) ?? [0]));

  return (
    <>
      <PageHeader title="Orders" subtitle="Every order against what its partners paid. Largest differences first." />
      <div className="mb-4">
        <Chips label="Status" value={status} onChange={set(setStatus)} options={[
          { value: "", label: "All", count: counts.data?.orders },
          ...["unpaid_past_due", "short_paid", "freight_overcharged", "over_paid", "pending", "settled"].map((k) => ({ value: k, label: STATUS_LABEL[k], count: counts.data?.status_counts[k] ?? 0 })),
        ]} />
      </div>
      {/* Filter bar — unified inline pill strip */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search — grows to fill available space */}
        <div className="relative flex-1">
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute">
            <Search size={15} />
          </span>
          <input
            aria-label="Search order ID"
            placeholder="Search order ID — e.g. ORD-W-204118"
            value={q}
            onChange={(e) => set(setQ)(e.target.value)}
            className="min-h-10 w-full rounded-md border border-hairline bg-canvas pl-9 pr-4 text-body-sm text-ink placeholder:text-mute transition-colors focus:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
        </div>

        {/* Channel select — fixed width */}
        <div className="relative w-full sm:w-52">
          <select
            aria-label="Filter by channel"
            value={channel}
            onChange={(e) => set(setChannel)(e.target.value)}
            className="min-h-10 w-full appearance-none rounded-md border border-hairline bg-canvas pl-3.5 pr-9 text-body-sm text-ink transition-colors focus:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <option value="">All channels</option>
            {partners.data?.filter((p) => p.kind === "channel").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-mute" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>

        {/* Clear pill — only when active */}
        {(q || channel || status) && (
          <button
            type="button"
            onClick={() => { setQ(""); setChannel(""); setStatus(""); setPage(1); }}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-hairline bg-canvas px-4 text-body-sm font-medium text-body-mid transition-colors hover:border-ink hover:text-ink"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
            Clear
          </button>
        )}
      </div>

      {list.loading && !d ? <ListSkeleton rows={8} /> : list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> :
        !d || d.items.length === 0 ? (
          <EmptyState title="No orders match" hint={q || status || channel ? "Try clearing a filter." : "Upload files and run matching to see orders here."} />
        ) : (
          <div className={list.loading ? "opacity-60 transition-opacity" : ""}>
            <p className="mb-2 text-body-sm text-body-mid tabular">{d.total.toLocaleString("en-IN")} orders · net difference <Money value={d.difference_total} diff /></p>
            <div className="hidden overflow-x-auto rounded-md border border-hairline bg-canvas md:block">
              <table className="w-full min-w-[860px] text-body-sm">
                <thead><tr className="border-b border-hairline bg-soft text-left text-eyebrow-sm uppercase text-body-mid">
                  <th className="px-4 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Expected</th>
                  <th className="px-4 py-3 text-right font-medium">Received</th><th className="px-4 py-3 text-right font-medium">Difference</th>
                  <th className="px-4 py-3 text-right font-medium">Freight</th><th className="w-8" /></tr></thead>
                <tbody>{d.items.map((o) => (
                  <tr key={o.id} tabIndex={0} onClick={() => setOpen(o)} onKeyDown={(e) => e.key === "Enter" && setOpen(o)}
                    className="cursor-pointer border-b border-hairline last:border-b-0 hover:bg-soft focus-visible:bg-soft">
                    <td className="px-4 py-3"><p className="font-mono text-caption-mono text-ink">{o.order_ref}</p><p className="text-body-sm text-body-mid">{shortDate(o.order_date)} · {o.payment_mode.toUpperCase()}</p></td>
                    <td className="px-4 py-3">{o.channel}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-right"><Money value={o.expected} /></td>
                    <td className="px-4 py-3 text-right"><Money value={o.received} /></td>
                    <td className="px-4 py-3 text-right"><DiffBar value={o.difference} max={maxDiff} /></td>
                    <td className="px-4 py-3 text-right"><Money value={o.freight_difference} diff /></td>
                    <td className="pr-3 text-mute" aria-hidden>›</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <ul className="flex flex-col gap-3 md:hidden">
              {d.items.map((o) => (
                <li key={o.id}>
                  <button onClick={() => setOpen(o)} className="w-full rounded-md border border-hairline bg-canvas p-4 text-left hover:bg-soft">
                    <div className="flex items-start justify-between gap-2"><p className="font-mono text-caption-mono text-ink">{o.order_ref}</p><StatusBadge status={o.status} /></div>
                    <p className="mt-1 text-body-sm text-body-mid">{o.channel} · {shortDate(o.order_date)}</p>
                    <div className="mt-3 flex items-center justify-between"><span className="text-body-sm text-body-mid">Expected {rupees(o.expected)}</span><Money value={o.difference} diff /></div>
                  </button>
                </li>))}
            </ul>
            <Pagination page={page} pageSize={PAGE} total={d.total} onPage={setPage} />
          </div>
        )}
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.order_ref ?? "Order"}>{open && <OrderDetail id={open.id} />}</Drawer>
    </>
  );
}

export default function OrdersPage() {
  return <Suspense fallback={<ListSkeleton />}><Orders /></Suspense>;
}
