import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptIns, INS_MAX_BODY_BYTES, InsError, normalizeIns } from "@/integrations/clickbank/ins";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN = /^[0-9a-f]{32}$/;

/**
 * ClickBank Instant Notification endpoint (one URL per workspace connection).
 * Authenticity comes from the encryption: only ClickBank and the workspace know
 * the secret key. ClickBank needs a 2xx within 3 seconds.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > INS_MAX_BODY_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const raw = await req.text();
  if (raw.length > INS_MAX_BODY_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const db = createSupabaseAdminClient();
  const { data: conn } = await db
    .from("platform_connections")
    .select("id, workspace_id")
    .eq("webhook_token", token)
    .eq("platform", "clickbank")
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: secret } = await db
    .from("integration_secrets")
    .select("value")
    .eq("workspace_id", conn.workspace_id)
    .eq("platform", "clickbank")
    .eq("name", "ins_secret_key")
    .maybeSingle();
  if (!secret) {
    await db.from("platform_connections").update({ status: "error", last_error: "INS secret key not configured" }).eq("id", conn.id);
    return NextResponse.json({ error: "secret_not_configured" }, { status: 409 });
  }

  let payload: unknown;
  try {
    payload = decryptIns(raw, secret.value);
  } catch (e) {
    const err = e instanceof InsError ? e : new InsError("Invalid notification", 400);
    await db.from("platform_connections").update({ status: "error", last_error: err.message }).eq("id", conn.id);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  let event;
  try {
    event = normalizeIns(payload);
  } catch {
    return NextResponse.json({ error: "unexpected_payload" }, { status: 400 });
  }

  const { data: result, error } = await db.rpc("ingest_sale_event", {
    p_token: token,
    p_platform: "clickbank",
    p_event: event,
    p_payload: payload as Record<string, unknown>,
  });
  if (error) {
    console.error("[clickbank/ins] ingest failed", error.message);
    // Non-2xx makes ClickBank retry later (every 4h, up to 5 attempts).
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result });
}

export function GET() {
  return NextResponse.json({ ok: true, service: "clickbank-ins" });
}
