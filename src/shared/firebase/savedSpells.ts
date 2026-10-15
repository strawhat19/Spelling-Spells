import type { Account } from '../authentication/types';
import { seedSpells } from '../catalog/seed';
import { authFailure } from './errors';
import { authenticationService, requireCurrentAccount } from '../authentication/service';
import {
  doc,
  query,
  limit,
  orderBy,
  Timestamp,
  onSnapshot,
  collection,
  documentId,
  runTransaction,
  serverTimestamp,
  getDocsFromServer,
} from 'firebase/firestore';

export const SAVED_SPELL_LIMIT = 500;
export type SavedSpellsSnapshot = {
  limit: number;
  savedIds: string[];
  truncated: boolean;
  message: string | null;
  source: `server` | `cache` | null;
  status: `loading` | `live` | `cached` | `pending` | `error`;
};
export type SavedSpellsResult =
  | { ok: true }
  | { ok: false; code: `connection-required` | `denied` | `error`; message: string };

const eligibleIds = new Set(seedSpells.map((spell) => spell.id));
const emptySnapshot = (): SavedSpellsSnapshot => ({
  source: null,
  message: null,
  savedIds: [],
  truncated: false,
  status: `loading`,
  limit: SAVED_SPELL_LIMIT,
});

const validateId = (id: string): void => {
  if (!eligibleIds.has(id)) throw new Error(`Only a spell in the current published archive can be saved.`);
};

const scopedQuery = (expected: Account) => {
  const { account, runtime } = requireCurrentAccount(expected);
  return query(collection(runtime.database, `users`, account.id, `savedSpells`), orderBy(documentId()), limit(SAVED_SPELL_LIMIT + 1));
};

const attempt = async (operation: () => Promise<void>): Promise<SavedSpellsResult> => {
  try {
    await operation();
    return { ok: true };
  } catch (error) {
    const failure = authFailure(error);
    return { ...failure, code: failure.code === `connection-required` || failure.code === `denied` ? failure.code : `error` };
  }
};

