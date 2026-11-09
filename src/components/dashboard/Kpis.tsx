import { clsx } from "clsx";
import { Info } from "lucide-react";

export function HeroProfit({
  value,
  caption,
  positive,
  empty,
}: {
  value: string;
  caption: string;
  positive: boolean | null;
  empty: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">Net profit (confirmed)</p>
      <p
        className={clsx(
          "mt-1 text-5xl font-semibold tracking-tight sm:text-6xl",
          empty ? "text-muted" : positive ? "text-ink" : "text-neg",
        )}
      >
        {value}
      </p>
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        {caption}
      </p>
    </div>
  );
}

export function KpiTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 truncate text-xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 truncate text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
