import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ModuleKind, transpileModule } from 'typescript';

const source = await readFile(new URL(`../../src/shared/authentication/service.ts`, import.meta.url), `utf8`);
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
};
const userFor = (uid) => ({ uid, email: `${uid}@example.invalid`, emailVerified: true });
const identityFor = (user) => ({ email: user.email, firebaseUid: user.uid, emailVerified: user.emailVerified });
const accountFor = (user) => ({
  id: `account-${user.uid}`, number: 1, email: user.email, firebaseUid: user.uid,
  role: `Subscriber`, active: true, roleVerified: true, emailVerified: true,
  displayName: `Archivist`, avatarUrl: null,
});

const createHarness = ({ accountWait, profileWait } = {}) => {
  const observers = new Set();
  const credentials = [];
  const snapshots = [];
  let signOutCalls = 0;
  let verificationCalls = 0;
  const auth = { currentUser: null, authStateReady: async () => undefined };
  const runtime = { auth, database: {} };
  const notify = () => observers.forEach((listener) => listener(auth.currentUser));
  const signIn = async () => {
    const request = deferred();
    credentials.push(request);
    const user = await request.promise;
    auth.currentUser = user;
    notify();
    return { user };
  };
  const modules = {
    '../firebase/config': { firebaseConfigured: true },
    '../firebase/client': { getFirebaseRuntime: () => runtime },
    '../firebase/authPlatform': { signInWithPlatformGoogle: signIn },
    '../firebase/errors': {
      getErrorCode: (error) => error?.code ?? ``,
      authFailure: (error) => ({ ok: false, code: `error`, message: error?.message ?? `Failure` }),
    },
    '../models/users/User': {
      normalizeProfile: (value) => value,
      readAccount: (_id, _value, identity) => accountFor({ ...identity, uid: identity.firebaseUid }),
    },
    '../firebase/accounts': {
      identityFromUser: identityFor,
      ensurePrivateAccount: async (_database, user, scope) => {
        if (accountWait?.uid === user.uid) await accountWait.promise;
        scope.assertCurrent();
        return `account-${user.uid}`;
      },
      readPrivateAccount: async (_database, user) => accountFor(user),
    },
    'firebase/firestore': {
      doc: () => ({}),
      onSnapshot: () => () => undefined,
      serverTimestamp: () => 0,
      runTransaction: async (_database, callback) => callback({ get: async () => ({ exists: () => true, data: () => ({}) }), update: () => undefined }),
    },
    'firebase/auth': {
      reload: async () => undefined,
      getIdToken: async () => `test-token`,
      signInWithEmailAndPassword: signIn,
      createUserWithEmailAndPassword: signIn,
      sendPasswordResetEmail: async () => undefined,
      sendEmailVerification: async () => { verificationCalls += 1; },
      updateProfile: async () => { if (profileWait) await profileWait.promise; },
      onIdTokenChanged: (_auth, listener) => {
        observers.add(listener);
        queueMicrotask(() => { if (observers.has(listener)) listener(auth.currentUser); });
        return () => observers.delete(listener);
      },
      signOut: async () => {
        signOutCalls += 1;
        auth.currentUser = null;
        notify();
      },
    },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.ok(name in modules, `Unexpected service dependency: ${name}`);
      return modules[name];
    },
  }, { filename: `authentication-service-under-test.cjs` });
  const service = exports.authenticationService;
  const unsubscribe = service.subscribe((snapshot) => snapshots.push(snapshot));
  return { auth, service, credentials, snapshots, unsubscribe, signOutCalls: () => signOutCalls, verificationCalls: () => verificationCalls };
};

test(`local sign-out and the next sign-in do not wait for old Firestore hydration`, async () => {
  const accountWait = { uid: `alice`, ...deferred() };
  const harness = createHarness({ accountWait });
  await tick();
  const first = harness.service.signInWithEmail({ email: `alice@example.invalid`, password: `test-password` });
  await tick();
  harness.credentials[0].resolve(userFor(`alice`));
  await tick();
  assert.equal(harness.service.getSnapshot().phase, `account`);
  let signedOut = false;
  const logout = harness.service.signOut().then((result) => { signedOut = result.ok; });
  await tick();
  assert.equal(signedOut, true);
  assert.equal(harness.service.getSnapshot().status, `signed-out`);
  const second = harness.service.signInWithEmail({ email: `bob@example.invalid`, password: `test-password` });
  await tick();
  assert.equal(harness.credentials.length, 2);
  harness.credentials[1].resolve(userFor(`bob`));
  assert.equal((await second).ok, true);
  accountWait.resolve();
  assert.equal((await first).ok, false);
  await logout;
  assert.equal(harness.service.getSnapshot().account.firebaseUid, `bob`);
  harness.unsubscribe();
});

test(`late cancelled credentials are signed out before a newer credential request begins`, async () => {
  const harness = createHarness();
  await tick();
  const first = harness.service.signInWithEmail({ email: `alice@example.invalid`, password: `test-password` });
  await tick();
  assert.equal((await harness.service.signOut()).ok, true);
  const second = harness.service.signInWithEmail({ email: `bob@example.invalid`, password: `test-password` });
  await tick();
  assert.equal(harness.credentials.length, 1);
  harness.credentials[0].resolve(userFor(`alice`));
  await tick();
  assert.ok(harness.signOutCalls() >= 2);
  assert.equal(harness.credentials.length, 2);
  assert.equal(harness.snapshots.some((value) => value.identity?.firebaseUid === `alice`), false);
  harness.credentials[1].resolve(userFor(`bob`));
  assert.equal((await first).ok, false);
  assert.equal((await second).ok, true);
  assert.equal(harness.service.getSnapshot().account.firebaseUid, `bob`);
  harness.unsubscribe();
});

test(`cancelled signup cannot send a later verification or block the next login`, async () => {
  const profileWait = deferred();
  const harness = createHarness({ profileWait });
  await tick();
  const first = harness.service.signUpWithEmail({ email: `alice@example.invalid`, password: `long-test-password`, displayName: `Archivist` });
  await tick();
  harness.credentials[0].resolve(userFor(`alice`));
  await tick();
  assert.equal((await harness.service.signOut()).ok, true);
  const second = harness.service.signInWithEmail({ email: `bob@example.invalid`, password: `test-password` });
  await tick();
  harness.credentials[1].resolve(userFor(`bob`));
  assert.equal((await second).ok, true);
  profileWait.resolve();
  assert.equal((await first).ok, false);
  assert.equal(harness.verificationCalls(), 0);
  assert.equal(harness.service.getSnapshot().account.firebaseUid, `bob`);
  harness.unsubscribe();
});
