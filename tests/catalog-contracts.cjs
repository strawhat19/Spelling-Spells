const fs = require(`node:fs`);
const os = require(`node:os`);
const vm = require(`node:vm`);
const path = require(`node:path`);
const test = require(`node:test`);
const assert = require(`node:assert/strict`);
const ts = require(`typescript`);
const { loadModule } = require(`../scripts/catalog-tools.cjs`);
const { finalizeCatalogBuild } = require(`../scripts/finalize-catalog-build.cjs`);
const { prepareCatalogBuild, readPublicEnvironment, getPublicConfiguration, readPublicRows, normalizeAnonymousCatalog, normalizeFixtureCatalog } = require(`../scripts/prepare-catalog-build.cjs`);

const root = path.resolve(__dirname, `..`);
const { spellFromRecord, worldFromRecord, sourceFromRecord } = loadModule(`src/shared/catalog/records.ts`);
const { getSpellPath, findSpellByRoute } = loadModule(`src/shared/catalog/routes.ts`);
const { getSpellStructuredData } = loadModule(`src/shared/catalog/metadata.ts`);
const { canAccessOwner } = loadModule(`src/shared/authentication/types.ts`);
const plain = (value) => JSON.parse(JSON.stringify(value));
const response = (data, total = `*`, status = 200) => ({ ok: status >= 200 && status < 300, status, headers: { get: (name) => name.toLowerCase() === `content-range` ? `0-${Math.max(0, data.length - 1)}/${total}` : null }, json: async () => data });
const configuration = { origin: `https://catalog-fixture.supabase.co`, key: `sb_publishable_isolated_fixture` };
const environment = { EXPO_PUBLIC_SUPABASE_URL: configuration.origin, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: configuration.key };
const sourceRow = { id: `Source_1_Fixture_2026-10-21_00000000-0000-4000-8000-000000000001`, label: `Isolated Fixture Reference`, url: `https://example.test/reference`, revision: 1, payload: {} };
const worldRow = { id: `fixture-world`, slug: `fixture-world`, name: `Fixture World`, kind: `fictional`, revision: 1, payload: { medium: `Books`, description: `A synthetic setting used only in isolated tests.` } };
const basePayload = {
  kind: `Fixture Spell`,
  medium: `Books`,
  sourceTitle: `Fixture Book`,
  language: `Invented`,
  pronunciation: ``,
  pronunciationNote: `No pronunciation is asserted.`,
  pronunciationStatus: `unavailable`,
  syllables: [],
  definition: `An isolated fictional effect for catalog tests.`,
  effect: `Creates a synthetic light.`,
  usage: `This is isolated fixture data.`,
  aliases: [],
  casters: [`Fixture Caster`],
  continuity: `Isolated Test Continuity`,
  entryType: `spell`,
  evidenceStatus: `verified`,
  sourceIds: [sourceRow.id],
  etymology: `Not asserted.`,
  etymologyStatus: `Unconfirmed`,
  breakdown: [],
  danger: 1,
  utility: 1,
  skill: `Beginner`,
  category: `Light`,
  accent: `light`,
};
const spellRow = (overrides = {}, payload = {}) => ({ id: `Spell_100_FixtureFlame_2026-10-21_00000000-0000-4000-8000-000000000100`, number: 100, slug: `fixture-flame`, name: `Fixture Flame`, universe_id: worldRow.id, status: `published`, revision: 1, updated_at: `2026-10-21T12:00:00.000Z`, payload: { ...basePayload, ...payload }, ...overrides });
const source = () => sourceFromRecord(sourceRow);
const fixture = () => plain({ spells: [spellFromRecord(spellRow(), [source()])], worlds: [worldFromRecord(worldRow)] });

const temporaryProject = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `spelling-spells-catalog-contracts-`));
  fs.writeFileSync(path.join(directory, `app.json`), JSON.stringify({ expo: { extra: { siteUrl: `https://example.test` } } }));
  test.after(() => {
    const target = path.resolve(directory);
    const expectedParent = path.resolve(os.tmpdir());
    if (path.dirname(target) !== expectedParent || !path.basename(target).startsWith(`spelling-spells-catalog-contracts-`)) throw new Error(`Refusing To Remove An Unexpected Test Directory`);
    fs.rmSync(target, { recursive: true, force: true });
  });
  return directory;
};

