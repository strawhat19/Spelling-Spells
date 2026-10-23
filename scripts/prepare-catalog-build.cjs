const fs = require(`node:fs`);
const path = require(`node:path`);
const crypto = require(`node:crypto`);
const { parseEnv } = require(`node:util`);

const projectRoot = path.resolve(__dirname, `..`);
const maximumRows = 4000;
const pageSize = 200;
const publicKeys = [`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`];
const publicPaths = [`/`, `/spells`, `/worlds`, `/pricing`, `/pronunciation`, `/about`, `/help`, `/guidelines`, `/data-privacy`, `/contact`, `/privacy`, `/terms`, `/notifications`];
const privatePaths = [`/admin`, `/auth`, `/users`, `/saved`, `/submit`, `/review`, `/health`, `/signin`, `/signup`, `/login`, `/sign-in`, `/sign-up`, `/register`, `/profile`, `/grimoire`, `/features`, `/contacts`, `/feedback`, `/analytics`, `/dashboard`, `/submissions`, `/catalog-editor`, `/reset-password`];
const spellFields = [`id`, `slug`, `name`, `number`, `worldId`, `sourceTitle`, `medium`, `kind`, `language`, `pronunciation`, `pronunciationNote`, `pronunciationStatus`, `syllables`, `definition`, `usage`, `effect`, `entryType`, `casters`, `continuity`, `etymology`, `etymologyStatus`, `breakdown`, `danger`, `utility`, `skill`, `category`, `accent`, `counterspell`, `aliases`, `evidenceStatus`, `sourceIds`];
const worldFields = [`id`, `slug`, `name`, `medium`, `description`, `kind`, `continuity`];
const mediaFields = [`id`, `url`, `alt`, `type`, `credit`, `poster`, `caption`, `sourceUrl`];
const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pick = (record, keys) => Object.fromEntries(keys.filter((key) => record[key] !== undefined).map((key) => [key, record[key]]));
const object = (value, label) => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`${label} Must Be An Object`);
  return value;
};
const rows = (value, label) => {
  if (!Array.isArray(value) || value.length > maximumRows) throw new Error(`${label} Must Be An Array With At Most ${maximumRows} Records`);
  return value;
};
const assertUnique = (records, field, label) => {
  const values = records.map((record) => record[field]);
  if (values.some((value) => value === undefined || value === ``) || new Set(values).size !== values.length) throw new Error(`${label} Has A Missing Or Duplicate ${field}`);
};
const xml = (value) => value.replace(/&/g, `&amp;`).replace(/</g, `&lt;`).replace(/>/g, `&gt;`).replace(/"/g, `&quot;`).replace(/'/g, `&apos;`);
const snapshotHash = (value) => crypto.createHash(`sha256`).update(value).digest(`hex`);

const readPublicEnvironment = (root = projectRoot, environment = process.env) => {
  const result = {};
  for (const file of [`.env`, `.env.local`]) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, `utf8`).split(/\r?\n/)) {
      const key = line.match(/^\s*(?:export\s+)?(EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)\s*=/)?.[1];
      if (!key) continue;
      const value = parseEnv(line)[key];
      if (typeof value !== `string`) throw new Error(`A Public Catalog Environment Value Could Not Be Parsed`);
      result[key] = value.trim();
    }
  }
  for (const key of publicKeys) if (Object.hasOwn(environment, key)) result[key] = String(environment[key] ?? ``).trim();
  return result;
};

const getPublicConfiguration = (environment) => {
  const key = environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? ``)) throw new Error(`Catalog Build Requires A Public Supabase Publishable Key. Private And Service-Role Keys Are Not Accepted`);
  let url;
  try { url = new URL(environment.EXPO_PUBLIC_SUPABASE_URL); } catch { throw new Error(`Catalog Build Requires A Public Supabase Project URL`); }
  if (url.protocol !== `https:` || url.username || url.password || url.search || url.hash || ![``, `/`].includes(url.pathname)) throw new Error(`Catalog Build Requires An HTTPS Supabase Project Origin Without Credentials`);
  return { key, origin: url.origin };
};

