import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, BellOff, Bot, CheckSquare, LineChart as LineIcon, Table2 } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { DashboardFilters, buildHref } from "@/components/dashboard/Filters";
import { HeroProfit, KpiTile } from "@/components/dashboard/Kpis";
import { DailyProfitChart, SpendVsCommissionChart, type ChartPoint } from "@/components/dashboard/Charts";
import { DecisionButtons } from "@/components/dashboard/Approvals";
import { resolveRange } from "@/lib/dates";
import { computeKpis, isEmptyPeriod, ratio } from "@/lib/metrics/kpis";
import { formatMoney, formatMultiple, formatNumber, formatPercent, type DisplayCurrency } from "@/lib/format";
import { requireContext, roleAtLeast } from "@/server/context";
import { BREAKDOWN_DIMENSIONS, getDashboardData, parseDimension } from "@/server/dashboard";

export const metadata: Metadata = { title: "Executive Dashboard" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const range = resolveRange(sp);
  const dimension = parseDimension(sp.dim);
  const curParam = one(sp.cur);
  const currency: DisplayCurrency = curParam === "BRL" || curParam === "USD" ? curParam : ctx.workspace.displayCurrency;

  const data = await getDashboardData(ctx, range, dimension);
  const { totals, fx } = data;
  const k = computeKpis(totals);
  const empty = isEmptyPeriod(totals);
  const m = (v: number | null, signed = false) => formatMoney(v, currency, fx, { signed });
  const params = {
    range: range.key,
    from: range.key === "custom" ? range.from : undefined,
    to: range.key === "custom" ? range.to : undefined,
    dim: one(sp.dim),
    cur: curParam,
  };
  const chartData: ChartPoint[] = data.daily.map((d) => ({
    day: d.day,
    spend: d.spend_usd,
    approved: d.commission_approved_usd,
    pending: d.commission_pending_usd,
    profit: d.net_profit_usd,
  }));
  const isAdmin = roleAtLeast(ctx.role, "admin");

  return (
    <>
      <PageHeader title="Executive Dashboard" subtitle={`${range.label} · ${range.from} → ${range.to} (UTC)`}>
        <DashboardFilters range={range} currency={currency} params={params} fxAvailable={!!fx} />
      </PageHeader>

      {currency === "BRL" && (
        <p className="-mt-3 mb-4 text-xs text-muted">
          {fx
            ? `Values converted at USD/BRL ${fx.rate.toFixed(4)} (${fx.source}, ${fx.rateDate}). Originals are stored in USD.`
            : "No USD/BRL rate stored yet — values are shown in USD."}
        </p>
      )}

      {/* Hero + headline money */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <HeroProfit
            value={empty ? m(0) : m(k.netProfitUsd, true)}
            positive={k.netProfitUsd >= 0}
            empty={empty}
            caption="Approved commissions minus ad spend. Pending commissions are never counted as profit."
          />
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Projected (incl. pending)</dt>
              <dd className="mt-0.5 font-medium text-ink-2">{m(k.projectedProfitUsd, true)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Reversal rate</dt>
              <dd className="mt-0.5 font-medium text-ink-2">{formatPercent(k.reversalRate, 1)}</dd>
            </div>
          </dl>
        </Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2">
          <KpiTile label="Investment" value={m(totals.spendUsd)} hint="Ad spend" />
          <KpiTile
            label="Approved commissions"
            value={m(totals.commissionApprovedUsd)}
            hint={`${formatNumber(totals.salesApproved)} approved sales`}
          />
          <KpiTile
            label="Pending commissions"
            value={m(totals.commissionPendingUsd)}
            hint={`${formatNumber(totals.salesPending)} awaiting approval`}
          />
          <KpiTile
            label="Reversed"
            value={m(totals.commissionReversedUsd)}
            hint={`${totals.refunds} refunds · ${totals.chargebacks} chargebacks`}
          />
          <KpiTile label="ROAS" value={formatMultiple(k.roas)} hint="Approved ÷ spend" />
          <KpiTile label="ROI" value={formatPercent(k.roi, 1)} hint="(Approved − spend) ÷ spend" />
        </div>
      </div>

      {/* Efficiency row */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Sales" value={formatNumber(totals.salesTotal)} hint="Excl. cancelled" />
        <KpiTile label="Clicks" value={formatNumber(totals.clicks)} hint={`${formatNumber(totals.impressions, true)} impressions`} />
        <KpiTile label="Avg. CPC" value={m(k.cpc)} />
        <KpiTile label="CTR" value={formatPercent(k.ctr)} />
        <KpiTile label="CPA" value={m(k.cpa)} hint="Per approved sale" />
        <KpiTile label="Conversion rate" value={formatPercent(k.conversionRate)} hint={`${formatNumber(totals.adConversions)} ad-reported conv.`} />
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Investment vs approved commissions" subtitle="Daily, by sale date">
          {empty ? (
            <EmptyState icon={LineIcon} title="No spend or sales in this period">
              Data appears here once Google Ads (Phase 8) and the affiliate platforms (Phases 2–3) are connected.
            </EmptyState>
          ) : (
            <>
              <SpendVsCommissionChart data={chartData} currency={currency} fx={fx} />
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-muted hover:text-ink-2">View as table</summary>
                <div className="mt-2 max-h-64 overflow-auto">
                  <table className="w-full tabular">
                    <thead className="text-left text-muted">
                      <tr>
                        <th className="py-1 font-medium">Day</th>
                        <th className="py-1 text-right font-medium">Spend</th>
                        <th className="py-1 text-right font-medium">Approved</th>
                        <th className="py-1 text-right font-medium">Pending</th>
                        <th className="py-1 text-right font-medium">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink-2">
                      {chartData.map((d) => (
                        <tr key={d.day}>
                          <td className="py-1">{d.day}</td>
                          <td className="py-1 text-right">{m(d.spend)}</td>
                          <td className="py-1 text-right">{m(d.approved)}</td>
                          <td className="py-1 text-right">{m(d.pending)}</td>
                          <td className="py-1 text-right">{m(d.profit, true)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </Card>
        <Card className="lg:col-span-2" title="Daily net profit" subtitle="Approved commissions − spend">
          {empty ? (
            <EmptyState icon={LineIcon} title="No results yet" />
          ) : (
            <DailyProfitChart data={chartData} currency={currency} fx={fx} />
          )}
        </Card>
      </div>

      {/* Breakdown */}
      <Card className="mt-4" title="Results by dimension" subtitle="Sorted by net profit">
        <nav className="-mt-1 mb-4 flex gap-1 overflow-x-auto pb-1" aria-label="Breakdown dimension">
          {(Object.entries(BREAKDOWN_DIMENSIONS) as [keyof typeof BREAKDOWN_DIMENSIONS, string][]).map(([key, label]) => (
            <Link
              key={key}
              href={buildHref("/dashboard", params, { dim: key })}
              scroll={false}
              aria-current={dimension === key ? "true" : undefined}
              className={clsx(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                dimension === key ? "bg-surface-3 text-ink" : "text-muted hover:text-ink-2",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        {data.breakdown.length === 0 ? (
          <EmptyState icon={Table2} title={`No data by ${BREAKDOWN_DIMENSIONS[dimension].toLowerCase()} in this period`} />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-sm tabular">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2 font-medium sm:px-2">{BREAKDOWN_DIMENSIONS[dimension]}</th>
                  <th className="px-2 py-2 text-right font-medium">Spend</th>
                  <th className="px-2 py-2 text-right font-medium">Clicks</th>
                  <th className="px-2 py-2 text-right font-medium">CPC</th>
                  <th className="px-2 py-2 text-right font-medium">Approved sales</th>
                  <th className="px-2 py-2 text-right font-medium">Approved comm.</th>
                  <th className="px-2 py-2 text-right font-medium">Net profit</th>
                  <th className="px-2 py-2 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.breakdown.map((r) => {
                  const net = r.commission_approved_usd - r.spend_usd;
                  return (
                    <tr key={r.key} className="text-ink-2">
                      <td className="max-w-[220px] truncate px-4 py-2 text-ink sm:px-2">{r.label.replace(/_/g, " ")}</td>
                      <td className="px-2 py-2 text-right">{m(r.spend_usd)}</td>
                      <td className="px-2 py-2 text-right">{formatNumber(r.clicks)}</td>
                      <td className="px-2 py-2 text-right">{m(ratio(r.spend_usd, r.clicks))}</td>
                      {r.commission_attributable ? (
                        <>
                          <td className="px-2 py-2 text-right">{formatNumber(r.sales_approved)}</td>
                          <td className="px-2 py-2 text-right">{m(r.commission_approved_usd)}</td>
                          <td className={clsx("px-2 py-2 text-right font-medium", net < 0 ? "text-neg" : "text-ink")}>
                            {m(net, true)}
                          </td>
                          <td className="px-2 py-2 text-right">{formatMultiple(ratio(r.commission_approved_usd, r.spend_usd))}</td>
                        </>
                      ) : (
                        <td colSpan={4} className="px-2 py-2 text-right text-xs text-muted">
                          Sales are not attributable by {BREAKDOWN_DIMENSIONS[dimension].toLowerCase()} · ad-reported conv.{" "}
                          {formatNumber(r.ad_conversions)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Operations */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title="Awaiting approval"
          subtitle="Nothing that spends money runs without approval"
          action={
            <Link href="/approvals" className="text-xs text-accent hover:underline">
              Open center
            </Link>
          }
        >
          {data.approvals.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No operations awaiting approval" />
          ) : (
            <ul className="space-y-4">
              {data.approvals.map((a) => (
                <li key={a.id} className="rounded-lg border border-line p-3">
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {a.action_type} · requested by {a.requested_by}
                    {a.estimated_spend_usd !== null && ` · est. ${m(a.estimated_spend_usd)}`}
                  </p>
                  {isAdmin && (
                    <div className="mt-3">
                      <DecisionButtons id={a.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="AI recommendations" subtitle="Each one must cite real evidence">
          {data.recommendations.length === 0 ? (
            <EmptyState icon={Bot} title="No recommendations yet">
              The AI Marketing Agent (Phase 10) needs real performance data before it recommends anything.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {data.recommendations.map((r) => (
                <li key={r.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">{r.module}</Badge>
                    {r.expected_impact_usd !== null && (
                      <span className="text-xs text-muted">≈ {m(r.expected_impact_usd, true)}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-ink">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{r.rationale}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Alerts">
          {data.alerts.length === 0 ? (
            <EmptyState icon={BellOff} title="No open alerts" />
          ) : (
            <ul className="space-y-3">
              {data.alerts.map((a) => (
                <li key={a.id} className="flex gap-2 rounded-lg border border-line p-3">
                  <AlertTriangle
                    className={clsx(
                      "mt-0.5 h-4 w-4 shrink-0",
                      a.severity === "critical" ? "text-critical" : a.severity === "warning" ? "text-warning" : "text-muted",
                    )}
                    aria-hidden
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                      {a.severity} · {a.kind}
                    </p>
                    <p className="text-sm text-ink">{a.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
