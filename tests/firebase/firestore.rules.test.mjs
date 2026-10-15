import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  doc,
  query,
  limit,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer,
  orderBy,
  deleteDoc,
  updateDoc,
  Timestamp,
  collection,
  writeBatch,
  documentId,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

const projectId = `demo-spelling-spells`;
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):[0-9]+$/.test(host)) {
  throw new Error(`These security tests require a loopback Firestore emulator. They never connect to a real Firebase project.`);
}
const port = Number(host.split(`:`).at(-1));
const rules = await readFile(new URL(`../../firestore.rules`, import.meta.url), `utf8`);
const date = new Date().toISOString().slice(0, 10);
const idFor = (number) => `User_${number}_Account_${date}_${randomUUID()}`;
const spellOne = `Spell_1_Lumos_2026-10-06_719dd0e1-506a-4e67-9b02-04d4af1b4931`;
const spellTwo = `Spell_2_Fus-Ro-Dah_2026-10-06_719dd0e2-506a-4e67-9b02-04d4af1b4932`;
let environment;

const client = (uid, claims = {}) => environment.authenticatedContext(uid, {
  email: `${uid}@example.test`,
  email_verified: true,
  ...claims,
}).firestore();

const newUser = (uid, id, number, overrides = {}) => ({
  id,
  number,
  active: true,
  avatarUrl: null,
  privacy: `private`,
  role: `Subscriber`,
  displayName: `Test Archivist`,
  email: `${uid}@example.test`,
  firebase_uid: uid,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const createAccount = (database, uid, number = 1, options = {}) => {
  const id = options.id ?? idFor(number);
  const batch = writeBatch(database);
  batch.set(doc(database, `users`, id), newUser(uid, id, number, options.user));
  batch.set(doc(database, `authMappings`, uid), { userId: id, createdAt: serverTimestamp(), ...options.mapping });
  batch.set(doc(database, `counters`, `users`), { number, lastUserId: id, ...options.counter });
  if (options.extraUser) batch.set(doc(database, `users`, options.extraUser), newUser(uid, options.extraUser, number));
  return { id, commit: () => batch.commit() };
};

const seedAccount = async (uid, number = 1, overrides = {}) => {
  const id = idFor(number);
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    const batch = writeBatch(database);
    batch.set(doc(database, `users`, id), newUser(uid, id, number, overrides));
    batch.set(doc(database, `authMappings`, uid), { userId: id, createdAt: serverTimestamp() });
    batch.set(doc(database, `counters`, `users`), { number, lastUserId: id });
    await batch.commit();
  });
  return id;
};

const allocateAccount = async (database, uid) => {
  const suffix = randomUUID();
  const mappingRef = doc(database, `authMappings`, uid);
  const counterRef = doc(database, `counters`, `users`);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let allocatedFrom = null;
    try {
      return await runTransaction(database, async (transaction) => {
        const mapping = await transaction.get(mappingRef);
        if (mapping.exists()) return mapping.data().userId;
        const counter = await transaction.get(counterRef);
        allocatedFrom = counter.exists() ? counter.data().number : 0;
        const number = allocatedFrom + 1;
        const id = `User_${number}_Account_${date}_${suffix}`;
        transaction.set(doc(database, `users`, id), newUser(uid, id, number));
        transaction.set(mappingRef, { userId: id, createdAt: serverTimestamp() });
        transaction.set(counterRef, { number, lastUserId: id });
        return id;
      });
    } catch (error) {
      if (error.code !== `permission-denied`) throw error;
      const committed = await getDocFromServer(mappingRef);
      if (committed.exists()) return committed.data().userId;
      if (allocatedFrom === null) throw error;
      let latest;
      try { latest = (await getDocFromServer(counterRef)).data()?.number; } catch (counterError) {
        const racedMapping = await getDocFromServer(mappingRef);
        if (racedMapping.exists()) return racedMapping.data().userId;
        throw counterError;
      }
      if (!Number.isSafeInteger(latest) || latest <= allocatedFrom) throw error;
    }
  }
  throw new Error(`Account allocation remained busy.`);
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { host: `127.0.0.1`, port, rules },
  });
});
beforeEach(async () => { await environment.clearFirestore(); });
after(async () => { await environment?.cleanup(); });

test(`guests cannot read accounts, mappings, counters or saved references`, async () => {
  const id = await seedAccount(`alice`);
  const guest = environment.unauthenticatedContext().firestore();
  for (const path of [`users/${id}`, `authMappings/alice`, `counters/users`, `users/${id}/savedSpells/${spellOne}`]) {
    await assertFails(getDoc(doc(guest, path)));
  }
  await assertFails(createAccount(guest, `guest`, 2).commit());
});

