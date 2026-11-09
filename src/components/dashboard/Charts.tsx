"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, type DisplayCurrency, type FxQuote } from "@/lib/format";

export interface ChartPoint {
  day: string;
  spend: number;
  approved: number;
  pending: number;
  profit: number;
}

const AXIS = { stroke: "rgb(var(--axis))", fontSize: 11, tickLine: false } as const;
const tickStyle = { fill: "rgb(var(--muted))", fontSize: 11 };
const shortDay = (d: string) => {
  const [, m, day] = d.split("-");
  return `${m}/${day}`;
};

function TooltipBox({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: { name: string; value: string; color: string }[];
}) {
  if (!active) return null;
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {rows.map((r) => (
        <p key={r.name} className="flex items-center gap-2 text-ink-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden />
          <span className="flex-1">{r.name}</span>
          <span className="tabular font-medium text-ink">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function SpendVsCommissionChart({
  data,
  currency,
  fx,
}: {
  data: ChartPoint[];
  currency: DisplayCurrency;
  fx: FxQuote | null;
}) {
  const fmt = (v: number) => formatMoney(v, currency, fx);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgb(var(--grid))" strokeWidth={1} />
          <XAxis dataKey="day" tickFormatter={shortDay} {...AXIS} tick={tickStyle} minTickGap={24} />
          <YAxis
            {...AXIS}
            tick={tickStyle}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) => formatMoney(v, currency, fx, { compact: true })}
          />
          <Tooltip
            cursor={{ stroke: "rgb(var(--axis))", strokeWidth: 1 }}
            content={({ active, payload, label }) => (
              <TooltipBox
                active={active && !!payload?.length}
                label={String(label ?? "")}
                rows={[
                  { name: "Approved commission", value: fmt(Number(payload?.[0]?.payload?.approved ?? 0)), color: "rgb(var(--series-1))" },
                  { name: "Ad spend", value: fmt(Number(payload?.[0]?.payload?.spend ?? 0)), color: "rgb(var(--series-2))" },
                ]}
              />
            )}
          />
          <Legend
            verticalAlign="top"
            align="left"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "rgb(var(--ink-2))" }}
          />
          <Line
            name="Approved commission"
            type="linear"
            isAnimationActive={false}
            dataKey="approved"
            stroke="rgb(var(--series-1))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--surface))" }}
          />
          <Line
            name="Ad spend"
            type="linear"
            isAnimationActive={false}
            dataKey="spend"
            stroke="rgb(var(--series-2))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--surface))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyProfitChart({
  data,
  currency,
  fx,
}: {
  data: ChartPoint[];
  currency: DisplayCurrency;
  fx: FxQuote | null;
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="rgb(var(--grid))" strokeWidth={1} />
          <XAxis dataKey="day" tickFormatter={shortDay} {...AXIS} tick={tickStyle} minTickGap={24} />
          <YAxis
            {...AXIS}
            tick={tickStyle}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) => formatMoney(v, currency, fx, { compact: true })}
          />
          <ReferenceLine y={0} stroke="rgb(var(--axis))" />
          <Tooltip
            cursor={{ fill: "rgb(var(--surface-3) / 0.5)" }}
            content={({ active, payload, label }) => {
              const v = Number(payload?.[0]?.value ?? 0);
              return (
                <TooltipBox
                  active={active && !!payload?.length}
                  label={String(label ?? "")}
                  rows={[
                    {
                      name: v >= 0 ? "Net profit" : "Net loss",
                      value: formatMoney(v, currency, fx, { signed: true }),
                      color: v >= 0 ? "rgb(var(--pos))" : "rgb(var(--neg))",
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="profit" name="Net profit" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={24}>
            {data.map((d) => (
              <Cell key={d.day} fill={d.profit >= 0 ? "rgb(var(--pos))" : "rgb(var(--neg))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
