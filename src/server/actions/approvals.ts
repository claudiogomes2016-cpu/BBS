"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext, roleAtLeast } from "@/server/context";
import type { FormState } from "./auth";

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(500).optional(),
});

export async function decideApproval(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireContext();
  if (!roleAtLeast(ctx.role, "admin")) return { error: "Only workspace admins can approve operations." };
  const parsed = decisionSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: "Invalid decision." };

  // The DB trigger records decided_by/decided_at and blocks invalid transitions.
  const { data, error } = await ctx.supabase
    .from("approval_requests")
    .update({ status: parsed.data.decision, decision_note: parsed.data.note ?? null })
    .eq("id", parsed.data.id)
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "This request is no longer pending." };
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  return { message: parsed.data.decision === "approved" ? "Approved." : "Rejected." };
}
