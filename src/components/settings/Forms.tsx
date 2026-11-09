"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/ui/form";
import { updateFinancialLimits, updateWorkspace } from "@/server/actions/settings";
import type { FormState } from "@/server/actions/auth";

export interface LimitsValues {
  daily_budget_usd: number;
  monthly_budget_usd: number;
  max_cpc_usd: number;
  max_cpa_usd: number;
  min_margin_usd: number;
  max_spend_per_product_usd: number;
  max_spend_per_campaign_usd: number;
  no_conversion_spend_alert_usd: number;
  auto_optimization_enabled: boolean;
  auto_pause_enabled: boolean;
}

const MONEY_FIELDS: { name: keyof LimitsValues; label: string; hint: string }[] = [
  { name: "daily_budget_usd", label: "Daily budget (USD)", hint: "Total ad spend allowed per day. Google Ads may overspend a daily budget on some days; alerts watch for it." },
  { name: "monthly_budget_usd", label: "Monthly budget (USD)", hint: "Hard ceiling for the month." },
  { name: "max_cpc_usd", label: "Max CPC (USD)", hint: "No bid above this, whatever the model suggests." },
  { name: "max_cpa_usd", label: "Max CPA (USD)", hint: "Cost per approved sale before a campaign is flagged." },
  { name: "min_margin_usd", label: "Min. margin per sale (USD)", hint: "Profit to keep per sale; used for bid ceilings." },
  { name: "max_spend_per_product_usd", label: "Max spend per product (USD)", hint: "Testing cap per product." },
  { name: "max_spend_per_campaign_usd", label: "Max spend per campaign (USD)", hint: "Testing cap per campaign." },
  { name: "no_conversion_spend_alert_usd", label: "Alert after spend with no sale (USD)", hint: "Raises a 'no conversions' alert." },
];

export function LimitsForm({ values, canEdit }: { values: LimitsValues; canEdit: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(updateFinancialLimits, {});
  return (
    <form action={action} className="space-y-5">
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
        {MONEY_FIELDS.map((f) => (
          <Field key={f.name} label={f.label} hint={f.hint}>
            <input
              name={f.name}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              required
              defaultValue={String(values[f.name])}
              className={inputClass}
            />
          </Field>
        ))}
      </fieldset>
      <fieldset disabled={!canEdit} className="space-y-3 rounded-lg border border-line p-4">
        <legend className="px-1 text-xs font-medium text-ink-2">Automation (off by default)</legend>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="auto_optimization_enabled" defaultChecked={values.auto_optimization_enabled} className="mt-1 accent-[rgb(var(--accent))]" />
          <span>
            <span className="font-medium text-ink">Allow automatic optimizations within these limits</span>
            <span className="block text-xs text-muted">Bid and budget adjustments that stay inside every limit above. Requires daily budget, max CPC and max CPA.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="auto_pause_enabled" defaultChecked={values.auto_pause_enabled} className="mt-1 accent-[rgb(var(--accent))]" />
          <span>
            <span className="font-medium text-ink">Allow preventive auto-pause</span>
            <span className="block text-xs text-muted">Pause a campaign that breaks CPA or budget limits, then notify you.</span>
          </span>
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton disabled={!canEdit}>Save limits</SubmitButton>
        <FormMessage state={state} />
        {!canEdit && <p className="text-xs text-muted">Only admins can change limits.</p>}
      </div>
    </form>
  );
}

export function WorkspaceForm({
  name,
  displayCurrency,
  canEdit,
}: {
  name: string;
  displayCurrency: "USD" | "BRL";
  canEdit: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateWorkspace, {});
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Workspace name">
          <input name="name" defaultValue={name} required maxLength={120} className={inputClass} />
        </Field>
        <Field label="Default display currency" hint="The ledger is always stored in USD.">
          <select name="display_currency" defaultValue={displayCurrency} className={inputClass}>
            <option value="USD">USD — US dollar</option>
            <option value="BRL">BRL — Brazilian real (converted)</option>
          </select>
        </Field>
      </fieldset>
      <div className="flex items-center gap-4">
        <SubmitButton disabled={!canEdit}>Save workspace</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
