begin;

insert into app_private.counters (name) values ('notifications');

create table public.notifications (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  slug text not null unique check (char_length(slug) between 1 and 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160 and title = btrim(title) and title !~ '[[:cntrl:]]'),
  body text not null check (char_length(body) between 1 and 10000 and body = btrim(body) and body ~ '[^[:space:]]'),
  suffix text check (suffix is null or (char_length(suffix) between 1 and 80 and suffix = btrim(suffix) and suffix !~ '[[:cntrl:]]')),
  kind text not null default 'announcement' check (kind in ('development', 'announcement')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  link_url text check (link_url is null or (
    char_length(link_url) between 1 and 2048 and link_url !~ '[[:space:]\\]'
    and (link_url ~ '^/([^/].*)?$' or link_url ~ '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$')
  )),
  link_label text check (link_label is null or (char_length(link_label) between 1 and 120 and link_label = btrim(link_label) and link_label !~ '[[:cntrl:]]')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_link_pair check ((link_url is null) = (link_label is null)),
  constraint notifications_app_id check (
    id ~ ('^Notification_' || number::text || '_Announcement_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  )
);
create index notifications_published_number_idx on public.notifications (number desc) where status = 'published';

create table public.notification_receipts (
  account_id text not null references public.accounts (id) on delete restrict,
  notification_id text not null references public.notifications (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (account_id, notification_id)
);

-- This infrastructure row carries no announcement contents, account data or counts.
create table public.notification_feed_state (
  id text primary key check (id = 'public'),
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  updated_at timestamptz not null default now()
);
insert into public.notification_feed_state (id) values ('public');

create table app_private.notification_create_requests (
  account_id text not null references public.accounts (id) on delete restrict,
  request_id uuid not null,
  notification_id text not null,
  payload jsonb not null,
  primary key (account_id, request_id)
);

alter table public.notifications enable row level security;
alter table public.notification_receipts enable row level security;
alter table public.notification_feed_state enable row level security;
alter table app_private.notification_create_requests enable row level security;

create policy notifications_public_read on public.notifications for select to anon
using (status = 'published');
create policy notifications_account_read on public.notifications for select to authenticated
using (status = 'published' or (select app_private.is_owner()));
create policy notification_receipts_read_self on public.notification_receipts for select to authenticated
using (account_id = (select app_private.active_account_id()));
create policy notification_feed_state_read on public.notification_feed_state for select to anon, authenticated
using (true);

create function app_private.lock_notification_owner(p_expected_auth_uid uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare actor_account text;
begin
  actor_account := app_private.lock_active_account(p_expected_auth_uid);
  if not app_private.is_owner() then raise exception 'Notification management requires the active verified Owner.' using errcode = '42501'; end if;
  return actor_account;
end;
$$;

create function app_private.save_notification(
  p_payload jsonb, p_expected_auth_uid uuid, p_id text default null,
  p_expected_updated_at timestamptz default null, p_request_id uuid default null
)
returns setof public.notifications language plpgsql security definer set search_path = ''
as $$
declare
  actor_account text := app_private.lock_notification_owner(p_expected_auth_uid);
  saved public.notifications%rowtype;
  previous_request app_private.notification_create_requests%rowtype;
  next_number bigint;
  normalized jsonb;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or not (p_payload ?& array['slug', 'title', 'body', 'suffix', 'kind', 'status', 'link_url', 'link_label'])
    or (p_payload - array['slug', 'title', 'body', 'suffix', 'kind', 'status', 'link_url', 'link_label']) <> '{}'::jsonb
    or exists (select 1 from jsonb_each(p_payload) as item where jsonb_typeof(item.value) not in ('string', 'null')) then
    raise exception 'Use the supported notification fields.' using errcode = '22023';
  end if;
  normalized := jsonb_build_object(
    'slug', lower(btrim(p_payload ->> 'slug')), 'title', btrim(p_payload ->> 'title'),
    'body', btrim(p_payload ->> 'body'), 'suffix', nullif(btrim(p_payload ->> 'suffix'), ''),
    'kind', p_payload ->> 'kind', 'status', p_payload ->> 'status',
    'link_url', nullif(btrim(p_payload ->> 'link_url'), ''), 'link_label', nullif(btrim(p_payload ->> 'link_label'), '')
  );
  if p_id is null then
    if p_request_id is null or p_expected_updated_at is not null then raise exception 'A stable creation attempt is required.' using errcode = '22023'; end if;
    select * into previous_request from app_private.notification_create_requests
    where account_id = actor_account and request_id = p_request_id;
    if found then
      if previous_request.payload is distinct from normalized then raise exception 'This creation attempt was already used.' using errcode = '22023'; end if;
      select * into saved from public.notifications where id = previous_request.notification_id;
      if not found then raise exception 'The previously created notification was removed. Reload before creating another.' using errcode = '40001'; end if;
      return next saved;
      return;
    end if;
    update app_private.counters set number = number + 1 where name = 'notifications' returning number into next_number;
    if next_number is null then raise exception 'Notification allocation is unavailable.'; end if;
    insert into public.notifications (id, number, slug, title, body, suffix, kind, status, link_url, link_label)
    values (
      'Notification_' || next_number::text || '_Announcement_' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD') || '_' || gen_random_uuid()::text,
      next_number, normalized ->> 'slug', normalized ->> 'title', normalized ->> 'body', normalized ->> 'suffix',
      normalized ->> 'kind', normalized ->> 'status', normalized ->> 'link_url', normalized ->> 'link_label'
    ) returning * into saved;
    insert into app_private.notification_create_requests (account_id, request_id, notification_id, payload)
    values (actor_account, p_request_id, saved.id, normalized);
  else
    if p_expected_updated_at is null then raise exception 'Review the saved notification before editing.' using errcode = '22023'; end if;
    select * into saved from public.notifications where id = p_id for update;
    if not found or saved.updated_at is distinct from p_expected_updated_at then raise exception 'The notification changed. Reload before editing.' using errcode = '40001'; end if;
    update public.notifications set
      slug = normalized ->> 'slug', title = normalized ->> 'title', body = normalized ->> 'body', suffix = normalized ->> 'suffix',
      kind = normalized ->> 'kind', status = normalized ->> 'status', link_url = normalized ->> 'link_url', link_label = normalized ->> 'link_label',
      updated_at = greatest(clock_timestamp(), saved.updated_at + interval '1 microsecond')
    where id = p_id returning * into saved;
  end if;
  update public.notification_feed_state set revision = revision + 1, updated_at = clock_timestamp() where id = 'public';
  return next saved;
end;
$$;

create function app_private.get_owner_notifications(p_expected_auth_uid uuid, p_before bigint default null)
returns setof public.notifications language plpgsql security definer set search_path = ''
as $$
begin
  perform app_private.lock_notification_owner(p_expected_auth_uid);
  if p_before is not null and (p_before < 1 or p_before > 9007199254740991) then
    raise exception 'Use a valid notification page cursor.' using errcode = '22023';
  end if;
  return query select * from public.notifications
  where p_before is null or number < p_before
  order by number desc limit 51;
end;
$$;

create function app_private.remove_notification(p_id text, p_expected_updated_at timestamptz, p_expected_auth_uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare saved public.notifications%rowtype;
begin
  perform app_private.lock_notification_owner(p_expected_auth_uid);
  select * into saved from public.notifications where id = p_id for update;
  if not found or p_expected_updated_at is null or saved.updated_at is distinct from p_expected_updated_at then
    raise exception 'The notification changed. Reload before deleting.' using errcode = '40001';
  end if;
  delete from public.notifications where id = saved.id;
  update public.notification_feed_state set revision = revision + 1, updated_at = clock_timestamp() where id = 'public';
end;
$$;

create function app_private.mark_notifications_read(p_ids text[], p_expected_auth_uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor_account text := app_private.lock_active_account(p_expected_auth_uid);
  requested_count integer;
  published_count integer;
begin
  if p_ids is null or cardinality(p_ids) > 100 or array_ndims(p_ids) > 1
    or exists (select 1 from unnest(p_ids) as requested(id) where id is null or char_length(id) > 200) then
    raise exception 'Mark at most 100 observed notifications at a time.' using errcode = '22023';
  end if;
  select count(distinct id) into requested_count from unnest(p_ids) as requested(id);
  if requested_count = 0 then return; end if;
  perform id from public.notifications where id = any(p_ids) for share;
  select count(*) into published_count from public.notifications where status = 'published' and id = any(p_ids);
  if published_count <> requested_count then
    raise exception 'The observed notification feed changed. Reload before marking notifications read.' using errcode = '40001';
  end if;
  insert into public.notification_receipts (account_id, notification_id)
  select actor_account, id from public.notifications where status = 'published' and id = any(p_ids)
  on conflict (account_id, notification_id) do nothing;
end;
$$;

create function public.save_notification(
  p_payload jsonb, p_expected_auth_uid uuid, p_id text default null,
  p_expected_updated_at timestamptz default null, p_request_id uuid default null
)
returns setof public.notifications language sql security invoker set search_path = ''
as $$ select * from app_private.save_notification(p_payload, p_expected_auth_uid, p_id, p_expected_updated_at, p_request_id); $$;
create function public.get_owner_notifications(p_expected_auth_uid uuid, p_before bigint default null)
returns setof public.notifications language sql security invoker set search_path = ''
as $$ select * from app_private.get_owner_notifications(p_expected_auth_uid, p_before); $$;
create function public.remove_notification(p_id text, p_expected_updated_at timestamptz, p_expected_auth_uid uuid)
returns void language sql security invoker set search_path = ''
as $$ select app_private.remove_notification(p_id, p_expected_updated_at, p_expected_auth_uid); $$;
create function public.mark_notifications_read(p_ids text[], p_expected_auth_uid uuid)
returns void language sql security invoker set search_path = ''
as $$ select app_private.mark_notifications_read(p_ids, p_expected_auth_uid); $$;

revoke all on public.notifications, public.notification_receipts, public.notification_feed_state from public, anon, authenticated;
revoke all on app_private.notification_create_requests from public, anon, authenticated;
revoke all on function app_private.lock_notification_owner(uuid) from public, anon, authenticated;
revoke all on function app_private.save_notification(jsonb, uuid, text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function app_private.get_owner_notifications(uuid, bigint) from public, anon, authenticated;
revoke all on function app_private.remove_notification(text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function app_private.mark_notifications_read(text[], uuid) from public, anon, authenticated;
revoke all on function public.save_notification(jsonb, uuid, text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.get_owner_notifications(uuid, bigint) from public, anon, authenticated;
revoke all on function public.remove_notification(text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.mark_notifications_read(text[], uuid) from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.notifications, public.notification_feed_state to anon, authenticated;
grant select on public.notification_receipts to authenticated;
grant execute on function app_private.get_owner_notifications(uuid, bigint), public.get_owner_notifications(uuid, bigint) to authenticated;
grant execute on function app_private.save_notification(jsonb, uuid, text, timestamptz, uuid), app_private.remove_notification(text, timestamptz, uuid), app_private.mark_notifications_read(text[], uuid) to authenticated;
grant execute on function public.save_notification(jsonb, uuid, text, timestamptz, uuid), public.remove_notification(text, timestamptz, uuid), public.mark_notifications_read(text[], uuid) to authenticated;

do $$
declare table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'The Supabase Realtime publication is missing.';
  end if;
  foreach table_name in array array['notification_feed_state', 'notification_receipts'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

comment on table public.notifications is 'Broadcast announcements only; published records are public, drafts require the active verified Owner.';
comment on table public.notification_receipts is 'Private own-account read receipts; stable notification IDs remain read through edits and republishing.';
comment on table public.notification_feed_state is 'Public-safe invalidation only; published-only RLS never exposes drafts or deleted-row payloads.';
comment on table app_private.notification_create_requests is 'Private retry-safe creation attempts; retained after deletion to prevent stale retries recreating removed announcements.';
commit;
