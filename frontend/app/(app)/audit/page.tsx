"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/bits";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";

interface Entry { id: number; actor: string | null; action: string; entity: string; entity_id: string | null; before: unknown; after: unknown; at: string }
const PAGE = 50;

export default function AuditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const allowed = user?.role === "cofounder";
  useEffect(() => { if (user && !allowed) router.replace("/dashboard"); }, [user, allowed, router]);
  const { data, error, loading, reload } = useFetch(() => (allowed ? api<Entry[]>(`/api/audit-log?page=${page}&page_size=${PAGE}`) : Promise.resolve([])), [page, allowed]);
  if (!allowed) return null;
  return (
    <>
      <PageHeader title="Audit log" subtitle="Every change, who made it and when. This log cannot be edited." />
      {loading && !data ? <ListSkeleton rows={8} /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="No activity yet" /> : (
        <>
          <ul className="divide-y divide-hairline rounded-md border border-hairline bg-canvas">
            {data.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <details>
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-caption-mono text-ink">{e.action}</span>
                    <span className="text-body-sm text-body-mid">{e.actor ?? "system"} · {e.entity}{e.entity_id ? ` #${e.entity_id}` : ""}</span>
                    <span className="tabular ml-auto text-body-sm text-body-mid">{shortDate(e.at)} {new Date(e.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-sm bg-soft p-3 font-mono text-caption-mono text-body">{JSON.stringify({ before: e.before, after: e.after }, null, 2)}</pre>
                </details>
              </li>))}
          </ul>
          <div className="flex items-center justify-between pt-4">
            <p className="text-body-sm text-body-mid">Page {page}</p>
            <div className="flex gap-2">
              <button className="min-h-11 rounded-sm border border-hairline px-4 text-body-sm font-medium hover:bg-soft disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="min-h-11 rounded-sm border border-hairline px-4 text-body-sm font-medium hover:bg-soft disabled:opacity-40" disabled={data.length < PAGE} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
