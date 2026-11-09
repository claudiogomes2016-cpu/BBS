/**
 * Bid ceilings derived from unit economics.
 *
 *   effective commission = commission x (1 - expected reversal rate)
 *   max CPA              = effective commission - target margin
 *   max CPC              = max CPA x conversion rate
 *
 * Example from the product brief: commission $100, conversion 2%, margin $40
 *   -> max CPA $60 -> max CPC $1.20
 *
 * These are THEORETICAL ceilings. Callers must label which inputs are estimates
 * and recompute with observed data once enough clicks/sales exist.
 */

export interface BidInputs {
  /** Commission per sale in USD (> 0). */
  commissionUsd: number;
  /** Visitor -> approved sale rate, 0 < r <= 1. */
  conversionRate: number;
  /** Profit we want to keep per sale, USD (>= 0). */
  targetMarginUsd: number;
  /** Share of sales expected to be refunded / charged back, 0 <= r < 1. */
  expectedReversalRate?: number;
  /** Other variable cost per sale (tools, fees), USD (>= 0). */
  otherCostPerSaleUsd?: number;
}

export interface BidCeiling {
  effectiveCommissionUsd: number;
  maxCpaUsd: number;
  maxCpcUsd: number;
  /** False when the margin target cannot be met at any positive CPC. */
  viable: boolean;
}

function assertRange(name: string, v: number, min: number, max: number, minInclusive = true) {
  const okMin = minInclusive ? v >= min : v > min;
  if (!Number.isFinite(v) || !okMin || v > max) {
    throw new RangeError(`${name} out of range: ${v}`);
  }
}

const cents = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export function computeBidCeiling(input: BidInputs): BidCeiling {
  const reversal = input.expectedReversalRate ?? 0;
  const otherCost = input.otherCostPerSaleUsd ?? 0;
  assertRange("commissionUsd", input.commissionUsd, 0, 1_000_000, false);
  assertRange("conversionRate", input.conversionRate, 0, 1, false);
  assertRange("targetMarginUsd", input.targetMarginUsd, 0, 1_000_000);
  assertRange("expectedReversalRate", reversal, 0, 0.99);
  assertRange("otherCostPerSaleUsd", otherCost, 0, 1_000_000);

  const effective = input.commissionUsd * (1 - reversal);
  const maxCpa = effective - input.targetMarginUsd - otherCost;
  if (maxCpa <= 0) {
    return { effectiveCommissionUsd: cents(effective), maxCpaUsd: 0, maxCpcUsd: 0, viable: false };
  }
  return {
    effectiveCommissionUsd: cents(effective),
    maxCpaUsd: cents(maxCpa),
    // Floor to the cent: a ceiling must never be rounded up.
    maxCpcUsd: Math.floor(maxCpa * input.conversionRate * 100 + 1e-9) / 100,
    viable: true,
  };
}
