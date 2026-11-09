-- Database test suite: tenancy isolation (RLS), financial ledger semantics,
-- deduplication, approval integrity and audit. Fails loudly on first error.
\set QUIET on
\pset tuples_only on

-- Users -----------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.dev', '{"full_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.dev', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@test.dev', '{}');

create temp table ids as
select
  (select workspace_id from workspace_members where user_id = '00000000-0000-0000-0000-00000000000a') as ws_a,
  (select workspace_id from workspace_members where user_id = '00000000-0000-0000-0000-00000000000b') as ws_b;
grant select on ids to authenticated, anon;

do $$
begin
  assert (select count(*) from workspaces) = 3, 'bootstrap: one workspace per user';
  assert (select count(*) from financial_limits) = 3, 'bootstrap: limits row per workspace';
  assert (select count(*) from platform_connections) = 9, 'bootstrap: 3 platform slots per workspace';
  assert (select role from workspace_members where user_id = '00000000-0000-0000-0000-00000000000a') = 'owner';
  assert (select full_name from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Alice';
  assert (select auto_optimization_enabled or auto_pause_enabled from financial_limits limit 1) = false,
    'automation must be OFF by default';
end $$;

-- Carol becomes a VIEWER of Alice's workspace.
insert into workspace_members (workspace_id, user_id, role)
select ws_a, '00000000-0000-0000-0000-00000000000c', 'viewer' from ids;

-- Seed ledger data for Alice (as server/service would) ---------------------------
insert into products (id, workspace_id, platform, external_id, name, commission_model, commission_fixed_usd)
select '11111111-1111-1111-1111-111111111111', ws_a, 'clickbank', 'CB-1', 'Alpha Supplement', 'cpa', 100 from ids;

insert into daily_metrics (workspace_id, metric_date, product_id, country, device, age_range, impressions, clicks, cost_usd)
select ws_a, d, '11111111-1111-1111-1111-111111111111', 'US', 'mobile', '35_44', 1000, 50, 60
from ids, (values (date '2026-11-01'), (date '2026-11-02')) v(d);

insert into conversions (workspace_id, platform, external_sale_id, product_id, country, device, status,
                         commission_amount, commission_usd, occurred_at)
select ws_a, 'clickbank', s.id, '11111111-1111-1111-1111-111111111111', 'US', 'mobile', s.st::sale_status,
       s.amt, s.amt, timestamptz '2026-11-01 15:00+00'
from ids, (values ('S1', 'approved', 100), ('S2', 'pending', 100), ('S3', 'refunded', 100),
                  ('S4', 'chargeback', 50), ('S5', 'cancelled', 70)) s(id, st, amt);

-- Duplicate sale id must be rejected (postback retries).
do $$
begin
  insert into conversions (workspace_id, platform, external_sale_id, commission_amount, commission_usd, occurred_at)
  select ws_a, 'clickbank', 'S1', 1, 1, now() from ids;
  raise exception 'duplicate sale was accepted';
exception when unique_violation then null;
end $$;

-- ================= As ALICE (owner) =================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$
declare t record; ws uuid := (select ws_a from ids);
begin
  assert (select count(*) from workspaces) = 1, 'alice sees only her workspace';
  select * into t from dashboard_totals(ws, '2026-11-01', '2026-11-30');
  assert t.spend_usd = 120, 'spend ' || t.spend_usd;
  assert t.clicks = 100;
  assert t.commission_approved_usd = 100, 'approved ' || t.commission_approved_usd;
  assert t.commission_pending_usd = 100, 'pending is tracked but separate';
  assert t.commission_reversed_usd = 150, 'refund + chargeback reversed ' || t.commission_reversed_usd;
  assert t.sales_total = 4, 'cancelled is not a sale';
  assert t.refunds = 1 and t.chargebacks = 1;

  assert (select count(*) from dashboard_daily(ws, '2026-11-01', '2026-11-07')) = 7, 'zero-filled days';
  assert (select net_profit_usd from dashboard_daily(ws, '2026-11-01', '2026-11-01')) = 40, 'day1 profit 100-60';

  assert (select commission_attributable from dashboard_breakdown(ws, '2026-11-01', '2026-11-30', 'age_range') limit 1) = false,
    'age has no fabricated commission';
  assert (select label from dashboard_breakdown(ws, '2026-11-01', '2026-11-30', 'product') limit 1) = 'Alpha Supplement';
  begin
    perform dashboard_breakdown(ws, '2026-11-01', '2026-11-30', 'drop table');
    raise exception 'invalid dimension accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;

-- Alice can write in her workspace but NOT in Bob's.
insert into products (workspace_id, platform, name) select ws_a, 'manual', 'Manual Offer' from ids;
do $$
begin
  insert into products (workspace_id, platform, name) select ws_b, 'manual', 'Intrusion' from ids;
  raise exception 'cross-tenant insert was accepted';
exception when insufficient_privilege then null;
end $$;

-- Audit log is read-only for users, but records their actions.
do $$
begin
  assert (select count(*) from audit_log where entity = 'products' and action = 'insert'
          and actor_id = '00000000-0000-0000-0000-00000000000a') = 1, 'product insert audited with actor';
  begin
    insert into audit_log (workspace_id, action, entity) select ws_a, 'forged', 'x' from ids;
    raise exception 'audit forgery accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Approval lifecycle.
insert into approval_requests (workspace_id, action_type, title, payload, requested_by, requested_by_user)
select ws_a, 'campaign.enable', 'Enable test campaign', '{"budget":10}', 'user', '00000000-0000-0000-0000-00000000000a'
from ids;
update approval_requests set status = 'approved';
do $$
begin
  assert (select decided_by from approval_requests) = '00000000-0000-0000-0000-00000000000a', 'decider recorded';
  assert (select decided_at is not null from approval_requests);
  begin
    update approval_requests set payload = '{"budget":1000}';
    raise exception 'approved payload was changed';
  exception when check_violation then null;
  end;
  begin
    update approval_requests set status = 'pending';
    raise exception 'approval reopened';
  exception when check_violation then null;
  end;
end $$;

-- Manual conversions cannot impersonate API data.
do $$
begin
  insert into conversions (workspace_id, platform, external_sale_id, commission_amount, commission_usd, occurred_at, source, status)
  select ws_a, 'clickbank', 'FAKE', 999, 999, now(), 'api', 'approved' from ids;
  raise exception 'user wrote api-sourced conversion';
exception when insufficient_privilege then null;
end $$;

-- ================= As BOB (other tenant) =================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
declare t record;
begin
  assert (select count(*) from products) = 0, 'bob sees no foreign products';
  assert (select count(*) from conversions) = 0, 'bob sees no foreign sales';
  assert (select count(*) from audit_log where workspace_id = (select ws_a from ids)) = 0, 'bob sees no foreign audit';
  assert (select count(*) from audit_log) > 0, 'bob sees his own audit trail';
  select * into t from dashboard_totals((select ws_a from ids), '2026-11-01', '2026-11-30');
  assert t.spend_usd = 0 and t.commission_approved_usd = 0, 'bob cannot aggregate alice data';
  update financial_limits set daily_budget_usd = 999 where workspace_id = (select ws_a from ids);
  assert not found, 'bob cannot touch alice limits';
end $$;

-- ================= As CAROL (viewer in Alice's ws) =================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  assert (select count(*) from products) = 2, 'viewer can read';
  update financial_limits set daily_budget_usd = 999 where workspace_id = (select ws_a from ids);
  assert not found, 'viewer cannot change limits';
  begin
    insert into products (workspace_id, platform, name) select ws_a, 'manual', 'x' from ids;
    raise exception 'viewer inserted product';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ================= As ANON =================
reset role;
set role anon;
do $$
begin
  perform 1 from products;
  raise exception 'anon read products';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Limits validation (as owner path, checked by constraint).
do $$
begin
  update financial_limits set daily_budget_usd = 100, monthly_budget_usd = 50;
  raise exception 'monthly < daily accepted';
exception when check_violation then null;
end $$;

select 'ALL DATABASE ASSERTIONS PASSED';
