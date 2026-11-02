"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error";
interface ToastItem { id: number; message: string; tone: Tone }
const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, message, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 lg:bottom-6 lg:items-end">
        {items.map((t) => (
          <div key={t.id} role="status"
            className={cn("pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg border bg-canvas px-5 py-3 text-body-sm font-semibold shadow-layer-3",
              t.tone === "error" ? "border-accent-red/40 text-on-soft-red" : "border-hairline text-ink")}>
            <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", t.tone === "error" ? "bg-accent-red" : "bg-mint")} />
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
