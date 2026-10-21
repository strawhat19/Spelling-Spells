-- Run through run-catalog-security.cjs: all data lives in an isolated in-memory database.
-- Supabase Auth tables/claims are fixtures; this does not prove hosted Auth or Realtime delivery.
begin;
do $$ begin
  if current_setting('spelling_spells.isolated_catalog_tests', true) is distinct from 'in-memory' then
    raise exception 'Refusing To Run Without The Isolated In-Memory Test Harness';
  end if;
end; $$;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create schema catalog_test;
grant usage on schema catalog_test to anon, authenticated;
create function catalog_test.assert(p_condition boolean, p_message text)
returns void language plpgsql security invoker set search_path = '' as $$ begin
  if p_condition is distinct from true then raise exception 'Assertion Failed: %', p_message; end if;
end; $$;
create function catalog_test.denied(p_sql text, p_state text, p_message text)
returns void language plpgsql security invoker set search_path = '' as $$ begin
  begin execute p_sql; exception when others then
    if sqlstate = p_state then return; end if;
    raise exception 'Assertion Failed: %; Expected %, Received %: %', p_message, p_state, sqlstate, sqlerrm;
  end;
  raise exception 'Assertion Failed: %; Expected Denial', p_message;
end; $$;
create function catalog_test.actor(p_uid uuid, p_session uuid)
returns void language plpgsql security invoker set search_path = '' as $$ begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_uid, 'role', 'authenticated', 'session_id', p_session,
    'user_metadata', jsonb_build_object('role', 'Owner', 'active', true))::text, true);
