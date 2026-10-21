const fs = require(`node:fs`);
const vm = require(`node:vm`);
const path = require(`node:path`);
const ts = require(`typescript`);

const root = path.resolve(__dirname, `..`);
const cache = new Map();
const loadModule = (relativePath) => {
  const filename = path.resolve(root, relativePath);
  if (!filename.startsWith(`${root}${path.sep}`) || !/\.[cm]?[jt]sx?$/.test(filename)) throw new Error(`Catalog Modules Must Be Project Source Files`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, `utf8`), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith(`.`)) return require(name);
    const base = path.resolve(path.dirname(filename), name);
    const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, `index.ts`)].find((candidate) => fs.statSync(candidate, { throwIfNoEntry: false })?.isFile());
    if (!resolved) throw new Error(`Catalog Module Import Could Not Be Resolved: ${name}`);
    return loadModule(path.relative(root, resolved));
  };
  try {
    vm.runInNewContext(source, { module, exports: module.exports, require: localRequire, URL, console, crypto: require(`node:crypto`).webcrypto }, { filename });
    return module.exports;
  } catch (error) { cache.delete(filename); throw error; }
};

module.exports = { loadModule };
