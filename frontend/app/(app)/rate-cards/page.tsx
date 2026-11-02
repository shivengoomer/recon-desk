"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/bits";
import { Select } from "@/components/ui/fields";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { rupees, shortDate } from "@/lib/format";
import type { Partner, RateCard, RateLine } from "@/lib/types";
import { useFetch } from "@/lib/use-fetch";

const blank = (): RateLine => ({ payment_mode: null, commission_pct: null, fixed_fee: null, shipping_fee: null, weight_min_g: null, weight_max_g: null, base_rate: null, cod_fee_pct: null, cod_fee_min: null });

function describe(l: RateLine, courier: boolean): string {
  if (courier) {
    const cod = l.cod_fee_pct || l.cod_fee_min ? ` + COD ${l.cod_fee_pct ?? 0}% (min ${rupees(l.cod_fee_min)})` : "";
    return `${l.weight_min_g}–${l.weight_max_g} g: ${rupees(l.base_rate)}${cod}`;
  }
  const parts = [l.commission_pct && `${Number(l.commission_pct)}% commission`, Number(l.fixed_fee) > 0 && `${rupees(l.fixed_fee)} fixed`, Number(l.shipping_fee) > 0 && `${rupees(l.shipping_fee)} shipping`].filter(Boolean);
  return `${l.payment_mode ? l.payment_mode.toUpperCase() : "All payments"}: ${parts.join(" + ") || "no deductions"}`;
}

export default function RateCardsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "cofounder";
  const toast = useToast();
  const partners = useFetch(() => api<Partner[]>("/api/partners"), []);
  const cards = useFetch(() => api<RateCard[]>("/api/rate-cards"), []);
  const settings = useFetch(() => api<{ tolerance_inr: number }>("/api/settings"), []);
  const [editing, setEditing] = useState<RateCard | "new" | null>(null);
  const [tol, setTol] = useState<string | null>(null);
  const byId = new Map(partners.data?.map((p) => [p.id, p]));

  async function saveTolerance() {
    try {
      await api("/api/settings", { method: "PUT", json: { tolerance_inr: Number(tol) } });
      toast("Tolerance updated. Run matching to apply it.");
      settings.reload();
      setTol(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not save", "error");
    }
  }

  return (
    <>
      <PageHeader title="Rate cards" subtitle="What each partner should charge. Expected amounts and gaps are computed from these."
        actions={canEdit && <Button onClick={() => setEditing("new")}>Add rate card</Button>} />

      <section className="mb-8 rounded-md border border-hairline p-5">
        <p className="text-eyebrow-sm uppercase text-body-mid">Gap tolerance</p>
        {settings.error ? <ErrorBanner message={settings.error} onRetry={settings.reload} /> : (
          <div className="mt-2 flex flex-wrap items-end gap-4">
            {canEdit ? (
              <>
                <div className="w-40"><Input label="Rupees" type="number" min={0} max={10000} value={tol ?? settings.data?.tolerance_inr ?? ""} onChange={(e) => setTol(e.target.value)} /></div>
                <Button variant="secondary" onClick={saveTolerance} disabled={tol === null || tol === "" || Number(tol) === settings.data?.tolerance_inr}>Save</Button>
              </>
            ) : <p className="tabular text-display-xs text-ink">{settings.data ? rupees(settings.data.tolerance_inr, { decimals: false }) : "—"}</p>}
            <p className="max-w-md text-body-sm text-body-mid">Differences up to this amount are treated as settled.</p>
          </div>)}
      </section>

      {cards.loading && !cards.data ? <ListSkeleton rows={4} /> : cards.error ? <ErrorBanner message={cards.error} onRetry={cards.reload} /> :
        !cards.data?.length ? <EmptyState title="No rate cards yet" hint={canEdit ? "Add one per channel and courier so expected amounts can be computed." : "Ask the co-founder to add rate cards."} /> : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {cards.data.map((c) => {
              const p = byId.get(c.partner_id);
              const courier = p?.kind === "courier";
              return (
                <li key={c.id} className="rounded-md border border-hairline p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-body-md font-medium text-ink">{p?.name ?? "Partner"}</p><p className="text-body-sm text-body-mid">{c.name} · from {shortDate(c.effective_from)}{c.effective_to ? ` to ${shortDate(c.effective_to)}` : ""}</p></div>
                    <Badge tone="neutral">{courier ? "Courier" : "Channel"}</Badge>
                  </div>
                  <ul className="mt-3 flex flex-col gap-1 text-body-sm text-body">{c.lines.map((l, i) => <li key={i} className="tabular">{describe(l, courier)}</li>)}</ul>
                  {canEdit && <div className="mt-4"><Button variant="secondary" onClick={() => setEditing(c)}>Edit</Button></div>}
                </li>);
            })}
          </ul>)}

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add rate card" : "Edit rate card"}>
        {editing && partners.data && <CardForm key={editing === "new" ? "new" : editing.id} card={editing === "new" ? null : editing} partners={partners.data}
          onDone={() => { setEditing(null); cards.reload(); }} />}
      </Drawer>
    </>
  );
}

