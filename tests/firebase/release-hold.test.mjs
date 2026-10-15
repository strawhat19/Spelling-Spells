import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ModuleKind, transpileModule } from 'typescript';

const paths = {
  config: `firebase/config.ts`,
  errors: `firebase/errors.ts`,
  user: `models/users/User.ts`,
  platform: `firebase/authPlatform.web.ts`,
  client: `firebase/client.ts`,
  service: `authentication/service.ts`,
};
const compiled = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) => {
  const source = await readFile(new URL(`../../src/shared/${path}`, import.meta.url), `utf8`);
  return [name, transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText];
})));
const scenarios = [
  { development: false, projectId: `fake-production-project`, emulatorFlag: `0` },
  { development: true, projectId: `demo-spelling-spells`, emulatorFlag: `1` },
  { development: false, projectId: `fake-production-project`, emulatorFlag: `1` },
];

const createHarness = ({ development, projectId, emulatorFlag }) => {
  const calls = [];
  const forbidden = (name) => (..._args) => {
    calls.push(name);
    throw new Error(`Release hold must prevent ${name}`);
  };
  const boundary = (name) => new Proxy({}, { get: (_target, key) => forbidden(`${name}.${String(key)}`) });
  const modules = {
    'firebase/app': boundary(`firebase/app`),
    'firebase/auth': boundary(`firebase/auth`),
    'firebase/firestore': boundary(`firebase/firestore`),
    '../firebase/accounts': boundary(`private accounts`),
  };
  const aliases = {
    config: [`./config`, `../firebase/config`],
    errors: [`../firebase/errors`],
    user: [`../models/users/User`],
    platform: [`./authPlatform`, `../firebase/authPlatform`],
    client: [`../firebase/client`],
    service: [],
  };
  const loaded = {};
  for (const [name, source] of Object.entries(compiled)) {
    const exports = {};
    runInNewContext(source, {
      exports,
      __DEV__: development,
      process: { env: {
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: projectId,
        EXPO_PUBLIC_FIREBASE_API_KEY: `fake-populated-key`,
        EXPO_PUBLIC_FIREBASE_APP_ID: `fake-populated-app-id`,
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
        EXPO_PUBLIC_USE_FIREBASE_EMULATORS: emulatorFlag,
      } },
      require: (dependency) => {
        assert.ok(dependency in modules, `Unexpected release-hold dependency: ${dependency}`);
        return modules[dependency];
      },
    }, { filename: `release-hold-${name}-under-test.cjs` });
    loaded[name] = exports;
    for (const alias of aliases[name]) modules[alias] = exports;
  }
  return { calls, ...loaded };
};

test(`the source release hold overrides populated Firebase and emulator environment values`, () => {
  for (const scenario of scenarios) {
    const { calls, config, client } = createHarness(scenario);
    assert.equal(config.accountConnectionReleased, false);
    assert.equal(config.firebaseConfigured, false);
    assert.equal(config.getFirebaseConfig(), null);
    assert.throws(client.getFirebaseRuntime, { code: `app/connection-required` });
    assert.deepEqual(calls, []);
  }
});

test(`subscriptions and every direct auth action remain disconnected without invoking SDK operations`, async () => {
  for (const scenario of scenarios) {
    const { calls, service: module } = createHarness(scenario);
    const service = module.authenticationService;
    const snapshots = [];
    const unsubscribe = service.subscribe((snapshot) => snapshots.push(snapshot));
    assert.equal(service.getSnapshot().status, `unavailable`);
    assert.throws(module.requireCurrentAccount, { code: `app/connection-required` });
    const actions = [
      () => service.signInWithGoogle(),
      () => service.signInWithEmail({ email: `archivist@example.invalid`, password: `fake-password` }),
      () => service.signUpWithEmail({ email: `archivist@example.invalid`, password: `fake-long-password`, displayName: `Archivist` }),
      () => service.resetPassword(`archivist@example.invalid`),
      () => service.sendVerification(),
      () => service.refreshIdentity(),
      () => service.retryHydration(),
      () => service.updateProfile({ displayName: `Archivist`, avatarUrl: null }),
      () => service.signOut(),
    ];
    for (const action of actions) {
      const result = await action();
      assert.equal(result.ok, false);
      assert.equal(result.code, `connection-required`);
      assert.deepEqual(calls, []);
    }
    assert.ok(snapshots.every((snapshot) => snapshot.account === null && snapshot.identity === null && snapshot.status !== `signed-in`));
    unsubscribe();
    assert.equal(service.getSnapshot().status, `unavailable`);
    assert.deepEqual(calls, []);
  }
});
