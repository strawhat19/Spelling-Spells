import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ModuleKind, transpileModule } from 'typescript';

const source = await readFile(new URL(`../../src/shared/firebase/client.ts`, import.meta.url), `utf8`);
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
const requested = {
  apiKey: `demo-key`,
  appId: `demo-app`,
  projectId: `demo-spelling-spells`,
  authDomain: `demo-spelling-spells.firebaseapp.com`,
};

const createHarness = (options) => {
  const calls = [];
  const app = { name: `spelling-spells`, options };
  const modules = {
    './config': {
      getFirebaseConfig: () => requested,
      firebaseEmulatorsRequested: true,
      shouldUseFirebaseEmulators: () => true,
    },
    'firebase/app': {
      getApps: () => [app],
      initializeApp: () => { throw new Error(`An existing app must not be replaced.`); },
    },
    './authPlatform': { initializePlatformAuth: () => { calls.push(`auth-init`); return {}; } },
    'firebase/auth': { connectAuthEmulator: () => calls.push(`auth-emulator`) },
    'firebase/firestore': {
      memoryLocalCache: () => ({}),
      initializeFirestore: () => { calls.push(`firestore-init`); return {}; },
      connectFirestoreEmulator: () => calls.push(`firestore-emulator`),
    },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    __DEV__: true,
    require: (name) => {
      assert.ok(name in modules, `Unexpected initialization dependency: ${name}`);
      return modules[name];
    },
  }, { filename: `firebase-client-under-test.cjs` });
  return { calls, getRuntime: exports.getFirebaseRuntime };
};

test(`a retained app with mismatched actual options is rejected before auth or emulator initialization`, () => {
  for (const field of Object.keys(requested)) {
    const harness = createHarness({ ...requested, [field]: `different-real-project-value` });
    assert.throws(harness.getRuntime, { code: `app/config-mismatch` });
    assert.deepEqual(harness.calls, []);
  }
});

test(`an exact matching retained demo app can initialize the guarded emulators once`, () => {
  const harness = createHarness({ ...requested });
  const first = harness.getRuntime();
  assert.equal(harness.getRuntime(), first);
  assert.deepEqual(harness.calls, [`auth-init`, `auth-emulator`, `firestore-init`, `firestore-emulator`]);
});
