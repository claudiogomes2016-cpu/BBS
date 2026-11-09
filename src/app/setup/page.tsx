import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (isSupabaseConfigured()) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Brand />
      <h1 className="mt-8 text-xl font-semibold">Connect the database</h1>
      <p className="mt-2 text-sm text-ink-2">
        Affiliate Intelligence needs a Supabase project. Set these environment variables (locally in
        <code className="mx-1 rounded bg-surface-3 px-1">.env.local</code>, in production in Vercel) and apply the
        migrations in <code className="mx-1 rounded bg-surface-3 px-1">supabase/migrations</code>.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-4 text-xs text-ink-2">
{`NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
NEXT_PUBLIC_SITE_URL=https://<your-domain>`}
      </pre>
    </main>
  );
}
