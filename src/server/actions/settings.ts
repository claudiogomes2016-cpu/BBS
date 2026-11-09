"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext, roleAtLeast } from "@/server/context";
import type { FormState } from "./auth";

const money = (max: number) =>
  z.coerce.number({ invalid_type_error: "Must be a number." }).min(0, "Cannot be negative.").max(max);

const limitsSchema = z
  .object({
    daily_budget_usd: money(1_000_000),
    monthly_budget_usd: money(10_000_000),
    max_cpc_usd: money(1_000),
    max_cpa_usd: money(100_000),
    min_margin_usd: money(100_000),
    max_spend_per_product_usd: money(10_000_000),
    max_spend_per_campaign_usd: money(10_000_000),
    no_conversion_spend_alert_usd: money(1_000_000),
    auto_optimization_enabled: z.boolean(),
    auto_pause_enabled: z.boolean(),
  })
  .refine((v) => v.monthly_budget_usd === 0 || v.monthly_budget_usd >= v.daily_budget_usd, {
    message: "Monthly budget must be at least the daily budget.",
  })
  .refine((v) => !v.auto_optimization_enabled || (v.daily_budget_usd > 0 && v.max_cpc_usd > 0 && v.max_cpa_usd > 0), {
    message: "Set daily budget, max CPC and max CPA before enabling automatic optimization.",
  });

export async function updateFinancialLimits(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireContext();
  if (!roleAtLeast(ctx.role, "admin")) return { error: "Only workspace admins can change financial limits." };

  const parsed = limitsSchema.safeParse({
    ...Object.fromEntries(formData),
    auto_optimization_enabled: formData.get("auto_optimization_enabled") === "on",
    auto_pause_enabled: formData.get("auto_pause_enabled") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data, error } = await ctx.supabase
    .from("financial_limits")
    .update({ ...parsed.data, updated_by: ctx.user.id })
    .eq("workspace_id", ctx.workspace.id)
    .select("workspace_id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Nothing was saved (permission denied)." };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { message: "Financial limits saved." };
}

const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  display_currency: z.enum(["USD", "BRL"]),
});

export async function updateWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireContext();
  if (!roleAtLeast(ctx.role, "admin")) return { error: "Only workspace admins can change the workspace." };
  const parsed = workspaceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { data, error } = await ctx.supabase
    .from("workspaces")
    .update(parsed.data)
    .eq("id", ctx.workspace.id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Nothing was saved (permission denied)." };
  revalidatePath("/", "layout");
  return { message: "Workspace saved." };
}
