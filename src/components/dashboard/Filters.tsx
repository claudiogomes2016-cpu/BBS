import Link from "next/link";
import { clsx } from "clsx";
import { RANGE_PRESETS, type DateRange } from "@/lib/dates";
import type { DisplayCurrency } from "@/lib/format";

type Params = Record<string, string | undefined>;

export function buildHref(base: string, current: Params, patch: Params): string {
  const merged = { ...current, ...patch };
  const qs = new URLSearchParams(
    Object.entries(merged).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""),
  );
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

const pill = (active: boolean) =>
  clsx(
    "inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition",
    active ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
  );

export function DashboardFilters({
  range,
  currency,
  params,
  fxAvailable,
}: {
  range: DateRange;
  currency: DisplayCurrency;
  params: Params;
  fxAvailable: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap rounded-lg border border-line bg-surface p-1" role="group" aria-label="Date range">
        {(Object.keys(RANGE_PRESETS) as (keyof typeof RANGE_PRESETS)[]).map((k) => (
          <Link
            key={k}
            href={buildHref("/dashboard", params, { range: k, from: undefined, to: undefined })}
            className={pill(range.key === k)}
            aria-current={range.key === k ? "true" : undefined}
          >
            {k === "mtd" ? "MTD" : k.toUpperCase()}
          </Link>
        ))}
      </div>
      <form action="/dashboard" className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
        <input type="hidden" name="range" value="custom" />
        {params.dim && <input type="hidden" name="dim" value={params.dim} />}
        {params.cur && <input type="hidden" name="cur" value={params.cur} />}
        <input
          type="date"
          name="from"
          defaultValue={range.from}
          aria-label="From"
          className="h-8 rounded-md bg-transparent px-2 text-xs text-ink [color-scheme:inherit]"
        />
        <span className="text-xs text-muted">→</span>
        <input
          type="date"
          name="to"
          defaultValue={range.to}
          aria-label="To"
          className="h-8 rounded-md bg-transparent px-2 text-xs text-ink [color-scheme:inherit]"
        />
        <button type="submit" className={pill(range.key === "custom")}>
          Apply
        </button>
      </form>
      <div className="flex rounded-lg border border-line bg-surface p-1" role="group" aria-label="Display currency">
        {(["USD", "BRL"] as const).map((c) => (
          <Link
            key={c}
            href={buildHref("/dashboard", params, { cur: c })}
            className={pill(currency === c)}
            title={c === "BRL" && !fxAvailable ? "No USD/BRL rate stored yet — values stay in USD" : undefined}
          >
            {c}
          </Link>
        ))}
      </div>
    </div>
  );
}
