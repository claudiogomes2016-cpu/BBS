import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/lib/env";

/**
 * Service-role client: BYPASSES RLS. Only for trusted server jobs (cron, webhooks,
 * postbacks) after their own authentication. Never import from client code.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  const { url } = supabasePublicEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
