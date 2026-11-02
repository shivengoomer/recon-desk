"use client";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Staggered entrance for every dashboard block. */
export function Reveal({ i = 0, className, children }: { i?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(i, 10) * 0.045, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export const PANEL = "rounded-md border border-hairline bg-canvas shadow-[0_1px_2px_rgba(0,0,0,0.03),0_14px_32px_-18px_rgba(0,0,0,0.12)]";

/** Consistent panel anatomy: icon chip, title, hint, optional action, body. */
export function Panel({ icon: Icon, title, hint, action, className, children }: {
  icon?: LucideIcon; title: string; hint?: string; action?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={cn(PANEL, "flex h-full flex-col p-5 md:p-6", className)}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-ink"><Icon size={16} aria-hidden /></span>}
          <div>
            <h2 className="font-display text-[20px] font-bold leading-tight">{title}</h2>
            {hint && <p className="mt-0.5 text-body-sm text-body-mid">{hint}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-hairline px-3 text-body-sm font-semibold text-ink transition-colors hover:border-ink">
      {children}
    </a>
  );
}
