import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-xl border border-line bg-surface p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-4 py-8 text-center">
      <Icon className="mb-2 h-5 w-5 text-muted" aria-hidden />
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {children && <div className="mt-1 max-w-sm text-xs text-muted">{children}</div>}
    </div>
  );
}

const badgeTone = {
  neutral: "bg-surface-3 text-ink-2",
  accent: "bg-accent/15 text-accent",
  good: "bg-good/15 text-good",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTone; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", badgeTone[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
