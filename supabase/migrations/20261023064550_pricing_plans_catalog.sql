begin;

create function app_private.pricing_features_valid(p_features jsonb)
returns boolean language sql immutable security invoker set search_path = ''
as $$ select case when jsonb_typeof(p_features) = 'array' then jsonb_array_length(p_features) <= 16 and not exists (
  select 1 from jsonb_array_elements(p_features) feature where jsonb_typeof(feature) <> 'string'
    or char_length(feature #>> '{}') not between 1 and 160 or feature #>> '{}' <> btrim(feature #>> '{}')
    or feature #>> '{}' ~ '[[:cntrl:]]'
) else false end; $$;

create table public.pricing_plans (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  slug text not null unique check (char_length(slug) <= 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80 and name = btrim(name) and name !~ '[[:cntrl:]]'),
  description text not null check (char_length(description) between 1 and 600 and description = btrim(description) and description !~ '[[:cntrl:]]'),
  features jsonb not null check (app_private.pricing_features_valid(features)),
  price_cents integer not null check (price_cents between 0 and 100000000),
  currency text not null default 'USD' check (currency = 'USD'),
  interval text not null default 'month' check (interval in ('month', 'year', 'one-time')),
  active boolean not null default false,
  highlighted boolean not null default false,
  removes_ads boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 10000),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_plan_app_id check (id ~ ('^Plan_' || number::text || '_[a-zA-Z0-9-]{1,80}_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'))
);
create index pricing_plans_public_order_idx on public.pricing_plans (display_order, number) where active;

create table public.pricing_plan_feed (
  id text primary key check (id = 'public'),
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  updated_at timestamptz not null default now()
);
insert into public.pricing_plan_feed (id) values ('public');
alter table public.pricing_plans enable row level security;
alter table public.pricing_plan_feed enable row level security;
create policy pricing_plans_public_read on public.pricing_plans for select to anon, authenticated using (active);
create policy pricing_plans_owner_read on public.pricing_plans for select to authenticated using ((select app_private.is_owner()));
create policy pricing_plan_feed_public_read on public.pricing_plan_feed for select to anon, authenticated using (true);

create function app_private.bump_pricing_plan_feed()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  update public.pricing_plan_feed set revision = revision + 1, updated_at = clock_timestamp() where id = 'public';
  return null;
end; $$;
create trigger pricing_plans_feed after insert or update or delete on public.pricing_plans
for each statement execute function app_private.bump_pricing_plan_feed();

create function app_private.owner_save_pricing_plan(p_record jsonb)
returns setof public.pricing_plans language plpgsql security definer set search_path = ''
as $$
declare
  field text;
  record_id text;
  next_number bigint;
  expected_revision bigint;
  saved public.pricing_plans%rowtype;
