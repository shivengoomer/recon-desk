"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { DiffBar, Money, PageHeader, StatusBadge } from "@/components/ui/bits";
import { Pagination, Select } from "@/components/ui/fields";
import { Chips } from "@/components/ui/chips";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, download, qs } from "@/lib/api";
import { CLAIM_TYPE_LABEL, rupees, shortDate } from "@/lib/format";
import type { ClaimPage, ClaimRow, Partner } from "@/lib/types";
import { useMatch } from "@/lib/match";
import { useFetch } from "@/lib/use-fetch";

const PAGE = 50;
const STATUSES = ["open", "filed", "recovered", "rejected"] as const;

function Claims() {
  const sp = useSearchParams();
  const toast = useToast();
  const [partner, setPartner] = useState(sp.get("partner_id") ?? "");
  const [status, setStatus] = useState("open");
  const [type, setType] = useState(sp.get("claim_type") ?? "");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<ClaimRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const { version } = useMatch();
  const partners = useFetch(() => api<Partner[]>("/api/partners"), []);
  const filters = { partner_id: partner, status: status || undefined, claim_type: type || undefined };
  const list = useFetch(() => api<ClaimPage>(`/api/claims${qs({ ...filters, page, page_size: PAGE })}`), [partner, status, type, page, version]);
  const d = list.data;
  const maxAmt = Math.max(0, ...(d?.items.map((c) => Number(c.amount)) ?? [0]));
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  async function exportCsv() {
    setExporting(true);
    try {
      await download(`/api/claims/export.csv${qs(filters)}`, "claims.csv");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader title="Claims" subtitle="What each partner owes us, with the evidence to raise it."
        actions={<Button variant="secondary" onClick={exportCsv} loading={exporting} disabled={!d?.total}>Export evidence CSV</Button>} />
      <div className="mb-4"><Chips label="Claim status" value={status} onChange={reset(setStatus)}
        options={[{ value: "open", label: "Open" }, { value: "filed", label: "Filed" }, { value: "recovered", label: "Recovered" }, { value: "rejected", label: "Rejected" }, { value: "", label: "All" }]} /></div>
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Select label="Partner" value={partner} onChange={(e) => reset(setPartner)(e.target.value)}>
          <option value="">All partners</option>
          {partners.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select label="Type" value={type} onChange={(e) => reset(setType)(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(CLAIM_TYPE_LABEL).filter(([k]) => k !== "return_not_received").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {list.loading && !d ? <ListSkeleton rows={8} /> : list.error ? <ErrorBanner message={list.error} onRetry={list.reload} /> :
        !d || d.items.length === 0 ? <EmptyState title="No claims here" hint={partner || type || status !== "open" ? "Try clearing a filter." : "Run matching after uploading files to find shortfalls."} /> : (
          <div className={list.loading ? "opacity-60 transition-opacity" : ""}>
            <div className="mb-3 flex items-baseline gap-3"><p className="tabular font-display text-display-sm text-ink">{rupees(d.amount_total)}</p><p className="text-body-sm text-body-mid tabular">across {d.total.toLocaleString("en-IN")} claims</p></div>
            <div className="hidden overflow-x-auto rounded-md border border-hairline bg-canvas md:block">
              <table className="w-full min-w-[760px] text-body-sm">
                <thead><tr className="border-b border-hairline bg-soft text-left text-eyebrow-sm uppercase text-body-mid">
                  <th className="px-4 py-3 font-medium">Partner</th><th className="px-4 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th><th className="px-4 py-3 text-right font-medium">Age</th><th className="px-4 py-3 font-medium">Status</th><th className="w-8" /></tr></thead>
                <tbody>{d.items.map((c) => (
                  <tr key={c.id} tabIndex={0} onClick={() => setSel(c)} onKeyDown={(e) => e.key === "Enter" && setSel(c)} className="cursor-pointer border-b border-hairline last:border-b-0 hover:bg-soft focus-visible:bg-soft">
                    <td className="px-4 py-3 font-medium text-ink">{c.partner}</td>
                    <td className="px-4 py-3 font-mono text-caption-mono">{c.order_ref}</td>
                    <td className="px-4 py-3">{CLAIM_TYPE_LABEL[c.claim_type]}</td>
                    <td className="px-4 py-3 text-right"><DiffBar value={c.amount} max={maxAmt} tone="ink" /></td>
                    <td className={`tabular px-4 py-3 text-right ${(c.age_days ?? 0) > 60 ? "font-semibold text-on-soft-red" : (c.age_days ?? 0) > 30 ? "text-on-soft-yellow" : ""}`}>{c.age_days === null ? "—" : `${c.age_days}d`}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="pr-3 text-mute" aria-hidden>›</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <ul className="flex flex-col gap-3 md:hidden">
              {d.items.map((c) => (
                <li key={c.id}><button onClick={() => setSel(c)} className="w-full rounded-md border border-hairline bg-canvas p-4 text-left hover:bg-soft">
                  <div className="flex items-start justify-between gap-2"><p className="text-body-md font-medium text-ink">{c.partner}</p><StatusBadge status={c.status} /></div>
                  <p className="mt-1 font-mono text-caption-mono text-body-mid">{c.order_ref}</p>
                  <div className="mt-3 flex items-center justify-between text-body-sm"><span className="text-body-mid">{CLAIM_TYPE_LABEL[c.claim_type]} · {c.age_days ?? "—"}d</span><Money value={c.amount} className="font-semibold text-ink" /></div>
                </button></li>))}
            </ul>
            <Pagination page={page} pageSize={PAGE} total={d.total} onPage={setPage} />
          </div>
        )}
      <Drawer open={!!sel} onClose={() => setSel(null)} title="Claim">
        {sel && <ClaimEditor key={sel.id} claim={sel} onSaved={() => { setSel(null); list.reload(); }} />}
      </Drawer>
    </>
  );
}

function ClaimEditor({ claim, onSaved }: { claim: ClaimRow; onSaved: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState(claim.status);
  const [note, setNote] = useState(claim.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needsNote = status === "rejected" && !note.trim();

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/claims/${claim.id}`, { method: "PATCH", json: { status, note } });
      toast("Claim updated");
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="tabular font-display text-display-sm text-ink">{rupees(claim.amount)}</p>
        <p className="mt-1 text-body-sm text-body-mid">{CLAIM_TYPE_LABEL[claim.claim_type]} · {claim.partner} · due {shortDate(claim.due_since)}</p>
        <p className="mt-1 font-mono text-caption-mono text-ink">{claim.order_ref}</p>
      </div>
      {err && <ErrorBanner message={err} />}
      <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as ClaimRow["status"])}>
        {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
      </Select>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-eyebrow-sm uppercase text-body-mid">Note {status === "rejected" && "(required)"}</label>
        <textarea id="note" rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ticket number, who you spoke to, outcome…"
          className="rounded-sm border border-hairline bg-canvas px-4 py-3 text-body-md text-ink" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} loading={busy} disabled={needsNote}>Save</Button>
        <a href={`/orders?q=${encodeURIComponent(claim.order_ref)}`} className={buttonClass("secondary")}>View order</a>
      </div>
    </div>
  );
}

export default function ClaimsPage() {
  return <Suspense fallback={<ListSkeleton />}><Claims /></Suspense>;
}
