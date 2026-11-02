"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow, PageHeader } from "@/components/ui/bits";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { rupees, shortDate } from "@/lib/format";
import type { Suggestion } from "@/lib/types";
import { useMatch } from "@/lib/match";
import { useFetch } from "@/lib/use-fetch";

export default function ReviewPage() {
  const toast = useToast();
  const { version } = useMatch();
  const { data, error, loading, reload, setData } = useFetch(() => api<Suggestion[]>("/api/suggestions?limit=100"), [version]);
  const [busy, setBusy] = useState<number | null>(null);

  async function decide(s: Suggestion, action: "confirm" | "reject") {
    setBusy(s.id);
    try {
      await api(`/api/suggestions/${s.id}/${action}`, { method: "POST" });
      toast(action === "confirm" ? `Matched to ${s.candidate_order_ref}` : "Suggestion rejected");
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not save", "error");
      if (e instanceof ApiError && e.status === 409) setData((d) => d?.filter((x) => x.id !== s.id) ?? d);
    } finally {
      setBusy(null);
    }
  }

  // group candidates by the partner row they would explain
  const groups = new Map<string, Suggestion[]>();
  data?.forEach((s) => groups.set(`${s.line_table}:${s.line_id}`, [...(groups.get(`${s.line_table}:${s.line_id}`) ?? []), s]));

  return (
    <>
      <PageHeader title="Review matches" subtitle="Partner rows with no usable order ID. These are suggestions only; nothing is applied until you confirm." />
      {loading && !data ? <ListSkeleton rows={4} /> : error ? <ErrorBanner message={error} onRetry={reload} /> :
        groups.size === 0 ? <EmptyState title="Nothing to review" hint="Every partner row either matched an order or has no likely candidate." /> : (
          <div className="flex flex-col gap-5">
            {[...groups.values()].map((cands) => {
              const first = cands[0];
              return (
                <Card key={`${first.line_table}:${first.line_id}`} className="!p-5 md:!p-6">
                  <Eyebrow>{first.line_table === "cod_remittances" ? "COD remittance row" : "Settlement row"}</Eyebrow>
                  <p className="tabular mt-1 text-display-xs text-ink">{rupees(first.line_amount)} <span className="text-body-sm font-normal text-body-mid">· {shortDate(first.line_date)}{first.line_ref ? ` · ref “${first.line_ref}”` : " · no order ID"}</span></p>
                  <ul className="mt-4 divide-y divide-hairline rounded-md border border-hairline bg-canvas">
                    {cands.map((s) => (
                      <li key={s.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="font-mono text-caption-mono text-ink">{s.candidate_order_ref} <span className="text-body-mid">· {rupees(s.candidate_value)}</span></p>
                          <p className="mt-1 text-body-sm text-body-mid">{s.reason}</p>
                          <p className="mt-1 text-body-sm text-body-mid">Confidence <span className="tabular font-medium text-ink">{Math.round(Number(s.score) * 100)}%</span></p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button variant="secondary" onClick={() => decide(s, "reject")} disabled={busy === s.id}>Reject</Button>
                          <Button onClick={() => decide(s, "confirm")} loading={busy === s.id}>Confirm match</Button>
                        </div>
                      </li>))}
                  </ul>
                </Card>);
            })}
          </div>
        )}
    </>
  );
}