export const savedSpellsService = {
  subscribe: (expected: Account, listener: (value: SavedSpellsSnapshot) => void): (() => void) => {
    let current = emptySnapshot();
    let disposed = false;
    let revision = 0;
    let scope: string | null = null;
    let unsubscribeDocuments: (() => void) | null = null;
    const emit = (next: SavedSpellsSnapshot): void => {
      if (disposed) return;
      current = next;
      listener(next);
    };
    const stopDocuments = (): void => {
      revision += 1;
      unsubscribeDocuments?.();
      unsubscribeDocuments = null;
      scope = null;
    };
    emit(current);
    const unsubscribeAuth = authenticationService.subscribe((auth) => {
      if (disposed) return;
      const account = auth.account;
      if (auth.status !== `signed-in` || !account?.active || !account.roleVerified || account.id !== expected.id || account.firebaseUid !== expected.firebaseUid) {
        stopDocuments();
        emit({ ...emptySnapshot(), status: `error`, message: `Private saved spells are unavailable until this account is confirmed.` });
        return;
      }
      const nextScope = `${account.firebaseUid}:${account.id}:${account.role}`;
      if (scope === nextScope && unsubscribeDocuments) return;
      stopDocuments();
      scope = nextScope;
      const currentRevision = revision;
      emit(emptySnapshot());
      try {
        unsubscribeDocuments = onSnapshot(scopedQuery(expected), { includeMetadataChanges: true }, (documents) => {
          if (disposed || currentRevision !== revision) return;
          if (documents.metadata.hasPendingWrites) {
            emit({ ...current, status: `pending`, source: `cache`, message: `Waiting for the server to confirm your saved spells.` });
            return;
          }
          try {
            const references = documents.docs.map((document) => {
              const value = document.data();
              validateId(document.id);
              if (Object.keys(value).length !== 2 || value.spellId !== document.id || !(value.savedAt instanceof Timestamp)) {
                throw new Error(`A saved spell reference has an unsupported format. No records were replaced.`);
              }
              return { id: document.id, savedAt: value.savedAt.toMillis() };
            });
            const savedIds = references.slice(0, SAVED_SPELL_LIMIT)
              .sort((first, second) => first.savedAt - second.savedAt || first.id.localeCompare(second.id))
              .map((entry) => entry.id);
            const fromCache = documents.metadata.fromCache;
            emit({
              limit: SAVED_SPELL_LIMIT,
              savedIds: savedIds.slice(0, SAVED_SPELL_LIMIT),
              truncated: references.length > SAVED_SPELL_LIMIT,
              status: fromCache ? `cached` : `live`,
              source: fromCache ? `cache` : `server`,
              message: fromCache ? `Showing cached saved spells while waiting for the server.` : references.length > SAVED_SPELL_LIMIT ? `Showing the first 500 saved spells. Bulk changes are unavailable for this partial collection.` : null,
            });
          } catch (error) {
            emit({ ...emptySnapshot(), status: `error`, message: authFailure(error).message });
          }
        }, (error) => {
          if (disposed || currentRevision !== revision) return;
          unsubscribeDocuments = null;
          emit({ ...emptySnapshot(), status: `error`, message: authFailure(error).message });
        });
      } catch (error) {
        emit({ ...emptySnapshot(), status: `error`, message: authFailure(error).message });
      }
    });
    return () => {
      disposed = true;
      stopDocuments();
      unsubscribeAuth();
    };
  },
  setSaved: (expected: Account, spellId: string, saved: boolean): Promise<SavedSpellsResult> => attempt(async () => {
    validateId(spellId);
    const { account, runtime, revision: sessionRevision } = requireCurrentAccount(expected);
    const guard = (): void => { requireCurrentAccount(expected, sessionRevision); };
    const reference = doc(runtime.database, `users`, account.id, `savedSpells`, spellId);
    await runTransaction(runtime.database, async (transaction) => {
      guard();
      const existing = await transaction.get(reference);
      guard();
      if (saved && !existing.exists()) transaction.set(reference, { spellId, savedAt: serverTimestamp() });
      if (!saved && existing.exists()) transaction.delete(reference);
    });
    guard();
  }),
  clearSaved: (expected: Account): Promise<SavedSpellsResult> => attempt(async () => {
    const { runtime, revision: sessionRevision } = requireCurrentAccount(expected);
    const guard = (): void => { requireCurrentAccount(expected, sessionRevision); };
    const documents = await getDocsFromServer(scopedQuery(expected));
    guard();
    if (documents.size > SAVED_SPELL_LIMIT) throw new Error(`This collection exceeds the visible window. Clear individual saved spells instead.`);
    if (documents.empty) return;
    documents.docs.forEach((entry) => {
      validateId(entry.id);
      const value = entry.data();
      if (Object.keys(value).length !== 2 || value.spellId !== entry.id || !(value.savedAt instanceof Timestamp)) {
        throw new Error(`A saved reference has an unsupported format. No records were removed.`);
      }
    });
    await runTransaction(runtime.database, async (transaction) => {
      guard();
      const current = await Promise.all(documents.docs.map((entry) => transaction.get(entry.ref)));
      guard();
      current.forEach((entry, index) => {
        const original = documents.docs[index].data().savedAt;
        const latest: unknown = entry.data()?.savedAt;
        if (entry.exists() && (!(original instanceof Timestamp) || !(latest instanceof Timestamp) || !latest.isEqual(original))) {
          throw new Error(`Your saved spells changed on another device. Refresh before clearing them.`);
        }
      });
      current.forEach((entry) => { if (entry.exists()) transaction.delete(entry.ref); });
    });
    guard();
  }),
  importSaved: (expected: Account, ids: readonly string[]): Promise<SavedSpellsResult> => attempt(async () => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > SAVED_SPELL_LIMIT) throw new Error(`Import at most 500 saved spell references at a time.`);
    uniqueIds.forEach(validateId);
    const { account, runtime, revision: sessionRevision } = requireCurrentAccount(expected);
    const guard = (): void => { requireCurrentAccount(expected, sessionRevision); };
    const documents = await getDocsFromServer(scopedQuery(expected));
    guard();
    if (documents.size > SAVED_SPELL_LIMIT) throw new Error(`This collection exceeds the visible window. Bulk import is unavailable.`);
    const existingIds = new Set(documents.docs.map((entry) => entry.id));
    const additions = uniqueIds.filter((id) => !existingIds.has(id));
    if (existingIds.size + additions.length > SAVED_SPELL_LIMIT) throw new Error(`The combined collection exceeds the supported 500-reference window.`);
    if (!additions.length) return;
    await runTransaction(runtime.database, async (transaction) => {
      guard();
      const references = additions.map((id) => doc(runtime.database, `users`, account.id, `savedSpells`, id));
      const current = await Promise.all(references.map((reference) => transaction.get(reference)));
      guard();
      current.forEach((entry, index) => {
        if (!entry.exists()) transaction.set(entry.ref, { spellId: additions[index], savedAt: serverTimestamp() });
      });
    });
    guard();
  }),
};
