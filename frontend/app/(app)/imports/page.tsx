"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow, PageHeader } from "@/components/ui/bits";
import { Select } from "@/components/ui/fields";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, download } from "@/lib/api";
import { cn } from "@/lib/cn";
import { KIND_LABEL, num, shortDate } from "@/lib/format";
import type { Batch, FieldDef, FileKind, Inspect, Mapping, Partner } from "@/lib/types";
import { useFetch } from "@/lib/use-fetch";

const KINDS: FileKind[] = ["orders", "settlement", "cod", "freight"];
const KIND_HINT: Record<FileKind, string> = {
  orders: "From your OMS or storefront", settlement: "Payout report from a channel", cod: "Remittance report from a courier", freight: "Freight invoice from a courier",
};
type Map = Record<string, string>;

export default function ImportsPage() {
  const toast = useToast();
  const partners = useFetch(() => api<Partner[]>("/api/partners"), []);
  const fields = useFetch(() => api<Record<FileKind, FieldDef[]>>("/api/mappings/fields"), []);
  const [kind, setKind] = useState<FileKind>("settlement");
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Inspect | null>(null);
  const [mapping, setMapping] = useState<Map>({});
  const [busy, setBusy] = useState<"inspect" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Batch | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const eligible = useMemo(() => (partners.data ?? []).filter((p) => p.kind === (kind === "orders" || kind === "settlement" ? "channel" : "courier")), [partners.data, kind]);
  useEffect(() => {
    if (eligible.length && !eligible.some((p) => p.id === partnerId)) setPartnerId(eligible[0].id);
  }, [eligible, partnerId]);

  const versions = useFetch(() => (partnerId ? api<Mapping[]>(`/api/mappings?partner_id=${partnerId}&file_kind=${kind}`) : Promise.resolve([])), [partnerId, kind]);
  const recent = useFetch(() => api<Batch[]>("/api/imports?limit=8"), []);
  const active = versions.data?.find((m) => m.status === "approved") ?? null;

  const inspect = useCallback(async (f: File, m?: Map) => {
    if (!partnerId) return;
    setBusy("inspect");
    setError(null);
    const form = new FormData();
    form.set("file", f);
    form.set("partner_id", String(partnerId));
    form.set("file_kind", kind);
    if (m) form.set("mapping", JSON.stringify(m));
    try {
      const res = await api<Inspect>("/api/imports/inspect", { form });
      setInfo(res);
      if (!m) {
        const useActive = res.active_matches_file && active;
        setMapping(useActive ? { ...active!.mapping } : Object.fromEntries(Object.entries(res.suggestion).map(([k, v]) => [k, v.column])));
        if (!useActive) void inspect(f, Object.fromEntries(Object.entries(res.suggestion).map(([k, v]) => [k, v.column])));
      }
    } catch (e) {
      setInfo(null);
      setError(e instanceof ApiError ? e.message : "Could not read the file");
    } finally {
      setBusy(null);
    }
  }, [partnerId, kind, active]);

  function pick(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setInfo(null);
    void inspect(f);
  }
  function reset() { setFile(null); setInfo(null); setMapping({}); setError(null); if (input.current) input.current.value = ""; }
  useEffect(() => { reset(); setResult(null); }, [kind, partnerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const defs = fields.data?.[kind] ?? [];
  const missingRequired = defs.filter((f) => f.required && !mapping[f.name]);
  const sameAsActive = !!active && JSON.stringify(sortKeys(active.mapping)) === JSON.stringify(sortKeys(clean(mapping)));
  const sameAsSuggestion = !!info && JSON.stringify(sortKeys(clean(mapping))) === JSON.stringify(sortKeys(Object.fromEntries(Object.entries(info.suggestion).map(([k, v]) => [k, v.column]))));

  async function approveAndImport() {
    if (!file || !partnerId) return;
    setBusy("import");
    setError(null);
    try {
      if (!sameAsActive) {
        const draft = await api<Mapping>("/api/mappings", { json: { partner_id: partnerId, file_kind: kind, mapping: clean(mapping), ai_suggested: sameAsSuggestion } });
        await api(`/api/mappings/${draft.id}/approve`, { method: "POST" });
      }
      const form = new FormData();
      form.set("file", file);
      form.set("partner_id", String(partnerId));
      form.set("file_kind", kind);
      const batch = await api<Batch>("/api/imports", { form });
      setResult(batch);
      toast(`Imported ${num(batch.accepted_count + batch.updated_count)} rows`);
      reset();
      versions.reload();
      recent.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function rollback(m: Mapping) {
    try {
      await api(`/api/mappings/${m.id}/rollback`, { method: "POST" });
      toast(`Rolled back to the version ${m.version} mapping`);
      versions.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not roll back", "error");
    }
  }

  const colOptions = info?.headers ?? [];
  const mappedFields = defs.filter((f) => mapping[f.name]);

  return (
    <>
      <PageHeader title="Import files" subtitle="CSV or Excel. Column mappings are saved per partner and file type, previewed on 20 rows, and versioned." />

      <section aria-labelledby="s1" className="mb-6">
        <h2 id="s1" className="mb-3 text-display-xs">1. What are you uploading?</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="File type">
          {KINDS.map((k) => (
            <button key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={cn("min-h-11 rounded-md border p-4 text-left transition-colors", kind === k ? "border-primary bg-primary text-on-primary" : "border-hairline bg-canvas hover:bg-soft")}>
              <p className="text-body-md font-medium">{KIND_LABEL[k]}</p>
              <p className={cn("mt-1 text-body-sm", kind === k ? "text-on-primary/70" : "text-body-mid")}>{KIND_HINT[k]}</p>
            </button>))}
        </div>
        <div className="mt-4 max-w-sm">
          <Select label={kind === "orders" || kind === "settlement" ? "Channel" : "Courier"} value={partnerId ?? ""} onChange={(e) => setPartnerId(Number(e.target.value))}>
            {eligible.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        {kind === "orders" && <p className="mt-2 text-body-sm text-body-mid">If the file has a Channel column, map it and one file can cover every channel.</p>}
      </section>

      <section aria-labelledby="s2" className="mb-6">
        <h2 id="s2" className="mb-3 text-display-xs">2. Choose the file</h2>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={cn("flex flex-col items-center gap-3 rounded-md border border-dashed px-6 py-10 text-center transition-colors", drag ? "border-primary bg-soft" : "border-hairline bg-soft")}>
          <p className="text-body-md text-ink">{file ? file.name : "Drag a .csv or .xlsx file here"}</p>
          {file && <p className="text-body-sm text-body-mid tabular">{(file.size / 1024).toFixed(0)} KB</p>}
          <input ref={input} type="file" accept=".csv,.xlsx,.txt" className="sr-only" id="file" onChange={(e) => pick(e.target.files?.[0])} />
          <Button variant="secondary" onClick={() => input.current?.click()} loading={busy === "inspect"}>{file ? "Choose a different file" : "Browse files"}</Button>
        </div>
      </section>

      {error && <div className="mb-6"><ErrorBanner message={error} /></div>}

      {file && !info && busy === "inspect" && <ListSkeleton rows={4} />}

      {file && info && (
        <>
          <section aria-labelledby="s3" className="mb-6">
            <h2 id="s3" className="mb-1 text-display-xs">3. Check the column mapping</h2>
            <p className="mb-3 text-body-sm text-body-mid">
              {info.active_matches_file && sameAsActive ? `Using your saved mapping (version ${active?.version}).`
                : active && !info.active_matches_file ? "This file's columns differ from your saved mapping. A suggested mapping is shown; review it before approving."
                  : "Suggested from the column names. Nothing is saved until you approve."}
            </p>
            <div className="overflow-hidden rounded-md border border-hairline">
              {defs.map((f) => {
                const sug = info.suggestion[f.name];
                return (
                  <div key={f.name} className="grid grid-cols-1 gap-2 border-b border-hairline px-4 py-3 last:border-b-0 md:grid-cols-[220px_1fr_auto] md:items-center md:gap-4">
                    <label htmlFor={`m-${f.name}`} className="text-body-sm font-medium text-ink">{f.label}{f.required && <span className="text-on-soft-red"> *</span>}</label>
                    <select id={`m-${f.name}`} value={mapping[f.name] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f.name]: e.target.value }))}
                      className="min-h-11 w-full rounded-sm border border-hairline bg-canvas px-3 text-body-sm text-ink">
                      <option value="">{f.required ? "Choose a column…" : "Not in this file"}</option>
                      {colOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="min-h-6">{sug && mapping[f.name] === sug.column && <Badge tone={sug.confidence >= 0.9 ? "auto" : "review"}>Suggested {Math.round(sug.confidence * 100)}%</Badge>}</div>
                  </div>);
              })}
            </div>
            <div className="mt-3"><Button variant="secondary" onClick={() => file && inspect(file, clean(mapping))} loading={busy === "inspect"} disabled={missingRequired.length > 0}>Refresh preview</Button></div>
          </section>

          <section aria-labelledby="s4" className="mb-6">
            <h2 id="s4" className="mb-3 text-display-xs">4. Preview first 20 rows</h2>
            {info.preview_error ? <ErrorBanner message={info.preview_error} /> : !info.preview ? <p className="text-body-sm text-body-mid">Map the required columns to see a preview.</p> : (
              <>
                <p className="mb-2 text-body-sm text-body-mid tabular"><span className="font-medium text-on-soft-green">{info.preview.ok_count} readable</span>{info.preview.error_count > 0 && <> · <span className="font-medium text-on-soft-red">{info.preview.error_count} with problems</span></>}</p>
                <div className="overflow-x-auto rounded-md border border-hairline">
                  <table className="w-full min-w-[640px] text-body-sm">
                    <thead><tr className="border-b border-hairline bg-soft text-left text-eyebrow-sm uppercase text-body-mid">
                      <th className="px-3 py-2 font-medium">Row</th>{mappedFields.map((f) => <th key={f.name} className="px-3 py-2 font-medium">{f.label}</th>)}</tr></thead>
                    <tbody>{info.preview.rows.map((r) => (
                      <tr key={r.row} className={cn("border-b border-hairline last:border-b-0", !r.ok && "bg-accent-red/5")}>
                        <td className="tabular px-3 py-2 text-body-mid">{r.row}</td>
                        {r.ok ? mappedFields.map((f) => <td key={f.name} className="tabular whitespace-nowrap px-3 py-2">{String(r.values[f.name] ?? r.values[`${f.name}_id`] ?? "—")}</td>)
                          : <td colSpan={mappedFields.length} className="px-3 py-2 font-medium text-on-soft-red">{r.error}</td>}
                      </tr>))}</tbody>
                  </table>
                </div>
              </>)}
          </section>

          <div className="mb-10 flex flex-wrap items-center gap-3">
            <Button onClick={approveAndImport} loading={busy === "import"} disabled={missingRequired.length > 0 || !info.preview}>
              {sameAsActive ? "Import file" : "Approve mapping and import"}
            </Button>
            {missingRequired.length > 0 && <p className="text-body-sm text-on-soft-red">Map: {missingRequired.map((f) => f.label).join(", ")}</p>}
          </div>
        </>
      )}

      {result && (
        <Card className="mb-10 !p-5 md:!p-6" role="status">
          <Eyebrow>Import complete · {result.file_name}</Eyebrow>
          <dl className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-5">
            {([["Rows read", result.row_count], ["New", result.accepted_count], ["Updated", result.updated_count], ["Already imported", result.duplicate_count], ["Rejected", result.rejected_count]] as const).map(([l, v]) => (
              <div key={l}><dt className="text-body-sm text-body-mid">{l}</dt><dd className="tabular text-display-xs text-ink">{num(v)}</dd></div>))}
          </dl>
          {result.rejected_count > 0 && <div className="mt-4"><Button variant="secondary" onClick={() => download(`/api/imports/${result.id}/rejects.csv`, "rejects.csv")}>Download rejected rows</Button></div>}
          <p className="mt-4 text-body-sm text-body-mid">Next: run matching from the dashboard to refresh claims.</p>
        </Card>)}

      <section aria-labelledby="hist" className="mb-10">
        <h2 id="hist" className="mb-3 text-display-xs">Mapping versions</h2>
        {versions.loading && !versions.data ? <ListSkeleton rows={2} /> : versions.error ? <ErrorBanner message={versions.error} onRetry={versions.reload} /> :
          !versions.data?.length ? <EmptyState title="No saved mapping yet" hint="Upload a file and approve a mapping to save it for this source." /> : (
            <ul className="divide-y divide-hairline rounded-md border border-hairline">
              {versions.data.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="tabular text-body-md font-medium text-ink">Version {m.version}</span>
                    <Badge tone={m.status === "approved" ? "auto" : "neutral"}>{m.status === "approved" ? "Active" : m.status}</Badge>
                    {m.ai_suggested && <Badge tone="info">AI-suggested</Badge>}
                    <span className="text-body-sm text-body-mid">{shortDate(m.created_at)}</span>
                  </div>
                  {m.status === "superseded" && <Button variant="secondary" onClick={() => rollback(m)}>Roll back to this</Button>}
                </li>))}
            </ul>)}
      </section>

      <section aria-labelledby="rec">
        <h2 id="rec" className="mb-3 text-display-xs">Recent imports</h2>
        {recent.loading && !recent.data ? <ListSkeleton rows={3} /> : recent.error ? <ErrorBanner message={recent.error} onRetry={recent.reload} /> :
          !recent.data?.length ? <EmptyState title="No imports yet" /> : (
            <ul className="divide-y divide-hairline rounded-md border border-hairline">
              {recent.data.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-body-sm">
                  <div><p className="font-medium text-ink">{b.file_name}</p><p className="text-body-mid">{KIND_LABEL[b.file_kind]} · {shortDate(b.created_at)}</p></div>
                  <p className="tabular text-body-mid">{num(b.accepted_count)} new · {num(b.duplicate_count)} dup · {num(b.rejected_count)} rejected</p>
                </li>))}
            </ul>)}
      </section>
    </>
  );
}

const clean = (m: Map): Map => Object.fromEntries(Object.entries(m).filter(([, v]) => v));
const sortKeys = (m: Map): Map => Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));
