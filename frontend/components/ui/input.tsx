import { cn } from "@/lib/cn";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";

export function Input({
  label,
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
        className={cn(
          "min-h-12 rounded-sm border bg-canvas px-4 py-3 text-body-md text-ink transition-colors focus:border-ink",
          error ? "border-accent-red" : "border-hairline",
          className,
        )}
      />
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
      <label htmlFor={id} className="text-body-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...rest}
          className={cn(
            "min-h-12 w-full rounded-sm border bg-canvas py-3 pl-4 pr-12 text-body-md text-ink transition-colors focus:border-ink",
            error ? "border-accent-red" : "border-hairline",
            className,
          )}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-body-mid transition-colors hover:bg-soft hover:text-ink"
        >
          {shown ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
      {error && <p id={`${id}-err`} className="text-body-sm text-on-soft-red">{error}</p>}
    </div>
  );
}
