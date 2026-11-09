import type { Metadata } from "next";
import { z } from "zod";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { LimitsForm, WorkspaceForm, type LimitsValues } from "@/components/settings/Forms";
import { requireContext, roleAtLeast } from "@/server/context";
import { getLatestFx } from "@/server/dashboard";

export const metadata: Metadata = { title: "Settings" };

const num = z.coerce.number();
const limitsSchema = z.object({
  daily_budget_usd: num,
  monthly_budget_usd: num,
  max_cpc_usd: num,
  max_cpa_usd: num,
  min_margin_usd: num,
  max_spend_per_product_usd: num,
  max_spend_per_campaign_usd: num,
  no_conversion_spend_alert_usd: num,
  auto_optimization_enabled: z.boolean(),
  auto_pause_enabled: z.boolean(),
  updated_at: z.string(),
});

const PLATFORM_LABEL: Record<string, string> = {
  clickbank: "ClickBank",
  digistore24: "Digistore24",
  smartadv: "SmartAdv",
  manual: "Manual",
};
const PLATFORM_PHASE: Record<string, string> = {
  clickbank: "Phase 2",
  digistore24: "Phase 3",
  smartadv: "After documentation is validated",
};

export default async function SettingsPage() {
  const ctx = await requireContext();
  const canEdit = roleAtLeast(ctx.role, "admin");

  const [limitsRes, connRes, fx] = await Promise.all([
    ctx.supabase
      .from("financial_limits")
      .select(
        "daily_budget_usd, monthly_budget_usd, max_cpc_usd, max_cpa_usd, min_margin_usd, max_spend_per_product_usd, max_spend_per_campaign_usd, no_conversion_spend_alert_usd, auto_optimization_enabled, auto_pause_enabled, updated_at",
      )
      .eq("workspace_id", ctx.workspace.id)
      .single(),
    ctx.supabase
      .from("platform_connections")
      .select("platform, status, last_sync_at, last_error")
      .eq("workspace_id", ctx.workspace.id)
      .order("platform"),
    getLatestFx(ctx),
  ]);
  if (limitsRes.error) throw new Error(`Failed to load limits: ${limitsRes.error.message}`);
  if (connRes.error) throw new Error(`Failed to load connections: ${connRes.error.message}`);
  const limits = limitsSchema.parse(limitsRes.data);
  const { updated_at, ...values } = limits;

  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace, financial guardrails and integrations" />
      <div className="space-y-4">
        <Card title="Workspace">
          <WorkspaceForm name={ctx.workspace.name} displayCurrency={ctx.workspace.displayCurrency} canEdit={canEdit} />
        </Card>

        <Card
          title="Financial limits & protection"
          subtitle={`0 means "not set". Last updated ${new Date(updated_at).toISOString().slice(0, 16).replace("T", " ")} UTC. Every change is audited.`}
        >
          <LimitsForm values={values as LimitsValues} canEdit={canEdit} />
        </Card>

        <Card title="Affiliate platforms" subtitle="Credentials are stored server-side only, never in the browser.">
          <ul className="divide-y divide-line">
            {(connRes.data ?? []).map((c) => (
              <li key={c.platform} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{PLATFORM_LABEL[c.platform] ?? c.platform}</p>
                  <p className="text-xs text-muted">{PLATFORM_PHASE[c.platform] ?? ""}</p>
                </div>
                <Badge tone={c.status === "connected" ? "good" : c.status === "error" ? "critical" : "neutral"}>
                  {String(c.status).replace("_", " ")}
                </Badge>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Google Ads</p>
                <p className="text-xs text-muted">Phase 8 · OAuth2 + developer token</p>
              </div>
              <Badge>not configured</Badge>
            </li>
          </ul>
        </Card>

        <Card title="Exchange rate (USD → BRL)">
          {fx ? (
            <p className="text-sm text-ink-2">
              1 USD = <span className="font-medium text-ink">{fx.rate.toFixed(4)} BRL</span> · {fx.source} · {fx.rateDate}
            </p>
          ) : (
            <p className="text-sm text-muted">
              No rate stored yet. The daily FX job fills this automatically once deployed (see docs/SETUP.md).
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
