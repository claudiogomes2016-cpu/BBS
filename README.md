# AFFILIATE INTELLIGENCE

**FIND OPPORTUNITIES. REDUCE CPC. GENERATE PROFIT.**

International affiliate-marketing intelligence platform: finds products, researches
buying-intent keywords and CPC, prepares Google Ads campaigns, tracks sales through
their full lifecycle and measures **confirmed net profit in USD**.

> Status: **Phase 1 — Foundation** (auth, database, RLS, executive dashboard,
> financial guardrails, approval center). See [docs/PHASES.md](docs/PHASES.md).

## Stack

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS ·
Supabase (PostgreSQL, Auth, Row Level Security) · Vercel (hosting + cron) · Recharts.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Apply the database migrations in `supabase/migrations/` to your Supabase project
(see [docs/SETUP.md](docs/SETUP.md)).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (type-checks and lints) |
| `npm test` | Unit tests (profit math, bid ceilings, dates, FX parsing) |
| `npm run test:db` | Spins up a throwaway PostgreSQL, applies all migrations and runs the RLS / ledger test suite |
| `npm run typecheck` | TypeScript only |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system design, data model, security model
- [docs/SETUP.md](docs/SETUP.md): Supabase + Vercel deployment, environment variables
- [docs/PHASES.md](docs/PHASES.md): roadmap and delivery status per phase
