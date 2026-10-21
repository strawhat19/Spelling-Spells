-- Prepared locally; applying this migration to a hosted project requires separate approval.
begin;

insert into app_private.counters (name) values ('catalog_spells'), ('catalog_universes'), ('catalog_sources'), ('catalog_submissions');

create table public.catalog_universes (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 160),
  name text not null check (char_length(btrim(name)) between 1 and 160 and name !~ '[[:cntrl:]]'),
  kind text not null default 'fictional' check (kind in ('fictional', 'folklore')),
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 24000),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_sources (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  label text not null check (char_length(btrim(label)) between 1 and 240 and label !~ '[[:cntrl:]]'),
  url text not null check (char_length(url) <= 2048 and url ~ '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$' and url !~ '[[:cntrl:]]'),
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 24000),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_spells (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 160),
  name text not null check (char_length(btrim(name)) between 1 and 160 and name !~ '[[:cntrl:]]'),
  universe_id text references public.catalog_universes (id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'rejected', 'published', 'unpublished')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 80000),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_spell_app_id check (id ~ ('^Spell_' || number::text || '_[^_]+_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f-]{36}$')),
  constraint catalog_published_universe check (status <> 'published' or universe_id is not null)
);
create index catalog_spells_public_browse_idx on public.catalog_spells (number, id) where status = 'published';
create index catalog_spells_universe_idx on public.catalog_spells (universe_id, number) where status = 'published';

create table public.catalog_spell_sources (
  spell_id text not null references public.catalog_spells (id) on delete restrict,
  source_id text not null references public.catalog_sources (id) on delete restrict,
  primary key (spell_id, source_id)
);
create index catalog_spell_sources_source_idx on public.catalog_spell_sources (source_id, spell_id);

create table public.catalog_feed_state (
  id text primary key check (id = 'public'),
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  updated_at timestamptz not null default now()
);
insert into public.catalog_feed_state (id) values ('public');

create table public.catalog_submissions (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  account_id text not null references public.accounts (id) on delete restrict,
  request_id uuid not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 40000),
  status text not null default 'review' check (status in ('review', 'approved', 'rejected', 'changes-requested')),
  reviewer_note text not null default '' check (char_length(reviewer_note) <= 2000),
  entry_id text references public.catalog_spells (id) on delete restrict,
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, request_id),
  constraint catalog_submission_app_id check (id ~ ('^Submission_' || number::text || '_Entry_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f-]{36}$')),
  constraint catalog_submission_approval_link check (status <> 'approved' or entry_id is not null)
);
create index catalog_submissions_account_page_idx on public.catalog_submissions (account_id, number desc);
create index catalog_submissions_review_page_idx on public.catalog_submissions (number desc);