begin
  if p_record is null or jsonb_typeof(p_record) is distinct from 'object' or octet_length(p_record::text) > 16000 then
    raise exception 'Use A Valid Plan Record' using errcode = '22023';
  end if;
  if p_record - array['id', 'expectedRevision', 'expectedAuthUid', 'slug', 'name', 'description', 'features', 'priceCents', 'currency', 'interval', 'active', 'highlighted', 'removesAds', 'displayOrder'] <> '{}'::jsonb
    or not (p_record ?& array['expectedAuthUid', 'slug', 'name', 'description', 'features', 'priceCents', 'currency', 'interval', 'active', 'highlighted', 'removesAds', 'displayOrder'])
    or exists (select 1 from jsonb_each(p_record) entry where entry.value = 'null'::jsonb) then
    raise exception 'Use Only The Required Plan Fields And Optional Identity Fields' using errcode = '22023';
  end if;
  foreach field in array array['expectedAuthUid', 'slug', 'name', 'description', 'currency', 'interval'] loop
    if jsonb_typeof(p_record -> field) is distinct from 'string' then raise exception 'Plan Text Fields Must Be Strings' using errcode = '22023'; end if;
  end loop;
  if p_record ->> 'expectedAuthUid' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception 'Confirm The Current Account Before Saving' using errcode = '22023';
  end if;
  perform app_private.require_catalog_actor((p_record ->> 'expectedAuthUid')::uuid);
  if char_length(p_record ->> 'slug') not between 1 and 80 or p_record ->> 'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(btrim(p_record ->> 'name')) not between 1 and 80 or p_record ->> 'name' ~ '[[:cntrl:]]'
    or char_length(btrim(p_record ->> 'description')) not between 1 and 600 or p_record ->> 'description' ~ '[[:cntrl:]]'
    or p_record ->> 'currency' <> 'USD' or p_record ->> 'interval' not in ('month', 'year', 'one-time')
    or not app_private.pricing_features_valid(p_record -> 'features') then
    raise exception 'Check The Plan Text, Features, Currency And Billing Interval' using errcode = '22023';
  end if;
  foreach field in array array['active', 'highlighted', 'removesAds'] loop
    if jsonb_typeof(p_record -> field) is distinct from 'boolean' then raise exception 'Plan Settings Must Be Booleans' using errcode = '22023'; end if;
  end loop;
  foreach field in array array['priceCents', 'displayOrder'] loop
    if jsonb_typeof(p_record -> field) is distinct from 'number' or p_record ->> field !~ '^(0|[1-9][0-9]{0,8})$' then
      raise exception 'Plan Amount And Display Order Must Be Nonnegative Integers' using errcode = '22023';
    end if;
  end loop;
  if (p_record ->> 'priceCents')::integer > 100000000 or (p_record ->> 'displayOrder')::integer > 10000 then
    raise exception 'Plan Amount Or Display Order Is Too Large' using errcode = '22023';
  end if;
  if p_record ? 'id' and (jsonb_typeof(p_record -> 'id') <> 'string' or char_length(p_record ->> 'id') not between 1 and 180) then
    raise exception 'Use A Valid Existing Plan Identity' using errcode = '22023';
  end if;
  record_id := p_record ->> 'id';
  if record_id is null then
    if p_record ? 'expectedRevision' then raise exception 'New Plans Cannot Have An Existing Revision' using errcode = '22023'; end if;
    select number into next_number from app_private.counters where name = 'pricing_plans' for update;
    if next_number is null then raise exception 'Plan Allocation Is Unavailable'; end if;
    if (select count(*) from public.pricing_plans) >= 100 then raise exception 'Manage At Most 100 Plans' using errcode = '22023'; end if;
    update app_private.counters set number = number + 1 where name = 'pricing_plans' returning number into next_number;
    insert into public.pricing_plans (id, number, slug, name, description, features, price_cents, currency, interval, active, highlighted, removes_ads, display_order)
    values (app_private.catalog_id('Plan', next_number, p_record ->> 'name'), next_number, p_record ->> 'slug', btrim(p_record ->> 'name'), btrim(p_record ->> 'description'),
      p_record -> 'features', (p_record ->> 'priceCents')::integer, p_record ->> 'currency', p_record ->> 'interval', (p_record ->> 'active')::boolean,
      (p_record ->> 'highlighted')::boolean, (p_record ->> 'removesAds')::boolean, (p_record ->> 'displayOrder')::integer) returning * into saved;
  else
    if jsonb_typeof(p_record -> 'expectedRevision') is distinct from 'number' or p_record ->> 'expectedRevision' !~ '^[1-9][0-9]{0,15}$' then
      raise exception 'Confirm The Current Plan Revision Before Saving' using errcode = '22023';
    end if;
    expected_revision := (p_record ->> 'expectedRevision')::bigint;
    if expected_revision > 9007199254740991 then raise exception 'Use A Safe Plan Revision' using errcode = '22023'; end if;
    select * into saved from public.pricing_plans where id = record_id for update;
    if not found then raise exception 'This Plan No Longer Exists' using errcode = 'P0002'; end if;
    if saved.revision <> expected_revision then raise exception 'This Plan Changed; Reload Before Saving' using errcode = '40001'; end if;
    if saved.slug <> p_record ->> 'slug' then raise exception 'Plan Slugs Cannot Be Changed' using errcode = '22023'; end if;
    update public.pricing_plans set name = btrim(p_record ->> 'name'), description = btrim(p_record ->> 'description'), features = p_record -> 'features',
      price_cents = (p_record ->> 'priceCents')::integer, currency = p_record ->> 'currency', interval = p_record ->> 'interval', active = (p_record ->> 'active')::boolean,
      highlighted = (p_record ->> 'highlighted')::boolean, removes_ads = (p_record ->> 'removesAds')::boolean, display_order = (p_record ->> 'displayOrder')::integer,
      revision = revision + 1, updated_at = clock_timestamp() where id = record_id returning * into saved;
  end if;
  return next saved;
