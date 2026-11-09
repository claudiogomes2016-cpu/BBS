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
