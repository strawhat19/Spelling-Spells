-- UNEXECUTED regression script. Requires separately authorized validation.
-- psql ONLY against an isolated local Supabase database at 127.0.0.1:54322:
-- psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
--   --set=spelling_spells_local_test=APPROVED_LOCAL_ONLY --file=supabase/tests/account_security.sql
-- Use local credentials interactively/.pgpass. Never use a production URL or a tunnel.
-- All fixtures, role changes, schema helpers and application mutations roll back.
\set ON_ERROR_STOP on
\if :{?spelling_spells_local_test}
\else
  \echo 'Refusing: explicit APPROVED_LOCAL_ONLY test flag is required.'
  \quit 3
\endif

select :'spelling_spells_local_test' = 'APPROVED_LOCAL_ONLY'
  and :'HOST' in ('127.0.0.1', 'localhost', '::1')
  and :'PORT' = '54322'
  and current_database() = 'postgres'
  and coalesce(current_setting('app.settings.supabase_url', true), '') not like '%qtfajiuilwdtywkklbjq%'
  as approved_local_target \gset
\if :approved_local_target
\else
  \echo 'Refusing: target must be isolated local Supabase on loopback port 54322, never the production project.'
  \quit 3
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create schema spelling_spells_test;
grant usage on schema spelling_spells_test to authenticated;

create function spelling_spells_test.assert(p_condition boolean, p_message text)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if p_condition is distinct from true then raise exception 'Assertion failed: %', p_message; end if;
end;
$$;

create function spelling_spells_test.expect_error(p_sql text, p_state text, p_message text)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_state then return; end if;
    raise exception 'Assertion failed: %; expected SQLSTATE %, received %: %', p_message, p_state, sqlstate, sqlerrm;
  end;
  raise exception 'Assertion failed: %; expected denial SQLSTATE %', p_message, p_state;
end;
$$;

create function spelling_spells_test.actor(p_uid uuid, p_session uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_session,
    'user_metadata', jsonb_build_object('role', 'Owner', 'active', true)
  )::text, true);
end;
$$;
revoke all on all functions in schema spelling_spells_test from public, anon;
grant execute on all functions in schema spelling_spells_test to authenticated;

