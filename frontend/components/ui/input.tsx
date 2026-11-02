import { cn } from "@/lib/cn";
import { useId, type InputHTMLAttributes } from "react";

export function Input({
  label,
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
        className={cn(
          "min-h-11 rounded-sm border bg-canvas px-4 py-3 text-body-md text-ink",
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