function CardForm({ card, partners, onDone }: { card: RateCard | null; partners: Partner[]; onDone: () => void }) {
  const toast = useToast();
  const [partnerId, setPartnerId] = useState(card?.partner_id ?? partners[0].id);
  const [name, setName] = useState(card?.name ?? "");
  const [from, setFrom] = useState(card?.effective_from ?? new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(card?.effective_to ?? "");
  const [lines, setLines] = useState<RateLine[]>(card?.lines.length ? card.lines : [blank()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const courier = partners.find((p) => p.id === partnerId)?.kind === "courier";

  const set = (i: number, patch: Partial<RateLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const num = (v: string) => (v === "" ? null : v);
  const int = (v: string) => (v === "" ? null : Number(v));

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const body = { partner_id: partnerId, name, effective_from: from, effective_to: to || null, lines };
      await (card ? api(`/api/rate-cards/${card.id}`, { method: "PUT", json: body }) : api("/api/rate-cards", { json: body }));
      toast("Rate card saved. Run matching to apply it.");
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!card || !confirm("Delete this rate card? Orders it covered will no longer be judged.")) return;
    try {
      await api(`/api/rate-cards/${card.id}`, { method: "DELETE" });
      toast("Rate card deleted");
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not delete");
    }
  }
  const f = "min-h-11 w-full rounded-sm border border-hairline bg-canvas px-3 text-body-sm text-ink";
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="flex flex-col gap-1 text-body-sm text-body-mid">{t}{children}</label>;

  return (
    <div className="flex flex-col gap-5">
      {err && <ErrorBanner message={err} />}
      <Select label="Partner" value={partnerId} disabled={!!card} onChange={(e) => { setPartnerId(Number(e.target.value)); setLines([blank()]); }}>
        {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.kind})</option>)}
      </Select>
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Effective from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Effective to (optional)" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="flex flex-col gap-3">
        {lines.map((l, i) => (
          <fieldset key={i} className="rounded-md border border-hairline p-4">
            <legend className="px-1 text-eyebrow-sm uppercase text-body-mid">{courier ? "Weight slab" : "Line"} {i + 1}</legend>
            <div className="grid grid-cols-2 gap-3">
              {courier ? (
                <>
                  <L t="From (g)"><input className={f} type="number" min={0} value={l.weight_min_g ?? ""} onChange={(e) => set(i, { weight_min_g: int(e.target.value) })} /></L>
                  <L t="To (g)"><input className={f} type="number" min={0} value={l.weight_max_g ?? ""} onChange={(e) => set(i, { weight_max_g: int(e.target.value) })} /></L>
                  <L t="Base rate ₹"><input className={f} type="number" min={0} step="0.01" value={l.base_rate ?? ""} onChange={(e) => set(i, { base_rate: num(e.target.value) })} /></L>
                  <L t="COD fee %"><input className={f} type="number" min={0} max={100} step="0.01" value={l.cod_fee_pct ?? ""} onChange={(e) => set(i, { cod_fee_pct: num(e.target.value) })} /></L>
                  <L t="COD fee minimum ₹"><input className={f} type="number" min={0} step="0.01" value={l.cod_fee_min ?? ""} onChange={(e) => set(i, { cod_fee_min: num(e.target.value) })} /></L>
                </>
              ) : (
                <>
                  <L t="Applies to"><select className={f} value={l.payment_mode ?? ""} onChange={(e) => set(i, { payment_mode: e.target.value || null })}><option value="">All payments</option><option value="prepaid">Prepaid</option><option value="cod">COD</option></select></L>
                  <L t="Commission %"><input className={f} type="number" min={0} max={100} step="0.01" value={l.commission_pct ?? ""} onChange={(e) => set(i, { commission_pct: num(e.target.value) })} /></L>
                  <L t="Fixed fee ₹"><input className={f} type="number" min={0} step="0.01" value={l.fixed_fee ?? ""} onChange={(e) => set(i, { fixed_fee: num(e.target.value) })} /></L>
                  <L t="Shipping fee ₹"><input className={f} type="number" min={0} step="0.01" value={l.shipping_fee ?? ""} onChange={(e) => set(i, { shipping_fee: num(e.target.value) })} /></L>
                </>
              )}
            </div>
            {lines.length > 1 && <button className="mt-3 min-h-11 text-body-sm font-medium text-on-soft-red" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Remove line</button>}
          </fieldset>))}
        <Button variant="secondary" onClick={() => setLines((ls) => [...ls, blank()])}>Add {courier ? "slab" : "line"}</Button>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-hairline pt-4">
        <Button onClick={save} loading={busy} disabled={!name.trim()}>Save rate card</Button>
        {card && <Button variant="danger" onClick={remove}>Delete</Button>}
      </div>
    </div>
  );
}