const readPublicRows = async (table, configuration, fetcher = fetch) => {
  if (![ `catalog_spells`, `catalog_universes`, `catalog_sources` ].includes(table)) throw new Error(`Unsupported Public Catalog Table`);
  const result = [];
  let offset = 0;
  for (let page = 0; page < 100; page += 1) {
    const limit = Math.min(pageSize, maximumRows + 1 - offset);
    const url = new URL(`/rest/v1/${table}`, configuration.origin);
    url.searchParams.set(`select`, `*`);
    url.searchParams.set(`order`, `id.asc`);
    url.searchParams.set(`limit`, String(limit));
    url.searchParams.set(`offset`, String(offset));
    if (table === `catalog_spells`) url.searchParams.set(`status`, `eq.published`);
    let response;
    try {
      response = await fetcher(url, { method: `GET`, redirect: `error`, signal: AbortSignal.timeout(15000), headers: { apikey: configuration.key, Prefer: `count=exact`, Accept: `application/json` } });
    } catch { throw new Error(`Anonymous Catalog Read Failed For ${table}. No Bundled Catalog Was Substituted`); }
    if (!response.ok) {
      let code;
      try { code = (await response.json())?.code; } catch {}
      const missingSchema = response.status === 404 && [`PGRST205`, `42P01`].includes(code);
      throw Object.assign(new Error(`Anonymous Catalog Read Failed For ${table} (HTTP ${response.status}). Check The Approved Catalog Migration And Anonymous Read Grants`), {
        code: missingSchema ? `CATALOG_SCHEMA_UNAVAILABLE` : `CATALOG_READ_FAILED`,
      });
    }
    let data;
    try { data = await response.json(); } catch { throw new Error(`Anonymous Catalog Read Returned Invalid JSON For ${table}`); }
    if (!Array.isArray(data) || data.length > limit) throw new Error(`Anonymous Catalog Read Returned An Unsupported Page For ${table}`);
    const totalText = response.headers?.get?.(`content-range`)?.match(/\/(\d+)$/)?.[1];
    const total = totalText === undefined ? null : Number(totalText);
    if ((total !== null && total > maximumRows) || result.length + data.length > maximumRows) throw new Error(`The ${table} Catalog Exceeds The ${maximumRows} Record Build Limit. No Partial Snapshot Was Written`);
    result.push(...data);
    offset += data.length;
    if (total !== null && offset >= total) return result;
    if (!data.length) {
      if (total !== null && offset < total) throw new Error(`The ${table} Catalog Returned An Incomplete Page`);
      return result;
    }
    if (total === null && data.length < limit) return result;
  }
  throw new Error(`The ${table} Catalog Could Not Be Read Completely Within The Build Request Limit`);
};

const publicSpell = (spell) => {
  if (spell.evidenceStatus !== `verified`) throw new Error(`Unverified Catalog Entries Cannot Enter A Public Build Snapshot`);
  if (!safeSlug.test(spell.slug ?? ``) || !Number.isSafeInteger(spell.number) || spell.number < 1) throw new Error(`A Public Catalog Entry Has An Invalid Number Or Slug`);
  for (const field of [`id`, `name`, `worldId`, `sourceTitle`, `kind`, `definition`]) if (typeof spell[field] !== `string` || !spell[field].trim()) throw new Error(`A Public Catalog Entry Is Missing ${field}`);
  const result = pick(spell, spellFields);
  result.sources = rows(spell.sources, `Catalog Sources`).map((source) => ({ label: source.label, url: source.url }));
  result.breakdown = rows(spell.breakdown, `Word Parts`).map((part) => ({ label: part.label, meaning: part.meaning }));
  if (spell.media !== undefined) result.media = rows(spell.media, `Catalog Media`).map((media) => {
    object(media, `Catalog Media`);
    if (![`image`, `video`].includes(media.type) || typeof media.id !== `string` || typeof media.alt !== `string`) throw new Error(`A Public Media Record Is Invalid`);
    for (const field of [`url`, `poster`, `sourceUrl`]) {
      if (!media[field]) continue;
      const value = media[field];
      if (typeof value !== `string`) throw new Error(`A Public Media Link Is Invalid`);
      if (value.startsWith(`/`) && !value.startsWith(`//`) && !value.includes(`..`) && !/[\\\s]/.test(value)) continue;
      let url;
      try { url = new URL(value); } catch { throw new Error(`A Public Media Link Is Invalid`); }
      if (url.protocol !== `https:` || url.username || url.password) throw new Error(`Public Media Requires HTTPS Or A Local Asset Path`);
    }
    if (!media.url) throw new Error(`A Public Media Record Is Missing Its URL`);
    return pick(media, mediaFields);
  });
  return result;
};

