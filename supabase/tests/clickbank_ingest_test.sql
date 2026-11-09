-- Phase 2 tests: integration secrets + ClickBank sale-event ingestion.
-- Runs after rls_and_ledger_test.sql (reuses alice/bob/carol).
\set QUIET on
\pset tuples_only on

create temp table t as
select m.workspace_id as ws_a,
       (select webhook_token from platform_connections pc where pc.workspace_id = m.workspace_id and platform = 'clickbank') as tok
from workspace_members m
where m.user_id = '00000000-0000-0000-0000-00000000000a' and m.role = 'owner';
grant select on t to authenticated, service_role;

-- ---------- Secrets ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select set_integration_secret((select ws_a from t), 'clickbank', 'ins_secret_key', 'ABCDEF1234567890');
do $$
begin
  assert (select hint from integration_secret_status((select ws_a from t)) where name = 'ins_secret_key') = '7890',
    'owner sees hint';
  begin
    perform value from integration_secrets;
    raise exception 'user could read secret values';
  exception when insufficient_privilege then null;
  end;
  begin
    perform ingest_sale_event((select tok from t), 'clickbank', '{}'::jsonb, '{}'::jsonb);
    raise exception 'user could call ingestion';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from audit_log where action = 'secret_set' and new_data::text like '%ABCDEF%') = 0,
    'secret value never reaches the audit log';
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  perform set_integration_secret((select ws_a from t), 'clickbank', 'api_key', 'API-XXXXXXXXXXXXXXXX');
  raise exception 'viewer set a secret';
exception when insufficient_privilege then null;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  assert (select count(*) from integration_secret_status((select ws_a from t))) = 0, 'other tenant sees no secret status';
end $$;
reset role;

-- ---------- Ingestion (as the service role, like the webhook) ----------
set role service_role;
do $$
declare tok text := (select tok from t); ws uuid := (select ws_a from t); r text;
begin
  r := ingest_sale_event(tok, 'clickbank',
    '{"event_key":"********|TEST|2026-11-09T10:00:00-05:00","raw_type":"TEST","kind":"test"}', '{}');
  assert r = 'test', 'test event: ' || r;
  assert (select status from platform_connections where webhook_token = tok) = 'connected', 'test verifies connection';

  r := ingest_sale_event(tok, 'clickbank', jsonb_build_object(
    'event_key','CB111|SALE|2026-11-09T10:00:00-05:00','raw_type','SALE','kind','sale',
    'external_sale_id','CB111','receipt','CB111','occurred_at','2026-11-09T10:00:00-05:00',
    'commission_usd','42.50','sale_amount_usd','69.00','vendor','vendorx','item_no','1',
    'product_title','Vendor X Product','device','mobile','country','US'), '{"raw":true}');
  assert r = 'recorded';
  assert (select status from conversions where external_sale_id = 'CB111') = 'approved';
  assert (select commission_usd from conversions where external_sale_id = 'CB111') = 42.50;
  assert (select name from products where external_id = 'vendorx:1') = 'Vendor X Product', 'product auto-created';

  r := ingest_sale_event(tok, 'clickbank', jsonb_build_object(
    'event_key','CB111|SALE|2026-11-09T10:00:00-05:00','raw_type','SALE','kind','sale',
    'external_sale_id','CB111','occurred_at','2026-11-09T10:00:00-05:00','commission_usd','999'), '{}');
  assert r = 'duplicate', 'retry is idempotent';
  assert (select commission_usd from conversions where external_sale_id = 'CB111') = 42.50, 'duplicate did not change amount';

  r := ingest_sale_event(tok, 'clickbank', jsonb_build_object(
    'event_key','CB111|RFND|2026-11-12T09:00:00-05:00','raw_type','RFND','kind','refund',
    'external_sale_id','CB111','occurred_at','2026-11-12T09:00:00-05:00','commission_usd','-42.50'), '{}');
  assert (select status from conversions where external_sale_id = 'CB111') = 'refunded', 'refund reverses sale';
  assert (select commission_usd from conversions where external_sale_id = 'CB111') = 42.50, 'reversed amount kept for reporting';

  r := ingest_sale_event(tok, 'clickbank', jsonb_build_object(
    'event_key','OLD1|CGBK|2026-11-12T09:00:00-05:00','raw_type','CGBK','kind','chargeback',
    'external_sale_id','OLD1','occurred_at','2026-11-12T09:00:00-05:00','commission_usd','-30'), '{}');
  assert (select status from conversions where external_sale_id = 'OLD1') = 'chargeback', 'orphan chargeback recorded';

  r := ingest_sale_event(tok, 'clickbank',
    '{"event_key":"CB111|CANCEL-REBILL|x","raw_type":"CANCEL-REBILL","kind":"other"}', '{}');
  assert r = 'recorded' and (select count(*) from conversion_events where raw_type = 'CANCEL-REBILL') = 1;

  begin
    perform ingest_sale_event('nope', 'clickbank', '{"event_key":"k","kind":"test"}', '{}');
    raise exception 'unknown token accepted';
  exception when no_data_found then null;
  end;
  assert (select count(*) from conversion_events where workspace_id = ws) = 5, 'one row per distinct event';
end $$;
reset role;

select 'CLICKBANK INGEST ASSERTIONS PASSED';
