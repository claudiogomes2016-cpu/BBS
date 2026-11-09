"use client";

import { clsx } from "clsx";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function SubmitButton({
  children,
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      className={clsx(
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:opacity-60",
        variant === "primary" && "bg-accent text-accent-ink hover:brightness-110",
        variant === "ghost" && "border border-line bg-surface-2 text-ink hover:bg-surface-3",
        variant === "danger" && "border border-critical/40 bg-critical/10 text-critical hover:bg-critical/20",
        className,
      )}
      {...rest}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; message?: string } }) {
  if (state.error)
    return (
      <p role="alert" className="flex items-center gap-2 text-sm text-critical">
        <AlertTriangle className="h-4 w-4" aria-hidden /> {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-good">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> {state.message}
      </p>
    );
  return null;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none";
