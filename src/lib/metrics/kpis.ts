/**
 * Single source of truth for every derived performance metric.
 *
 * Rules that matter for money:
 *  - Only APPROVED commissions count as revenue / profit.
 *  - Pending commissions are reported separately as "projected", never as profit.
 *  - A ratio with a zero denominator is `null` ("no data"), never 0 or Infinity,
 *    so the UI can show an honest empty state instead of a fake number.
 */

export interface PeriodTotals {
  spendUsd: number;
  impressions: number;
  clicks: number;
  adConversions: number;
  salesTotal: number;
  salesApproved: number;
  salesPending: number;
  salesReversed: number;
  refunds: number;
  chargebacks: number;
  commissionPendingUsd: number;
  commissionApprovedUsd: number;
  commissionReversedUsd: number;
}

export interface Kpis {
  /** Average cost per click. */
  cpc: number | null;
  /** Click-through rate (0..1). */
  ctr: number | null;
  /** Cost per APPROVED sale. */
  cpa: number | null;
  /** Approved sales / ad clicks (0..1). */
  conversionRate: number | null;
  /** Approved commission / spend (e.g. 2.5 = 2.5x). */
  roas: number | null;
  /** (Approved commission - spend) / spend. */
  roi: number | null;
  /** Approved commission - spend. Realized result. */
  netProfitUsd: number;
  /** Approved + pending - spend. Informational only, NOT realized. */
  projectedProfitUsd: number;
  /** Reversed sales / (approved + reversed) (0..1). */
  reversalRate: number | null;
}

export const EMPTY_TOTALS: PeriodTotals = Object.freeze({
  spendUsd: 0,
  impressions: 0,
  clicks: 0,
  adConversions: 0,
  salesTotal: 0,
  salesApproved: 0,
  salesPending: 0,
  salesReversed: 0,
  refunds: 0,
  chargebacks: 0,
  commissionPendingUsd: 0,
  commissionApprovedUsd: 0,
  commissionReversedUsd: 0,
});

export function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

/** Rounds to cents without binary drift (0.1 + 0.2 => 0.3). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeKpis(t: PeriodTotals): Kpis {
  const approved = t.commissionApprovedUsd;
  return {
    cpc: ratio(t.spendUsd, t.clicks),
    ctr: ratio(t.clicks, t.impressions),
    cpa: ratio(t.spendUsd, t.salesApproved),
    conversionRate: ratio(t.salesApproved, t.clicks),
    roas: ratio(approved, t.spendUsd),
    roi: ratio(approved - t.spendUsd, t.spendUsd),
    netProfitUsd: roundMoney(approved - t.spendUsd),
    projectedProfitUsd: roundMoney(approved + t.commissionPendingUsd - t.spendUsd),
    reversalRate: ratio(t.salesReversed, t.salesApproved + t.salesReversed),
  };
}

/** True when there is no data at all for the period (drives empty states). */
export function isEmptyPeriod(t: PeriodTotals): boolean {
  return t.spendUsd === 0 && t.impressions === 0 && t.clicks === 0 && t.salesTotal === 0;
}