create table app_private.catalog_actions (
  id bigint generated always as identity primary key,
  actor_auth_uid uuid not null,
  record_id text not null,
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.catalog_spells enable row level security;
alter table public.catalog_sources enable row level security;
alter table public.catalog_universes enable row level security;
alter table public.catalog_submissions enable row level security;
alter table public.catalog_spell_sources enable row level security;
alter table public.catalog_feed_state enable row level security;
alter table app_private.catalog_actions enable row level security;

create policy catalog_spells_public_read on public.catalog_spells for select to anon, authenticated using (status = 'published');
create policy catalog_spells_owner_read on public.catalog_spells for select to authenticated using ((select app_private.is_owner()));
create policy catalog_universes_public_read on public.catalog_universes for select to anon, authenticated using (
  exists (select 1 from public.catalog_spells s where s.universe_id = catalog_universes.id and s.status = 'published')
);
create policy catalog_universes_owner_read on public.catalog_universes for select to authenticated using ((select app_private.is_owner()));
create policy catalog_spell_sources_public_read on public.catalog_spell_sources for select to anon, authenticated using (
  exists (select 1 from public.catalog_spells s where s.id = catalog_spell_sources.spell_id and s.status = 'published')
);
create policy catalog_spell_sources_owner_read on public.catalog_spell_sources for select to authenticated using ((select app_private.is_owner()));
create policy catalog_sources_public_read on public.catalog_sources for select to anon, authenticated using (
  exists (select 1 from public.catalog_spell_sources r join public.catalog_spells s on s.id = r.spell_id
    where r.source_id = catalog_sources.id and s.status = 'published')
);
create policy catalog_sources_owner_read on public.catalog_sources for select to authenticated using ((select app_private.is_owner()));
create policy catalog_submissions_own_read on public.catalog_submissions for select to authenticated using (account_id = (select app_private.active_account_id()));
create policy catalog_submissions_owner_read on public.catalog_submissions for select to authenticated using ((select app_private.is_owner()));
create policy catalog_feed_state_public_read on public.catalog_feed_state for select to anon, authenticated using (true);

create function app_private.bump_catalog_feed()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.catalog_feed_state set revision = revision + 1, updated_at = clock_timestamp() where id = 'public';
  return null;
end;
$$;
create trigger catalog_spells_feed after insert or update or delete on public.catalog_spells for each statement execute function app_private.bump_catalog_feed();
create trigger catalog_universes_feed after insert or update or delete on public.catalog_universes for each statement execute function app_private.bump_catalog_feed();
create trigger catalog_sources_feed after insert or update or delete on public.catalog_sources for each statement execute function app_private.bump_catalog_feed();
create trigger catalog_spell_sources_feed after insert or update or delete on public.catalog_spell_sources for each statement execute function app_private.bump_catalog_feed();

-- Preserve every legacy reference before replacing the allowlist FK. Placeholders are never public.
insert into public.catalog_spells (id, number, slug, name, payload)
select spell_id, split_part(spell_id, '_', 2)::bigint, lower(split_part(spell_id, '_', 3)),
  replace(split_part(spell_id, '_', 3), '-', ' '), '{"seedPlaceholder":true}'::jsonb
from app_private.published_spell_ids;
update app_private.counters set number = coalesce((select max(number) from public.catalog_spells), 0) where name = 'catalog_spells';
alter table public.saved_spells drop constraint saved_spells_spell_id_fkey;
alter table public.saved_spells add constraint saved_spells_spell_id_fkey foreign key (spell_id) references public.catalog_spells (id) on delete restrict;

create function app_private.require_catalog_actor(p_expected_auth_uid uuid, p_owner boolean default true)
returns text language plpgsql security definer set search_path = ''
as $$
declare actor_account_id text;
begin
  actor_account_id := app_private.lock_active_account(p_expected_auth_uid);
  if not exists (select 1 from auth.users u join auth.sessions s on s.user_id = u.id
    where u.id = auth.uid() and not coalesce(u.is_anonymous, false)
      and s.id::text = auth.jwt() ->> 'session_id') then
    raise exception 'The Current Account Session Could Not Be Confirmed' using errcode = '42501';
  end if;
  if p_owner and not app_private.is_owner() then raise exception 'Catalog Editing Requires The Active Verified Owner' using errcode = '42501'; end if;
  return actor_account_id;
end;
$$;

create function app_private.catalog_id(p_type text, p_number bigint, p_name text)
returns text language sql volatile security invoker set search_path = ''
as $$ select p_type || '_' || p_number::text || '_' || coalesce(nullif(left(trim(both '-' from regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')), 80), ''), 'Entry')
  || '_' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD') || '_' || gen_random_uuid()::text; $$;

create function app_private.validate_catalog_payload(p_payload jsonb)
returns void language plpgsql immutable security invoker set search_path = ''
as $$
declare field text;
begin
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text) > 80000
    or p_payload ? 'seedPlaceholder' then raise exception 'Use A Complete Catalog Entry' using errcode = '22023'; end if;
  foreach field in array array['name', 'worldId', 'sourceTitle', 'medium', 'kind', 'language', 'pronunciation', 'pronunciationNote',
    'definition', 'usage', 'etymology', 'etymologyStatus', 'skill', 'category', 'accent', 'slug', 'entryType', 'continuity', 'effect', 'pronunciationStatus', 'evidenceStatus'] loop
    if jsonb_typeof(p_payload -> field) is distinct from 'string' or char_length(p_payload ->> field) > 8000 then
      raise exception 'Unsupported Catalog Field: %', field using errcode = '22023';
    end if;
  end loop;
  foreach field in array array['aliases', 'casters', 'syllables', 'sourceIds', 'sources', 'breakdown'] loop
    if jsonb_typeof(p_payload -> field) is distinct from 'array' or jsonb_array_length(p_payload -> field) > 40 then
      raise exception 'Unsupported Catalog List: %', field using errcode = '22023';
    end if;
  end loop;
  foreach field in array array['aliases', 'casters', 'syllables', 'sourceIds'] loop
    if exists (select 1 from jsonb_array_elements(p_payload -> field) item where jsonb_typeof(item) <> 'string' or char_length(item #>> '{}') > 500) then
      raise exception 'Unsupported Catalog List Item: %', field using errcode = '22023';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(p_payload -> 'sources') source
    where jsonb_typeof(source) is distinct from 'object' or jsonb_typeof(source -> 'label') is distinct from 'string'
      or jsonb_typeof(source -> 'url') is distinct from 'string' or char_length(source ->> 'label') not between 1 and 240
      or char_length(source ->> 'url') > 2048 or source ->> 'url' !~ '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$')
    or exists (select 1 from jsonb_array_elements(p_payload -> 'breakdown') part
      where jsonb_typeof(part) is distinct from 'object' or jsonb_typeof(part -> 'label') is distinct from 'string'
        or jsonb_typeof(part -> 'meaning') is distinct from 'string' or char_length(part ->> 'label') > 500 or char_length(part ->> 'meaning') > 2000) then
    raise exception 'Use Supported Source References And Word Breakdowns' using errcode = '22023';
  end if;
  if p_payload ? 'media' then
    if jsonb_typeof(p_payload -> 'media') is distinct from 'array' or jsonb_array_length(p_payload -> 'media') > 12 then
      raise exception 'Use At Most Twelve Supported Media Records' using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(p_payload -> 'media') media
      where jsonb_typeof(media) is distinct from 'object' or jsonb_typeof(media -> 'id') is distinct from 'string'
        or jsonb_typeof(media -> 'alt') is distinct from 'string' or jsonb_typeof(media -> 'url') is distinct from 'string'
        or jsonb_typeof(media -> 'type') is distinct from 'string' or media ->> 'type' not in ('image', 'video')
        or char_length(media ->> 'url') > 2048 or char_length(media ->> 'alt') > 1000
        or (media ->> 'url' !~ '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$' and media ->> 'url' !~ '^/[^/\\[:space:]][^\\[:space:]]*$')) then
      raise exception 'Use Public HTTPS Or App-Local Media URLs With Alternative Text' using errcode = '22023';
    end if;
  end if;
  if p_payload ->> 'entryType' not in ('spell', 'ability', 'incantation')
    or p_payload ->> 'evidenceStatus' not in ('verified', 'unverified')
    or p_payload ->> 'pronunciationStatus' not in ('verified', 'approximate', 'unavailable')
    or p_payload ->> 'skill' not in ('Beginner', 'Intermediate', 'Advanced')
    or p_payload ->> 'etymologyStatus' not in ('Confirmed', 'Suggested', 'Unconfirmed')
    or p_payload ->> 'accent' not in ('light', 'fire', 'wind', 'unlock', 'shield', 'wand')
    or p_payload ->> 'medium' not in ('Books', 'Films', 'Games', 'Comics', 'Television', 'Folklore')
    or jsonb_typeof(p_payload -> 'danger') is distinct from 'number'
    or jsonb_typeof(p_payload -> 'utility') is distinct from 'number'
    or (p_payload ->> 'danger')::numeric not between 1 and 5
    or (p_payload ->> 'utility')::numeric not between 1 and 5
    or (p_payload ->> 'danger')::numeric <> trunc((p_payload ->> 'danger')::numeric)
    or (p_payload ->> 'utility')::numeric <> trunc((p_payload ->> 'utility')::numeric)
    or nullif(btrim(p_payload ->> 'name'), '') is null
    or nullif(btrim(p_payload ->> 'definition'), '') is null
    or nullif(btrim(p_payload ->> 'effect'), '') is null then
    raise exception 'Check The Catalog Entry Types And Required Fields' using errcode = '22023';
  end if;
end;
$$;

create function app_private.owner_save_catalog_universe(p_record jsonb)
returns setof public.catalog_universes language plpgsql security definer set search_path = ''
as $$
declare saved public.catalog_universes%rowtype; next_number bigint; record_id text := nullif(p_record ->> 'id', '');
begin
  perform app_private.require_catalog_actor((p_record ->> 'expectedAuthUid')::uuid);
  if p_record is null or jsonb_typeof(p_record) <> 'object' or octet_length(p_record::text) > 30000
    or jsonb_typeof(p_record -> 'payload') is distinct from 'object' then raise exception 'Use The Supported Universe Record' using errcode = '22023'; end if;
  if record_id is null then
    update app_private.counters set number = number + 1 where name = 'catalog_universes' returning number into next_number;
    insert into public.catalog_universes (id, number, slug, name, kind, payload)
    values (app_private.catalog_id('Universe', next_number, p_record ->> 'name'), next_number, p_record ->> 'slug', btrim(p_record ->> 'name'), coalesce(p_record ->> 'kind', 'fictional'), p_record -> 'payload') returning * into saved;
  else
    select * into saved from public.catalog_universes where id = record_id for update;
    if not found or saved.revision is distinct from (p_record ->> 'expectedRevision')::bigint then raise exception 'The Universe Changed. Reload Before Saving' using errcode = '40001'; end if;
    if p_record ->> 'slug' is distinct from saved.slug then raise exception 'Published Universe URLs Must Remain Stable' using errcode = '22023'; end if;
    update public.catalog_universes set name = btrim(p_record ->> 'name'), kind = p_record ->> 'kind', payload = p_record -> 'payload', revision = revision + 1, updated_at = clock_timestamp()
    where id = record_id returning * into saved;
  end if;
  insert into app_private.catalog_actions (actor_auth_uid, record_id, action) values (auth.uid(), saved.id, 'save-universe');
  return next saved;
end;
$$;

create function app_private.owner_save_catalog_source(p_record jsonb)
returns setof public.catalog_sources language plpgsql security definer set search_path = ''
as $$
declare saved public.catalog_sources%rowtype; next_number bigint; record_id text := nullif(p_record ->> 'id', '');
begin
  perform app_private.require_catalog_actor((p_record ->> 'expectedAuthUid')::uuid);
  if p_record is null or jsonb_typeof(p_record) <> 'object' or octet_length(p_record::text) > 30000
    or jsonb_typeof(p_record -> 'payload') is distinct from 'object' then raise exception 'Use The Supported Source Record' using errcode = '22023'; end if;
  if record_id is null then
    update app_private.counters set number = number + 1 where name = 'catalog_sources' returning number into next_number;
    insert into public.catalog_sources (id, number, label, url, payload)
    values (app_private.catalog_id('Source', next_number, p_record ->> 'label'), next_number, btrim(p_record ->> 'label'), p_record ->> 'url', p_record -> 'payload') returning * into saved;
  else
    select * into saved from public.catalog_sources where id = record_id for update;
    if not found or saved.revision is distinct from (p_record ->> 'expectedRevision')::bigint then raise exception 'The Source Changed. Reload Before Saving' using errcode = '40001'; end if;
    update public.catalog_sources set label = btrim(p_record ->> 'label'), url = p_record ->> 'url', payload = p_record -> 'payload', revision = revision + 1, updated_at = clock_timestamp()
    where id = record_id returning * into saved;
  end if;
  insert into app_private.catalog_actions (actor_auth_uid, record_id, action) values (auth.uid(), saved.id, 'save-source');
  return next saved;
end;
$$;

create function app_private.owner_save_catalog_spell(p_record jsonb)
returns setof public.catalog_spells language plpgsql security definer set search_path = ''
as $$
declare saved public.catalog_spells%rowtype; next_number bigint; record_id text := nullif(p_record ->> 'id', ''); body jsonb := p_record -> 'payload';
begin
  perform app_private.require_catalog_actor((p_record ->> 'expectedAuthUid')::uuid);
  perform app_private.validate_catalog_payload(body);
  if p_record ->> 'name' is distinct from body ->> 'name' or p_record ->> 'slug' is distinct from body ->> 'slug'
    or p_record ->> 'universe_id' is distinct from body ->> 'worldId' then raise exception 'Catalog Identity Fields Must Agree' using errcode = '22023'; end if;
  if not exists (select 1 from public.catalog_universes where id = p_record ->> 'universe_id')
    or exists (select 1 from jsonb_array_elements_text(body -> 'sourceIds') requested(id)
      left join public.catalog_sources s on s.id = requested.id where s.id is null)
    or (select count(distinct value) from jsonb_array_elements_text(body -> 'sourceIds')) <> jsonb_array_length(body -> 'sourceIds') then
    raise exception 'Choose Existing Universes And Unique Source References' using errcode = '22023';
  end if;
  if record_id is null then
    update app_private.counters set number = number + 1 where name = 'catalog_spells' returning number into next_number;
    record_id := app_private.catalog_id('Spell', next_number, p_record ->> 'name');
    body := (body - 'status' - 'revision') || jsonb_build_object('id', record_id, 'number', next_number);
    insert into public.catalog_spells (id, number, slug, name, universe_id, payload)
    values (record_id, next_number, p_record ->> 'slug', btrim(p_record ->> 'name'), p_record ->> 'universe_id', body) returning * into saved;
  else
    select * into saved from public.catalog_spells where id = record_id for update;
    if not found or saved.revision is distinct from (p_record ->> 'expectedRevision')::bigint then raise exception 'The Entry Changed. Reload Before Saving' using errcode = '40001'; end if;
    if p_record ->> 'slug' is distinct from saved.slug then raise exception 'Existing Spell URLs Must Remain Stable' using errcode = '22023'; end if;
    body := (body - 'status' - 'revision') || jsonb_build_object('id', saved.id, 'number', saved.number);
    update public.catalog_spells set name = btrim(p_record ->> 'name'), universe_id = p_record ->> 'universe_id', payload = body,
      status = 'draft', revision = revision + 1, updated_at = clock_timestamp() where id = record_id returning * into saved;
  end if;
  delete from public.catalog_spell_sources where spell_id = saved.id;
  insert into public.catalog_spell_sources (spell_id, source_id) select saved.id, value from jsonb_array_elements_text(body -> 'sourceIds');
  insert into app_private.catalog_actions (actor_auth_uid, record_id, action) values (auth.uid(), saved.id, 'save-spell');
  return next saved;
end;
$$;

create function app_private.owner_set_catalog_status(p_id text, p_status text, p_review_note text, p_expected_auth_uid uuid, p_expected_revision bigint)
returns setof public.catalog_spells language plpgsql security definer set search_path = ''
as $$
declare saved public.catalog_spells%rowtype;
begin
  perform app_private.require_catalog_actor(p_expected_auth_uid);
  if p_status is null or p_status not in ('draft', 'review', 'approved', 'rejected', 'published', 'unpublished')
    or p_review_note is null or char_length(p_review_note) > 2000 then raise exception 'Use A Supported Catalog Status And Review Note' using errcode = '22023'; end if;
  select * into saved from public.catalog_spells where id = p_id for update;
  if not found or saved.revision is distinct from p_expected_revision then raise exception 'The Entry Changed. Reload Before Reviewing' using errcode = '40001'; end if;
  if p_status = 'published' and saved.status not in ('approved', 'unpublished', 'published') then raise exception 'Approve The Entry Before Publishing' using errcode = '22023'; end if;
  if p_status = 'unpublished' and saved.status not in ('published', 'unpublished') then raise exception 'Only Published Entries Can Be Unpublished' using errcode = '22023'; end if;
  if p_status in ('approved', 'published') then
    perform app_private.validate_catalog_payload(saved.payload);
    if saved.payload ->> 'evidenceStatus' <> 'verified' or nullif(btrim(saved.payload ->> 'continuity'), '') is null
      or nullif(btrim(saved.payload ->> 'sourceTitle'), '') is null or nullif(btrim(saved.payload ->> 'kind'), '') is null
      or not exists (select 1 from public.catalog_universes where id = saved.universe_id)
      or not exists (select 1 from public.catalog_spell_sources where spell_id = saved.id)
      or exists (select 1 from jsonb_array_elements_text(saved.payload -> 'sourceIds') requested(id)
        left join public.catalog_spell_sources r on r.spell_id = saved.id and r.source_id = requested.id where r.source_id is null)
      or (select count(*) from public.catalog_spell_sources where spell_id = saved.id) <> jsonb_array_length(saved.payload -> 'sourceIds') then
      raise exception 'Verify The Entry And Its Sources Before Approval Or Publication' using errcode = '22023';
    end if;
  end if;
  if p_status <> saved.status then
    update public.catalog_spells set status = p_status, revision = revision + 1, updated_at = clock_timestamp() where id = saved.id returning * into saved;
    insert into app_private.catalog_actions (actor_auth_uid, record_id, action, note) values (auth.uid(), saved.id, 'status:' || p_status, p_review_note);
  end if;
  return next saved;
end;
$$;

create function app_private.submit_catalog_entry(p_request_id uuid, p_payload jsonb, p_expected_auth_uid uuid)
returns setof public.catalog_submissions language plpgsql security definer set search_path = ''
as $$
declare actor_account_id text; saved public.catalog_submissions%rowtype; next_number bigint; field text; limits jsonb := '{"name":120,"world":120,"pronunciation":240,"definition":1400,"sourceUrl":1000,"mediaUrl":1000,"notes":2000}'; normalized jsonb;
begin
  actor_account_id := app_private.require_catalog_actor(p_expected_auth_uid, false);
  if p_request_id is null or p_request_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_payload is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text) > 40000
    or (p_payload - array['kind', 'name', 'world', 'pronunciation', 'definition', 'sourceUrl', 'mediaUrl', 'notes', 'website']) <> '{}'::jsonb
    or jsonb_typeof(p_payload -> 'kind') is distinct from 'string' or p_payload ->> 'kind' not in ('new-spell', 'correction')
    or (p_payload ? 'website' and jsonb_typeof(p_payload -> 'website') is distinct from 'string') or coalesce(p_payload ->> 'website', '') <> '' then
    raise exception 'Use The Supported Submission Fields' using errcode = '22023';
  end if;
  foreach field in array array['name', 'world', 'pronunciation', 'definition', 'sourceUrl', 'mediaUrl', 'notes'] loop
    if jsonb_typeof(p_payload -> field) is distinct from 'string' or char_length(p_payload ->> field) > (limits ->> field)::integer then
      raise exception 'Check The Submission Field: %', field using errcode = '22023';
    end if;
  end loop;
  if nullif(btrim(p_payload ->> 'name'), '') is null or nullif(btrim(p_payload ->> 'world'), '') is null
    or nullif(btrim(p_payload ->> 'definition'), '') is null
    or p_payload ->> 'sourceUrl' !~ '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'
    or (p_payload ->> 'mediaUrl' <> '' and p_payload ->> 'mediaUrl' !~ '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$') then
    raise exception 'Add A Name, Universe, Description And Complete HTTPS Source' using errcode = '22023';
  end if;
  normalized := p_payload - 'website';
  perform pg_advisory_xact_lock(hashtextextended('spelling-spells:catalog-submission:' || actor_account_id || ':' || p_request_id::text, 0));
  select * into saved from public.catalog_submissions where account_id = actor_account_id and request_id = p_request_id;
  if found then
    if saved.payload is distinct from normalized then raise exception 'This Submission Attempt Was Already Used' using errcode = '22023'; end if;
    return next saved; return;
  end if;
  if (select count(*) from public.catalog_submissions where account_id = actor_account_id and created_at >= clock_timestamp() - interval '10 minutes') >= 5 then
    raise exception 'Submission Rate Limit Reached' using errcode = 'P0001';
  end if;
  update app_private.counters set number = number + 1 where name = 'catalog_submissions' returning number into next_number;
  insert into public.catalog_submissions (id, number, account_id, request_id, payload)
  values (app_private.catalog_id('Submission', next_number, 'Entry'), next_number, actor_account_id, p_request_id, normalized) returning * into saved;
  return next saved;
end;
$$;

create function app_private.review_catalog_submission(p_id text, p_status text, p_note text, p_expected_revision bigint, p_expected_auth_uid uuid, p_entry_id text default null)
returns setof public.catalog_submissions language plpgsql security definer set search_path = ''
as $$
declare saved public.catalog_submissions%rowtype;
begin
  perform app_private.require_catalog_actor(p_expected_auth_uid);
  if p_status is null or p_status not in ('approved', 'rejected', 'changes-requested') or p_note is null or char_length(p_note) > 2000 then
    raise exception 'Choose A Supported Review Outcome' using errcode = '22023';
  end if;
  select * into saved from public.catalog_submissions where id = p_id for update;
  if not found or saved.revision is distinct from p_expected_revision then raise exception 'The Submission Changed. Reload Before Reviewing' using errcode = '40001'; end if;
  if p_status = 'approved' and not exists (select 1 from public.catalog_spells where id = p_entry_id and status in ('approved', 'published')) then
    raise exception 'Link An Approved Catalog Entry Before Approving A Submission' using errcode = '22023';
  end if;
  update public.catalog_submissions set status = p_status, reviewer_note = p_note, entry_id = p_entry_id, revision = revision + 1, updated_at = clock_timestamp()
  where id = saved.id returning * into saved;
  insert into app_private.catalog_actions (actor_auth_uid, record_id, action, note) values (auth.uid(), saved.id, 'submission:' || p_status, p_note);
  return next saved;
end;
$$;

create or replace function app_private.set_saved_spell(p_spell_id text, p_is_saved boolean, p_expected_auth_uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare actor_account_id text := app_private.lock_active_account(p_expected_auth_uid); existing public.saved_spells%rowtype;
begin
  if p_is_saved is null or not exists (select 1 from public.catalog_spells where id = p_spell_id and (not p_is_saved or status = 'published')) then
    raise exception 'Only A Published Archive Entry Can Be Saved' using errcode = '22023';
  end if;
  select * into existing from public.saved_spells where account_id = actor_account_id and spell_id = p_spell_id;
  if found and existing.is_saved = p_is_saved then return; end if;
  if p_is_saved and (select count(*) from public.saved_spells where account_id = actor_account_id and is_saved) >= 500 then
    raise exception 'Save At Most 500 Spells Per Account' using errcode = '22023';
  end if;
  if not p_is_saved then
    update public.saved_spells set is_saved = false, revision = revision + 1, updated_at = clock_timestamp()
    where account_id = actor_account_id and spell_id = p_spell_id and is_saved;
  else
    insert into public.saved_spells (account_id, spell_id) values (actor_account_id, p_spell_id)
    on conflict (account_id, spell_id) do update set is_saved = true, saved_at = clock_timestamp(), updated_at = clock_timestamp(), revision = public.saved_spells.revision + 1;
  end if;
end;
$$;

create or replace function app_private.import_saved_spells(p_spell_ids text[], p_expected_auth_uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare actor_account_id text := app_private.lock_active_account(p_expected_auth_uid);
begin
  if p_spell_ids is null or cardinality(p_spell_ids) > 500 or coalesce(array_ndims(p_spell_ids), 1) <> 1 then raise exception 'Import At Most 500 Spell References' using errcode = '22023'; end if;
  if exists (select 1 from unnest(p_spell_ids) requested(id) left join public.catalog_spells s on s.id = requested.id and s.status = 'published' where s.id is null) then
    raise exception 'The Import Contains An Unpublished Entry' using errcode = '22023';
  end if;
  if (select count(*) from (select spell_id from public.saved_spells where account_id = actor_account_id and is_saved union select unnest(p_spell_ids)) combined) > 500 then
    raise exception 'The Combined Collection Exceeds 500 Saved Spells' using errcode = '22023';
  end if;
  insert into public.saved_spells (account_id, spell_id) select actor_account_id, spell_id from (select distinct unnest(p_spell_ids) as spell_id) requested
  on conflict (account_id, spell_id) do update set is_saved = true, saved_at = clock_timestamp(), updated_at = clock_timestamp(), revision = public.saved_spells.revision + 1 where not public.saved_spells.is_saved;
end;
$$;
drop table app_private.published_spell_ids;

create function public.owner_save_catalog_spell(p_record jsonb) returns setof public.catalog_spells language sql security invoker set search_path = '' as $$ select * from app_private.owner_save_catalog_spell(p_record); $$;
create function public.owner_save_catalog_source(p_record jsonb) returns setof public.catalog_sources language sql security invoker set search_path = '' as $$ select * from app_private.owner_save_catalog_source(p_record); $$;
create function public.owner_save_catalog_universe(p_record jsonb) returns setof public.catalog_universes language sql security invoker set search_path = '' as $$ select * from app_private.owner_save_catalog_universe(p_record); $$;
create function public.owner_set_catalog_status(p_id text, p_status text, p_review_note text, p_expected_auth_uid uuid, p_expected_revision bigint) returns setof public.catalog_spells language sql security invoker set search_path = '' as $$ select * from app_private.owner_set_catalog_status(p_id, p_status, p_review_note, p_expected_auth_uid, p_expected_revision); $$;
create function public.submit_catalog_entry(p_request_id uuid, p_payload jsonb, p_expected_auth_uid uuid) returns setof public.catalog_submissions language sql security invoker set search_path = '' as $$ select * from app_private.submit_catalog_entry(p_request_id, p_payload, p_expected_auth_uid); $$;
create function public.review_catalog_submission(p_id text, p_status text, p_note text, p_expected_revision bigint, p_expected_auth_uid uuid, p_entry_id text default null) returns setof public.catalog_submissions language sql security invoker set search_path = '' as $$ select * from app_private.review_catalog_submission(p_id, p_status, p_note, p_expected_revision, p_expected_auth_uid, p_entry_id); $$;

revoke all on public.catalog_spells, public.catalog_sources, public.catalog_universes, public.catalog_spell_sources, public.catalog_submissions, public.catalog_feed_state from public, anon, authenticated;
revoke all on app_private.catalog_actions from public, anon, authenticated;
revoke all on sequence app_private.catalog_actions_id_seq from public, anon, authenticated;
grant select on public.catalog_spells, public.catalog_sources, public.catalog_universes, public.catalog_spell_sources, public.catalog_feed_state to anon, authenticated;
grant select on public.catalog_submissions to authenticated;
grant usage on schema public to anon, authenticated;

do $$
declare function_name text; signature text;
begin
  foreach function_name in array array['bump_catalog_feed', 'require_catalog_actor', 'catalog_id', 'validate_catalog_payload', 'owner_save_catalog_spell', 'owner_save_catalog_source', 'owner_save_catalog_universe', 'owner_set_catalog_status', 'submit_catalog_entry', 'review_catalog_submission'] loop
    for signature in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'app_private' and p.proname = function_name loop
      execute 'revoke all on function ' || signature || ' from public, anon, authenticated';
      if function_name like 'owner_%' or function_name in ('submit_catalog_entry', 'review_catalog_submission') then execute 'grant execute on function ' || signature || ' to authenticated'; end if;
    end loop;
  end loop;
  foreach function_name in array array['owner_save_catalog_spell', 'owner_save_catalog_source', 'owner_save_catalog_universe', 'owner_set_catalog_status', 'submit_catalog_entry', 'review_catalog_submission'] loop
    for signature in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = function_name loop
      execute 'revoke all on function ' || signature || ' from public, anon, authenticated';
      execute 'grant execute on function ' || signature || ' to authenticated';
    end loop;
  end loop;
end;
$$;

do $$
declare table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then raise exception 'The Supabase Realtime Publication Is Missing'; end if;
  foreach table_name in array array['catalog_spells', 'catalog_universes', 'catalog_sources', 'catalog_submissions', 'catalog_feed_state'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

comment on table public.catalog_spells is 'Published-only public archive; Owner-controlled moderation with stable IDs and URLs. Payload danger and utility are fictional editorial scales.';
comment on table public.catalog_submissions is 'Immutable private own-account contributions, retry-safe per account/request UUID; trusted Owner review never publishes directly.';
comment on table app_private.catalog_actions is 'Private audit of current-session Owner edits and moderation notes; never part of public spell payloads.';
commit;
