begin;

insert into app_private.counters (name) values ('contacts');

create table public.contacts (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  name text not null check (char_length(name) between 1 and 80 and name = btrim(name) and name !~ '[[:cntrl:]]' and name ~ '[^[:space:]]'),
  email text not null check (char_length(email) between 3 and 254 and email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' and email !~ '[[:cntrl:]]'),
  subject text not null check (char_length(subject) between 1 and 160 and subject = btrim(subject) and subject !~ '[[:cntrl:]]' and subject ~ '[^[:space:]]'),
  message text not null check (char_length(message) between 1 and 5000 and message = btrim(message) and message ~ '[^[:space:]]' and regexp_replace(message, E'[\n\r\t]', '', 'g') !~ '[[:cntrl:]]'),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  request_id uuid not null unique,
  submitted_auth_uid uuid,
  reviewed_by_auth_uid uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_app_id check (
    id ~ ('^Contact_' || number::text || '_Submission_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  ),
  constraint contacts_request_id_v4 check (request_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
);
create index contacts_email_created_at_idx on public.contacts (email, created_at desc);

alter table public.contacts enable row level security;
create policy contacts_owner_read on public.contacts for select to authenticated
using ((select app_private.is_owner()));

create function app_private.preserve_contact_submission()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if (new.id, new.number, new.name, new.email, new.subject, new.message, new.request_id, new.submitted_auth_uid, new.created_at)
    is distinct from (old.id, old.number, old.name, old.email, old.subject, old.message, old.request_id, old.submitted_auth_uid, old.created_at) then
    raise exception 'Original contact fields cannot be changed.' using errcode = '42501';
  end if;
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
create trigger contacts_preserve_submission before update on public.contacts
for each row execute function app_private.preserve_contact_submission();

create function app_private.submit_contact(p_payload jsonb, p_request_id uuid, p_expected_auth_uid uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  saved public.contacts%rowtype;
  next_number bigint;
  normalized_name text;
  normalized_email text;
  normalized_subject text;
  normalized_message text;
begin
  if actor is distinct from p_expected_auth_uid then raise exception 'The contact identity changed. Refresh before retrying.' using errcode = '42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 40000
    or not (p_payload ?& array['name', 'email', 'subject', 'message', 'website'])
    or (p_payload - array['name', 'email', 'subject', 'message', 'website']) <> '{}'::jsonb
    or exists (select 1 from jsonb_each(p_payload) item where jsonb_typeof(item.value) <> 'string') then
    raise exception 'Use the supported contact fields.' using errcode = '22023';
  end if;
  if p_request_id is null or p_request_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or p_payload ->> 'website' <> '' then
    raise exception 'This contact attempt cannot be accepted.' using errcode = '22023';
  end if;
  normalized_name := btrim(p_payload ->> 'name', E' \t\n\r\f' || chr(11));
  normalized_email := lower(btrim(p_payload ->> 'email', E' \t\n\r\f' || chr(11)));
  normalized_subject := btrim(p_payload ->> 'subject', E' \t\n\r\f' || chr(11));
  normalized_message := btrim(p_payload ->> 'message', E' \t\n\r\f' || chr(11));
  if char_length(normalized_name) not between 1 and 80 or normalized_name ~ '[[:cntrl:]]' or normalized_name !~ '[^[:space:]]'
    or char_length(normalized_email) not between 3 and 254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or normalized_email ~ '[[:cntrl:]]'
    or char_length(normalized_subject) not between 1 and 160 or normalized_subject ~ '[[:cntrl:]]' or normalized_subject !~ '[^[:space:]]'
    or char_length(normalized_message) not between 1 and 5000 or normalized_message !~ '[^[:space:]]' or regexp_replace(normalized_message, E'[\n\r\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception 'Check the contact fields and supported lengths.' using errcode = '22023';
  end if;
  if actor is not null and not exists (
    select 1 from auth.users u join auth.sessions s on s.user_id = u.id
    where u.id = actor and s.id::text = auth.jwt() ->> 'session_id'
  ) then raise exception 'The contact session changed. Refresh sign-in before retrying.' using errcode = '42501'; end if;

  -- Stable attempts and email throttles are serialized across tabs, devices and workers.
  perform pg_advisory_xact_lock(hashtextextended('spelling-spells:contact-request:' || p_request_id::text, 0));
  select * into saved from public.contacts where request_id = p_request_id;
  if found then
    if (saved.name, saved.email, saved.subject, saved.message, saved.submitted_auth_uid)
      is distinct from (normalized_name, normalized_email, normalized_subject, normalized_message, actor) then
      raise exception 'This contact attempt was already used for another submission.' using errcode = '22023';
    end if;
    return jsonb_build_object('id', saved.id, 'number', saved.number, 'created_at', saved.created_at);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('spelling-spells:contact-email:' || normalized_email, 0));
  if (select count(*) from public.contacts where email = normalized_email and created_at >= clock_timestamp() - interval '10 minutes') >= 3 then
    raise exception 'Contact Rate Limit Reached' using errcode = 'P0001';
  end if;
  update app_private.counters set number = number + 1 where name = 'contacts' returning number into next_number;
  if next_number is null then raise exception 'Contact allocation is unavailable.'; end if;
  insert into public.contacts (id, number, name, email, subject, message, request_id, submitted_auth_uid)
  values (
    'Contact_' || next_number::text || '_Submission_' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD') || '_' || gen_random_uuid()::text,
    next_number, normalized_name, normalized_email, normalized_subject, normalized_message, p_request_id, actor
  ) returning * into saved;
  return jsonb_build_object('id', saved.id, 'number', saved.number, 'created_at', saved.created_at);
end;
$$;

create function public.submit_contact(p_payload jsonb, p_request_id uuid, p_expected_auth_uid uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.submit_contact(p_payload, p_request_id, p_expected_auth_uid); $$;

create function app_private.get_owner_contacts(p_expected_auth_uid uuid, p_before bigint default null)
returns table (id text, number bigint, name text, email text, subject text, message text, status text, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or p_expected_auth_uid is distinct from auth.uid() or not app_private.is_owner() then
    raise exception 'Contact review requires the active verified Owner.' using errcode = '42501';
  end if;
  if p_before is not null and p_before not between 1 and 9007199254740991 then raise exception 'Invalid contact cursor.' using errcode = '22023'; end if;
  return query select c.id, c.number, c.name, c.email, c.subject, c.message, c.status, c.created_at, c.updated_at
  from public.contacts c where p_before is null or c.number < p_before order by c.number desc limit 51;
end;
$$;

create function public.get_owner_contacts(p_expected_auth_uid uuid, p_before bigint default null)
returns table (id text, number bigint, name text, email text, subject text, message text, status text, created_at timestamptz, updated_at timestamptz)
language sql stable security invoker set search_path = ''
as $$ select * from app_private.get_owner_contacts(p_expected_auth_uid, p_before); $$;

create function app_private.set_contact_status(p_id text, p_status text, p_expected_auth_uid uuid, p_expected_updated_at timestamptz)
returns table (id text, number bigint, name text, email text, subject text, message text, status text, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare saved public.contacts%rowtype;
begin
  perform app_private.lock_active_account(p_expected_auth_uid);
  if not app_private.is_owner() then raise exception 'Contact review requires the active verified Owner.' using errcode = '42501'; end if;
  if p_id is null or char_length(p_id) > 200 or p_status is null or p_status not in ('new', 'read', 'archived') or p_expected_updated_at is null then
    raise exception 'Use a supported contact status and revision.' using errcode = '22023';
  end if;
  select * into saved from public.contacts c where c.id = p_id for update;
  if not found or saved.updated_at is distinct from p_expected_updated_at then raise exception 'The contact changed. Reload before retrying.' using errcode = '40001'; end if;
  if saved.status <> p_status then
    update public.contacts c set status = p_status, reviewed_by_auth_uid = auth.uid() where c.id = p_id returning c.* into saved;
  end if;
  return query select saved.id, saved.number, saved.name, saved.email, saved.subject, saved.message, saved.status, saved.created_at, saved.updated_at;
end;
$$;

create function public.set_contact_status(p_id text, p_status text, p_expected_auth_uid uuid, p_expected_updated_at timestamptz)
returns table (id text, number bigint, name text, email text, subject text, message text, status text, created_at timestamptz, updated_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from app_private.set_contact_status(p_id, p_status, p_expected_auth_uid, p_expected_updated_at); $$;

revoke all on table public.contacts from public, anon, authenticated;
grant select on table public.contacts to authenticated;
grant usage on schema app_private to anon;

revoke all on function app_private.preserve_contact_submission() from public, anon, authenticated;
revoke all on function app_private.submit_contact(jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function public.submit_contact(jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.get_owner_contacts(uuid, bigint) from public, anon, authenticated;
revoke all on function public.get_owner_contacts(uuid, bigint) from public, anon, authenticated;
revoke all on function app_private.set_contact_status(text, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.set_contact_status(text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function app_private.submit_contact(jsonb, uuid, uuid) to anon, authenticated;
grant execute on function public.submit_contact(jsonb, uuid, uuid) to anon, authenticated;
grant execute on function app_private.get_owner_contacts(uuid, bigint) to authenticated;
grant execute on function public.get_owner_contacts(uuid, bigint) to authenticated;
grant execute on function app_private.set_contact_status(text, text, uuid, timestamptz) to authenticated;
grant execute on function public.set_contact_status(text, text, uuid, timestamptz) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then raise exception 'The Supabase Realtime publication is missing.'; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contacts') then
    alter publication supabase_realtime add table public.contacts;
  end if;
end;
$$;

comment on table public.contacts is 'Private contact intake. Public creation is validated, retry-safe and email-throttled; only the current active verified Owner can read or review. No email delivery is configured.';
comment on function public.submit_contact(jsonb, uuid, uuid) is 'Public validated intake. Returns only an ID, number and saved timestamp; stable identical attempts return the same receipt. Three new submissions per normalized email in ten minutes is a basic throttle, not comprehensive bot protection.';
commit;
