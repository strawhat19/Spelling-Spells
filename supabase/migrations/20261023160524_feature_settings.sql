begin;

create function app_private.feature_policy_valid(p_policy jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
begin
  if p_policy is null or jsonb_typeof(p_policy) is distinct from 'object' then return false; end if;
  if p_policy - array['roles', 'enabled', 'description', 'minimumRole'] <> '{}'::jsonb
    or not (p_policy ?& array['roles', 'enabled', 'description', 'minimumRole']) then return false; end if;
  if jsonb_typeof(p_policy -> 'enabled') is distinct from 'boolean'
    or jsonb_typeof(p_policy -> 'description') is distinct from 'string'
    or jsonb_typeof(p_policy -> 'minimumRole') is distinct from 'string' then return false; end if;
  if char_length(p_policy ->> 'description') not between 1 and 600
    or p_policy ->> 'description' <> btrim(p_policy ->> 'description') or p_policy ->> 'description' ~ '[[:cntrl:]]'
    or p_policy ->> 'minimumRole' not in ('Guest', 'Member', 'Subscriber', 'Developer', 'Admin', 'Owner') then return false; end if;
  if p_policy -> 'roles' = 'null'::jsonb then return true; end if;
  if jsonb_typeof(p_policy -> 'roles') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_policy -> 'roles') > 6 or exists (
    select 1 from jsonb_array_elements(p_policy -> 'roles') role
    where jsonb_typeof(role) <> 'string' or role #>> '{}' not in ('Guest', 'Member', 'Subscriber', 'Developer', 'Admin', 'Owner')
  ) then return false; end if;
  return (select count(*) = count(distinct role) from jsonb_array_elements_text(p_policy -> 'roles') role);
end;
$$;

create function app_private.feature_map_valid(p_features jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
begin
  if p_features is null or jsonb_typeof(p_features) is distinct from 'object' then return false; end if;
  if p_features - 'themeToggle' <> '{}'::jsonb or not (p_features ? 'themeToggle') then return false; end if;
  return app_private.feature_policy_valid(p_features -> 'themeToggle');
end;
$$;

create table public.feature_settings (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  scope text not null default 'global' unique check (scope = 'global'),
  type text not null default 'FeatureSettings' check (type = 'FeatureSettings'),
  name text not null default 'Global' check (name = 'Global'),
  version integer not null default 1 check (version = 1),
  features jsonb not null check (app_private.feature_map_valid(features)),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_settings_app_id check (
    id ~ ('^FeatureSettings_' || number::text || '_Global_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  )
);
alter table public.feature_settings enable row level security;
create policy feature_settings_public_singleton_read on public.feature_settings
for select to anon, authenticated using (scope = 'global');

insert into app_private.counters (name, number) values ('feature_settings', 0);
do $$
declare next_number bigint;
begin
  update app_private.counters set number = number + 1 where name = 'feature_settings' returning number into next_number;
  insert into public.feature_settings (id, number, features)
  values (app_private.catalog_id('FeatureSettings', next_number, 'Global'), next_number,
    '{"themeToggle":{"roles":null,"enabled":true,"minimumRole":"Guest","description":"Choose between the light and dark themes"}}'::jsonb);
end;
$$;

create function app_private.owner_save_feature_policy(p_key text, p_policy jsonb, p_expected_revision bigint, p_expected_auth_uid uuid)
returns setof public.feature_settings language plpgsql security definer set search_path = ''
as $$
declare saved public.feature_settings%rowtype;
begin
  perform app_private.require_catalog_actor(p_expected_auth_uid, true);
  if p_key is distinct from 'themeToggle' or p_policy is null or octet_length(p_policy::text) > 5000
    or not app_private.feature_policy_valid(p_policy) then
    raise exception 'Use A Supported Feature And Valid Feature Policy' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision not between 1 and 9007199254740991 then
    raise exception 'Confirm The Current Feature Revision Before Saving' using errcode = '22023';
  end if;
  select * into saved from public.feature_settings where scope = 'global' for update;
  if not found then raise exception 'The Global Feature Settings Have Not Been Created' using errcode = 'P0002'; end if;
  if saved.revision <> p_expected_revision then raise exception 'The Feature Changed. Reload Before Saving' using errcode = '40001'; end if;
  if saved.features -> p_key = p_policy then return next saved; return; end if;
  update public.feature_settings set features = jsonb_set(features, array[p_key], p_policy, false),
    revision = revision + 1, updated_at = clock_timestamp()
  where id = saved.id returning * into saved;
  return next saved;
end;
$$;

create function public.owner_save_feature_policy(p_key text, p_policy jsonb, p_expected_revision bigint, p_expected_auth_uid uuid)
returns setof public.feature_settings language sql security invoker set search_path = ''
as $$ select * from app_private.owner_save_feature_policy(p_key, p_policy, p_expected_revision, p_expected_auth_uid); $$;

revoke all on public.feature_settings from public, anon, authenticated;
grant select on public.feature_settings to anon, authenticated;
revoke all on function app_private.feature_policy_valid(jsonb), app_private.feature_map_valid(jsonb) from public, anon, authenticated;
revoke all on function app_private.owner_save_feature_policy(text, jsonb, bigint, uuid), public.owner_save_feature_policy(text, jsonb, bigint, uuid) from public, anon, authenticated;
grant execute on function app_private.owner_save_feature_policy(text, jsonb, bigint, uuid), public.owner_save_feature_policy(text, jsonb, bigint, uuid) to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feature_settings'
  ) then alter publication supabase_realtime add table public.feature_settings; end if;
end; $$;

comment on table public.feature_settings is 'Exact public-safe global feature singleton; current active verified permanent-session Owner RPC writes. Role audiences control display features only and grant no administrative capability or paid entitlement.';
commit;
