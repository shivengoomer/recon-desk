import { cn } from "@/lib/cn";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";

export function Input({
  label,
  error,
  className,
  icon,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute"
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...rest}
          className={cn(
            "min-h-11 w-full rounded-sm border bg-canvas py-2.5 text-body-sm text-ink transition-colors focus:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
            icon ? "pl-10 pr-4" : "px-4",
            error ? "border-accent-red" : "border-hairline",
            className,
          )}
        />
      </div>
      {error && (
        <p id={`${id}-err`} className="text-body-sm text-on-soft-red">
          {error}
        </p>
      )}
    </div>
  );
}

/** Password field with a show/hide toggle (keeps autofill and screen-reader labels intact). */
export function PasswordInput({
  label,
  error,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; error?: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...rest}
          className={cn(
            "min-h-11 w-full rounded-sm border bg-canvas py-2.5 pl-4 pr-12 text-body-sm text-ink transition-colors focus:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
            error ? "border-accent-red" : "border-hairline",
            className,
          )}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-body-mid transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} className="text-body-sm text-on-soft-red">
          {error}
        </p>
      )}
    </div>
  );
}
