"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext, roleAtLeast } from "@/server/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateInsSecret } from "@/integrations/clickbank/ins";
import { API_KEY_PATTERN, checkApiKey } from "@/integrations/clickbank/api";
import type { FormState } from "./auth";

export interface SecretState extends FormState {
  secret?: string;
}

async function requireAdmin() {
  const ctx = await requireContext();
  if (!roleAtLeast(ctx.role, "admin")) throw new Error("Only workspace admins can manage integrations.");
  return ctx;
}

/** Creates a new INS secret, stores it server-side and returns it ONCE for ClickBank. */
export async function createInsSecret(): Promise<SecretState> {
  try {
    const ctx = await requireAdmin();
    const secret = generateInsSecret();
    const { error } = await ctx.supabase.rpc("set_integration_secret", {
      p_workspace: ctx.workspace.id,
      p_platform: "clickbank",
      p_name: "ins_secret_key",
      p_value: secret,
    });
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { secret, message: "New secret key created. Paste it in ClickBank now — it will not be shown again." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

const apiKeySchema = z.string().trim().regex(API_KEY_PATTERN, "That does not look like a ClickBank API key (it starts with API-).");

export async function saveClickBankApiKey(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const ctx = await requireAdmin();
    const parsed = apiKeySchema.safeParse(formData.get("api_key"));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const check = await checkApiKey(parsed.data);
    if (!check.ok && check.reason === "unauthorized") return { error: check.detail };
    const { error } = await ctx.supabase.rpc("set_integration_secret", {
      p_workspace: ctx.workspace.id,
      p_platform: "clickbank",
      p_name: "api_key",
      p_value: parsed.data,
    });
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return check.ok
      ? { message: `API key saved and verified${check.orders !== null ? ` · ${check.orders} affiliate orders in the last 30 days` : ""}.` }
      : { message: `API key saved, but ClickBank could not be reached right now (${check.detail}). Use "Test" later.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function testClickBankApiKey(): Promise<FormState> {
  try {
    const ctx = await requireAdmin();
    const { data, error } = await createSupabaseAdminClient()
      .from("integration_secrets")
      .select("value")
      .eq("workspace_id", ctx.workspace.id)
      .eq("platform", "clickbank")
      .eq("name", "api_key")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "No API key saved yet." };
    const check = await checkApiKey(data.value);
    return check.ok
      ? { message: `Connected${check.orders !== null ? ` · ${check.orders} affiliate orders in the last 30 days` : ""}.` }
      : { error: check.detail };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

const nicknameSchema = z.string().trim().regex(/^[A-Za-z0-9]{5,10}$/, "Account nickname: 5–10 letters or digits.");

export async function saveClickBankNickname(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const ctx = await requireAdmin();
    const parsed = nicknameSchema.safeParse(formData.get("nickname"));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { data, error } = await ctx.supabase
      .from("platform_connections")
      .update({ account_nickname: parsed.data.toLowerCase(), account_label: parsed.data.toLowerCase() })
      .eq("workspace_id", ctx.workspace.id)
      .eq("platform", "clickbank")
      .select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "Nothing was saved (permission denied)." };
    revalidatePath("/settings");
    return { message: "Nickname saved." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
