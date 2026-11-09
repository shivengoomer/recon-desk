import { cn } from "@/lib/cn";

const RING =
  "M 128 0 C 57.308 0 0 57.308 0 128 C 0 198.692 57.308 256 128 256 C 198.692 256 256 198.692 256 128 L 224 128 C 224 181.019 181.019 224 128 224 C 74.98 224 32 181.019 32 128 C 32 74.98 74.98 32 128 32 Z M 128 56 C 88.236 56 56 88.236 56 128 C 56 167.764 88.236 200 128 200 C 167.764 200 200 167.764 200 128 L 168 128 C 168 150.091 150.091 168 128 168 C 105.909 168 88 150.091 88 128 C 88 105.909 105.909 88 128 88 Z";

/** The Recon Desk ring mark, spinning. Uses currentColor, so it works on any background. */
export function LogoLoader({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      className={cn("animate-logo-spin shrink-0", className)}
    >
      <path d={RING} />
    </svg>
  );
}

/** Full-area loading state with the animated logo. */
export function LogoLoading({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex min-h-screen flex-col items-center justify-center gap-4 text-ink", className)}>
      <LogoLoader size={56} />
      <span className="text-body-sm font-semibold text-body-mid">{label}…</span>
    </div>
  );
}