-- Refuse to overwrite even a matching fixture identity in an existing local database.
select spelling_spells_test.assert(not exists (
  select 1 from auth.users where id in (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  )
), 'fixture UUIDs must not exist');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, is_anonymous)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'spelling-a@example.invalid', now(), '{"display_name":"Fixture A","role":"Owner","active":false}', false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'spelling-b@example.invalid', now(), '{"display_name":"Fixture B"}', false),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'spelling-owner@example.invalid', now(), '{"display_name":"Fixture Owner"}', false),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'spelling-admin@example.invalid', now(), '{"display_name":"Fixture Admin"}', false);
insert into auth.sessions (id, user_id, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', now(), now()),
  ('44444444-4444-4444-8444-444444444444', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', now(), now());

select spelling_spells_test.assert(not has_table_privilege('anon', 'public.accounts', 'SELECT'), 'anon cannot read accounts');
select spelling_spells_test.assert(not has_table_privilege('anon', 'public.saved_spells', 'SELECT'), 'anon cannot read favorites');
select spelling_spells_test.assert(not has_function_privilege('anon', 'public.ensure_account(uuid)', 'EXECUTE'), 'anon cannot create app accounts');
select spelling_spells_test.assert(not has_table_privilege('authenticated', 'public.accounts', 'UPDATE'), 'browser cannot update authority');
select spelling_spells_test.assert(not has_table_privilege('authenticated', 'public.saved_spells', 'DELETE'), 'browser cannot hard-delete favorites');
select spelling_spells_test.assert(has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'), 'allowlisted profile grant exists');

set local role authenticated;
select spelling_spells_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select id as a_id from public.ensure_account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') \gset
select spelling_spells_test.assert(
  (select id = :'a_id' from public.ensure_account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),
  'repeat ensure_account returns the same app identity'
);
select spelling_spells_test.assert(
  (select role = 'Subscriber' and active from public.accounts where id = :'a_id'),
  'editable metadata cannot assign Owner or inactive status'
);
select spelling_spells_test.assert((select privacy = 'private' from public.profiles where account_id = :'a_id'), 'profile starts private');
select spelling_spells_test.expect_error(
  $$select public.ensure_account('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', 'ensure actor assertion prevents account-switch race'
);

select spelling_spells_test.actor('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222');
select id as b_id from public.ensure_account('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') \gset
select spelling_spells_test.actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333');
select id as owner_id from public.ensure_account('cccccccc-cccc-4ccc-8ccc-cccccccccccc') \gset
select spelling_spells_test.actor('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444');
select id as admin_id from public.ensure_account('dddddddd-dddd-4ddd-8ddd-dddddddddddd') \gset

reset role;
select spelling_spells_test.assert(
  (select count(*) = 4 and count(distinct number) = 4 and bool_and(id like 'User_' || number::text || '_Account_%')
   from public.accounts where auth_uid in (
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
   )), 'app identities and numbers remain unique and matching'
);
select spelling_spells_test.assert(not exists (
  select 1 from public.accounts where role = 'Owner' and auth_uid in (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  )
), 'signup never automatically creates Owner');
-- Trusted fixture setup only: no public role-management endpoint is introduced.
update public.accounts set role = 'Owner' where id = :'owner_id';
update public.accounts set role = 'Admin' where id = :'admin_id';

set local role authenticated;
select spelling_spells_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select spelling_spells_test.assert((select count(*) = 1 from public.accounts), 'Subscriber sees own account only');
select spelling_spells_test.assert(not exists (select 1 from public.accounts where id = :'b_id'), 'A cannot read B account');
select spelling_spells_test.assert(not exists (select 1 from public.profiles where account_id = :'b_id'), 'A cannot read B private profile');
update public.profiles set display_name = 'Updated Fixture A', avatar_url = 'https://example.invalid/avatar.png' where account_id = :'a_id';
select spelling_spells_test.assert((select display_name = 'Updated Fixture A' from public.profiles where account_id = :'a_id'), 'own allowed profile fields save');
with changed as (
  update public.profiles set display_name = 'Illicit Edit' where account_id = :'b_id' returning account_id
)
select spelling_spells_test.assert((select count(*) = 0 from changed), 'A cannot edit B profile');
select spelling_spells_test.expect_error(format('update public.profiles set account_id = %L where account_id = %L', :'b_id', :'a_id'), '42501', 'profile account identity is immutable');
select spelling_spells_test.expect_error(format('update public.profiles set privacy = ''private'' where account_id = %L', :'a_id'), '42501', 'privacy is outside editable columns');
select spelling_spells_test.expect_error(format('update public.profiles set created_at = now() where account_id = %L', :'a_id'), '42501', 'profile creation timestamp is immutable');
select spelling_spells_test.expect_error(format('update public.accounts set role = ''Owner'' where id = %L', :'a_id'), '42501', 'browser cannot elevate role');
select spelling_spells_test.expect_error(format('update public.accounts set active = false where id = %L', :'a_id'), '42501', 'browser cannot change active status');
select spelling_spells_test.expect_error(format('update public.profiles set avatar_url = ''https://user:password@example.invalid/avatar.png'' where account_id = %L', :'a_id'), '23514', 'credentialed avatar URLs are rejected');

select public.set_saved_spell('Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931', true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select public.import_saved_spells(array[
  'Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931',
  'Spell_2_Fus-Ro-Dah_2026-10-06_719dd0e2-506a-4e67-9b02-04d4af1b4932',
  'Spell_2_Fus-Ro-Dah_2026-10-06_719dd0e2-506a-4e67-9b02-04d4af1b4932'
], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select spelling_spells_test.assert((select count(*) = 2 and bool_and(revision = 1) from public.saved_spells where is_saved), 'import is additive, deduplicated and does not revise existing saves');
select spelling_spells_test.expect_error(
  $$select public.set_saved_spell('Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931',false,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', 'mutation actor assertion prevents account-switch race'
);
select spelling_spells_test.expect_error(
  $$select public.set_saved_spell('unpublished-spell',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '22023', 'unpublished spell IDs are denied'
);
select spelling_spells_test.expect_error(
  $$select public.clear_saved_spells('[]'::jsonb,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '40001', 'clear rejects an incomplete set after concurrent additions'
);
select jsonb_agg(jsonb_build_object('spell_id',spell_id,'revision',revision) order by spell_id) as a_snapshot
from public.saved_spells where is_saved \gset
select public.set_saved_spell('Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931', false, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select spelling_spells_test.assert((select not is_saved and revision = 2 from public.saved_spells where spell_id = 'Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931'), 'unsave retains a revisioned tombstone');
select public.set_saved_spell('Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931', true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select spelling_spells_test.expect_error(
  format('select public.clear_saved_spells(%L::jsonb,''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'')', :'a_snapshot'),
  '40001', 'clear rejects stale revisions after unsave and resave'
);

select spelling_spells_test.actor('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222');
select spelling_spells_test.assert(not exists (select 1 from public.saved_spells where account_id = :'a_id'), 'B cannot read A favorites');
select public.set_saved_spell('Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931', true, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select spelling_spells_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select public.clear_saved_spells((select jsonb_agg(jsonb_build_object('spell_id',spell_id,'revision',revision)) from public.saved_spells where is_saved), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select spelling_spells_test.assert((select count(*) = 2 and bool_and(not is_saved) from public.saved_spells), 'clear writes tombstones for exactly the confirmed set');
select spelling_spells_test.actor('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222');
select spelling_spells_test.assert((select count(*) = 1 from public.saved_spells where is_saved), 'A clear leaves B saves intact');

select spelling_spells_test.actor('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444');
select spelling_spells_test.assert((select count(*) = 1 from public.accounts), 'Admin has no Owner directory access');
select spelling_spells_test.assert((select count(*) = 1 from public.profiles), 'Admin has no private profile directory access');
select spelling_spells_test.actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333');
select spelling_spells_test.assert((select count(*) >= 4 from public.accounts), 'verified active Owner can read account directory');
select spelling_spells_test.assert((select count(*) >= 4 from public.profiles), 'verified active Owner can read profile directory');
select spelling_spells_test.assert(not exists (select 1 from public.saved_spells where account_id = :'b_id'), 'Owner cannot read another account favorites');

reset role;
update auth.users set email_confirmed_at = null where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
set local role authenticated;
select spelling_spells_test.assert((select count(*) = 1 from public.accounts), 'unconfirmed Owner cannot list directory');
reset role;
update auth.users set email_confirmed_at = now() where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
delete from auth.sessions where id = '33333333-3333-4333-8333-333333333333';
set local role authenticated;
select spelling_spells_test.assert((select count(*) = 1 from public.accounts), 'revoked Owner session cannot list directory');

reset role;
update public.accounts set active = false where id = :'a_id';
set local role authenticated;
select spelling_spells_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select spelling_spells_test.assert((select not active from public.accounts where id = :'a_id'), 'deactivated identity can hydrate its denied status');
select spelling_spells_test.assert(not exists (select 1 from public.saved_spells), 'deactivated identity cannot read favorites');
select spelling_spells_test.expect_error(
  $$select public.set_saved_spell('Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931',true,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '42501', 'deactivated account cannot save'
);
select spelling_spells_test.actor(null, null);
select spelling_spells_test.expect_error(
  $$select public.ensure_account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '42501', 'missing identity cannot create or hydrate accounts'
);

reset role;
rollback;
\echo 'Local transactional authorization checks completed; every fixture and test change rolled back.'