const isolatedModule = (relativePath, mocks) => {
  const filename = path.join(root, relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, `utf8`), { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const context = { module, exports: module.exports, URL, AbortController, setTimeout, clearTimeout, console, process: { env: {} }, require: (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw new Error(`Unexpected Dependency In Isolated Test: ${name}`);
  } };
  vm.runInNewContext(compiled, context, { filename });
  return module.exports;
};

const mockCatalogClient = (read) => {
  const queries = [];
  const client = { from: (table) => {
    const query = { table, filters: {}, start: 0, end: 199 };
    queries.push(query);
    const chain = {
      select: () => chain,
      order: () => chain,
      eq: (key, value) => { query.filters[key] = value; return chain; },
      range: (start, end) => { query.start = start; query.end = end; return chain; },
      maybeSingle: async () => read(query, true),
      then: (resolve, reject) => Promise.resolve().then(() => read(query, false)).then(resolve, reject),
    };
    return chain;
  } };
  return { client, queries };
};

const isolatedService = (transport, account = null) => isolatedModule(`src/shared/catalog/service.ts`, {
  './records': { spellFromRecord, worldFromRecord, sourceFromRecord },
  '../supabase/client': { getSupabaseClient: () => transport.client },
  '../authentication/types': { canAccessOwner },
  '../authentication/service': { requireCurrentAccount: () => ({ client: transport.client, account, revision: 1 }) },
}).catalogService;

test(`Catalog Normalization Preserves Authoritative Identity And Source Binding`, () => {
  const row = spellRow({}, { id: `forged-id`, slug: `forged-slug`, number: 900, worldId: `forged-world`, sources: [{ label: `Forged Reference`, url: `https://example.test/forged` }] });
  const normalized = spellFromRecord(row, [source()]);
  assert.equal(normalized.id, row.id);
  assert.equal(normalized.slug, row.slug);
  assert.equal(normalized.number, row.number);
  assert.equal(normalized.worldId, worldRow.id);
  assert.deepEqual(plain(normalized.sources), [{ label: sourceRow.label, url: sourceRow.url }]);
  assert.equal(getSpellPath(normalized), `/spell/fixture-flame`);
  assert.equal(findSpellByRoute([normalized], { slug: `fixture-flame` }).id, row.id);
});

test(`Published Entries Reject Missing Source Records And Unsafe Source URLs`, () => {
  assert.throws(() => spellFromRecord(spellRow(), []), /Missing Source Records/);
  assert.throws(() => sourceFromRecord({ ...sourceRow, url: `javascript:alert(1)` }), /Public HTTPS/);
  assert.throws(() => sourceFromRecord({ ...sourceRow, url: `https://user:password@example.test` }), /Public HTTPS/);
});

test(`A Legacy Import Placeholder Cannot Become A Public Entry Without A Universe`, () => {
  const row = spellRow({ status: `draft`, universe_id: `` }, { seedPlaceholder: true });
  assert.equal(spellFromRecord(row).importPlaceholder, true);
  assert.throws(() => spellFromRecord({ ...row, status: `published` }, [source()]), /Stable Identity/);
});

test(`Public Build Snapshots Reject Draft And Unverified Records`, () => {
  assert.throws(() => normalizeAnonymousCatalog([spellRow({ status: `draft` })], [worldRow], [sourceRow]), /Non-Published/);
  assert.throws(() => normalizeAnonymousCatalog([spellRow({}, { evidenceStatus: `unverified` })], [worldRow], [sourceRow]), /Unverified/);
  const privateFixture = fixture();
  privateFixture.spells[0].status = `draft`;
  assert.throws(() => normalizeFixtureCatalog(privateFixture), /Draft, Unpublished And Unverified/);
  assert.throws(() => normalizeFixtureCatalog({ ...fixture(), sources: [sourceRow] }), /Only PublicCatalog/);
});

test(`Public Build Snapshots Reject Duplicate Slugs And Missing Universes`, () => {
  const duplicate = fixture();
  duplicate.spells.push({ ...duplicate.spells[0], id: `different-id`, number: 101 });
  assert.throws(() => normalizeFixtureCatalog(duplicate), /Duplicate slug/);
  const missing = fixture();
  missing.worlds = [];
  assert.throws(() => normalizeFixtureCatalog(missing), /Missing Universe/);
});

test(`Public Snapshot Projection Omits Reviewer And Account Metadata`, () => {
  const row = spellRow({}, { reviewerNote: `PRIVATE REVIEW`, authorId: `PRIVATE ACCOUNT`, reviewHistory: [`PRIVATE HISTORY`] });
  const normalized = normalizeAnonymousCatalog([row], [worldRow], [sourceRow]);
  const serialized = JSON.stringify(normalized);
  assert.ok(!serialized.includes(`PRIVATE`));
  assert.ok(!Object.hasOwn(normalized.spells[0], `revision`));
  assert.ok(!Object.hasOwn(normalized.spells[0], `status`));
  assert.equal(normalized.spells[0].sources[0].url, sourceRow.url);
});

test(`Build Environment Reads Only Public Keys With Explicit Precedence`, () => {
  const directory = temporaryProject();
  fs.writeFileSync(path.join(directory, `.env`), `EXPO_PUBLIC_SUPABASE_URL=https://first.supabase.co\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_first\nSUPABASE_SERVICE_ROLE_KEY=private-fixture-never-used\n`);
  fs.writeFileSync(path.join(directory, `.env.local`), `EXPO_PUBLIC_SUPABASE_URL="https://second.supabase.co"\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_second\n`);
  const values = readPublicEnvironment(directory, { EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_process`, SUPABASE_ACCESS_TOKEN: `private-fixture-never-used` });
  assert.deepEqual(values, { EXPO_PUBLIC_SUPABASE_URL: `https://second.supabase.co`, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_process` });
  assert.throws(() => getPublicConfiguration({ ...environment, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_secret_fixture` }), /Not Accepted/);
  assert.throws(() => getPublicConfiguration({ ...environment, EXPO_PUBLIC_SUPABASE_URL: `https://user:password@example.test` }), /Without Credentials/);
});

test(`Anonymous Build Reads Use Published Filtering And No Session Authorization`, async () => {
  const requests = [];
  const data = await readPublicRows(`catalog_spells`, configuration, async (url, options) => {
    requests.push({ url: new URL(url), options });
    return response([spellRow()], 1);
  });
  assert.equal(data.length, 1);
  assert.equal(requests[0].url.searchParams.get(`status`), `eq.published`);
  assert.equal(requests[0].url.searchParams.get(`limit`), `200`);
  assert.equal(requests[0].options.method, `GET`);
  assert.equal(requests[0].options.headers.apikey, configuration.key);
  assert.equal(Object.keys(requests[0].options.headers).some((key) => key.toLowerCase() === `authorization`), false);
});

test(`Catalog Build Pagination Accepts Exactly 4000 Rows And Rejects An Oversize Catalog`, async () => {
  let reads = 0;
  const result = await readPublicRows(`catalog_universes`, configuration, async (url) => {
    reads += 1;
    const offset = Number(new URL(url).searchParams.get(`offset`));
    const count = Math.max(0, Math.min(200, 4000 - offset));
    return response(Array.from({ length: count }, (_, index) => ({ id: `fixture-${offset + index}` })));
  });
  assert.equal(result.length, 4000);
  assert.equal(reads, 21);
  await assert.rejects(() => readPublicRows(`catalog_spells`, configuration, async () => response([], 4001)), /Exceeds The 4000 Record Build Limit/);
});

test(`Fixture Preparation Produces New Detail URLs And A Public-Only Sitemap`, async () => {
  const directory = temporaryProject();
  fs.writeFileSync(path.join(directory, `fixture.json`), JSON.stringify(fixture()));
  let fetched = false;
  const result = await prepareCatalogBuild({ projectRoot: directory, fixture: `fixture.json`, environment: {}, quiet: true, now: () => new Date(`2026-10-21T12:00:00.000Z`), fetcher: async () => { fetched = true; throw new Error(`Unexpected Network`); } });
  assert.equal(fetched, false);
  assert.equal(result.manifest.mode, `fixture`);
  assert.equal(result.manifest.spellCount, 1);
  const sitemap = fs.readFileSync(path.join(result.generatedDirectory, `sitemap.xml`), `utf8`);
  const robots = fs.readFileSync(path.join(result.generatedDirectory, `robots.txt`), `utf8`);
  assert.ok(sitemap.includes(`https://example.test/spell/fixture-flame`));
  assert.ok(sitemap.includes(`https://example.test/world/fixture-world`));
  for (const privatePath of [`/saved`, `/submit`, `/submissions`, `/profile`, `/review`, `/catalog-editor`, `/auth`, `/signin`]) {
    assert.ok(!sitemap.includes(`<loc>https://example.test${privatePath}`));
    assert.ok(robots.includes(`Disallow: ${privatePath}`));
  }
  assert.ok(fs.readFileSync(result.snapshotPath, `utf8`).includes(`2026-10-21T12:00:00.000Z`));
  assert.equal(fs.existsSync(path.join(directory, `public`, `sitemap.xml`)), false);
});

test(`Only An Explicit Shell Produces An Empty Non-Network Snapshot`, async () => {
  const directory = temporaryProject();
  const result = await prepareCatalogBuild({ projectRoot: directory, shell: true, environment: {}, quiet: true, fetcher: async () => { throw new Error(`Unexpected Network`); } });
  assert.equal(result.manifest.mode, `shell`);
  assert.equal(result.manifest.catalogTimestamp, null);
  assert.deepEqual(result.catalog, { spells: [], worlds: [] });
  await assert.rejects(() => prepareCatalogBuild({ projectRoot: directory, environment: {}, quiet: true }), /Public Supabase Publishable Key/);
  await assert.rejects(() => prepareCatalogBuild({ projectRoot: directory, shell: true, fixture: `fixture.json`, environment: {}, quiet: true }), /Not Both/);
});

test(`Failed Anonymous Build Reads Do Not Overwrite The Existing Snapshot With Demo Data`, async () => {
  const directory = temporaryProject();
  const snapshotPath = path.join(directory, `src`, `shared`, `catalog`, `buildSnapshot.ts`);
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, `existing snapshot marker`);
  await assert.rejects(() => prepareCatalogBuild({ projectRoot: directory, environment, quiet: true, fetcher: async () => response({}, `*`, 404) }), /HTTP 404/);
  assert.equal(fs.readFileSync(snapshotPath, `utf8`), `existing snapshot marker`);
  assert.equal(fs.existsSync(path.join(directory, `test-results`, `catalog-build`, `manifest.json`)), false);
});

test(`Catalog Missing-Schema Classification Requires An Exact Code And HTTP 404`, async () => {
  for (const code of [`PGRST205`, `42P01`]) {
    await assert.rejects(() => readPublicRows(`catalog_sources`, configuration, async () => response({ code }, `*`, 404)), (error) => error.code === `CATALOG_SCHEMA_UNAVAILABLE` && /HTTP 404/.test(error.message));
  }
  for (const [status, code] of [[404, undefined], [404, `PGRST301`], [401, `PGRST205`], [403, `42P01`], [500, `PGRST205`]]) {
    await assert.rejects(() => readPublicRows(`catalog_sources`, configuration, async () => response({ code }, `*`, status)), (error) => error.code !== `CATALOG_SCHEMA_UNAVAILABLE`);
  }
});

for (const deployment of [`preview`, `production`]) {
  const deploymentLabel = deployment === `preview` ? `Preview` : `Production`;

  test(`Vercel ${deploymentLabel} Catalog Missing Tables Produce A Clearly Marked Empty Shell`, async () => {
    for (const code of [`PGRST205`, `42P01`]) {
      const directory = temporaryProject();
      const requests = [];
      const result = await prepareCatalogBuild({ projectRoot: directory, environment: { ...environment, VERCEL_ENV: deployment }, quiet: true, fetcher: async (url) => {
        requests.push(new URL(url).pathname);
        return response({ code }, `*`, 404);
      } });
      assert.equal(requests.length, 3);
      assert.equal(result.manifest.mode, `${deployment}-shell`);
      assert.equal(result.manifest.reason, `catalog-schema-unavailable`);
      assert.equal(result.manifest.catalogTimestamp, null);
      assert.equal(result.manifest.spellCount, 0);
      assert.equal(result.manifest.worldCount, 0);
      assert.deepEqual(result.manifest.spellPaths, []);
      assert.deepEqual(result.manifest.worldPaths, []);
      assert.deepEqual(result.catalog, { spells: [], worlds: [] });
      assert.match(fs.readFileSync(result.snapshotPath, `utf8`), /buildCatalogTimestamp: string \| null = null/);
      fs.mkdirSync(path.join(directory, `dist`));
      const finalized = finalizeCatalogBuild({ projectRoot: directory, quiet: true });
      assert.equal(finalized.mode, `${deployment}-shell`);
      const exportedManifest = JSON.parse(fs.readFileSync(path.join(directory, `dist`, `catalog-build.json`), `utf8`));
      assert.equal(exportedManifest.reason, `catalog-schema-unavailable`);
      assert.equal(exportedManifest.catalogTimestamp, null);
      assert.deepEqual(exportedManifest.spellPaths, []);
      assert.deepEqual(exportedManifest.worldPaths, []);
      const sitemap = fs.readFileSync(path.join(directory, `dist`, `sitemap.xml`), `utf8`);
      assert.ok(!sitemap.includes(`/spell/`));
      assert.ok(!sitemap.includes(`/world/`));
    }
  });

  test(`Vercel ${deploymentLabel} Catalog Partial Schema Availability Does Not Export A Partial Catalog`, async () => {
    const directory = temporaryProject();
    const result = await prepareCatalogBuild({ projectRoot: directory, environment: { ...environment, VERCEL_ENV: deployment }, quiet: true, fetcher: async (url) => {
      const table = new URL(url).pathname.split(`/`).at(-1);
      return table === `catalog_sources` ? response({ code: `PGRST205` }, `*`, 404) : response(table === `catalog_spells` ? [spellRow()] : [worldRow], 1);
    } });
    assert.equal(result.manifest.mode, `${deployment}-shell`);
    assert.deepEqual(result.catalog, { spells: [], worlds: [] });
    assert.ok(!fs.readFileSync(result.snapshotPath, `utf8`).includes(`Fixture Flame`));
  });

  test(`Vercel ${deploymentLabel} Catalog Unexpected Failures Leave The Existing Snapshot Untouched`, async () => {
    const failures = [
      async () => response({}, `*`, 404),
      async () => response({ code: `PGRST301` }, `*`, 401),
      async () => response({ code: `42501` }, `*`, 403),
      async () => response({ code: `PGRST205` }, `*`, 500),
      async () => { throw new Error(`Isolated Network Failure`); },
      async () => ({ ...response({}, `*`, 404), json: async () => { throw new SyntaxError(`Isolated Invalid Error JSON`); } }),
      async () => ({ ...response([], 0), json: async () => { throw new SyntaxError(`Isolated Invalid Catalog JSON`); } }),
    ];
    for (const fetcher of failures) {
      const directory = temporaryProject();
      const snapshotPath = path.join(directory, `src`, `shared`, `catalog`, `buildSnapshot.ts`);
      fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
      fs.writeFileSync(snapshotPath, `existing snapshot marker`);
      await assert.rejects(() => prepareCatalogBuild({ projectRoot: directory, environment: { ...environment, VERCEL_ENV: deployment }, quiet: true, fetcher }));
      assert.equal(fs.readFileSync(snapshotPath, `utf8`), `existing snapshot marker`);
      assert.equal(fs.existsSync(path.join(directory, `test-results`, `catalog-build`, `manifest.json`)), false);
    }
  });

  test(`Vercel ${deploymentLabel} Catalog Missing Tables Cannot Mask A Concurrent Authorization Failure`, async () => {
    const directory = temporaryProject();
    await assert.rejects(() => prepareCatalogBuild({ projectRoot: directory, environment: { ...environment, VERCEL_ENV: deployment }, quiet: true, fetcher: async (url) => {
      const table = new URL(url).pathname.split(`/`).at(-1);
      return table === `catalog_sources` ? response({ code: `PGRST301` }, `*`, 401) : response({ code: `PGRST205` }, `*`, 404);
    } }), /HTTP 401/);
    assert.equal(fs.existsSync(path.join(directory, `test-results`, `catalog-build`, `manifest.json`)), false);
  });

  test(`Vercel ${deploymentLabel} Catalog Still Requires Public Configuration Before Any Fetch`, async () => {
    const directory = temporaryProject();
    let requested = false;
    await assert.rejects(() => prepareCatalogBuild({ projectRoot: directory, environment: { VERCEL_ENV: deployment }, quiet: true, fetcher: async () => { requested = true; return response({ code: `PGRST205` }, `*`, 404); } }), /Public Supabase Publishable Key/);
    assert.equal(requested, false);
  });

  test(`Vercel ${deploymentLabel} Catalog Healthy Reads Use The Normal Anonymous Snapshot`, async () => {
    const directory = temporaryProject();
    const result = await prepareCatalogBuild({ projectRoot: directory, environment: { ...environment, VERCEL_ENV: deployment }, quiet: true, fetcher: async (url) => {
      const table = new URL(url).pathname.split(`/`).at(-1);
      return response(table === `catalog_sources` ? [sourceRow] : table === `catalog_universes` ? [worldRow] : [spellRow()], 1);
    } });
    assert.equal(result.manifest.mode, `anonymous`);
    assert.equal(result.manifest.spellCount, 1);
    assert.equal(result.manifest.worldCount, 1);
    assert.notEqual(result.manifest.catalogTimestamp, null);
    assert.equal(result.manifest.reason, undefined);
    assert.equal(result.catalog.spells[0].id, spellRow().id);
  });

  test(`Vercel ${deploymentLabel} Catalog Malformed Published Records Still Fail Validation`, async () => {
    const directory = temporaryProject();
    await assert.rejects(() => prepareCatalogBuild({ projectRoot: directory, environment: { ...environment, VERCEL_ENV: deployment }, quiet: true, fetcher: async (url) => {
      const table = new URL(url).pathname.split(`/`).at(-1);
      return response(table === `catalog_sources` ? [sourceRow] : table === `catalog_universes` ? [worldRow] : [spellRow({}, { evidenceStatus: `unverified` })], 1);
    } }), /Unverified/);
    assert.equal(fs.existsSync(path.join(directory, `test-results`, `catalog-build`, `manifest.json`)), false);
  });
}

test(`Vercel Catalog Fallback Is Unavailable In Local Development Differently Cased And Unknown Environments`, async () => {
  for (const value of [undefined, `development`, `Preview`, `Production`, `staging`]) {
    const directory = temporaryProject();
    await assert.rejects(() => prepareCatalogBuild({ projectRoot: directory, environment: { ...environment, ...(value === undefined ? {} : { VERCEL_ENV: value }) }, quiet: true, fetcher: async () => response({ code: `PGRST205` }, `*`, 404) }), (error) => error.code === `CATALOG_SCHEMA_UNAVAILABLE`);
    assert.equal(fs.existsSync(path.join(directory, `src`, `shared`, `catalog`, `buildSnapshot.ts`)), false);
    assert.equal(fs.existsSync(path.join(directory, `test-results`, `catalog-build`, `manifest.json`)), false);
  }
});

test(`Catalog Finalization Copies Generated Metadata And Rejects A Stale Snapshot`, async () => {
  const directory = temporaryProject();
  await prepareCatalogBuild({ projectRoot: directory, shell: true, environment: {}, quiet: true });
  fs.mkdirSync(path.join(directory, `dist`));
  fs.mkdirSync(path.join(directory, `public`));
  fs.writeFileSync(path.join(directory, `public`, `robots.txt`), `tracked public marker`);
  finalizeCatalogBuild({ projectRoot: directory, quiet: true });
  assert.ok(fs.readFileSync(path.join(directory, `dist`, `robots.txt`), `utf8`).includes(`Disallow: /profile`));
  assert.equal(fs.readFileSync(path.join(directory, `public`, `robots.txt`), `utf8`), `tracked public marker`);
  fs.appendFileSync(path.join(directory, `src`, `shared`, `catalog`, `buildSnapshot.ts`), `\nchanged`);
  assert.throws(() => finalizeCatalogBuild({ projectRoot: directory, quiet: true }), /Does Not Match/);
});

test(`Catalog Finalization Requires The Prepared Detail Pages To Exist In The Export`, async () => {
  const directory = temporaryProject();
  fs.writeFileSync(path.join(directory, `fixture.json`), JSON.stringify(fixture()));
  await prepareCatalogBuild({ projectRoot: directory, fixture: `fixture.json`, environment: {}, quiet: true });
  fs.mkdirSync(path.join(directory, `dist`));
  assert.throws(() => finalizeCatalogBuild({ projectRoot: directory, quiet: true }), /Missing Catalog Detail Page/);
  fs.mkdirSync(path.join(directory, `dist`, `spell`));
  fs.mkdirSync(path.join(directory, `dist`, `world`));
  fs.writeFileSync(path.join(directory, `dist`, `spell`, `fixture-flame.html`), `<html><title>Fixture Flame</title></html>`);
  fs.writeFileSync(path.join(directory, `dist`, `world`, `fixture-world.html`), `<html><title>Fixture World</title></html>`);
  assert.equal(finalizeCatalogBuild({ projectRoot: directory, quiet: true }).spellCount, 1);
});

test(`Runtime Catalog Reads Use The Database And Filter Published Records`, async () => {
  const transport = mockCatalogClient((query) => {
    if (query.table === `catalog_sources`) return { data: [sourceRow], error: null };
    if (query.table === `catalog_universes`) return { data: [worldRow], error: null };
    const records = [spellRow(), spellRow({ id: `draft-id`, number: 101, slug: `draft-flame`, status: `draft` })];
    return { data: records.filter((row) => row.status === query.filters.status), error: null };
  });
  const result = await isolatedService(transport).getPublicCatalog();
  assert.equal(result.spells.length, 1);
  assert.equal(result.spells[0].id, spellRow().id);
  assert.equal(transport.queries.find((query) => query.table === `catalog_spells`).filters.status, `published`);
});

test(`Runtime Database Failure Is An Error Rather Than A Seed Catalog`, async () => {
  const transport = mockCatalogClient(() => ({ data: null, error: { code: `42P01`, message: `Fixture Missing Table` } }));
  await assert.rejects(() => isolatedService(transport).getPublicCatalog(), /Has Not Been Installed/);
  await assert.rejects(() => isolatedService(transport).getSpell(`new-spell`), /Has Not Been Installed/);
});

test(`Runtime Reader Accepts Exactly 4000 Published Records With An Empty Lookahead`, async () => {
  const transport = mockCatalogClient((query) => {
    if (query.table === `catalog_sources`) return { data: [sourceRow], error: null };
    if (query.table === `catalog_universes`) return { data: [worldRow], error: null };
    const count = Math.max(0, Math.min(query.end - query.start + 1, 4000 - query.start));
    return { data: Array.from({ length: count }, (_, index) => spellRow({ id: `boundary-${query.start + index}`, slug: `boundary-${query.start + index}`, number: query.start + index + 1 })), error: null };
  });
  const result = await isolatedService(transport).getPublicCatalog();
  assert.equal(result.spells.length, 4000);
  const reads = transport.queries.filter((query) => query.table === `catalog_spells`);
  assert.equal(reads.length, 21);
  assert.equal(reads[20].start, 4000);
  assert.equal(reads[20].end, 4000);
});

test(`Runtime Reader Rejects Record 4001 Without Returning A Partial Catalog`, async () => {
  const transport = mockCatalogClient((query) => {
    if (query.table === `catalog_sources`) return { data: [sourceRow], error: null };
    if (query.table === `catalog_universes`) return { data: [worldRow], error: null };
    const count = Math.max(0, Math.min(query.end - query.start + 1, 4001 - query.start));
    return { data: Array.from({ length: count }, (_, index) => spellRow({ id: `boundary-${query.start + index}`, slug: `boundary-${query.start + index}`, number: query.start + index + 1 })), error: null };
  });
  await assert.rejects(() => isolatedService(transport).getPublicCatalog(), /4,000 Record Window/);
});

test(`Research Expansion Has 12 Distinct Unpublished Records Without Invented Pronunciation Or Artwork`, () => {
  const { expansionSpells, expansionWorlds } = loadModule(`src/shared/catalog/expansion.ts`);
  assert.equal(expansionSpells.length, 12);
  assert.equal(expansionWorlds.length, 3);
  assert.equal(new Set(expansionSpells.map((spell) => spell.id)).size, 12);
  assert.deepEqual(plain(expansionSpells.map((spell) => spell.number)), Array.from({ length: 12 }, (_, index) => index + 10));
  assert.equal(expansionSpells.filter((spell) => spell.evidenceStatus === `verified`).length, 8);
  assert.equal(expansionSpells.filter((spell) => spell.evidenceStatus === `unverified`).length, 4);
  for (const spell of expansionSpells) {
    assert.equal(spell.status, undefined);
    assert.equal(spell.pronunciation, ``);
    assert.equal(spell.pronunciationStatus, `unavailable`);
    assert.equal(spell.syllables.length, 0);
    assert.equal(spell.media?.length ?? 0, 0);
    assert.ok(spell.sources.length > 0);
    assert.ok(spell.continuity);
    assert.ok(spell.casters.length > 0);
  }
});

test(`Legacy Reader Aids Default To Approximate Rather Than An Invented Verified Status`, () => {
  const { seedSpells } = loadModule(`src/shared/catalog/seed.ts`);
  assert.equal(seedSpells.length, 9);
  for (const spell of seedSpells) {
    const normalized = spellFromRecord(spellRow({ id: spell.id, number: spell.number, name: spell.name, slug: getSpellPath(spell).slice(`/spell/`.length), universe_id: spell.worldId, payload: { ...spell } }));
    assert.equal(normalized.pronunciationStatus, `approximate`);
    assert.equal(normalized.pronunciation, spell.pronunciation);
    assert.equal(normalized.pronunciationNote, spell.pronunciationNote);
  }
});

test(`Direct Runtime Detail Reads Query The Requested Published Slug`, async () => {
  const transport = mockCatalogClient((query, single) => {
    if (query.table === `catalog_sources`) return { data: [sourceRow], error: null };
    if (single) return { data: query.filters.slug === `fixture-flame` && query.filters.status === `published` ? spellRow() : null, error: null };
    throw new Error(`Unexpected Fixture Read`);
  });
  const service = isolatedService(transport);
  const found = await service.getSpell(`fixture-flame`);
  assert.equal(found.id, spellRow().id);
  assert.equal(found.slug, `fixture-flame`);
  assert.equal(await service.getSpell(`missing-spell`), null);
  assert.ok(transport.queries.filter((query) => query.table === `catalog_spells`).every((query) => query.filters.status === `published`));
});

test(`Owner Saves Preserve Revision And Identity Without Publishing Through The Save Payload`, async () => {
  const requests = [];
  const transport = { client: { rpc: async (name, arguments) => {
    requests.push({ name, arguments });
    return { data: spellRow({ status: `draft`, revision: 8 }, { sources: [{ label: sourceRow.label, url: sourceRow.url }] }), error: null };
  } } };
  const account = { id: `fixture-owner`, authUid: `fixture-owner-uid`, role: `Owner`, active: true, roleVerified: true, emailVerified: true };
  const service = isolatedService(transport, account);
  const saved = await service.saveSpell({ ...basePayload, id: spellRow().id, slug: `fixture-flame`, name: `Fixture Flame`, worldId: worldRow.id, number: 100, revision: 7, status: `published` });
  assert.equal(saved.status, `draft`);
  assert.equal(saved.revision, 8);
  assert.equal(requests[0].name, `owner_save_catalog_spell`);
  assert.equal(requests[0].arguments.p_record.expectedRevision, 7);
  assert.equal(requests[0].arguments.p_record.expectedAuthUid, account.authUid);
  assert.equal(requests[0].arguments.p_record.universe_id, worldRow.id);
  assert.equal(Object.hasOwn(requests[0].arguments.p_record, `status`), false);
  assert.equal(Object.hasOwn(requests[0].arguments.p_record.payload, `status`), false);
});

test(`Owner Publication Uses The Status RPC With Revision And Confirmed Source Readback`, async () => {
  const requests = [];
  const transport = mockCatalogClient((query) => {
    if (query.table !== `catalog_sources`) throw new Error(`Unexpected Publication Read`);
    return { data: [sourceRow], error: null };
  });
  transport.client.rpc = async (name, arguments) => {
    requests.push({ name, arguments });
    return { data: spellRow({ revision: 9 }), error: null };
  };
  const account = { id: `fixture-owner`, authUid: `fixture-owner-uid`, role: `Owner`, active: true, roleVerified: true, emailVerified: true };
  const result = await isolatedService(transport, account).setStatus(spellRow().id, `published`, 8, `Fixture Source Reviewed`);
  assert.equal(result.status, `published`);
  assert.equal(result.revision, 9);
  assert.equal(result.sources[0].url, sourceRow.url);
  assert.equal(requests[0].name, `owner_set_catalog_status`);
  assert.equal(requests[0].arguments.p_expected_revision, 8);
  assert.equal(requests[0].arguments.p_expected_auth_uid, account.authUid);
  assert.equal(requests[0].arguments.p_review_note, `Fixture Source Reviewed`);
});

test(`Client Owner Catalog Access Rejects Ordinary Roles Before A Read`, async () => {
  for (const role of [`Member`, `Admin`, `Developer`, `Subscriber`]) {
    const transport = mockCatalogClient(() => { throw new Error(`Unexpected Privileged Read`); });
    const service = isolatedService(transport, { id: `fixture-account`, role, active: true, roleVerified: true, emailVerified: true });
    await assert.rejects(() => service.getOwnerCatalog(), /Owner Access Is Required/);
    await assert.rejects(() => service.saveSpell({ name: `Denied Fixture` }), /Owner Access Is Required/);
    await assert.rejects(() => service.setStatus(`denied-id`, `published`, 1), /Owner Access Is Required/);
    assert.equal(transport.queries.length, 0);
  }
});

test(`Structured Data Describes A Creative Work Without Ratings Or Real-World Instructions`, () => {
  const record = fixture();
  const data = getSpellStructuredData(record.spells[0], record.worlds[0], `https://example.test`);
  assert.equal(data[`@type`], `CreativeWork`);
  assert.equal(data.url, `https://example.test/spell/fixture-flame`);
  assert.equal(data.citation[0].url, sourceRow.url);
  assert.ok(!Object.hasOwn(data, `aggregateRating`));
  assert.ok(!Object.hasOwn(data, `step`));
});

test(`Page Metadata Escapes JSON-LD Script Boundaries And Round-Trips The Original Text`, () => {
  const React = require(`react`);
  const { renderToString } = require(`react-dom/server`);
  const { Helmet, HelmetProvider } = require(path.join(root, `node_modules`, `expo-router`, `vendor`, `react-helmet-async`, `lib`, `index.js`));
  const { default: PageMetadata } = isolatedModule(`src/components/PageMetadata/index.web.tsx`, {
    './urls': { getPublicPageUrl: (value) => new URL(value, `https://example.test`).href },
    'expo-router/head': { __esModule: true, default: Helmet },
    'react/jsx-runtime': require(`react/jsx-runtime`),
  });
  const data = { [`@type`]: `CreativeWork`, description: `Original </script><script>fixture</script> text` };
  const tree = PageMetadata({ title: `Fixture`, description: `Fixture Description`, structuredData: data });
  const script = tree.props.children.find((child) => child?.type === `script`);
  assert.ok(script);
  const serialized = script.props.children;
  assert.equal(typeof serialized, `string`);
  assert.equal(script.props.dangerouslySetInnerHTML, undefined);
  assert.ok(!serialized.includes(`<`));
  assert.deepEqual(JSON.parse(serialized), data);
  const helmetContext = {};
  renderToString(React.createElement(HelmetProvider, { context: helmetContext }, React.createElement(PageMetadata, { title: `Fixture`, description: `Fixture Description`, structuredData: data })));
  const renderedScript = helmetContext.helmet.script.toString();
  assert.match(renderedScript, /<script[^>]*type="application\/ld\+json"/);
  const renderedJson = renderedScript.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.equal(renderedJson, serialized);
  assert.deepEqual(JSON.parse(renderedJson), data);
  const privateTree = PageMetadata({ title: `Private`, description: `Private`, noIndex: true, structuredData: data });
  assert.equal(privateTree.props.children.some((child) => child?.type === `script`), false);
});
