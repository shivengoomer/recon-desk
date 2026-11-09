import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";
import { LogoLoader } from "./logo-loader";

type Variant = "primary" | "secondary" | "mint" | "danger";

const variants: Record<Variant, string> = {
  primary: "rounded-lg bg-primary text-on-primary border border-primary hover:bg-ink-strong",
  secondary: "rounded-lg bg-canvas text-ink border border-hairline hover:border-ink",
  // the one signature accent pill
  mint: "rounded-pill bg-mint text-ink border border-ink hover:bg-mint-deep hover:text-on-primary",
  danger: "rounded-lg bg-canvas text-on-soft-red border border-hairline hover:bg-accent-red/10",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean };

export function Button({ variant = "primary", loading, className, disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 px-6 py-3 text-body-md font-semibold transition-all duration-150 active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        className,
      )}
    >
      {loading && <LogoLoader size={18} />}
      {children}
    </button>
  );
}

/** Link styled as a button (for navigation CTAs). */
export const buttonClass = (variant: Variant = "primary", extra = "") =>
  cn("inline-flex min-h-11 items-center justify-center gap-2 px-6 py-3 text-body-md font-semibold transition-all duration-150 active:scale-[0.98]", variants[variant], extra);
