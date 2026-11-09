-- =============================================================================
-- Phase 2 — ClickBank integration
--  * per-connection webhook token (routes Instant Notifications to a workspace)
--  * server-only secret storage (INS secret key, ClickBank API key)
--  * atomic, idempotent sale-event ingestion
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Connection metadata
-- ---------------------------------------------------------------------------
alter table public.platform_connections
  add column webhook_token text unique default replace(gen_random_uuid()::text, '-', ''),
  add column account_nickname text check (account_nickname ~ '^[A-Za-z0-9]{5,10}$'),
  add column verified_at timestamptz,
  add column last_event_at timestamptz;

update public.platform_connections
set webhook_token = replace(gen_random_uuid()::text, '-', '')
where webhook_token is null;

alter table public.platform_connections alter column webhook_token set not null;

-- Raw notification type (e.g. CANCEL-REBILL, TEST) for events that do not map
-- to a sale lifecycle step.
alter table public.conversion_events alter column event_type drop not null;
alter table public.conversion_events add column raw_type text;

-- ---------------------------------------------------------------------------
-- Secrets: readable ONLY by the service role. Users write through
-- set_integration_secret() and can see whether a secret exists (+ last chars).
-- Intentionally NOT audited by audit_row(): that would copy the value.
-- ---------------------------------------------------------------------------
create table public.integration_secrets (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform public.affiliate_platform not null,
  name text not null check (name in ('ins_secret_key', 'api_key')),
  value text not null check (char_length(value) between 8 and 200),
  hint text not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, platform, name)
);
alter table public.integration_secrets enable row level security;
revoke all on public.integration_secrets from public, anon, authenticated;
grant all on public.integration_secrets to service_role;

