-- Read-only release evidence. Run after the billing migration and the approved Starter copy update.
with target_tables(schema_name, table_name) as (values
  ('public', 'pricing_plan_tiers'), ('public', 'account_entitlements'), ('public', 'account_grimoires'),
  ('app_private', 'billing_configuration'), ('app_private', 'billing_entitlement_authority'),
  ('app_private', 'billing_bindings'), ('app_private', 'billing_operation_leases'),
  ('app_private', 'billing_attempts'), ('app_private', 'billing_subscriptions'), ('app_private', 'billing_events')
), target_functions(signature) as (values
  ('public.billing_operation(text,jsonb)'), ('app_private.billing_operation(text,jsonb)'),
  ('public.own_billing_entitlement()'), ('app_private.own_billing_entitlement()'),
  ('app_private.billing_entitlement(text)'), ('app_private.current_billing_account_id()'),
  ('public.owner_archive_pricing_plan(text,bigint,uuid)'), ('app_private.owner_archive_pricing_plan(text,bigint,uuid)'),
  ('public.owner_delete_pricing_plan(text,bigint,uuid)'),
  ('app_private.owner_delete_pricing_plan(text,bigint,uuid)'),
  ('public.get_grimoire(uuid)'), ('public.save_grimoire(jsonb,bigint,uuid)'),
  ('app_private.get_grimoire(uuid)'), ('app_private.save_grimoire(jsonb,bigint,uuid)'),
  ('app_private.feature_allows(text)'), ('app_private.plan_meets_minimum(text,text)'),
  ('app_private.submit_contact(jsonb,uuid,uuid)'), ('app_private.mark_notifications_read(text[],uuid)'),
  ('public.submit_contact(jsonb,uuid,uuid)'), ('public.mark_notifications_read(text[],uuid)'),
  ('app_private.submit_contact_before_feature_gate(jsonb,uuid,uuid)'),
  ('app_private.mark_notifications_read_before_feature_gate(text[],uuid)')
)
select jsonb_build_object(
  'checkedAt', clock_timestamp(),
  'tables', (select jsonb_agg(jsonb_build_object(
    'table', t.schema_name || '.' || t.table_name, 'exists', c.oid is not null, 'rls', c.relrowsecurity,
    'anonSelect', has_table_privilege('anon', c.oid, 'SELECT'),
    'authenticatedSelect', has_table_privilege('authenticated', c.oid, 'SELECT'),
    'anonWrite', has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE'),
    'authenticatedWrite', has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE'),
    'serviceDirectWrite', has_table_privilege('service_role', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE')
  ) order by t.schema_name, t.table_name) from target_tables t
    left join pg_namespace n on n.nspname = t.schema_name
    left join pg_class c on c.relnamespace = n.oid and c.relname = t.table_name and c.relkind = 'r'),
  'functions', (select jsonb_agg(jsonb_build_object(
    'signature', f.signature, 'exists', p.oid is not null, 'securityDefiner', p.prosecdef, 'configuration', p.proconfig,
    'arguments', pg_get_function_identity_arguments(p.oid), 'result', pg_get_function_result(p.oid),
    'anonExecute', has_function_privilege('anon', p.oid, 'EXECUTE'),
    'authenticatedExecute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
    'serviceExecute', has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) order by f.signature) from target_functions f left join pg_proc p on p.oid = to_regprocedure(f.signature)),
  'policies', (select jsonb_agg(jsonb_build_object(
    'table', schemaname || '.' || tablename, 'name', policyname, 'roles', roles,
    'command', cmd, 'using', qual, 'check', with_check
  ) order by tablename, policyname) from pg_policies where schemaname = 'public' and tablename in (
    'pricing_plan_tiers', 'account_entitlements', 'account_grimoires', 'notifications', 'notification_feed_state'
  )),
  'featureSettings', (select jsonb_agg(jsonb_build_object(
    'version', version, 'revision', revision, 'features', features, 'valid', app_private.feature_map_valid(features)
  )) from public.feature_settings where scope = 'global'),
  'tiers', jsonb_build_object(
    'catalogCount', (select count(*) from public.pricing_plans),
    'projectionCount', (select count(*) from public.pricing_plan_tiers),
    'mismatches', (select count(*) from public.pricing_plans p full join public.pricing_plan_tiers t on t.id = p.id
      where p.id is null or t.id is null or (p.slug, p.number, p.display_order) is distinct from (t.slug, t.number, t.display_order)),
    'records', (select jsonb_agg(to_jsonb(t) order by t.display_order, t.number) from public.pricing_plan_tiers t)
  ),
  'triggers', (select jsonb_agg(jsonb_build_object(
    'table', c.relname, 'name', t.tgname, 'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid)
  ) order by t.tgname) from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where not t.tgisinternal and t.tgname in ('pricing_plans_sync_tier', 'accounts_initialize_entitlement')),
  'realtime', (select jsonb_agg(tablename order by tablename) from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename in ('feature_settings', 'pricing_plan_feed', 'pricing_plan_tiers', 'account_entitlements', 'account_grimoires')),
  'configuration', (select jsonb_agg(jsonb_build_object(
    'appId', app_id, 'providerAccountId', provider_account_id, 'livemode', livemode, 'active', active
  )) from app_private.billing_configuration),
  'aggregateState', jsonb_build_object(
    'accounts', (select count(*) from public.accounts),
    'entitlements', (select count(*) from public.account_entitlements),
    'missingEntitlements', (select count(*) from public.accounts a left join public.account_entitlements e on e.account_id = a.id where e.account_id is null),
    'entitlementStates', (select jsonb_object_agg(state, records) from (select state, count(*) records from public.account_entitlements group by state) totals),
    'bindings', (select count(*) from app_private.billing_bindings),
    'attempts', (select count(*) from app_private.billing_attempts),
    'subscriptions', (select count(*) from app_private.billing_subscriptions),
    'events', (select count(*) from app_private.billing_events),
    'grimoires', (select count(*) from public.account_grimoires)
  ),
  'starter', (select jsonb_build_object('id', id, 'slug', slug, 'active', active, 'revision', revision,
    'amount', price_cents, 'currency', currency, 'interval', interval, 'description', description, 'features', features)
    from public.pricing_plans where slug = 'starter')
) as release_readback;
