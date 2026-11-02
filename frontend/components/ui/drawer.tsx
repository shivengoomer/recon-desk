"use client";
import { useEffect } from "react";

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-primary/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={title}
        className="relative flex h-full w-full max-w-xl flex-col bg-canvas shadow-layer-4 md:rounded-l-md">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="text-display-xs">{title}</h2>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-body-mid hover:bg-soft" aria-label="Close panel">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}
