import type { Metadata } from "next";
import { clsx } from "clsx";
import { CheckSquare, History } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { DecisionButtons } from "@/components/dashboard/Approvals";
import { formatMoney } from "@/lib/format";
import { requireContext, roleAtLeast } from "@/server/context";
import { listApprovals } from "@/server/dashboard";

export const metadata: Metadata = { title: "Approval Center" };

const tone = (s: string) =>
  s === "approved" || s === "executed" ? "good" : s === "rejected" || s === "failed" ? "critical" : "neutral";
const fmtTime = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—");

export default async function ApprovalsPage() {
  const ctx = await requireContext();
  const isAdmin = roleAtLeast(ctx.role, "admin");
  const [pending, history] = await Promise.all([listApprovals(ctx, "pending"), listApprovals(ctx, "history")]);

  return (
    <>
      <PageHeader
        title="Approval Center"
        subtitle="Operations that spend money or change live campaigns wait here. Approved payloads are frozen and every decision is audited."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Pending (${pending.length})`}>
          {pending.length === 0 ? (
            <EmptyState icon={CheckSquare} title="Nothing awaiting approval">
              Campaign launches, budget increases and bid changes proposed by the agent will appear here.
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {pending.map((a) => (
                <li key={a.id} className="rounded-lg border border-line p-4">
                  <p className="font-medium text-ink">{a.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {a.action_type} · by {a.requested_by} · {fmtTime(a.created_at)}
                    {a.estimated_spend_usd !== null && ` · est. ${formatMoney(a.estimated_spend_usd)}`}
                  </p>
                  {isAdmin ? (
                    <div className="mt-3">
                      <DecisionButtons id={a.id} />
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted">Only admins can decide.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="History">
          {history.length === 0 ? (
            <EmptyState icon={History} title="No decisions yet" />
          ) : (
            <ul className="divide-y divide-line">
              {history.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{a.title}</p>
                    <p className="text-xs text-muted">
                      {a.action_type} · decided {fmtTime(a.decided_at)}
                      {a.decision_note && ` · “${a.decision_note}”`}
                    </p>
                  </div>
                  <span className={clsx("shrink-0")}>
                    <Badge tone={tone(a.status)}>{a.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