const validatePublicCatalog = (catalog) => {
  const spellRecords = rows(catalog.spells, `Public Spells`).map(publicSpell);
  const worlds = rows(catalog.worlds, `Public Universes`).map((value) => {
    const world = object(value, `Public Universe`);
    if (typeof world.id !== `string` || !world.id.trim() || typeof world.name !== `string` || !world.name.trim() || !safeSlug.test(world.slug || world.id)) throw new Error(`A Public Universe Has An Invalid Identity Or Slug`);
    return pick({ ...world, slug: world.slug || world.id, kind: world.kind === `folklore` ? `folklore` : `fictional` }, worldFields);
  });
  for (const field of [`id`, `slug`, `number`]) assertUnique(spellRecords, field, `Public Spells`);
  for (const field of [`id`, `slug`]) assertUnique(worlds, field, `Public Universes`);
  if (spellRecords.some((spell) => !worlds.some((world) => world.id === spell.worldId))) throw new Error(`A Public Catalog Entry References A Missing Universe`);
  return { spells: spellRecords.sort((left, right) => left.number - right.number), worlds: worlds.filter((world) => spellRecords.some((spell) => spell.worldId === world.id)) };
};

const normalizeAnonymousCatalog = (spells, worlds, sources) => {
  const { loadModule } = require(`./catalog-tools.cjs`);
  const { spellFromRecord, worldFromRecord, sourceFromRecord } = loadModule(`src/shared/catalog/records.ts`);
  if (spells.some((spell) => spell?.status !== `published`)) throw new Error(`A Non-Published Record Was Returned By The Anonymous Catalog Query`);
  const sourceRecords = sources.map(sourceFromRecord);
  return validatePublicCatalog({ spells: spells.map((spell) => spellFromRecord(spell, sourceRecords)), worlds: worlds.map(worldFromRecord) });
};

const normalizeFixtureCatalog = (input) => {
  const fixture = object(input, `Public Catalog Fixture`);
  if (Object.keys(fixture).some((key) => ![`spells`, `worlds`].includes(key))) throw new Error(`A Build Fixture Must Contain Only PublicCatalog Spells And Worlds`);
  const { loadModule } = require(`./catalog-tools.cjs`);
  const { getSpellSlug } = loadModule(`src/shared/catalog/routes.ts`);
  const { spellFromRecord } = loadModule(`src/shared/catalog/records.ts`);
  const spells = rows(fixture.spells, `Fixture Spells`).map((value) => {
    const spell = object(value, `Fixture Spell`);
    if ((spell.status !== undefined && spell.status !== `published`) || spell.evidenceStatus !== `verified`) throw new Error(`Draft, Unpublished And Unverified Entries Cannot Enter A Public Fixture`);
    if (spell.slug !== undefined && !safeSlug.test(spell.slug)) throw new Error(`A Public Fixture Entry Has An Invalid Slug`);
    return spellFromRecord({ id: spell.id, number: spell.number, name: spell.name, slug: getSpellSlug(spell), universe_id: spell.worldId, status: `published`, revision: 1, payload: spell });
  });
  return validatePublicCatalog({ spells, worlds: rows(fixture.worlds, `Fixture Universes`) });
};

const getSiteOrigin = (root) => {
  const app = JSON.parse(fs.readFileSync(path.join(root, `app.json`), `utf8`));
  let url;
  try { url = new URL(app?.expo?.extra?.siteUrl); } catch { throw new Error(`app.json Needs A Confirmed Public Site URL Before Catalog Export`); }
  if (![`https:`, `http:`].includes(url.protocol) || url.username || url.password || url.search || url.hash || ![``, `/`].includes(url.pathname)) throw new Error(`The Public Site URL Must Be An HTTP Or HTTPS Origin`);
  return url.origin;
};

