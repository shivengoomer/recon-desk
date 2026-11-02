"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { useToast } from "@/components/ui/toast";
import { num } from "./format";

interface LastRun { finished_at: string; orders_processed: number; duration_ms: number }
interface MatchState { version: number; running: boolean; last: LastRun | null; run: () => Promise<void> }
const Ctx = createContext<MatchState | null>(null);

/** Shared "run matching" action. Pages include `version` in their fetch deps to refresh after a run. */
export function MatchProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<LastRun | null>(null);

  useEffect(() => {
    api<LastRun | null>("/api/match-runs/latest").then(setLast).catch(() => {});
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const r = await api<{ orders_processed: number; duration_ms: number }>("/api/match-runs", { json: {} });
      toast(`Matched ${num(r.orders_processed)} orders in ${(r.duration_ms / 1000).toFixed(1)}s`);
      setLast({ finished_at: new Date().toISOString(), orders_processed: r.orders_processed, duration_ms: r.duration_ms });
      setVersion((v) => v + 1);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Matching failed", "error");
    } finally {
      setRunning(false);
    }
  }, [toast]);

  return <Ctx.Provider value={{ version, running, last, run }}>{children}</Ctx.Provider>;
}

export function useMatch(): MatchState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMatch outside MatchProvider");
  return v;
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
