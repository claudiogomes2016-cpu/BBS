import { z } from "zod";

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them.
const raw = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

const schema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(20),
});

export function isSupabaseConfigured(): boolean {
  return schema.safeParse(raw).success;
}

export function supabasePublicEnv(): { url: string; anonKey: string } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return parsed.data;
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