create or replace function public.set_integration_secret(
  p_workspace uuid, p_platform public.affiliate_platform, p_name text, p_value text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_workspace_role(p_workspace, 'admin') then
    raise exception 'Only workspace admins can manage integration secrets'
      using errcode = 'insufficient_privilege';
  end if;
  if p_name not in ('ins_secret_key', 'api_key') then
    raise exception 'Unknown secret %', p_name using errcode = 'invalid_parameter_value';
  end if;

  insert into public.integration_secrets (workspace_id, platform, name, value, hint, updated_by)
  values (p_workspace, p_platform, p_name, p_value, right(p_value, 4), auth.uid())
  on conflict (workspace_id, platform, name) do update
    set value = excluded.value, hint = excluded.hint,
        updated_by = excluded.updated_by, updated_at = now();

  -- Audit WITHOUT the value.
  insert into public.audit_log (workspace_id, actor_id, action, entity, entity_id, new_data)
  values (p_workspace, auth.uid(), 'secret_set', 'integration_secrets', p_platform::text || ':' || p_name,
          jsonb_build_object('platform', p_platform, 'name', p_name, 'hint', right(p_value, 4)));
end $$;

create or replace function public.integration_secret_status(p_workspace uuid)
returns table (platform public.affiliate_platform, name text, hint text, updated_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select s.platform, s.name, s.hint, s.updated_at
  from public.integration_secrets s
  where s.workspace_id = p_workspace and public.has_workspace_role(p_workspace, 'viewer');
$$;

revoke execute on function public.set_integration_secret(uuid, public.affiliate_platform, text, text) from public, anon;
revoke execute on function public.integration_secret_status(uuid) from public, anon;
grant execute on function public.set_integration_secret(uuid, public.affiliate_platform, text, text) to authenticated;
grant execute on function public.integration_secret_status(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ingestion. Called by the webhook with the service role, after the payload
-- was authenticated (decrypted with the workspace's secret).
--
-- p_event keys: event_key, raw_type, kind (sale|refund|chargeback|test|other),
--   external_sale_id, receipt, occurred_at, commission_usd, sale_amount_usd,
--   vendor, item_no, product_title, tracking_code, device, country
--
-- Returns: 'duplicate' | 'test' | 'recorded'
-- ---------------------------------------------------------------------------
create or replace function public.ingest_sale_event(
  p_token text, p_platform public.affiliate_platform, p_event jsonb, p_payload jsonb
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_ws uuid;
  v_conn uuid;
  v_event_id bigint;
  v_kind text := p_event ->> 'kind';
  v_occurred timestamptz := (p_event ->> 'occurred_at')::timestamptz;
  v_amount numeric := abs(coalesce((p_event ->> 'commission_usd')::numeric, 0));
  v_product uuid;
  v_conversion uuid;
  v_click_id text;
  v_click_campaign uuid;
  v_click_keyword text;
  v_click_country text;
  v_click_device public.device_type;
  v_event_type public.tracking_event_type;
  v_status public.sale_status;
begin
  select pc.workspace_id, pc.id into v_ws, v_conn
  from public.platform_connections pc
  where pc.webhook_token = p_token and pc.platform = p_platform;
  if v_ws is null then
    raise exception 'Unknown webhook token' using errcode = 'no_data_found';
  end if;

  v_event_type := case v_kind
    when 'sale' then 'sale_approved'
    when 'refund' then 'refund'
    when 'chargeback' then 'chargeback'
    else null
  end;

  insert into public.conversion_events (workspace_id, platform, event_key, event_type, raw_type, payload)
  values (v_ws, p_platform, p_event ->> 'event_key', v_event_type, p_event ->> 'raw_type', p_payload)
  on conflict (workspace_id, platform, event_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return 'duplicate';
  end if;

  update public.platform_connections
  set status = 'connected', last_event_at = now(), verified_at = coalesce(verified_at, now()),
      last_error = null
  where id = v_conn;

  if v_kind not in ('sale', 'refund', 'chargeback') then
    return case when v_kind = 'test' then 'test' else 'recorded' end;
  end if;

  -- Product catalogue entry (created on first sight).
  if coalesce(p_event ->> 'item_no', '') <> '' then
    insert into public.products (workspace_id, platform, external_id, name, vendor, source)
    values (v_ws, p_platform,
            coalesce(p_event ->> 'vendor', '') || ':' || (p_event ->> 'item_no'),
            coalesce(nullif(p_event ->> 'product_title', ''), p_event ->> 'item_no'),
            p_event ->> 'vendor', 'api')
    on conflict (workspace_id, platform, external_id) where external_id is not null
    do update set vendor = excluded.vendor
    returning id into v_product;
  end if;

  -- Attribution through our own click id, passed as the tracking code (tid).
  if coalesce(p_event ->> 'tracking_code', '') <> '' then
    select c.click_id, c.campaign_id, c.keyword_text, c.country, c.device
    into v_click_id, v_click_campaign, v_click_keyword, v_click_country, v_click_device
    from public.clicks c
    where c.workspace_id = v_ws and c.click_id = p_event ->> 'tracking_code';
  end if;

  if v_kind = 'sale' then
    -- ClickBank credits affiliate commissions to the account balance at sale
    -- time; refunds and chargebacks reverse them later.
    insert into public.conversions (
      workspace_id, platform, external_sale_id, product_id, click_id, campaign_id, keyword_text,
      country, device, status, sale_amount, commission_amount, commission_currency,
      commission_usd, occurred_at, approved_at, source
    ) values (
      v_ws, p_platform, p_event ->> 'external_sale_id', v_product, v_click_id, v_click_campaign,
      v_click_keyword,
      coalesce(v_click_country, nullif(p_event ->> 'country', '')),
      coalesce(v_click_device, (p_event ->> 'device')::public.device_type, 'unknown'),
      'approved', nullif(p_event ->> 'sale_amount_usd', '')::numeric, v_amount, 'USD',
      v_amount, v_occurred, v_occurred, 'api'
    )
    on conflict (workspace_id, platform, external_sale_id) do update
      set commission_amount = excluded.commission_amount,
          commission_usd = excluded.commission_usd,
          product_id = coalesce(public.conversions.product_id, excluded.product_id)
      where public.conversions.status = 'pending'
    returning id into v_conversion;
  else
    v_status := case v_kind when 'refund' then 'refunded' else 'chargeback' end;
    update public.conversions
    set status = v_status, reversed_at = v_occurred
    where workspace_id = v_ws and platform = p_platform
      and external_sale_id = p_event ->> 'external_sale_id'
    returning id into v_conversion;

    if v_conversion is null then
      -- Reversal for a sale recorded before the integration existed.
      insert into public.conversions (
        workspace_id, platform, external_sale_id, product_id, status, commission_amount,
        commission_currency, commission_usd, occurred_at, reversed_at, source,
        country, device
      ) values (
        v_ws, p_platform, p_event ->> 'external_sale_id', v_product, v_status, v_amount,
        'USD', v_amount, v_occurred, v_occurred, 'api',
        nullif(p_event ->> 'country', ''), coalesce((p_event ->> 'device')::public.device_type, 'unknown')
      )
      returning id into v_conversion;
    end if;
  end if;

  update public.conversion_events set conversion_id = v_conversion where id = v_event_id;
  return 'recorded';
end $$;

revoke execute on function public.ingest_sale_event(text, public.affiliate_platform, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_sale_event(text, public.affiliate_platform, jsonb, jsonb) to service_role;
