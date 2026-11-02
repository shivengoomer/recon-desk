"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { BarChart3, CheckCheck, FileText, LogOut, Percent, Play, ScrollText, Search, Upload, ListOrdered, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { rupees, STATUS_LABEL } from "@/lib/format";
import { useMatch } from "@/lib/match";
import type { OrderPage } from "@/lib/types";

const item = "flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-body-sm text-ink aria-selected:bg-soft";

/** ⌘K / Ctrl+K: jump to a screen, find an order, or run matching. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { run } = useMatch();
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<OrderPage["items"]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) { setQ(""); setOrders([]); return; }
    if (q.trim().length < 3) { setOrders([]); return; }
    const t = setTimeout(() => {
      api<OrderPage>(`/api/orders?q=${encodeURIComponent(q.trim())}&page_size=6`).then((r) => setOrders(r.items)).catch(() => setOrders([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (href: string) => { onOpenChange(false); router.push(href); };
  const pages: [string, string, LucideIcon][] = [
    ["/dashboard", "Dashboard", BarChart3], ["/orders", "Orders", ListOrdered], ["/claims", "Claims", FileText],
    ["/imports", "Import files", Upload], ["/review", "Review matches", CheckCheck], ["/rate-cards", "Rate cards", Percent],
    ...(user?.role === "cofounder" ? ([["/audit", "Audit log", ScrollText]] as [string, string, LucideIcon][]) : []),
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-[2px]" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-md bg-canvas shadow-layer-4 outline-none">
          <Dialog.Title className="sr-only">Command menu</Dialog.Title>
          <Command shouldFilter={false} label="Command menu">
            <div className="flex items-center gap-3 border-b border-hairline px-4">
              <Search size={18} className="text-mute" aria-hidden />
              <Command.Input value={q} onValueChange={setQ} placeholder="Search orders or jump to…" className="min-h-14 w-full bg-transparent text-body-md text-ink outline-none placeholder:text-mute-soft" />
              <kbd className="rounded-xs border border-hairline px-1.5 py-0.5 text-caption text-body-mid">Esc</kbd>
            </div>
            <Command.List className="max-h-[50vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-body-sm text-body-mid">{q.length < 3 ? "Type at least 3 characters of an order ID." : "No matches."}</Command.Empty>
              {orders.length > 0 && (
                <Command.Group heading="Orders" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-eyebrow-sm [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-body-mid">
                  {orders.map((o) => (
                    <Command.Item key={o.id} value={`order-${o.id}`} onSelect={() => go(`/orders?q=${o.order_ref}`)} className={item}>
                      <span className="font-mono text-caption-mono">{o.order_ref}</span>
                      <span className="text-body-mid">{STATUS_LABEL[o.status ?? ""] ?? "Not matched"}</span>
                      <span className="tabular ml-auto text-body-mid">{rupees(o.difference)}</span>
                    </Command.Item>))}
                </Command.Group>)}
              <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-eyebrow-sm [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-body-mid">
                {pages.map(([href, label, Icon]) => (
                  <Command.Item key={href} value={label} onSelect={() => go(href)} className={item}><Icon size={18} className="text-body-mid" aria-hidden />{label}</Command.Item>))}
              </Command.Group>
              <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-eyebrow-sm [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-body-mid">
                <Command.Item value="run matching" onSelect={() => { onOpenChange(false); void run(); }} className={item}><Play size={18} className="text-body-mid" aria-hidden />Run matching</Command.Item>
                <Command.Item value="sign out" onSelect={logout} className={item}><LogOut size={18} className="text-body-mid" aria-hidden />Sign out</Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
