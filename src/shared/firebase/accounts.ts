import { randomUUID } from 'expo-crypto';
import { getErrorCode } from './errors';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { createRecordId } from '../common/ids';
import { normalizeProfile, readAccount } from '../models/users/User';
import type { Account, AuthIdentity } from '../authentication/types';
import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';

export const identityFromUser = (user: User): AuthIdentity => ({
  email: user.email ?? ``,
  firebaseUid: user.uid,
  emailVerified: user.emailVerified,
});

type AccountScope = { revision: number; assertCurrent: () => void };
const pendingAccounts = new Map<string, Promise<string>>();

const mappedId = (data: { userId?: unknown }): string => {
  if (typeof data.userId !== `string` || !data.userId.startsWith(`User_`)) {
    throw new Error(`The account mapping is invalid. Contact the site owner.`);
  }
  return data.userId;
};

export const ensurePrivateAccount = (database: Firestore, user: User, scope: AccountScope): Promise<string> => {
  const key = `${database.app.name}:${user.uid}:${scope.revision}`;
  const pending = pendingAccounts.get(key);
  if (pending) return pending;
  const operation = (async () => {
    scope.assertCurrent();
    if (!user.email) throw new Error(`This sign-in method did not provide an email address.`);
    const uuid = randomUUID();
    const date = new Date().toISOString().slice(0, 10);
    const displayName = user.displayName?.trim().slice(0, 80) || `Archivist`;
    let avatarUrl: string | null = null;
    try { avatarUrl = normalizeProfile({ displayName, avatarUrl: user.photoURL }).avatarUrl; } catch { /* Ignore invalid provider image metadata. */ }
    const mappingRef = doc(database, `authMappings`, user.uid);
    const counterRef = doc(database, `counters`, `users`);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let allocatedFrom: number | null = null;
      try {
        return await runTransaction(database, async (transaction) => {
          scope.assertCurrent();
          const mapping = await transaction.get(mappingRef);
          scope.assertCurrent();
          if (mapping.exists()) return mappedId(mapping.data());
          const counter = await transaction.get(counterRef);
          scope.assertCurrent();
          const previous: unknown = counter.exists() ? counter.data().number : 0;
          if (typeof previous !== `number` || !Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) {
            throw new Error(`Account allocation is unavailable. Contact the site owner.`);
          }
          allocatedFrom = previous;
          const number = previous + 1;
          const id = createRecordId(`User`, number, `Account`, date, uuid);
          transaction.set(doc(database, `users`, id), {
            id,
            number,
            avatarUrl,
            displayName,
            active: true,
            privacy: `private`,
            role: `Subscriber`,
            email: user.email,
            firebase_uid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          transaction.set(mappingRef, { userId: id, createdAt: serverTimestamp() });
          transaction.set(counterRef, { number, lastUserId: id });
          return id;
        });
      } catch (error) {
        scope.assertCurrent();
        if (getErrorCode(error) !== `permission-denied`) throw error;
        // Rules can reject a contested create before the SDK retries its transaction.
        // Reuse this UID's committed mapping, or retry only after a proven counter advance.
        const committed = await getDocFromServer(mappingRef);
        scope.assertCurrent();
        if (committed.exists()) return mappedId(committed.data());
        if (allocatedFrom === null) throw error;
        let latest: unknown;
        try {
          latest = (await getDocFromServer(counterRef)).data()?.number;
        } catch (counterError) {
          scope.assertCurrent();
          const racedMapping = await getDocFromServer(mappingRef);
          scope.assertCurrent();
          if (racedMapping.exists()) return mappedId(racedMapping.data());
          throw counterError;
        }
        scope.assertCurrent();
        if (typeof latest !== `number` || !Number.isSafeInteger(latest) || latest <= allocatedFrom) throw error;
      }
    }
    throw new Error(`Account creation is busy. Please retry; an existing account will not be replaced.`);
  })();
  pendingAccounts.set(key, operation);
  void operation.finally(() => {
    if (pendingAccounts.get(key) === operation) pendingAccounts.delete(key);
  }).catch(() => undefined);
  return operation;
};

export const readPrivateAccount = async (database: Firestore, user: User, id: string): Promise<Account> => {
  const snapshot = await getDocFromServer(doc(database, `users`, id));
  if (!snapshot.exists()) throw new Error(`The linked private account is missing. Contact the site owner; a replacement was not created.`);
  return readAccount(snapshot.id, snapshot.data(), identityFromUser(user));
};