const prepareCatalogBuild = async (options = {}) => {
  const root = path.resolve(options.projectRoot ?? projectRoot);
  const environment = options.environment ?? process.env;
  const fixture = options.fixture ?? environment.CATALOG_BUILD_FIXTURE;
  const shell = options.shell === true;
  if (shell && fixture) throw new Error(`Choose An Explicit Fixture Or An Empty Shell, Not Both`);
  let mode = shell ? `shell` : fixture ? `fixture` : `anonymous`;
  let catalog = { spells: [], worlds: [] };
  if (fixture) catalog = normalizeFixtureCatalog(JSON.parse(fs.readFileSync(path.resolve(root, fixture), `utf8`)));
  if (mode === `anonymous`) {
    const configuration = getPublicConfiguration(readPublicEnvironment(root, environment));
    const reads = await Promise.allSettled([`catalog_spells`, `catalog_universes`, `catalog_sources`].map((table) => readPublicRows(table, configuration, options.fetcher ?? fetch)));
    const failures = reads.filter((read) => read.status === `rejected`);
    const otherFailure = failures.find((read) => read.reason?.code !== `CATALOG_SCHEMA_UNAVAILABLE`);
    if (otherFailure) throw otherFailure.reason;
    if (failures.length) {
      if (![ `preview`, `production` ].includes(environment.VERCEL_ENV)) throw failures[0].reason;
      mode = `${environment.VERCEL_ENV}-shell`;
      if (!options.quiet) console.warn(`Catalog Tables Are Not Installed. Exporting An Empty ${environment.VERCEL_ENV === `production` ? `Production` : `Preview`} Shell; Runtime Will Show The Migration Error. No Seed Catalog Was Substituted`);
    } else catalog = normalizeAnonymousCatalog(...reads.map((read) => read.value));
  }
  const schemaUnavailable = [ `preview-shell`, `production-shell` ].includes(mode);
  const generatedAt = (options.now?.() ?? new Date()).toISOString();
  const timestamp = shell || schemaUnavailable ? null : generatedAt;
  const origin = getSiteOrigin(root);
  const spellPaths = catalog.spells.map((spell) => `/spell/${spell.slug}`);
  const worldPaths = catalog.worlds.map((world) => `/world/${world.slug}`);
  const locations = [...publicPaths, ...spellPaths, ...worldPaths].map((value) => new URL(value, origin).href);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations.map((location) => `  <url><loc>${xml(location)}</loc></url>`).join(`\n`)}\n</urlset>\n`;
  const robots = `User-agent: *\nAllow: /\n${privatePaths.map((value) => `Disallow: ${value}`).join(`\n`)}\n\nSitemap: ${origin}/sitemap.xml\n`;
  const snapshot = `import type { PublicCatalog } from './types';\n\nexport const buildCatalog: PublicCatalog = ${JSON.stringify(catalog, null, 2)};\nexport const buildCatalogTimestamp: string | null = ${JSON.stringify(timestamp)};\n`;
  const manifest = { version: 1, mode, generatedAt, catalogTimestamp: timestamp, siteOrigin: origin, spellCount: catalog.spells.length, worldCount: catalog.worlds.length, spellPaths, worldPaths, snapshotSha256: snapshotHash(snapshot), files: [`sitemap.xml`, `robots.txt`], ...(schemaUnavailable ? { reason: `catalog-schema-unavailable` } : {}) };
  const generatedDirectory = path.join(root, `test-results`, `catalog-build`);
  const snapshotPath = path.join(root, `src`, `shared`, `catalog`, `buildSnapshot.ts`);
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.mkdirSync(generatedDirectory, { recursive: true });
  fs.writeFileSync(snapshotPath, snapshot);
  fs.writeFileSync(path.join(generatedDirectory, `sitemap.xml`), sitemap);
  fs.writeFileSync(path.join(generatedDirectory, `robots.txt`), robots);
  fs.writeFileSync(path.join(generatedDirectory, `manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  if (!options.quiet) console.log(`${mode === `fixture` ? `Explicit Public Catalog Fixture Used` : mode === `shell` ? `Explicit Empty Catalog Shell Used` : schemaUnavailable ? `${environment.VERCEL_ENV === `production` ? `Production` : `Preview`} Catalog Shell Prepared / Migration Required` : `Anonymous Public Catalog Snapshot Loaded`}: ${catalog.spells.length} Spell(s), ${catalog.worlds.length} Universe(s)`);
  return { catalog, manifest, snapshotPath, generatedDirectory };
};

module.exports = { prepareCatalogBuild, readPublicEnvironment, getPublicConfiguration, readPublicRows, normalizeAnonymousCatalog, normalizeFixtureCatalog, snapshotHash };

if (require.main === module) {
  const flags = process.argv.slice(2);
  if (flags.includes(`--help`)) console.log(`Usage: node scripts/prepare-catalog-build.cjs [--shell]\nDefault: Anonymous Published Supabase Catalog\nVercel Preview And Production: Confirmed Missing Catalog Tables Produce An Empty Shell With A Warning\nIsolated Fixture: Set CATALOG_BUILD_FIXTURE To A PublicCatalog JSON File\nOnly Public Supabase URL And Publishable-Key Environment Values Are Read For Database Access`);
  else if (flags.some((value) => value !== `--shell`)) { console.error(`Unknown Catalog Build Option`); process.exitCode = 1; }
  else prepareCatalogBuild({ shell: flags.includes(`--shell`) }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
