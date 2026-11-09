# Delivery plan

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation: architecture, auth, database + RLS, executive dashboard, financial limits, approval center | ✅ Delivered |
| 2 | ClickBank integration | Next |
| 3 | Digistore24 integration | Planned |
| 4 | Product Radar + CPA offer evaluation (score 0–100) | Planned |
| 5 | Keyword Intelligence + CPC Intelligence | Planned |
| 6 | Landing Page Builder (mobile-first, compliant) | Planned |
| 7 | Tracking Intelligence + sales tracking (postbacks, lifecycle) | Planned |
| 8 | Google Ads API integration | Planned |
| 9 | Audience Intelligence | Planned |
| 10 | AI Marketing Agent (daily/weekly routines, reports) | Planned |
| 11 | Operational autonomy within approved limits | Planned |
| 12 | Full testing, security review, launch | Planned |

## Phase 1: verification

- **Unit tests:** 15 passing (KPI formulas, bid ceiling incl. the $100 / 2% / $40 → $1.20 example, date ranges, FX parsing).
- **Database tests:** migrations applied on PostgreSQL 16, with assertions for bootstrap,
  tenant isolation (owner / viewer / other tenant / anon), ledger semantics
  (pending ≠ profit, refunds + chargebacks reversed, cancelled excluded), duplicate
  sale rejection, approval integrity, audit trail, and limit validation.
- **End-to-end (browser):** 20 checks on desktop and iPhone viewports, against a local
  Postgres executing real RLS. Covers login, dashboard figures, BRL view, breakdowns,
  approve flow, settings validation and persistence, tenant isolation, mobile menu, and
  no horizontal scroll.

## Known follow-ups

- `zod` 3.x advisory GHSA-mrhx-c7xc-m3w5 (memory exhaustion on oversized constrained
  collections). We validate only small form payloads; migrate to zod 4 in Phase 2.
- `postcss` advisories inside Next.js' build toolchain (build-time only, our own CSS).
  Track the next Next.js 15.x patch.
- UI language is English (international product). Portuguese UI can be added via
  `profiles.preferred_locale`.
