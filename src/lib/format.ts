export type DisplayCurrency = "USD" | "BRL";

export interface FxQuote {
  /** BRL per 1 USD. */
  rate: number;
  rateDate: string;
  source: string;
}

const DASH = "—";

/**
 * Formats a USD amount. When BRL display is requested and a quote exists, the
 * value is converted; without a quote we fall back to USD (never guess a rate).
 */
export function formatMoney(
  amountUsd: number | null | undefined,
  currency: DisplayCurrency = "USD",
  fx?: FxQuote | null,
  opts: { compact?: boolean; signed?: boolean } = {},
): string {
  if (amountUsd === null || amountUsd === undefined || !Number.isFinite(amountUsd)) return DASH;
  const useBrl = currency === "BRL" && !!fx && fx.rate > 0;
  const value = useBrl ? amountUsd * fx!.rate : amountUsd;
  const formatted = new Intl.NumberFormat(useBrl ? "pt-BR" : "en-US", {
    style: "currency",
    currency: useBrl ? "BRL" : "USD",
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : 2,
    minimumFractionDigits: opts.compact ? 0 : 2,
    signDisplay: opts.signed ? "exceptZero" : "auto",
  }).format(value);
  return formatted;
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatMultiple(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return `${value.toFixed(2)}x`;
}
