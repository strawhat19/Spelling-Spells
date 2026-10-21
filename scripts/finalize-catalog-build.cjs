const fs = require(`node:fs`);
const path = require(`node:path`);
const { snapshotHash } = require(`./prepare-catalog-build.cjs`);

const projectRoot = path.resolve(__dirname, `..`);

const finalizeCatalogBuild = (options = {}) => {
  const root = path.resolve(options.projectRoot ?? projectRoot);
  const outputDirectory = path.resolve(root, options.outputDirectory ?? `dist`);
  if (outputDirectory !== path.join(root, `dist`) && !outputDirectory.startsWith(`${root}${path.sep}`)) throw new Error(`Catalog Output Must Stay Within The Project Directory`);
  if (!fs.statSync(outputDirectory, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`Export The Web App Before Finalizing Catalog Metadata`);
  const generatedDirectory = path.join(root, `test-results`, `catalog-build`);
  const manifest = JSON.parse(fs.readFileSync(path.join(generatedDirectory, `manifest.json`), `utf8`));
  const snapshot = fs.readFileSync(path.join(root, `src`, `shared`, `catalog`, `buildSnapshot.ts`), `utf8`);
  if (manifest.version !== 1 || manifest.snapshotSha256 !== snapshotHash(snapshot)) throw new Error(`Catalog Build Metadata Does Not Match The Prepared Snapshot. Prepare And Export Again`);
  if (!Array.isArray(manifest.files) || manifest.files.length !== 2 || !manifest.files.includes(`sitemap.xml`) || !manifest.files.includes(`robots.txt`)) throw new Error(`The Catalog Build Manifest Has Unsupported Output Files`);
  if (!Array.isArray(manifest.spellPaths) || !Array.isArray(manifest.worldPaths)) throw new Error(`The Catalog Build Manifest Has Invalid Detail Routes`);
  for (const route of [...manifest.spellPaths, ...manifest.worldPaths]) {
    if (typeof route !== `string` || !/^\/(?:spell|world)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route)) throw new Error(`The Catalog Build Manifest Has An Unsafe Detail Route`);
    const relative = route.slice(1);
    const exported = [path.join(outputDirectory, `${relative}.html`), path.join(outputDirectory, relative, `index.html`)];
    if (!exported.some((filename) => fs.statSync(filename, { throwIfNoEntry: false })?.isFile())) throw new Error(`The Web Export Is Missing Catalog Detail Page ${route}`);
  }
  for (const file of [`sitemap.xml`, `robots.txt`]) {
    const source = path.join(generatedDirectory, file);
    if (!fs.statSync(source, { throwIfNoEntry: false })?.isFile()) throw new Error(`Prepared Catalog Metadata Is Missing ${file}`);
  }
  for (const file of [`sitemap.xml`, `robots.txt`]) fs.copyFileSync(path.join(generatedDirectory, file), path.join(outputDirectory, file));
  fs.writeFileSync(path.join(outputDirectory, `catalog-build.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  if (!options.quiet) console.log(`Catalog Export Metadata Finalized: ${manifest.spellCount} Spell(s), ${manifest.worldCount} Universe(s), ${manifest.mode} Snapshot`);
  return manifest;
};

module.exports = { finalizeCatalogBuild };

if (require.main === module) {
  if (process.argv.length > 2) { console.error(`Usage: node scripts/finalize-catalog-build.cjs`); process.exitCode = 1; }
  else {
    try { finalizeCatalogBuild(); } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
