# Setup & deployment

## 1. Supabase

1. Create a project (choose a US region, e.g. `us-east-1`, close to Vercel).
2. Apply the migrations, in order, from `supabase/migrations/`:
   - SQL editor: paste each file and run, **or**
   - Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
3. Auth → URL configuration: set **Site URL** to your domain and add
   `https://<domain>/auth/callback` to the redirect URLs.
4. Copy the project URL, the anon/publishable key and the service-role key.

Each new user automatically receives a workspace (as owner), default financial
limits (all zero, automation off) and platform connection slots.

## 2. Environment variables

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon / publishable key (RLS protects data) |
| `NEXT_PUBLIC_SITE_URL` | public | e.g. `https://app.example.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Used by cron/webhooks. Never prefix with `NEXT_PUBLIC_` |
| `CRON_SECRET` | **server only** | ≥ 16 random chars. Vercel sends it to cron routes |

## 3. Vercel

Import the GitHub repository, set the variables above, deploy. `vercel.json`
schedules `/api/cron/fx` on weekdays at 21:17 UTC (after the ECB publishes its
reference rates), so the USD→BRL view works with no computer switched on.

## 4. Verify

- `GET /api/health` → `{"status":"ok","supabaseConfigured":true}`
- Sign up, confirm the email, open `/dashboard` (empty states until data arrives).
- Settings → save financial limits.

## Local database tests

`npm run test:db` needs PostgreSQL 15+ binaries (`initdb`, `pg_ctl`, `psql`). It
creates a throwaway cluster, applies every migration over a minimal stand-in of
Supabase's `auth` schema and runs `supabase/tests/rls_and_ledger_test.sql`.
