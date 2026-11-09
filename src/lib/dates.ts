import { z } from "zod";

export const RANGE_PRESETS = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  mtd: "Month to date",
} as const;

export type RangeKey = keyof typeof RANGE_PRESETS | "custom";

export interface DateRange {
  key: RangeKey;
  from: string; // YYYY-MM-DD (inclusive)
  to: string; // YYYY-MM-DD (inclusive)
  label: string;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MAX_DAYS = 366;

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + days);
  return c;
}

/** Resolves URL search params into a safe, bounded date range (UTC days). */
export function resolveRange(
  params: { range?: string | string[]; from?: string | string[]; to?: string | string[] },
  now: Date = new Date(),
): DateRange {
  const pick = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const range = pick(params.range);

  if (range === "custom") {
    const f = isoDate.safeParse(pick(params.from));
    const t = isoDate.safeParse(pick(params.to));
    if (f.success && t.success) {
      const from = new Date(`${f.data}T00:00:00Z`);
      const to = new Date(`${t.data}T00:00:00Z`);
      const days = (to.getTime() - from.getTime()) / 86_400_000;
      if (!Number.isNaN(days) && days >= 0 && days < MAX_DAYS && to <= today) {
        return { key: "custom", from: f.data, to: t.data, label: `${f.data} → ${t.data}` };
      }
    }
  }

  const key: keyof typeof RANGE_PRESETS =
    range && range in RANGE_PRESETS ? (range as keyof typeof RANGE_PRESETS) : "30d";
  const from =
    key === "mtd"
      ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
      : addDays(today, -(Number.parseInt(key, 10) - 1));
  return { key, from: toIsoDate(from), to: toIsoDate(today), label: RANGE_PRESETS[key] };
}