test(`one atomic signup creates a private Subscriber with the exact Firebase UID`, async () => {
  const database = client(`alice`, { email_verified: false });
  const account = createAccount(database, `alice`);
  await assertSucceeds(account.commit());
  const value = (await assertSucceeds(getDoc(doc(database, `users`, account.id)))).data();
  assert.equal(value.role, `Subscriber`);
  assert.equal(value.firebase_uid, `alice`);
  assert.equal(value.number, 1);
  assert.equal(value.privacy, `private`);
  await assertSucceeds(getDoc(doc(database, `authMappings`, `alice`)));
  await assertFails(getDoc(doc(database, `counters`, `users`)));
});

test(`signup rejects role, inactive, email, UID and extra-field forgery`, async () => {
  for (const user of [
    { role: `Owner` },
    { role: `Admin` },
    { role: `Developer` },
    { active: false },
    { privacy: `public` },
    { email: `someone-else@example.test` },
    { firebase_uid: `someone-else` },
    { roleVerified: true },
    { plan: `Paid` },
  ]) {
    await assertFails(createAccount(client(`alice`), `alice`, 1, { user }).commit());
  }
});

test(`signup rejects missing components, counter jumps, number mismatch and extra records`, async () => {
  const database = client(`alice`);
  const id = idFor(1);
  await assertFails(setDoc(doc(database, `users`, id), newUser(`alice`, id, 1)));
  await assertFails(setDoc(doc(database, `authMappings`, `alice`), { userId: id, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(database, `counters`, `users`), { number: 1, lastUserId: id }));
  await assertFails(createAccount(database, `alice`, 2).commit());
  await assertFails(createAccount(database, `alice`, 1, { id: idFor(2) }).commit());
  await assertFails(createAccount(database, `alice`, 1, { counter: { number: 2 } }).commit());
  await assertFails(createAccount(database, `alice`, 1, { extraUser: idFor(1) }).commit());
  await assertFails(createAccount(database, `alice`, 1, { counter: { privateEmail: `alice@example.test` } }).commit());
  await assertFails(createAccount(database, `alice`, 1, { mapping: { role: `Owner` } }).commit());
});

test(`the next new account advances exactly once and old mappings cannot relink`, async () => {
  const alice = await seedAccount(`alice`);
  const bobDatabase = client(`bob`);
  await assertFails(createAccount(bobDatabase, `bob`, 3).commit());
  const bob = createAccount(bobDatabase, `bob`, 2);
  await assertSucceeds(bob.commit());
  await assertFails(updateDoc(doc(client(`alice`), `authMappings`, `alice`), { userId: bob.id }));
  await assertFails(deleteDoc(doc(client(`alice`), `authMappings`, `alice`)));
  await assertFails(createAccount(client(`alice`), `alice`, 3).commit());
  await assertFails(updateDoc(doc(client(`alice`), `counters`, `users`), { number: 3, lastUserId: alice }));
  await assertFails(deleteDoc(doc(client(`alice`), `counters`, `users`)));
});

test(`concurrent retry-safe allocation resolves one account for the same UID`, async () => {
  const database = client(`alice`);
  const [first, second] = await Promise.all([allocateAccount(database, `alice`), allocateAccount(database, `alice`)]);
  assert.equal(first, second);
  await environment.withSecurityRulesDisabled(async (context) => {
    assert.equal((await getDocs(collection(context.firestore(), `users`))).size, 1);
    assert.equal((await getDoc(doc(context.firestore(), `counters`, `users`))).data().number, 1);
  });
});

test(`distinct concurrent signups receive unique next numbers`, async () => {
  const [alice, bob] = await Promise.all([
    allocateAccount(client(`alice`), `alice`),
    allocateAccount(client(`bob`), `bob`),
  ]);
  assert.notEqual(alice, bob);
  await environment.withSecurityRulesDisabled(async (context) => {
    const accounts = await getDocs(collection(context.firestore(), `users`));
    assert.deepEqual(accounts.docs.map((entry) => entry.data().number).sort(), [1, 2]);
    assert.equal((await getDoc(doc(context.firestore(), `counters`, `users`))).data().number, 2);
  });
});

test(`own reads and safe profile edits work; other account reads and account lists do not`, async () => {
  const alice = await seedAccount(`alice`);
  const bob = await seedAccount(`bob`, 2);
  const database = client(`alice`);
  await assertSucceeds(getDoc(doc(database, `users`, alice)));
  await assertFails(getDoc(doc(database, `users`, bob)));
  await assertFails(getDoc(doc(database, `authMappings`, `bob`)));
  await assertFails(getDocs(query(collection(database, `users`), limit(50))));
  await assertFails(getDocs(query(collection(database, `authMappings`), limit(50))));
  await assertSucceeds(updateDoc(doc(database, `users`, alice), { displayName: `Updated Archivist`, avatarUrl: `https://example.test/avatar.png`, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(database, `users`, bob), { displayName: `Unauthorized Edit`, updatedAt: serverTimestamp() }));
});

test(`profile cannot promote, deactivate, change identity/email or inject unsafe avatar data`, async () => {
  const id = await seedAccount(`alice`);
  const reference = doc(client(`alice`), `users`, id);
  for (const changes of [
    { role: `Owner` },
    { role: `Admin` },
    { active: false },
    { number: 2 },
    { id: idFor(2) },
    { firebase_uid: `bob` },
    { email: `changed@example.test` },
    { privacy: `public` },
    { createdAt: Timestamp.fromMillis(0) },
    { displayName: `` },
    { displayName: `x`.repeat(81) },
    { avatarUrl: `http://example.test/avatar.png` },
    { avatarUrl: `https://user:password@example.test/avatar.png` },
    { avatarUrl: `javascript:alert(1)` },
    { avatarUrl: `https://example.test/${`x`.repeat(2048)}` },
  ]) await assertFails(updateDoc(reference, { ...changes, updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(reference));
});

test(`saved spell references are private, exact-shaped and server-timestamped`, async () => {
  const alice = await seedAccount(`alice`);
  const bob = await seedAccount(`bob`, 2);
  const database = client(`alice`);
  const reference = doc(database, `users`, alice, `savedSpells`, spellOne);
  await assertSucceeds(setDoc(reference, { spellId: spellOne, savedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(reference));
  await assertFails(getDoc(doc(client(`bob`), `users`, alice, `savedSpells`, spellOne)));
  await assertFails(setDoc(doc(database, `users`, bob, `savedSpells`, spellTwo), { spellId: spellTwo, savedAt: serverTimestamp() }));
  await assertFails(updateDoc(reference, { savedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(database, `users`, alice, `savedSpells`, spellTwo), { spellId: spellOne, savedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(database, `users`, alice, `savedSpells`, spellTwo), { spellId: spellTwo, savedAt: Timestamp.fromMillis(0) }));
  await assertFails(setDoc(doc(database, `users`, alice, `savedSpells`, spellTwo), { spellId: spellTwo, savedAt: serverTimestamp(), role: `Owner` }));
  await assertFails(setDoc(doc(database, `users`, alice, `savedSpells`, `unknown-spell`), { spellId: `unknown-spell`, savedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(reference));
});

test(`saved queries require an own bounded window with at most 501 lookahead records`, async () => {
  const id = await seedAccount(`alice`);
  const saves = collection(client(`alice`), `users`, id, `savedSpells`);
  await assertSucceeds(getDocs(query(saves, orderBy(documentId()), limit(501))));
  await assertFails(getDocs(saves));
  await assertFails(getDocs(query(saves, limit(502))));
  await assertFails(getDocs(query(collection(client(`bob`), `users`, id, `savedSpells`), limit(500))));
});

test(`inactive accounts can see their own status but cannot edit profiles or use private saves`, async () => {
  const id = await seedAccount(`alice`, 1, { active: false });
  const database = client(`alice`);
  const reference = doc(database, `users`, id, `savedSpells`, spellOne);
  await assertSucceeds(getDoc(doc(database, `users`, id)));
  await assertFails(updateDoc(doc(database, `users`, id), { displayName: `Changed`, updatedAt: serverTimestamp() }));
  await assertFails(getDoc(reference));
  await assertFails(setDoc(reference, { spellId: spellOne, savedAt: serverTimestamp() }));
  await assertFails(deleteDoc(reference));
});

test(`trusted role changes do not grant cross-account reads or client role management`, async () => {
  const owner = await seedAccount(`owner`, 1, { role: `Owner` });
  const other = await seedAccount(`other`, 2);
  const database = client(`owner`, { role: `Owner`, admin: true });
  await assertSucceeds(getDoc(doc(database, `users`, owner)));
  await assertFails(getDoc(doc(database, `users`, other)));
  await assertFails(updateDoc(doc(database, `users`, other), { role: `Owner`, updatedAt: serverTimestamp() }));
});

test(`later-stage and unmatched paths stay denied`, async () => {
  await seedAccount(`alice`);
  const database = client(`alice`);
  for (const path of [`submissions/private`, `publishedSpells/public`, `connections/secret`, `features/global`, `arbitrary/record`]) {
    await assertFails(getDoc(doc(database, path)));
    await assertFails(setDoc(doc(database, path), { visible: true }));
  }
});
