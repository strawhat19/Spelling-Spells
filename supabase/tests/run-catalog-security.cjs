const fs = require(`node:fs`);
const path = require(`node:path`);
const assert = require(`node:assert/strict`);
const { buildSeedSql, getSeedRecords } = require(`../../scripts/catalog-seed.cjs`);
const { PGlite } = require(process.env.SPELLING_SPELLS_PGLITE_PATH || `@electric-sql/pglite`);

// This runner constructs an in-memory PostgreSQL instance; it accepts no database URL.
const main = async () => {
  const db = new PGlite();
  const preserveLegacyPublication = process.argv.includes(`--initial-legacy-publication`);
  const root = path.resolve(__dirname, `../..`);
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz,
        raw_user_meta_data jsonb default '{}', is_anonymous boolean default false, encrypted_password text);
      create table auth.sessions (id uuid primary key, user_id uuid references auth.users(id), created_at timestamptz, updated_at timestamptz);
      create table auth.identities (id uuid primary key, user_id uuid references auth.users(id), provider text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb; $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
      create publication supabase_realtime;
      set spelling_spells.isolated_catalog_tests = 'in-memory';
    `);
    const migrations = fs.readdirSync(path.join(root, `supabase/migrations`)).filter((file) => file.endsWith(`.sql`)).sort();
    for (const file of migrations) {
      if (file.endsWith(`_catalog_expansion.sql`)) {
        await db.exec(`
          insert into auth.users (id, email, email_confirmed_at) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'legacy@example.invalid', now());
          select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', false);
          select public.ensure_account('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
          select public.set_saved_spell('Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931', true, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
          select set_config('request.jwt.claim.sub', '', false);
        `);
      }
      await db.exec(fs.readFileSync(path.join(root, `supabase/migrations`, file), `utf8`));
      console.log(`Migration Applied In Memory: ${file}`);
    }
    const preserved = await db.query(`select count(*)::integer as count from public.saved_spells s join public.catalog_spells c on c.id = s.spell_id where s.is_saved and c.payload ->> 'seedPlaceholder' = 'true'`);
    assert.equal(preserved.rows?.[0]?.count, 1, `The legacy favorite must survive the FK migration`);
    await db.exec(fs.readFileSync(path.join(__dirname, `catalog_security.sql`), `utf8`));
    const records = getSeedRecords();
    await assert.rejects(db.exec(buildSeedSql()), /Catalog Import Requires Explicit Approval/);
    await db.exec(`rollback; set spelling_spells.catalog_import_approved = 'APPROVED_CATALOG_IMPORT';`);
    await db.exec(buildSeedSql({ preserveLegacyPublication }));
    const counts = await db.query(`select (select count(*)::integer from public.catalog_spells) as spells,
      (select count(*)::integer from public.catalog_universes) as universes,
      (select count(*)::integer from public.catalog_sources) as sources,
      (select count(*)::integer from public.catalog_spells where status <> 'draft') as non_drafts`);
    assert.deepEqual(counts.rows?.[0], { spells: 21, universes: 6, sources: 22, non_drafts: preserveLegacyPublication ? 9 : 0 });
    await db.exec(`set role anon;`);
    assert.equal((await db.query(`select count(*)::integer as count from public.catalog_spells`)).rows[0]?.count, preserveLegacyPublication ? 9 : 0);
    await db.exec(`reset role;`);
    await db.query(`select app_private.validate_catalog_payload(payload) from public.catalog_spells`);
    const before = await db.query(`select id, status, revision, payload from public.catalog_spells order by number`);
    await db.exec(buildSeedSql());
    assert.deepEqual((await db.query(`select id, status, revision, payload from public.catalog_spells order by number`)).rows, before.rows, `Repeated imports must preserve every existing spell value and revision`);

    await db.exec(`
      insert into auth.sessions (id, user_id) values ('eeeeeeee-1111-4111-8111-eeeeeeeeeeee', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
      update public.accounts set role = 'Owner' where auth_uid = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
      select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', false);
      select set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","session_id":"eeeeeeee-1111-4111-8111-eeeeeeeeeeee"}', false);
      set role authenticated;
    `);
    const owner = `eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee`;
    const spell = (await db.query(`select * from public.catalog_spells where number = 1`)).rows[0];
    await db.query(`select public.owner_save_catalog_spell($1::jsonb)`, [JSON.stringify({ id: spell.id, name: spell.name, slug: spell.slug,
      universe_id: spell.universe_id, expectedRevision: spell.revision, expectedAuthUid: owner,
      payload: { ...spell.payload, definition: `Owner Edit Must Survive Every Import` } })]);
    for (const status of [`approved`, `published`, `unpublished`]) await db.query(`select public.owner_set_catalog_status(id, $1, 'Isolated Owner Import Regression', $2::uuid, revision) from public.catalog_spells where number = 1`, [status, owner]);
    const source = (await db.query(`select * from public.catalog_sources order by number limit 1`)).rows[0];
    await db.query(`select public.owner_save_catalog_source($1::jsonb)`, [JSON.stringify({ id: source.id, label: `Owner Source Edit`, url: source.url, payload: source.payload, expectedRevision: source.revision, expectedAuthUid: owner })]);
    const universe = (await db.query(`select * from public.catalog_universes order by number limit 1`)).rows[0];
    await db.query(`select public.owner_save_catalog_universe($1::jsonb)`, [JSON.stringify({ id: universe.id, name: `Owner Universe Edit`, slug: universe.slug, kind: universe.kind, payload: universe.payload, expectedRevision: universe.revision, expectedAuthUid: owner })]);
    await db.exec(`reset role;`);
    const ownerBefore = await db.query(`select id, status, revision, payload from public.catalog_spells order by number`);
    await db.exec(buildSeedSql({ preserveLegacyPublication: true }));
    assert.deepEqual((await db.query(`select id, status, revision, payload from public.catalog_spells order by number`)).rows, ownerBefore.rows, `Even the explicit legacy option must preserve an already imported Owner edit and status`);
    assert.equal((await db.query(`select label from public.catalog_sources where id = $1`, [source.id])).rows[0]?.label, `Owner Source Edit`);
    assert.equal((await db.query(`select name from public.catalog_universes where id = $1`, [universe.id])).rows[0]?.name, `Owner Universe Edit`);
    assert.equal((await db.query(`select count(*)::integer as count from public.catalog_spells where number > 9 and status <> 'draft'`)).rows[0]?.count, 0);
    assert.equal((await db.query(`select count(*)::integer as count from public.catalog_spell_sources`)).rows[0]?.count, records.spells.reduce((sum, record) => sum + record.payload.sourceIds.length, 0));
    console.log(`Seed Import Passed: 21 Entries, 6 Universes, 22 Sources; ${preserveLegacyPublication ? `Only Nine Legacy Records Published By Explicit Test Option` : `All Entries Default Draft`}; Every Payload Validated; Repeat Imports And Owner Edits Preserved`);
    console.log(`Catalog Authorization, Moderation, Favorites, Submission And Contact Checks Passed In Isolated PostgreSQL`);
    console.log(`Auth Tables And Claims Were Fixtures; Hosted Auth, PostgREST, Realtime And Browser Delivery Were Not Exercised`);
  } finally { await db.close(); }
};

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
