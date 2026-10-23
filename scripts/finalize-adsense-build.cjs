const fs = require(`node:fs`);
const path = require(`node:path`);
const { parseEnv } = require(`node:util`);

const projectRoot = path.resolve(__dirname, `..`);
const publisherKey = `ADSENSE_PUBLISHER_ID`;
const verificationTag = /<meta\b(?=[^>]*\bname\s*=\s*(?:"google-adsense-account"|'google-adsense-account'|google-adsense-account(?=[\s/>])))[^>]*>\s*/gi;
const normalizePublisherId = (value) => {
  const digits = typeof value === `string` ? value.trim().match(/^(?:ca-)?pub-(\d{16})$/)?.[1] : null;
  return digits && !/^0+$/.test(digits) ? `pub-${digits}` : null;
};
const readPublisherConfiguration = (root, environment) => {
  let value = ``;
  for (const file of [`.env`, `.env.local`]) {
    const filename = path.join(root, file);
    if (!fs.existsSync(filename)) continue;
    for (const line of fs.readFileSync(filename, `utf8`).split(/\r?\n/)) {
      if (/^\s*(?:export\s+)?ADSENSE_PUBLISHER_ID\s*=/.test(line)) value = parseEnv(line)[publisherKey] ?? ``;
    }
  }
  if (Object.hasOwn(environment, publisherKey)) value = String(environment[publisherKey] ?? ``);
  return { publisherId: normalizePublisherId(value), invalid: Boolean(value.trim()) && !normalizePublisherId(value) };
};
const htmlFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const filename = path.join(directory, entry.name);
  return entry.isDirectory() ? htmlFiles(filename) : entry.isFile() && entry.name.endsWith(`.html`) ? [filename] : [];
});
const finalizeAdSenseBuild = (options = {}) => {
  const root = path.resolve(options.projectRoot ?? projectRoot);
  const output = path.resolve(root, options.outputDirectory ?? `dist`);
  if (output !== path.join(root, `dist`) && !output.startsWith(`${root}${path.sep}`)) throw new Error(`Publisher Output Must Stay Within The Project Directory`);
  if (!fs.statSync(output, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`Export The Web App Before Preparing Publisher Metadata`);
  const { invalid, publisherId } = readPublisherConfiguration(root, options.environment ?? process.env);
  const files = htmlFiles(output);
  if (!files.length) throw new Error(`The Web Export Has No HTML Pages For Publisher Metadata`);
  for (const filename of files) {
    const html = fs.readFileSync(filename, `utf8`);
    let heads = 0;
    const updated = html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, (head) => {
      heads += 1;
      const clean = head.replace(verificationTag, ``);
      return publisherId ? clean.replace(/<\/head>$/i, `<meta name="google-adsense-account" content="ca-${publisherId}" /></head>`) : clean;
    });
    if (heads !== 1) throw new Error(`An Exported Page Needs Exactly One HTML Head`);
    if (updated !== html) fs.writeFileSync(filename, updated);
  }
  const source = path.join(root, `public`, `ads.txt`);
  const destination = path.join(output, `ads.txt`);
  const existing = fs.existsSync(source) ? fs.readFileSync(source, `utf8`).replace(/^\uFEFF/, ``).trim() : ``;
  const seller = publisherId ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0` : ``;
  const lines = existing ? existing.split(/\r?\n/) : [];
  if (seller && !lines.some((line) => line.trim() === seller)) lines.push(seller);
  if (lines.length) fs.writeFileSync(destination, `${lines.join(`\n`)}\n`);
  else if (fs.existsSync(destination)) fs.unlinkSync(destination);
  const manifest = {
    version: 1,
    verificationOnly: true,
    publisherId,
    publisherConfigured: Boolean(publisherId),
    verificationMetaPages: publisherId ? files.length : 0,
    sourceSellerFilePreserved: Boolean(existing),
    adsTxt: lines.length ? publisherId ? `configured` : `source-preserved` : `absent`,
  };
  fs.writeFileSync(path.join(output, `adsense-build.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  if (!options.quiet) {
    if (invalid) console.warn(`AdSense Publisher ID Is Invalid; Verification Is Unconfigured`);
    console.log(`AdSense Preparation Finalized: ${publisherId ? `${files.length} Verification Page(s)` : `Publisher Unconfigured`}, Ads.txt ${lines.length ? `Prepared` : `Absent`}`);
  }
  return manifest;
};

module.exports = { normalizePublisherId, readPublisherConfiguration, finalizeAdSenseBuild };

if (require.main === module) {
  if (process.argv.length > 2) { console.error(`Usage: node scripts/finalize-adsense-build.cjs`); process.exitCode = 1; }
  else {
    try { finalizeAdSenseBuild(); } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
