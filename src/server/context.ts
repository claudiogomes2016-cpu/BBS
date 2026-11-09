import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DisplayCurrency } from "@/lib/format";

export const ROLES = ["viewer", "analyst", "admin", "owner"] as const;
export type MemberRole = (typeof ROLES)[number];

export function roleAtLeast(role: MemberRole, min: MemberRole): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(min);
}

const membershipSchema = z.object({
  role: z.enum(ROLES),
  workspaces: z.object({
    id: z.string().uuid(),
    name: z.string(),
    display_currency: z.enum(["USD", "BRL"]),
    timezone: z.string(),
  }),
});

export interface AppContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: { id: string; email: string | null };
  workspace: { id: string; name: string; displayCurrency: DisplayCurrency; timezone: string };
  role: MemberRole;
}

/** Resolves the signed-in user and their active workspace (cached per request). */
export const requireContext = cache(async (): Promise<AppContext> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, display_currency, timezone)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load workspace: ${error.message}`);
  const m = membershipSchema.safeParse(data);
  if (!m.success) throw new Error("No workspace found for this account.");

  return {
    supabase,
    user: { id: user.id, email: user.email ?? null },
    workspace: {
      id: m.data.workspaces.id,
      name: m.data.workspaces.name,
      displayCurrency: m.data.workspaces.display_currency,
      timezone: m.data.workspaces.timezone,
    },
    role: m.data.role,
  };
});
