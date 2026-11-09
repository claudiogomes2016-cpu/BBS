import "server-only";
import { z } from "zod";
import type { AppContext } from "./context";
import type { DateRange } from "@/lib/dates";
import { EMPTY_TOTALS, type PeriodTotals } from "@/lib/metrics/kpis";
import type { FxQuote } from "@/lib/format";

const num = z.coerce.number();

const totalsRow = z.object({
  spend_usd: num,
  impressions: num,
  clicks: num,
  ad_conversions: num,
  sales_total: num,
  sales_approved: num,
  sales_pending: num,
  sales_reversed: num,
  refunds: num,
  chargebacks: num,
  commission_pending_usd: num,
  commission_approved_usd: num,
  commission_reversed_usd: num,
});

const dailyRow = z.object({
  day: z.string(),
  spend_usd: num,
  clicks: num,
  sales_approved: num,
  commission_approved_usd: num,
  commission_pending_usd: num,
  net_profit_usd: num,
});
export type DailyPoint = z.infer<typeof dailyRow>;

const breakdownRow = z.object({
  key: z.string(),
  label: z.string(),
  spend_usd: num,
  impressions: num,
  clicks: num,
  ad_conversions: num,
  sales_approved: num,
  commission_approved_usd: num,
  commission_pending_usd: num,
  commission_attributable: z.boolean(),
});
export type BreakdownRow = z.infer<typeof breakdownRow>;

export const BREAKDOWN_DIMENSIONS = {
  product: "Product",
  platform: "Platform",
  campaign: "Campaign",
  country: "Country",
  device: "Device",
  age_range: "Age",
  gender: "Gender",
  keyword: "Keyword",
} as const;
export type BreakdownDimension = keyof typeof BREAKDOWN_DIMENSIONS;

export function parseDimension(v: string | string[] | undefined): BreakdownDimension {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s in BREAKDOWN_DIMENSIONS ? (s as BreakdownDimension) : "product";
}

const approvalRow = z.object({
  id: z.string(),
  title: z.string(),
  action_type: z.string(),
  estimated_spend_usd: num.nullable(),
  requested_by: z.string(),
  status: z.string(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
  decision_note: z.string().nullable(),
});
export type ApprovalRow = z.infer<typeof approvalRow>;

const recommendationRow = z.object({
  id: z.string(),
  module: z.string(),
  title: z.string(),
  rationale: z.string(),
  expected_impact_usd: num.nullable(),
  risk_level: z.string(),
  created_at: z.string(),
});
export type RecommendationRow = z.infer<typeof recommendationRow>;

const alertRow = z.object({
  id: z.string(),
  kind: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  created_at: z.string(),
});
export type AlertRow = z.infer<typeof alertRow>;

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Failed to load ${what}: ${error?.message ?? "unknown error"}`);
}

export async function getLatestFx(ctx: AppContext): Promise<FxQuote | null> {
  const { data, error } = await ctx.supabase
    .from("fx_rates")
    .select("rate, rate_date, source")
    .eq("base", "USD")
    .eq("quote", "BRL")
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("FX rate", error);
  if (!data) return null;
  return { rate: Number(data.rate), rateDate: String(data.rate_date), source: String(data.source) };
}

export async function getDashboardData(ctx: AppContext, range: DateRange, dimension: BreakdownDimension) {
  const ws = ctx.workspace.id;
  const args = { p_workspace: ws, p_from: range.from, p_to: range.to };

  const [totalsRes, dailyRes, breakdownRes, approvalsRes, recsRes, alertsRes, fx] = await Promise.all([
    ctx.supabase.rpc("dashboard_totals", args),
    ctx.supabase.rpc("dashboard_daily", args),
    ctx.supabase.rpc("dashboard_breakdown", { ...args, p_dimension: dimension }),
    ctx.supabase
      .from("approval_requests")
      .select("id, title, action_type, estimated_spend_usd, requested_by, status, created_at, decided_at, decision_note")
      .eq("workspace_id", ws)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    ctx.supabase
      .from("recommendations")
      .select("id, module, title, rationale, expected_impact_usd, risk_level, created_at")
      .eq("workspace_id", ws)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5),
    ctx.supabase
      .from("alerts")
      .select("id, kind, severity, message, created_at")
      .eq("workspace_id", ws)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    getLatestFx(ctx),
  ]);

  if (totalsRes.error) fail("totals", totalsRes.error);
  if (dailyRes.error) fail("daily series", dailyRes.error);
  if (breakdownRes.error) fail("breakdown", breakdownRes.error);
  if (approvalsRes.error) fail("approvals", approvalsRes.error);
  if (recsRes.error) fail("recommendations", recsRes.error);
  if (alertsRes.error) fail("alerts", alertsRes.error);

  const t = totalsRow.safeParse(Array.isArray(totalsRes.data) ? totalsRes.data[0] : totalsRes.data);
  const totals: PeriodTotals = t.success
    ? {
        spendUsd: t.data.spend_usd,
        impressions: t.data.impressions,
        clicks: t.data.clicks,
        adConversions: t.data.ad_conversions,
        salesTotal: t.data.sales_total,
        salesApproved: t.data.sales_approved,
        salesPending: t.data.sales_pending,
        salesReversed: t.data.sales_reversed,
        refunds: t.data.refunds,
        chargebacks: t.data.chargebacks,
        commissionPendingUsd: t.data.commission_pending_usd,
        commissionApprovedUsd: t.data.commission_approved_usd,
        commissionReversedUsd: t.data.commission_reversed_usd,
      }
    : EMPTY_TOTALS;

  return {
    totals,
    daily: z.array(dailyRow).parse(dailyRes.data ?? []),
    breakdown: z.array(breakdownRow).parse(breakdownRes.data ?? []),
    approvals: z.array(approvalRow).parse(approvalsRes.data ?? []),
    recommendations: z.array(recommendationRow).parse(recsRes.data ?? []),
    alerts: z.array(alertRow).parse(alertsRes.data ?? []),
    fx,
  };
}

export async function listApprovals(ctx: AppContext, status: "pending" | "history") {
  let q = ctx.supabase
    .from("approval_requests")
    .select("id, title, action_type, estimated_spend_usd, requested_by, status, created_at, decided_at, decision_note")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .limit(100);
  q = status === "pending" ? q.eq("status", "pending") : q.neq("status", "pending");
  const { data, error } = await q;
  if (error) fail("approvals", error);
  return z.array(approvalRow).parse(data ?? []);
}