end; $$;
grant execute on all functions in schema catalog_test to anon, authenticated;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, is_anonymous) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'catalog-a@example.invalid', now(), '{"role":"Owner"}', false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'catalog-b@example.invalid', now(), '{}', false),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'catalog-owner@example.invalid', now(), '{}', false),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'catalog-admin@example.invalid', now(), '{}', false);
insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', now(), now()),
  ('44444444-4444-4444-8444-444444444444', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', now(), now());
select catalog_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select public.ensure_account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select catalog_test.actor('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222');
select public.ensure_account('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select catalog_test.actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333');
select public.ensure_account('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
select catalog_test.actor('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444');
select public.ensure_account('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
update public.accounts set role = 'Owner' where auth_uid = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
update public.accounts set role = 'Admin' where auth_uid = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select catalog_test.assert(not has_function_privilege('anon', 'public.owner_save_catalog_spell(jsonb)', 'EXECUTE'), 'Anon Cannot Execute Owner Save');
select catalog_test.assert(not has_function_privilege('anon', 'app_private.require_catalog_actor(uuid,boolean)', 'EXECUTE'), 'Anon Cannot Invoke Internal Auth Helper');
select catalog_test.assert(not has_function_privilege('authenticated', 'app_private.require_catalog_actor(uuid,boolean)', 'EXECUTE'), 'Caller Cannot Directly Invoke Internal Auth Helper');
select catalog_test.assert(not has_table_privilege('authenticated', 'public.catalog_spells', 'INSERT'), 'No Direct Catalog Insert Grant');
select catalog_test.assert(not has_table_privilege('authenticated', 'public.catalog_spells', 'UPDATE'), 'No Direct Catalog Update Grant');
select catalog_test.assert(not has_table_privilege('authenticated', 'public.catalog_submissions', 'UPDATE'), 'No Direct Submission Review Grant');
select catalog_test.assert(not has_table_privilege('anon', 'public.catalog_submissions', 'SELECT'), 'No Anon Submission Read Grant');
select catalog_test.assert(not has_table_privilege('authenticated', 'public.catalog_feed_state', 'UPDATE'), 'No Client Feed Revision Write Grant');
select catalog_test.assert((select count(*) = 9 from public.catalog_spells where payload ->> 'seedPlaceholder' = 'true'), 'Nine Legacy IDs Survive As Hidden Draft Placeholders');
select catalog_test.assert(to_regclass('app_private.published_spell_ids') is null, 'The Nine-ID Allowlist Is Removed');

set local role anon;
select catalog_test.assert(not exists (select 1 from public.catalog_spells), 'Public Cannot Read Legacy Draft Placeholders');
select catalog_test.assert(not exists (select 1 from public.catalog_universes), 'Public Cannot Read Unpublished Universes');
select catalog_test.denied($q$select public.owner_save_catalog_spell('{}')$q$, '42501', 'Anon Cannot Author Catalog Entries');
select catalog_test.denied($q$select * from public.catalog_submissions$q$, '42501', 'Anon Cannot Read Private Submissions');

set local role authenticated;
select catalog_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select catalog_test.assert((select role = 'Subscriber' from public.accounts where auth_uid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'Editable Owner Metadata Does Not Grant Ownership');
select catalog_test.denied($q$select public.owner_save_catalog_universe('{"expectedAuthUid":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}')$q$, '42501', 'Subscriber Cannot Author Universes');
select catalog_test.denied($q$update public.accounts set role = 'Owner'$q$, '42501', 'Subscriber Cannot Grant Owner Access');
select catalog_test.denied($q$select public.set_saved_spell('Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931', true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$, '22023', 'Draft Legacy Entry Cannot Receive New Saves');
select catalog_test.denied($q$select public.submit_catalog_entry('10101010-1010-4010-8010-101010101010', '{"kind":"new-spell","name":"Fixture","world":"Fixture","pronunciation":"","definition":"Fixture Description","sourceUrl":"https://example.invalid/source","mediaUrl":"","notes":"","status":"published"}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$, '22023', 'Submission Cannot Set Publication Status');
select catalog_test.denied($q$select public.submit_catalog_entry('10101010-1010-4010-8010-101010101010', '{"name":"Fixture","world":"Fixture","pronunciation":"","definition":"Fixture Description","sourceUrl":"https://example.invalid/source","mediaUrl":"","notes":""}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$, '22023', 'Submission Requires An Explicit Supported Kind');
select catalog_test.denied($q$select public.submit_catalog_entry('10101010-1010-4010-8010-101010101010', '{"kind":"new-spell","name":"Fixture","world":"Fixture","pronunciation":"","definition":"Fixture Description","sourceUrl":"https://user:password@example.invalid/source","mediaUrl":"","notes":""}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$, '22023', 'Submission Rejects Credentialed Source URLs');
select catalog_test.denied($q$select public.submit_catalog_entry('10101010-1010-4010-8010-101010101010', '{"kind":"new-spell","name":"Fixture","world":"Fixture","pronunciation":"","definition":"Fixture Description","sourceUrl":"https://example.invalid/source","mediaUrl":"","notes":"","website":"bot"}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$, '22023', 'Submission Enforces The Honeypot');
select public.submit_catalog_entry('10101010-1010-4010-8010-101010101010', '{"kind":"new-spell","name":"Fixture Entry","world":"Fixture Universe","pronunciation":"","definition":"An Isolated Fictional Test Entry","sourceUrl":"https://example.invalid/source","mediaUrl":"","notes":""}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select public.submit_catalog_entry('10101010-1010-4010-8010-101010101010', '{"kind":"new-spell","name":"Fixture Entry","world":"Fixture Universe","pronunciation":"","definition":"An Isolated Fictional Test Entry","sourceUrl":"https://example.invalid/source","mediaUrl":"","notes":""}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select catalog_test.assert((select count(*) = 1 and bool_and(status = 'review') from public.catalog_submissions), 'Submission Retry Is Idempotent And Starts In Review');
select catalog_test.denied($q$select public.submit_catalog_entry('10101010-1010-4010-8010-101010101010', '{"kind":"new-spell","name":"Changed","world":"Fixture Universe","pronunciation":"","definition":"An Isolated Fictional Test Entry","sourceUrl":"https://example.invalid/source","mediaUrl":"","notes":""}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$, '22023', 'Reusing An Attempt For Another Payload Is Denied');
select catalog_test.denied($q$select public.submit_catalog_entry('20202020-2020-4020-8020-202020202020', '{}', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$q$, '42501', 'Submission Identity Assertion Prevents Account-Switch Races');
select catalog_test.denied($q$select public.review_catalog_submission('unknown', 'approved', '', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null)$q$, '42501', 'Ordinary Users Cannot Approve Submissions');
select catalog_test.actor('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222');
select catalog_test.assert(not exists (select 1 from public.catalog_submissions), 'B Cannot Read A Private Submission');
select catalog_test.actor('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444');
select catalog_test.assert(not exists (select 1 from public.catalog_submissions), 'Admin Has No Owner Review Access');
select catalog_test.denied($q$select public.owner_save_catalog_source('{"expectedAuthUid":"dddddddd-dddd-4ddd-8ddd-dddddddddddd"}')$q$, '42501', 'Admin Cannot Edit Catalog Sources');

select catalog_test.actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333');
select catalog_test.assert((select count(*) = 1 from public.catalog_submissions), 'Verified Owner Can Read Review Queue');
select public.owner_save_catalog_universe('{"slug":"fixture-universe","name":"Fixture Universe","kind":"fictional","payload":{"medium":"Books","description":"Isolated Fictional Test Universe","kind":"fictional"},"expectedAuthUid":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}');
select public.owner_save_catalog_source('{"label":"Fixture Source","url":"https://example.invalid/source","payload":{"publisher":"Fixture Publisher","kind":"primary","locator":"Chapter One","evidenceNote":"Isolated Test Citation"},"expectedAuthUid":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}');
select public.owner_save_catalog_spell(jsonb_build_object(
  'name', 'Fixture Entry', 'slug', 'fixture-entry', 'universe_id', (select id from public.catalog_universes where slug = 'fixture-universe'),
  'expectedAuthUid', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'payload', jsonb_build_object(
    'name', 'Fixture Entry', 'slug', 'fixture-entry', 'worldId', (select id from public.catalog_universes where slug = 'fixture-universe'),
    'sourceTitle', 'Fixture Source', 'medium', 'Books', 'kind', 'Fictional Fixture Spell', 'language', '', 'pronunciation', '', 'pronunciationNote', '',
    'definition', 'A Fictional Entry For Isolated Tests', 'usage', 'Test Only', 'etymology', '', 'etymologyStatus', 'Unconfirmed',
    'skill', 'Beginner', 'category', 'Fixture', 'accent', 'light', 'entryType', 'spell', 'continuity', 'Fixture Book Version', 'effect', 'Fictional Test Effect',
    'pronunciationStatus', 'unavailable', 'evidenceStatus', 'verified', 'danger', 1, 'utility', 1,
    'aliases', '[]'::jsonb, 'casters', '[]'::jsonb, 'syllables', '[]'::jsonb, 'breakdown', '[]'::jsonb,
    'sources', jsonb_build_array(jsonb_build_object('label', 'Fixture Source', 'url', 'https://example.invalid/source')),
    'sourceIds', jsonb_build_array((select id from public.catalog_sources where label = 'Fixture Source'))
  )
));
select catalog_test.assert((select status = 'draft' and number = 10 and id like 'Spell_10_%' and payload ->> 'id' = id from public.catalog_spells where slug = 'fixture-entry'), 'Create Allocates Stable Matching Identity And Starts Draft');
select catalog_test.denied(format('select public.owner_save_catalog_spell(%L::jsonb)', (
  select jsonb_build_object('id', id, 'name', name, 'slug', slug, 'universe_id', universe_id, 'payload', payload || '{"sourceIds":["missing-source"]}'::jsonb,
    'expectedAuthUid', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'expectedRevision', revision)::text from public.catalog_spells where slug = 'fixture-entry'
)), '22023', 'Owner Save Rejects Dangling Source References');
select catalog_test.denied(format('select public.owner_save_catalog_spell(%L::jsonb)', (
  select jsonb_build_object('id', id, 'name', name, 'slug', slug, 'universe_id', universe_id, 'payload', payload || '{"media":[{"id":"bad","type":"image","alt":"Fixture","url":"javascript:alert(1)"}]}'::jsonb,
    'expectedAuthUid', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'expectedRevision', revision)::text from public.catalog_spells where slug = 'fixture-entry'
)), '22023', 'Owner Save Rejects Executable Media URLs');
select public.owner_save_catalog_spell(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'universe_id', universe_id,
  'payload', payload || '{"evidenceStatus":"unverified","media":[{"id":"local-fixture","type":"image","alt":"Isolated Illustration","url":"/visuals/spells/fixture.png"}]}'::jsonb,
  'expectedAuthUid', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'expectedRevision', revision)) from public.catalog_spells where slug = 'fixture-entry';
select catalog_test.denied(format('select public.owner_set_catalog_status(%L, %L, %L, %L, %L)',
  (select id from public.catalog_spells where slug = 'fixture-entry'), 'approved', '', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', (select revision from public.catalog_spells where slug = 'fixture-entry')), '22023', 'Unverified Entries Cannot Be Approved');
select public.owner_save_catalog_spell(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'universe_id', universe_id,
  'payload', payload || '{"evidenceStatus":"verified","kind":""}'::jsonb, 'expectedAuthUid', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'expectedRevision', revision)) from public.catalog_spells where slug = 'fixture-entry';
select catalog_test.denied(format('select public.owner_set_catalog_status(%L, %L, %L, %L, %L)',
  (select id from public.catalog_spells where slug = 'fixture-entry'), 'approved', '', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', (select revision from public.catalog_spells where slug = 'fixture-entry')), '22023', 'Blank Entry Kind Cannot Be Approved');
select public.owner_save_catalog_spell(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'universe_id', universe_id,
  'payload', payload || '{"kind":"Fictional Fixture Spell","sourceTitle":"   "}'::jsonb, 'expectedAuthUid', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'expectedRevision', revision)) from public.catalog_spells where slug = 'fixture-entry';
select catalog_test.denied(format('select public.owner_set_catalog_status(%L, %L, %L, %L, %L)',
  (select id from public.catalog_spells where slug = 'fixture-entry'), 'approved', '', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', (select revision from public.catalog_spells where slug = 'fixture-entry')), '22023', 'Blank Source Title Cannot Be Approved');
select public.owner_save_catalog_spell(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'universe_id', universe_id,
  'payload', payload || '{"sourceTitle":"Fixture Source"}'::jsonb, 'expectedAuthUid', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'expectedRevision', revision)) from public.catalog_spells where slug = 'fixture-entry';
select catalog_test.denied(format('select public.owner_set_catalog_status(%L, %L, %L, %L, %L)', (select id from public.catalog_spells where slug = 'fixture-entry'), 'published', '', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', (select revision from public.catalog_spells where slug = 'fixture-entry')), '22023', 'Draft Cannot Be Published Before Approval');
select public.owner_set_catalog_status(id, 'review', 'Sources Ready For Review', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', revision) from public.catalog_spells where slug = 'fixture-entry';
select public.owner_set_catalog_status(id, 'approved', 'Verified Against Fixture Source', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', revision) from public.catalog_spells where slug = 'fixture-entry';
select public.review_catalog_submission(s.id, 'approved', 'Linked To Approved Catalog Entry', s.revision, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', c.id) from public.catalog_submissions s cross join public.catalog_spells c where c.slug = 'fixture-entry';
select catalog_test.denied(format('select public.owner_set_catalog_status(%L, %L, %L, %L, 1)', (select id from public.catalog_spells where slug = 'fixture-entry'), 'published', '', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), '40001', 'Stale Publication Revision Is Denied');
select public.owner_set_catalog_status(id, 'published', 'Approved Fictional Test Entry', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', revision) from public.catalog_spells where slug = 'fixture-entry';

set local role anon;
select catalog_test.assert((select count(*) = 1 from public.catalog_spells), 'Public Reads Exactly The Published Entry');
select catalog_test.assert((select name = 'Fixture Entry' from public.catalog_spells where slug = 'fixture-entry'), 'New Published Slug Resolves Without A Seed Allowlist');
select catalog_test.assert((select count(*) = 1 from public.catalog_universes), 'Referenced Published Universe Is Public');
select catalog_test.assert((select count(*) = 1 from public.catalog_sources), 'Referenced Published Source Is Public');
select catalog_test.assert((select count(*) = 1 from public.catalog_spell_sources), 'Published Spell-Source Relation Is Public');
select catalog_test.assert((select revision > 0 from public.catalog_feed_state where id = 'public'), 'Public Feed Revision Advances Without Exposing Draft Contents');
select catalog_test.denied($q$select * from app_private.catalog_actions$q$, '42501', 'Public Cannot Read Private Review Notes');

set local role authenticated;
select catalog_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select public.set_saved_spell(id, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') from public.catalog_spells where slug = 'fixture-entry';
select public.import_saved_spells(array[(select id from public.catalog_spells where slug = 'fixture-entry')], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select catalog_test.assert((select count(*) = 1 and bool_and(revision = 1) from public.saved_spells where is_saved), 'New Catalog ID Saves And Duplicate Import Is Additive');
select catalog_test.assert((select status = 'approved' and entry_id is not null from public.catalog_submissions), 'Author Sees Confirmed Review Result');
select catalog_test.actor('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222');
select catalog_test.assert(not exists (select 1 from public.saved_spells), 'B Cannot Read A Favorites');
select catalog_test.actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333');
select catalog_test.assert(not exists (select 1 from public.saved_spells), 'Owner Cannot Read A Favorites');
select public.owner_set_catalog_status(id, 'unpublished', 'Temporarily Unpublished', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', revision) from public.catalog_spells where slug = 'fixture-entry';
set local role anon;
select catalog_test.assert(not exists (select 1 from public.catalog_spells where slug = 'fixture-entry'), 'Unpublished Direct Record Is Hidden');
select catalog_test.assert(not exists (select 1 from public.catalog_sources), 'Unpublished Source Records Are Hidden');
set local role authenticated;
select catalog_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select catalog_test.assert((select count(*) = 1 from public.saved_spells where is_saved), 'Unpublishing Does Not Delete Private Favorite');
select public.set_saved_spell(spell_id, false, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') from public.saved_spells where is_saved;
select catalog_test.assert((select count(*) = 1 and bool_and(not is_saved) from public.saved_spells), 'Author Can Remove An Unpublished Favorite');
select catalog_test.actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333');
select public.owner_set_catalog_status(id, 'published', 'Restored After Review', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', revision) from public.catalog_spells where slug = 'fixture-entry';
select public.owner_save_catalog_spell(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'universe_id', universe_id,
  'payload', payload || '{"definition":"An Updated Fictional Test Description"}'::jsonb,
  'expectedAuthUid', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'expectedRevision', revision)) from public.catalog_spells where slug = 'fixture-entry';
select catalog_test.assert((select status = 'draft' and slug = 'fixture-entry' and number = 10 from public.catalog_spells where slug = 'fixture-entry'), 'Editing Published Content Resets It To Draft And Preserves Identity');
select catalog_test.denied(format('select public.review_catalog_submission(%L, %L, %L, %L, %L, null)', (select id from public.catalog_submissions), 'approved', '', (select revision from public.catalog_submissions), 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), '22023', 'An Approved Submission Requires An Approved Linked Catalog Entry');
select public.review_catalog_submission(id, 'changes-requested', 'Please Cite A Specific Work', revision, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', null) from public.catalog_submissions;
select public.review_catalog_submission(id, 'rejected', 'The Supplied Source Does Not Verify The Entry', revision, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', null) from public.catalog_submissions;
select catalog_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select catalog_test.assert((select status = 'rejected' and reviewer_note <> '' from public.catalog_submissions), 'Author Sees Rejection And Review Feedback');

-- Contact intake remains separate, private, retry-safe, and Owner-reviewed.
select public.submit_contact('{"name":"Fixture Sender","email":"catalog-contact@example.invalid","subject":"Fixture Subject","message":"Isolated Contact Body","website":""}', '30303030-3030-4030-8030-303030303030', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select public.submit_contact('{"name":"Fixture Sender","email":"catalog-contact@example.invalid","subject":"Fixture Subject","message":"Isolated Contact Body","website":""}', '30303030-3030-4030-8030-303030303030', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select catalog_test.assert(not exists (select 1 from public.contacts), 'Submitter Cannot Read Private Owner Contact Inbox');
select catalog_test.actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333');
select catalog_test.assert((select count(*) = 1 from public.get_owner_contacts('cccccccc-cccc-4ccc-8ccc-cccccccccccc')), 'Owner Inbox Receives Exactly One Retried Contact');
select public.set_contact_status(id, 'read', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', updated_at) from public.contacts;
select catalog_test.assert((select status = 'read' from public.contacts), 'Owner Contact Review Saves');

-- Revocation and verification are checked against current database state, not editable claims.
reset role;
update auth.users set email_confirmed_at = null where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
set local role authenticated;
select catalog_test.denied($q$select public.owner_save_catalog_source('{"expectedAuthUid":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}')$q$, '42501', 'Unverified Owner Cannot Edit');
reset role;
update auth.users set email_confirmed_at = now() where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
delete from auth.sessions where id = '33333333-3333-4333-8333-333333333333';
set local role authenticated;
select catalog_test.denied($q$select public.owner_save_catalog_source('{"expectedAuthUid":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}')$q$, '42501', 'Revoked Owner Session Cannot Edit');
select catalog_test.assert(not exists (select 1 from public.catalog_submissions), 'Revoked Owner Cannot Read Private Submission Queue');
reset role;
update public.accounts set active = false where auth_uid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;
select catalog_test.actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
select catalog_test.assert(not exists (select 1 from public.catalog_submissions), 'Inactive Account Cannot Read Private Submissions');
select catalog_test.denied($q$select public.submit_catalog_entry('40404040-4040-4040-8040-404040404040', '{}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$, '42501', 'Inactive Account Cannot Submit');
reset role;
rollback;
