import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { fetchUsdBrl } from "@/lib/fx";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Daily job (Vercel Cron): stores the USD→BRL reference rate. Idempotent per date. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const row = await fetchUsdBrl();
    const { error } = await createSupabaseAdminClient()
      .from("fx_rates")
      .upsert({ ...row, fetched_at: new Date().toISOString() }, { onConflict: "rate_date,base,quote" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, rate_date: row.rate_date, rate: row.rate });
  } catch (e) {
    console.error("[cron/fx]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, { status: 502 });
  }
}