end;
$$;

create function app_private.owner_delete_pricing_plan(p_id text, p_expected_revision bigint, p_expected_auth_uid uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare saved public.pricing_plans%rowtype;
begin
  perform app_private.require_catalog_actor(p_expected_auth_uid);
  if p_id is null or char_length(p_id) not between 1 and 180 or p_expected_revision is null or p_expected_revision not between 1 and 9007199254740991 then
    raise exception 'Confirm The Plan Identity And Revision Before Deleting' using errcode = '22023';
  end if;
  select * into saved from public.pricing_plans where id = p_id for update;
  if not found then raise exception 'This Plan No Longer Exists' using errcode = 'P0002'; end if;
  if saved.revision <> p_expected_revision then raise exception 'This Plan Changed; Reload Before Deleting' using errcode = '40001'; end if;
  delete from public.pricing_plans where id = p_id;
  return p_id;
end;
$$;

create function public.owner_save_pricing_plan(p_record jsonb)
returns setof public.pricing_plans language sql security invoker set search_path = ''
as $$ select * from app_private.owner_save_pricing_plan(p_record); $$;
create function public.owner_delete_pricing_plan(p_id text, p_expected_revision bigint, p_expected_auth_uid uuid)
returns text language sql security invoker set search_path = ''
as $$ select app_private.owner_delete_pricing_plan(p_id, p_expected_revision, p_expected_auth_uid); $$;

revoke all on public.pricing_plans, public.pricing_plan_feed from public, anon, authenticated;
grant select on public.pricing_plans, public.pricing_plan_feed to anon, authenticated;
revoke all on function app_private.pricing_features_valid(jsonb), app_private.bump_pricing_plan_feed() from public, anon, authenticated;
revoke all on function app_private.owner_save_pricing_plan(jsonb), public.owner_save_pricing_plan(jsonb) from public, anon, authenticated;
revoke all on function app_private.owner_delete_pricing_plan(text, bigint, uuid), public.owner_delete_pricing_plan(text, bigint, uuid) from public, anon, authenticated;
grant execute on function app_private.owner_save_pricing_plan(jsonb), public.owner_save_pricing_plan(jsonb) to authenticated;
grant execute on function app_private.owner_delete_pricing_plan(text, bigint, uuid), public.owner_delete_pricing_plan(text, bigint, uuid) to authenticated;

insert into app_private.counters (name, number) values ('pricing_plans', 2);
insert into public.pricing_plans (id, number, slug, name, description, features, price_cents, active, highlighted, removes_ads, display_order) values
  (app_private.catalog_id('Plan', 1, 'Free'), 1, 'free', 'Free', 'Explore the archive and build your own spell library.',
    '["Browse Every Published Spell", "Pronunciation And Source Guides", "Save Favorites With An Account", "Contribute Spell Suggestions"]', 0, true, false, false, 0),
  (app_private.catalog_id('Plan', 2, 'Starter'), 2, 'starter', 'Starter', 'Support a growing spell library, with an ad-free experience when subscriptions launch.',
    '["Everything In Free", "Support The Growing Archive"]', 100, true, true, true, 1);

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pricing_plan_feed'
  ) then alter publication supabase_realtime add table public.pricing_plan_feed; end if;
end; $$;

comment on table public.pricing_plans is 'Public-safe active pricing catalog; current-session verified Owner management. Publication does not grant entitlements or collect payments.';
comment on table public.pricing_plan_feed is 'Public pricing invalidation only; clients reread authorized rows after insert, update or delete.';
commit;
