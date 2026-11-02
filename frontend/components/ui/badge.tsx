import { cn } from "@/lib/cn";

export type BadgeTone = "auto" | "review" | "unmatched" | "info" | "neutral";

const tones: Record<BadgeTone, string> = {
  auto: "bg-accent-green/15 text-on-soft-green",
  review: "bg-accent-yellow/20 text-on-soft-yellow",
  unmatched: "bg-accent-red/10 text-on-soft-red",
  info: "bg-accent-blue-info/10 text-on-soft-blue",
  neutral: "bg-soft text-body-mid",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-caption", tones[tone])}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
