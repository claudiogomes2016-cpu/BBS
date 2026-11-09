import { describe, expect, it } from "vitest";
import { computeBidCeiling } from "./bidding";
import { computeKpis, EMPTY_TOTALS, isEmptyPeriod, ratio, roundMoney, type PeriodTotals } from "./kpis";
import { resolveRange } from "../dates";
import { formatMoney, formatPercent } from "../format";

describe("computeBidCeiling", () => {
  it("reproduces the brief example: $100, 2%, $40 margin -> CPA $60, CPC $1.20", () => {
    expect(computeBidCeiling({ commissionUsd: 100, conversionRate: 0.02, targetMarginUsd: 40 })).toEqual({
      effectiveCommissionUsd: 100,
      maxCpaUsd: 60,
      maxCpcUsd: 1.2,
      viable: true,
    });
  });

  it("discounts expected refunds/chargebacks and other costs", () => {
    const r = computeBidCeiling({
      commissionUsd: 100,
      conversionRate: 0.02,
      targetMarginUsd: 40,
      expectedReversalRate: 0.1,
      otherCostPerSaleUsd: 5,
    });
    expect(r.effectiveCommissionUsd).toBe(90);
    expect(r.maxCpaUsd).toBe(45);
    expect(r.maxCpcUsd).toBe(0.9);
  });

  it("never rounds a ceiling up", () => {
    // 33.33... * 0.03 = 0.99999 -> 0.99, not 1.00
    const r = computeBidCeiling({ commissionUsd: 100, conversionRate: 0.03, targetMarginUsd: 66.6667 });
    expect(r.maxCpcUsd).toBe(0.99);
  });

  it("flags non-viable economics instead of returning a negative bid", () => {
    const r = computeBidCeiling({ commissionUsd: 30, conversionRate: 0.02, targetMarginUsd: 40 });
    expect(r.viable).toBe(false);
    expect(r.maxCpcUsd).toBe(0);
  });

  it("rejects invalid inputs", () => {
    expect(() => computeBidCeiling({ commissionUsd: 0, conversionRate: 0.02, targetMarginUsd: 1 })).toThrow(RangeError);
    expect(() => computeBidCeiling({ commissionUsd: 10, conversionRate: 2, targetMarginUsd: 1 })).toThrow(RangeError);
    expect(() =>
      computeBidCeiling({ commissionUsd: 10, conversionRate: 0.1, targetMarginUsd: 1, expectedReversalRate: 1 }),
    ).toThrow(RangeError);
  });
});

describe("computeKpis", () => {
  const t: PeriodTotals = {
    ...EMPTY_TOTALS,
    spendUsd: 120,
    impressions: 2000,
    clicks: 100,
    salesTotal: 4,
    salesApproved: 1,
    salesPending: 1,
    salesReversed: 2,
    commissionApprovedUsd: 100,
    commissionPendingUsd: 100,
    commissionReversedUsd: 150,
  };

  it("counts only approved commission as profit", () => {
    const k = computeKpis(t);
    expect(k.netProfitUsd).toBe(-20);
    expect(k.projectedProfitUsd).toBe(80);
    expect(k.roas).toBeCloseTo(100 / 120);
    expect(k.roi).toBeCloseTo(-20 / 120);
  });

  it("computes traffic ratios", () => {
    const k = computeKpis(t);
    expect(k.cpc).toBe(1.2);
    expect(k.ctr).toBe(0.05);
    expect(k.cpa).toBe(120);
    expect(k.conversionRate).toBe(0.01);
    expect(k.reversalRate).toBeCloseTo(2 / 3);
  });

  it("returns null (not 0 / Infinity) without data", () => {
    const k = computeKpis(EMPTY_TOTALS);
    expect([k.cpc, k.ctr, k.cpa, k.conversionRate, k.roas, k.roi, k.reversalRate]).toEqual([
      null, null, null, null, null, null, null,
    ]);
    expect(k.netProfitUsd).toBe(0);
    expect(isEmptyPeriod(EMPTY_TOTALS)).toBe(true);
    expect(isEmptyPeriod(t)).toBe(false);
  });

  it("helpers are safe", () => {
    expect(ratio(1, 0)).toBeNull();
    expect(ratio(Number.NaN, 1)).toBeNull();
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe("resolveRange", () => {
  const now = new Date("2026-11-09T15:00:00Z");
  it("defaults to the last 30 days, inclusive", () => {
    expect(resolveRange({}, now)).toMatchObject({ key: "30d", from: "2026-10-11", to: "2026-11-09" });
  });
  it("supports month to date", () => {
    expect(resolveRange({ range: "mtd" }, now)).toMatchObject({ from: "2026-11-01", to: "2026-11-09" });
  });
  it("accepts a valid custom range and rejects bad ones", () => {
    expect(resolveRange({ range: "custom", from: "2026-11-01", to: "2026-11-05" }, now).key).toBe("custom");
    expect(resolveRange({ range: "custom", from: "2026-11-05", to: "2026-11-01" }, now).key).toBe("30d");
    expect(resolveRange({ range: "custom", from: "2026-11-01", to: "2026-12-01" }, now).key).toBe("30d");
    expect(resolveRange({ range: "custom", from: "x'; drop", to: "2026-11-01" }, now).key).toBe("30d");
  });
});

describe("formatMoney", () => {
  it("formats USD and converts to BRL only with a quote", () => {
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatMoney(10, "BRL", { rate: 5.5, rateDate: "2026-11-09", source: "ECB" })).toMatch(/R\$\s?55,00/);
    expect(formatMoney(10, "BRL", null)).toBe("$10.00");
    expect(formatMoney(null)).toBe("—");
    expect(formatPercent(0.0512)).toBe("5.12%");
  });
});
