-- AFFILIATE INTELLIGENCE — full database setup (generated, do not edit).
-- Source: supabase/migrations/*.sql  ·  Regenerate: npm run db:bundle
-- Paste into Supabase → SQL Editor → Run, on a NEW, EMPTY project.

-- >>> 20261109000100_foundation.sql
-- =============================================================================
-- AFFILIATE INTELLIGENCE — Phase 1 foundation schema
-- Multi-tenant (workspace) model, financial ledger, tracking, approvals, audit.
-- All money is stored in USD (numeric) unless a column says otherwise.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
-- Order matters for member_role: later values have MORE privileges.
create type public.member_role as enum ('viewer', 'analyst', 'admin', 'owner');
create type public.affiliate_platform as enum ('clickbank', 'digistore24', 'smartadv', 'manual');
create type public.commission_model as enum ('cpa', 'revshare', 'hybrid', 'fixed_usd');
create type public.data_source as enum ('api', 'manual', 'import', 'estimate');
create type public.device_type as enum ('mobile', 'desktop', 'tablet', 'other', 'unknown');
create type public.age_range as enum ('18_24', '25_34', '35_44', '45_54', '55_64', '65_plus', 'unknown');
create type public.gender_type as enum ('male', 'female', 'unknown');
create type public.sale_status as enum ('pending', 'approved', 'cancelled', 'refunded', 'chargeback');
create type public.tracking_event_type as enum (
  'visit', 'offer_click', 'sale_pending', 'sale_approved', 'sale_cancelled', 'refund', 'chargeback'
);
create type public.campaign_status as enum ('draft', 'paused', 'enabled', 'removed');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'executed', 'failed', 'expired');
create type public.recommendation_status as enum ('open', 'accepted', 'dismissed');
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.connection_status as enum ('not_configured', 'pending', 'connected', 'error', 'revoked');
create type public.page_status as enum ('draft', 'published', 'archived');
create type public.run_status as enum ('queued', 'running', 'succeeded', 'failed');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Identity & tenancy
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  preferred_locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  base_currency char(3) not null default 'USD' check (base_currency = 'USD'),
  display_currency char(3) not null default 'USD' check (display_currency in ('USD', 'BRL')),
  timezone text not null default 'America/New_York',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- Role check used by every RLS policy. SECURITY DEFINER avoids recursive RLS
-- on workspace_members; it only ever answers for the calling user (auth.uid()).
create or replace function public.has_workspace_role(ws uuid, min_role public.member_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.role >= min_role
  );
$$;

-- ---------------------------------------------------------------------------
-- Financial guardrails (one row per workspace)
-- ---------------------------------------------------------------------------
create table public.financial_limits (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  daily_budget_usd numeric(12, 2) not null default 0 check (daily_budget_usd >= 0),
  monthly_budget_usd numeric(12, 2) not null default 0 check (monthly_budget_usd >= 0),
  max_cpc_usd numeric(10, 2) not null default 0 check (max_cpc_usd >= 0),
  max_cpa_usd numeric(10, 2) not null default 0 check (max_cpa_usd >= 0),
  min_margin_usd numeric(10, 2) not null default 0 check (min_margin_usd >= 0),
  max_spend_per_product_usd numeric(12, 2) not null default 0 check (max_spend_per_product_usd >= 0),
  max_spend_per_campaign_usd numeric(12, 2) not null default 0 check (max_spend_per_campaign_usd >= 0),
  -- Spend with zero approved sales before a "no conversions" alert fires.
  no_conversion_spend_alert_usd numeric(10, 2) not null default 0 check (no_conversion_spend_alert_usd >= 0),
  -- Automatic actions stay OFF until the owner explicitly enables them.
  auto_optimization_enabled boolean not null default false,
  auto_pause_enabled boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint monthly_covers_daily check (monthly_budget_usd = 0 or monthly_budget_usd >= daily_budget_usd)
);

-- ---------------------------------------------------------------------------
-- Integrations (credentials are NEVER stored in these tables; see docs)
-- ---------------------------------------------------------------------------
create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform public.affiliate_platform not null,
  account_label text,
  status public.connection_status not null default 'not_configured',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform)
);

create table public.ads_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id text not null check (customer_id ~ '^[0-9]{10}$'),
  descriptive_name text,
  currency char(3),
  status public.connection_status not null default 'pending',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, customer_id)
);

-- ---------------------------------------------------------------------------
-- Product catalogue
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform public.affiliate_platform not null,
  external_id text,
  name text not null check (char_length(name) between 1 and 200),
  vendor text,
  category text,
  niche text,
  countries text[] not null default '{}',
  language text not null default 'en',
  price numeric(12, 2) check (price >= 0),
  currency char(3) not null default 'USD',
  commission_model public.commission_model not null default 'cpa',
  commission_fixed_usd numeric(12, 2) check (commission_fixed_usd >= 0),
  commission_percent numeric(5, 2) check (commission_percent between 0 and 100),
  affiliate_link text,
  official_url text,
  refund_policy text,
  refund_window_days integer check (refund_window_days >= 0),
  chargeback_policy text,
  approval_time text,
  payment_terms text,
  traffic_restrictions text,
  -- 0..100, NULL until the Product Radar has actually scored it.
  score integer check (score between 0 and 100),
  score_breakdown jsonb,
  scored_at timestamptz,
  source public.data_source not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_external_uq on public.products (workspace_id, platform, external_id)
  where external_id is not null;
create index products_ws_score_idx on public.products (workspace_id, score desc nulls last);

-- ---------------------------------------------------------------------------
-- Landing pages
-- ---------------------------------------------------------------------------
create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  locale text not null default 'en',
  title text not null,
  status public.page_status not null default 'draft',
  content jsonb not null default '{}'::jsonb,
  affiliate_disclosure text not null default
    'This page contains affiliate links. We may earn a commission if you purchase through them, at no extra cost to you.',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug, locale)
);

-- ---------------------------------------------------------------------------
-- Campaign structure (mirrors Google Ads, filled by sync in Phase 8)
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  ads_account_id uuid references public.ads_accounts (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  landing_page_id uuid references public.landing_pages (id) on delete set null,
  external_id text,
  name text not null,
  status public.campaign_status not null default 'draft',
  daily_budget_usd numeric(12, 2) check (daily_budget_usd >= 0),
  target_countries text[] not null default '{}',
  target_languages text[] not null default '{en}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index campaigns_external_uq on public.campaigns (workspace_id, ads_account_id, external_id)
  where external_id is not null;

create table public.ad_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  external_id text,
  name text not null,
  status public.campaign_status not null default 'draft',
  max_cpc_usd numeric(10, 2) check (max_cpc_usd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Keyword research (estimates and observed data kept explicitly apart)
-- ---------------------------------------------------------------------------
create table public.keyword_research (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  term text not null,
  country char(2) not null default 'US',
  language text not null default 'en',
  avg_monthly_searches integer,
  cpc_low_usd numeric(10, 2),
  cpc_high_usd numeric(10, 2),
  competition text,
  intent text check (intent in ('transactional', 'commercial', 'informational', 'navigational', 'unknown')),
  recommended_match text check (recommended_match in ('exact', 'phrase', 'broad')),
  is_negative boolean not null default false,
  rationale text,
  source public.data_source not null default 'estimate',
  fetched_at timestamptz not null default now(),
  unique (workspace_id, product_id, term, country, language)
);

-- ---------------------------------------------------------------------------
-- Ad performance fact table (one row per day x dimension combination)
-- ---------------------------------------------------------------------------
create table public.daily_metrics (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  metric_date date not null,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  ad_group_id uuid references public.ad_groups (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  keyword_text text,
  country char(2),
  region text,
  device public.device_type,
  age_range public.age_range,
  gender public.gender_type,
  hour_of_day smallint check (hour_of_day between 0 and 23),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  cost_usd numeric(14, 4) not null default 0 check (cost_usd >= 0),
  -- Conversions as reported by the ad platform (NOT money; see conversions table).
  ad_conversions numeric(12, 2) not null default 0,
  source public.data_source not null default 'api',
  synced_at timestamptz not null default now(),
  constraint daily_metrics_grain unique nulls not distinct (
    workspace_id, metric_date, campaign_id, ad_group_id, keyword_text,
    country, region, device, age_range, gender, hour_of_day
  )
);
create index daily_metrics_ws_date_idx on public.daily_metrics (workspace_id, metric_date);

-- ---------------------------------------------------------------------------
-- Tracking: clicks, sales (ledger) and immutable sale events
-- ---------------------------------------------------------------------------
create table public.clicks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  click_id text not null unique default encode(gen_random_bytes(12), 'hex'),
  gclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_page_id uuid references public.landing_pages (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  ad_group_id uuid references public.ad_groups (id) on delete set null,
  keyword_text text,
  country char(2),
  region text,
  device public.device_type not null default 'unknown',
  event_type public.tracking_event_type not null default 'visit'
    check (event_type in ('visit', 'offer_click')),
  created_at timestamptz not null default now()
);
create index clicks_ws_created_idx on public.clicks (workspace_id, created_at);
create index clicks_gclid_idx on public.clicks (gclid) where gclid is not null;

-- One row per sale; status moves through its lifecycle. A pending commission is
-- NEVER profit: profit only counts status = 'approved'.
create table public.conversions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform public.affiliate_platform not null,
  external_sale_id text not null,
  product_id uuid references public.products (id) on delete set null,
  click_id text references public.clicks (click_id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  keyword_text text,
  country char(2),
  device public.device_type not null default 'unknown',
  status public.sale_status not null default 'pending',
  sale_amount numeric(12, 2),
  commission_amount numeric(12, 2) not null,
  commission_currency char(3) not null default 'USD',
  commission_usd numeric(12, 2) not null,
  occurred_at timestamptz not null,
  approved_at timestamptz,
  reversed_at timestamptz,
  source public.data_source not null default 'api',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform, external_sale_id)
);
create index conversions_ws_occurred_idx on public.conversions (workspace_id, occurred_at);

-- Raw, append-only event log. event_key de-duplicates postback retries.
create table public.conversion_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversion_id uuid references public.conversions (id) on delete cascade,
  platform public.affiliate_platform not null,
  event_key text not null,
  event_type public.tracking_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique (workspace_id, platform, event_key)
);

-- ---------------------------------------------------------------------------
-- FX (global, written by server jobs only)
-- ---------------------------------------------------------------------------
create table public.fx_rates (
  rate_date date not null,
  base char(3) not null default 'USD',
  quote char(3) not null,
  rate numeric(14, 6) not null check (rate > 0),
  source text not null,
  fetched_at timestamptz not null default now(),
  primary key (rate_date, base, quote)
);

-- ---------------------------------------------------------------------------
-- AI agent, recommendations, approvals, alerts, audit
-- ---------------------------------------------------------------------------
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  routine text not null check (routine in ('daily', 'weekly', 'manual')),
  status public.run_status not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  summary text,
  error text,
  created_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  agent_run_id uuid references public.agent_runs (id) on delete set null,
  module text not null,
  title text not null,
  rationale text not null,
  -- Evidence must reference real rows/metrics; empty evidence = not shown as fact.
  evidence jsonb not null default '[]'::jsonb,
  expected_impact_usd numeric(12, 2),
  risk_level public.alert_severity not null default 'info',
  status public.recommendation_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  recommendation_id uuid references public.recommendations (id) on delete set null,
  action_type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  estimated_spend_usd numeric(12, 2),
  status public.approval_status not null default 'pending',
  requested_by text not null default 'agent' check (requested_by in ('agent', 'user', 'system')),
  requested_by_user uuid references auth.users (id) on delete set null,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  executed_at timestamptz,
  execution_result jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index approval_requests_ws_status_idx on public.approval_requests (workspace_id, status);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null,
  severity public.alert_severity not null default 'warning',
  message text not null,
  context jsonb not null default '{}'::jsonb,
  acknowledged_by uuid references auth.users (id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  -- No FK on purpose: audit rows must survive (and be insertable during)
  -- cascading deletes of the workspace they describe.
  workspace_id uuid,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_ws_created_idx on public.audit_log (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'workspaces', 'financial_limits', 'platform_connections', 'ads_accounts',
    'products', 'landing_pages', 'campaigns', 'ad_groups', 'conversions',
    'recommendations', 'approval_requests'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Audit trigger (append-only; runs as definer so users cannot forge entries)
-- ---------------------------------------------------------------------------
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (workspace_id, actor_id, action, entity, entity_id, old_data, new_data)
  values (
    coalesce((rec ->> 'workspace_id')::uuid, null),
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'workspace_id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'financial_limits', 'platform_connections', 'ads_accounts', 'products', 'landing_pages',
    'campaigns', 'ad_groups', 'conversions', 'approval_requests', 'workspace_members'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()',
      t || '_audit', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Approval decision integrity: only admins decide, decider is always the caller,
-- and a decision cannot be silently rewritten.
-- ---------------------------------------------------------------------------
create or replace function public.guard_approval_decision()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status in ('approved', 'rejected') then
      new.decided_by := auth.uid();
      new.decided_at := now();
    elsif old.status = 'approved' and new.status in ('executed', 'failed') then
      new.executed_at := coalesce(new.executed_at, now());
    elsif old.status = 'pending' and new.status = 'expired' then
      null;
    else
      raise exception 'Invalid approval transition % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;
  end if;
  -- The approved payload is frozen: what was approved is what gets executed.
  if old.status <> 'pending' and new.payload is distinct from old.payload then
    raise exception 'Payload of a decided approval cannot change' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger approval_requests_guard before update on public.approval_requests
  for each row execute function public.guard_approval_decision();

-- ---------------------------------------------------------------------------
-- Bootstrap: every new user gets a profile, a workspace (owner) and limits.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare ws_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.workspaces (name, created_by)
  values ('My Workspace', new.id)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  insert into public.financial_limits (workspace_id) values (ws_id);
  insert into public.platform_connections (workspace_id, platform)
  values (ws_id, 'clickbank'), (ws_id, 'digistore24'), (ws_id, 'smartadv');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.financial_limits enable row level security;
alter table public.platform_connections enable row level security;
alter table public.ads_accounts enable row level security;
alter table public.products enable row level security;
alter table public.landing_pages enable row level security;
alter table public.campaigns enable row level security;
alter table public.ad_groups enable row level security;
alter table public.keyword_research enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.clicks enable row level security;
alter table public.conversions enable row level security;
alter table public.conversion_events enable row level security;
alter table public.fx_rates enable row level security;
alter table public.agent_runs enable row level security;
alter table public.recommendations enable row level security;
alter table public.approval_requests enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_log enable row level security;

-- Profiles: self only.
create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces: members read, admins rename.
create policy workspaces_member_select on public.workspaces for select to authenticated
  using (public.has_workspace_role(id, 'viewer'));
create policy workspaces_admin_update on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, 'admin')) with check (public.has_workspace_role(id, 'admin'));

-- Members: members can see the roster; only owners manage it.
create policy members_select on public.workspace_members for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer'));
create policy members_owner_write on public.workspace_members for all to authenticated
  using (public.has_workspace_role(workspace_id, 'owner'))
  with check (public.has_workspace_role(workspace_id, 'owner'));

-- Financial limits & connections: members read, admins change.
create policy limits_select on public.financial_limits for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer'));
create policy limits_admin_update on public.financial_limits for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));

create policy connections_select on public.platform_connections for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer'));
create policy connections_admin_write on public.platform_connections for all to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));

create policy ads_accounts_select on public.ads_accounts for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer'));
create policy ads_accounts_admin_write on public.ads_accounts for all to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));

-- Working data: viewers read, analysts+ write.
do $$
declare t text;
begin
  foreach t in array array[
    'products', 'landing_pages', 'campaigns', 'ad_groups', 'keyword_research', 'recommendations'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_workspace_role(workspace_id, ''viewer''))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_workspace_role(workspace_id, ''analyst'')) with check (public.has_workspace_role(workspace_id, ''analyst''))',
      t || '_analyst_write', t);
  end loop;
end $$;

-- Data written by server ingestion (service role bypasses RLS): members read only.
do $$
declare t text;
begin
  foreach t in array array[
    'daily_metrics', 'clicks', 'conversion_events', 'agent_runs', 'audit_log'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_workspace_role(workspace_id, ''viewer''))',
      t || '_select', t);
  end loop;
end $$;

-- Conversions: read for members; manual entry/correction by analysts (audited).
create policy conversions_select on public.conversions for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer'));
create policy conversions_analyst_insert on public.conversions for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'analyst') and source in ('manual', 'import'));
create policy conversions_analyst_update on public.conversions for update to authenticated
  using (public.has_workspace_role(workspace_id, 'analyst') and source in ('manual', 'import'))
  with check (public.has_workspace_role(workspace_id, 'analyst') and source in ('manual', 'import'));

-- Approvals: members read; analysts may request; only admins decide.
create policy approvals_select on public.approval_requests for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer'));
create policy approvals_request on public.approval_requests for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, 'analyst')
    and status = 'pending' and requested_by = 'user' and requested_by_user = auth.uid()
  );
create policy approvals_decide on public.approval_requests for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));

-- Alerts: members read, analysts acknowledge.
create policy alerts_select on public.alerts for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer'));
create policy alerts_ack on public.alerts for update to authenticated
  using (public.has_workspace_role(workspace_id, 'analyst'))
  with check (public.has_workspace_role(workspace_id, 'analyst'));

-- FX: any signed-in user may read.
create policy fx_read on public.fx_rates for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Grants (explicit: anon gets nothing in public schema)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
revoke insert, update, delete on public.audit_log from authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_row() from public, anon, authenticated;

-- Explicit EXECUTE grants: projects created with "auto-expose new tables" OFF
-- may not grant function execution by default. RLS policies call this helper.
revoke execute on function public.has_workspace_role(uuid, public.member_role) from public, anon;
grant execute on function public.has_workspace_role(uuid, public.member_role) to authenticated, service_role;

-- >>> 20261109000200_dashboard_functions.sql
-- =============================================================================
-- Dashboard read functions. SECURITY INVOKER: they run under the caller's RLS,
-- so a user can only ever aggregate workspaces they belong to.
-- Revenue is attributed to the date the sale occurred (occurred_at, UTC).
-- =============================================================================

-- Totals for a period. Derived ratios (CPC, CTR, ROI...) are computed in the app
-- by tested pure functions so there is one source of truth for the formulas.
create or replace function public.dashboard_totals(p_workspace uuid, p_from date, p_to date)
returns table (
  spend_usd numeric,
  impressions bigint,
  clicks bigint,
  ad_conversions numeric,
  sales_total bigint,
  sales_approved bigint,
  sales_pending bigint,
  sales_reversed bigint,
  refunds bigint,
  chargebacks bigint,
  commission_pending_usd numeric,
  commission_approved_usd numeric,
  commission_reversed_usd numeric
)
language sql stable security invoker set search_path = public
as $$
  with m as (
    select coalesce(sum(cost_usd), 0) as spend_usd,
           coalesce(sum(impressions), 0)::bigint as impressions,
           coalesce(sum(clicks), 0)::bigint as clicks,
           coalesce(sum(ad_conversions), 0) as ad_conversions
    from daily_metrics
    where workspace_id = p_workspace and metric_date between p_from and p_to
  ),
  c as (
    select count(*) filter (where status <> 'cancelled') as sales_total,
           count(*) filter (where status = 'approved') as sales_approved,
           count(*) filter (where status = 'pending') as sales_pending,
           count(*) filter (where status in ('refunded', 'chargeback')) as sales_reversed,
           count(*) filter (where status = 'refunded') as refunds,
           count(*) filter (where status = 'chargeback') as chargebacks,
           coalesce(sum(commission_usd) filter (where status = 'pending'), 0) as commission_pending_usd,
           coalesce(sum(commission_usd) filter (where status = 'approved'), 0) as commission_approved_usd,
           coalesce(sum(commission_usd) filter (where status in ('refunded', 'chargeback')), 0) as commission_reversed_usd
    from conversions
    where workspace_id = p_workspace
      and occurred_at >= p_from::timestamptz
      and occurred_at < (p_to + 1)::timestamptz
  )
  select m.spend_usd, m.impressions, m.clicks, m.ad_conversions,
         c.sales_total, c.sales_approved, c.sales_pending, c.sales_reversed, c.refunds, c.chargebacks,
         c.commission_pending_usd, c.commission_approved_usd, c.commission_reversed_usd
  from m cross join c;
$$;

-- One row per calendar day in the range (zero-filled) for charts.
create or replace function public.dashboard_daily(p_workspace uuid, p_from date, p_to date)
returns table (
  day date,
  spend_usd numeric,
  clicks bigint,
  sales_approved bigint,
  commission_approved_usd numeric,
  commission_pending_usd numeric,
  net_profit_usd numeric
)
language sql stable security invoker set search_path = public
as $$
  with days as (
    select generate_series(p_from, p_to, interval '1 day')::date as day
  ),
  m as (
    select metric_date as day, sum(cost_usd) as spend_usd, sum(clicks)::bigint as clicks
    from daily_metrics
    where workspace_id = p_workspace and metric_date between p_from and p_to
    group by metric_date
  ),
  c as (
    select (occurred_at at time zone 'UTC')::date as day,
           count(*) filter (where status = 'approved') as sales_approved,
           sum(commission_usd) filter (where status = 'approved') as commission_approved_usd,
           sum(commission_usd) filter (where status = 'pending') as commission_pending_usd
    from conversions
    where workspace_id = p_workspace
      and occurred_at >= p_from::timestamptz and occurred_at < (p_to + 1)::timestamptz
    group by 1
  )
  select d.day,
         coalesce(m.spend_usd, 0),
         coalesce(m.clicks, 0),
         coalesce(c.sales_approved, 0),
         coalesce(c.commission_approved_usd, 0),
         coalesce(c.commission_pending_usd, 0),
         coalesce(c.commission_approved_usd, 0) - coalesce(m.spend_usd, 0)
  from days d
  left join m on m.day = d.day
  left join c on c.day = d.day
  order by d.day;
$$;

-- Results broken down by one dimension. Ad-side metrics come from daily_metrics,
-- money from conversions. Dimensions only the ad platform reports (age, gender)
-- have no commission column: we never fabricate an attribution.
create or replace function public.dashboard_breakdown(
  p_workspace uuid, p_from date, p_to date, p_dimension text
)
returns table (
  key text,
  label text,
  spend_usd numeric,
  impressions bigint,
  clicks bigint,
  ad_conversions numeric,
  sales_approved bigint,
  commission_approved_usd numeric,
  commission_pending_usd numeric,
  commission_attributable boolean
)
language plpgsql stable security invoker set search_path = public
as $$
begin
  if p_dimension not in ('product', 'platform', 'campaign', 'country', 'device', 'age_range', 'gender', 'keyword') then
    raise exception 'Unsupported dimension: %', p_dimension using errcode = 'invalid_parameter_value';
  end if;

  return query
  with m as (
    select coalesce(case p_dimension
             when 'product' then dm.product_id::text
             when 'platform' then p.platform::text
             when 'campaign' then dm.campaign_id::text
             when 'country' then dm.country::text
             when 'device' then dm.device::text
             when 'age_range' then dm.age_range::text
             when 'gender' then dm.gender::text
             when 'keyword' then dm.keyword_text
           end, 'unknown') as k,
           sum(dm.cost_usd) as spend_usd,
           sum(dm.impressions)::bigint as impressions,
           sum(dm.clicks)::bigint as clicks,
           sum(dm.ad_conversions) as ad_conversions
    from daily_metrics dm
    left join products p on p.id = dm.product_id
    where dm.workspace_id = p_workspace and dm.metric_date between p_from and p_to
    group by 1
  ),
  c as (
    select coalesce(case p_dimension
             when 'product' then cv.product_id::text
             when 'platform' then cv.platform::text
             when 'campaign' then cv.campaign_id::text
             when 'country' then cv.country::text
             when 'device' then cv.device::text
             when 'keyword' then cv.keyword_text
             else null
           end, 'unknown') as k,
           count(*) filter (where cv.status = 'approved') as sales_approved,
           sum(cv.commission_usd) filter (where cv.status = 'approved') as commission_approved_usd,
           sum(cv.commission_usd) filter (where cv.status = 'pending') as commission_pending_usd
    from conversions cv
    where cv.workspace_id = p_workspace
      and cv.occurred_at >= p_from::timestamptz and cv.occurred_at < (p_to + 1)::timestamptz
      and p_dimension not in ('age_range', 'gender')
    group by 1
  ),
  j as (
    select coalesce(m.k, c.k) as k,
           coalesce(m.spend_usd, 0) as spend_usd,
           coalesce(m.impressions, 0)::bigint as impressions,
           coalesce(m.clicks, 0)::bigint as clicks,
           coalesce(m.ad_conversions, 0) as ad_conversions,
           coalesce(c.sales_approved, 0)::bigint as sales_approved,
           coalesce(c.commission_approved_usd, 0) as commission_approved_usd,
           coalesce(c.commission_pending_usd, 0) as commission_pending_usd
    from m full outer join c on c.k = m.k
  )
  select j.k,
         coalesce(
           case p_dimension
             when 'product' then (select pr.name from products pr where pr.id::text = j.k)
             when 'campaign' then (select ca.name from campaigns ca where ca.id::text = j.k)
           end,
           j.k,
           'Unknown'
         ),
         j.spend_usd, j.impressions, j.clicks, j.ad_conversions,
         j.sales_approved, j.commission_approved_usd, j.commission_pending_usd,
         p_dimension not in ('age_range', 'gender')
  from j
  order by j.commission_approved_usd - j.spend_usd desc, j.spend_usd desc;
end $$;

revoke execute on function public.dashboard_totals(uuid, date, date) from public, anon;
revoke execute on function public.dashboard_daily(uuid, date, date) from public, anon;
revoke execute on function public.dashboard_breakdown(uuid, date, date, text) from public, anon;
grant execute on function public.dashboard_totals(uuid, date, date) to authenticated;
grant execute on function public.dashboard_daily(uuid, date, date) to authenticated;
grant execute on function public.dashboard_breakdown(uuid, date, date, text) to authenticated;
