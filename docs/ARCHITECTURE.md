# Architecture

## Principles

1. **Profit is the north star.** Only *approved* commissions are revenue. Pending
   commissions are shown as "projected", reversed ones (refund/chargeback) separately.
2. **No invented data.** Empty states instead of illustrative numbers; ratios with a
   zero denominator are `null` ("—"), never 0. Estimates and observed data are stored
   with an explicit `source` (`api` / `manual` / `import` / `estimate`).
3. **Money never moves without approval.** Spending operations become
   `approval_requests`; the approved payload is frozen by a DB trigger. Automation is
   OFF by default and, once enabled, constrained by `financial_limits`.
4. **Credentials never reach the browser.** Only the Supabase URL + anon key are
   public. Integration secrets live server-side (env vars / Supabase Vault).
5. **Tenant isolation in the database**, not only in the app: every table has RLS.

## Layers

```
src/
  app/                 Routes (App Router)
    (auth)/            login, signup
    (app)/             authenticated shell: dashboard, approvals, settings, [module]
    api/health         liveness
    api/cron/fx        daily USD→BRL rate job (Vercel Cron, CRON_SECRET)
    auth/callback      email confirmation
  components/          UI (server components by default; charts/forms are client)
  lib/                 Pure, framework-free logic, unit tested
    metrics/kpis.ts      KPI formulas (single source of truth)
    metrics/bidding.ts   max CPA / max CPC from unit economics
    format.ts, dates.ts, fx.ts, nav.ts, env.ts
    supabase/            server (user, RLS) and admin (service role) clients
  server/              Server-only data access + Server Actions (zod-validated)
  middleware.ts        session refresh + route protection
supabase/
  migrations/          schema, RLS, triggers, dashboard SQL functions
  tests/               local PostgreSQL test harness + assertions
```

Future integrations get their own folder (`src/integrations/<platform>/`) behind a
common adapter interface, so ClickBank, Digistore24 and SmartAdv are interchangeable.

## Data model (Phase 1)

| Area | Tables |
|---|---|
| Tenancy | `profiles`, `workspaces`, `workspace_members` (roles: viewer < analyst < admin < owner) |
| Guardrails | `financial_limits` (budgets, max CPC/CPA, min margin, caps, automation switches) |
| Integrations | `platform_connections`, `ads_accounts` (status only, no secrets) |
| Catalogue | `products` (commission model, refund/chargeback terms, score 0–100), `landing_pages` |
| Ads | `campaigns`, `ad_groups`, `keyword_research`, `daily_metrics` (fact table by day × campaign × keyword × country × device × age × gender × hour) |
| Tracking | `clicks` (click_id, gclid, UTMs), `conversions` (one row per sale, status lifecycle, unique per platform sale id), `conversion_events` (append-only, de-duplicated by `event_key`) |
| Intelligence | `agent_runs`, `recommendations` (with `evidence`), `approval_requests`, `alerts` |
| Compliance | `audit_log` (written only by a SECURITY DEFINER trigger), `fx_rates` |

Dashboard aggregates are SQL functions (`dashboard_totals`, `dashboard_daily`,
`dashboard_breakdown`) declared `SECURITY INVOKER`, so they run under the caller's RLS.
Age and gender breakdowns never show commissions: affiliate platforms do not report
them, and we do not fabricate attribution.

## Security model

- Supabase Auth (email + password, min 10 chars); `getUser()` validates the JWT on
  every request in middleware and server code.
- RLS on all tables; role checks via `has_workspace_role()`.
- Users cannot write `audit_log`, ingestion tables (`daily_metrics`, `clicks`,
  `conversion_events`) or API-sourced conversions; those are written only by the
  service role from authenticated server jobs.
- Approval transitions are enforced in the DB (`pending → approved/rejected/expired`,
  `approved → executed/failed`); `decided_by` is always `auth.uid()`.
- Open-redirect-safe `next` param; security headers set in `next.config.ts`.
- Cron endpoints require `Authorization: Bearer $CRON_SECRET` (constant-time compare).
