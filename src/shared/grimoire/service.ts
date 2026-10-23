import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { createRecordId } from '../common/ids';
import { getErrorCode } from '../supabase/errors';
import { requireCurrentAccount } from '../authentication/service';
import type { GrimoireData, GrimoireEntry, GrimoireCollection, GrimoireSnapshot } from './types';
import { isSpellId, isGrimoire, cloneData, emptyGrimoire, grimoireLimits, emptyGrimoireEntry, deviceGrimoireService } from './deviceService';

export { emptyGrimoire, grimoireLimits, emptyGrimoireEntry, grimoireStorageKey } from './deviceService';
type AccountScope = ReturnType<typeof requireCurrentAccount>;
type Attempt = { key: string; result: unknown; data: GrimoireData; expectedRevision: number };
const queues = new Map<string, Promise<unknown>>();
const attempts = new Map<string, Attempt>();
const confirmed = new Map<string, GrimoireSnapshot>();
const listeners = new Map<string, Set<(snapshot: GrimoireSnapshot) => void>>();
let subscriptionNumber = 0;
const scopeKey = (scope: AccountScope) => `${scope.account.id}:${scope.account.authUid}:${scope.revision}`;
const assertScope = (scope: AccountScope) => requireCurrentAccount(scope.account, scope.revision);
const cloneSnapshot = (snapshot: GrimoireSnapshot): GrimoireSnapshot => ({ ...snapshot, data: cloneData(snapshot.data) });
const messageFrom = (error: unknown) => {
  const code = getErrorCode(error);
  if ([`42P01`, `PGRST202`, `PGRST205`, `42883`].includes(code)) return `Account Grimoire Database Setup Is Not Available Yet`;
  if (code === `40001`) return `Your Grimoire Changed On Another Device. Reload And Review Before Saving`;
  if (code === `app/identity-changed`) return `Your Account Changed. Reopen Your Grimoire`;
  return error instanceof Error ? error.message : error && typeof error === `object` && `message` in error ? String(error.message) : `The Account Grimoire Request Was Not Confirmed. Reload Before Trying Again`;
};
const publish = (scope: AccountScope, value: GrimoireSnapshot): GrimoireSnapshot => {
  assertScope(scope);
  const key = scopeKey(scope);
  const previous = confirmed.get(key);
  if (previous && previous.revision > value.revision && !value.error) return cloneSnapshot(previous);
  confirmed.set(key, cloneSnapshot(value));
  listeners.get(key)?.forEach((listener) => listener(cloneSnapshot(value)));
  return cloneSnapshot(value);
};
const fail = (scope: AccountScope, error: unknown): GrimoireSnapshot => publish(scope, {
  data: emptyGrimoire(),
  revision: 0,
  updatedAt: null,
  persisted: false,
  source: `unavailable`,
  accountId: scope.account.id,
  ...confirmed.get(scopeKey(scope)),
  error: messageFrom(error),
});
const readResponse = (scope: AccountScope, value: unknown): GrimoireSnapshot => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Account Grimoire Response Is Unsupported`);
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 3 || !isGrimoire(row.data) || !Number.isSafeInteger(row.revision) || Number(row.revision) < 0 ||
    (row.updatedAt !== null && (typeof row.updatedAt !== `string` || !Number.isFinite(Date.parse(row.updatedAt)))) || (Number(row.revision) > 0 && row.updatedAt === null)) throw new Error(`The Account Grimoire Data Could Not Be Confirmed`);
  return { error: null, source: `cloud`, persisted: true, accountId: scope.account.id, revision: row.revision as number, updatedAt: row.updatedAt as string | null, data: cloneData(row.data) };
};
const request = async (scope: AccountScope, operation: `get_grimoire` | `save_grimoire`, input: Record<string, unknown> = {}): Promise<GrimoireSnapshot> => {
  assertScope(scope);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const { data, error } = await scope.client.rpc(operation, { ...input, p_expected_auth_uid: scope.account.authUid }).abortSignal(controller.signal);
    assertScope(scope);
    if (error) throw error;
    return readResponse(scope, data);
  } finally { clearTimeout(timeout); }
};
const refresh = async (scope: AccountScope): Promise<GrimoireSnapshot> => {
  try { return publish(scope, await request(scope, `get_grimoire`)); }
  catch (error) { return fail(scope, error); }
};
const queue = <T,>(scope: AccountScope, operation: () => Promise<T>): Promise<T> => {
  const key = scopeKey(scope);
  const next = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(() => { assertScope(scope); return operation(); });
  queues.set(key, next);
  void next.then(() => { if (queues.get(key) === next) queues.delete(key); }, () => { if (queues.get(key) === next) queues.delete(key); });
  return next;
};
const canonical = (data: GrimoireData) => JSON.stringify(data, (_key, value) => value && typeof value === `object` && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) : value);
const sameData = (left: GrimoireData, right: GrimoireData) => canonical(left) === canonical(right);
const update = <T,>(key: string, change: (data: GrimoireData, revision: number) => T): Promise<T> => {
  const scope = requireCurrentAccount();
  return queue(scope, async () => {
    const identity = scopeKey(scope);
    try {
      const pending = attempts.get(identity);
      const viewed = confirmed.get(identity);
      const previous = pending || !viewed?.persisted ? await request(scope, `get_grimoire`) : cloneSnapshot(viewed);
      if (pending && previous.revision > pending.expectedRevision && sameData(previous.data, pending.data)) {
        attempts.delete(identity);
        publish(scope, previous);
        if (pending.key === key) return pending.result as T;
        throw new Error(`Your Previous Change Is Confirmed. Review The Latest Grimoire Before Saving Another Change`);
      }
      if (pending && previous.revision !== pending.expectedRevision) {
        attempts.delete(identity);
        publish(scope, previous);
        throw new Error(`Your Grimoire Changed While A Save Was Unconfirmed. Review The Latest Data Before Saving`);
      }
      if (pending && pending.key !== key) throw new Error(`Retry The Unconfirmed Change Before Making Another Change`);
      const data = pending?.data ?? cloneData(previous.data);
      const result = pending ? pending.result as T : change(data, previous.revision);
      if (!isGrimoire(data)) throw new Error(`The Grimoire Change Is Unsupported`);
      const attempt = pending ?? { key, data, result, expectedRevision: previous.revision };
      attempts.set(identity, attempt);
      const saved = await request(scope, `save_grimoire`, { p_data: attempt.data, p_expected_revision: attempt.expectedRevision });
      if (!sameData(saved.data, attempt.data)) throw new Error(`The Saved Grimoire Did Not Match The Requested Change`);
      attempts.delete(identity);
      publish(scope, saved);
      return result;
    } catch (error) {
      if ([`40001`, `42501`, `22023`, `23514`].includes(getErrorCode(error))) attempts.delete(identity);
      if (getErrorCode(error) === `40001`) {
        try { publish(scope, await request(scope, `get_grimoire`)); } catch {}
      }
      fail(scope, error);
      throw new Error(messageFrom(error));
    }
  });
};
const subscribe = (listener: (snapshot: GrimoireSnapshot) => void): (() => void) => {
  const scope = requireCurrentAccount();
  const key = scopeKey(scope);
  let disposed = false;
  let dirty = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observers = listeners.get(key) ?? new Set<(snapshot: GrimoireSnapshot) => void>();
  listeners.set(key, observers);
  observers.add(listener);
  const load = async () => {
    dirty = true;
    if (pending || disposed) return;
    pending = true;
    try {
      while (dirty && !disposed) {
        dirty = false;
        try {
          const snapshot = await request(scope, `get_grimoire`);
          if (!disposed && !dirty) publish(scope, snapshot);
        } catch (error) {
          try { if (!disposed) fail(scope, error); } catch {}
        }
      }
    } finally { pending = false; }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void load(); }, 150); };
  const channel = scope.client.channel(`grimoire:${scope.account.id}:${++subscriptionNumber}`).on(`postgres_changes`, { event: `*`, schema: `public`, table: `account_grimoires`, filter: `account_id=eq.${scope.account.id}` }, schedule).subscribe((status) => { if (status === `SUBSCRIBED`) schedule(); });
  const foreground = AppState.addEventListener(`change`, (state) => { if (state === `active`) schedule(); });
  if (typeof window !== `undefined`) window.addEventListener(`focus`, schedule);
  const interval = setInterval(() => { if (typeof document === `undefined` || !document.hidden) schedule(); }, 60_000);
  void load();
  return () => {
    disposed = true;
    clearTimeout(timer);
    clearInterval(interval);
    foreground.remove();
    observers.delete(listener);
    if (!observers.size) { listeners.delete(key); confirmed.delete(key); attempts.delete(key); }
    if (typeof window !== `undefined`) window.removeEventListener(`focus`, schedule);
    void scope.client.removeChannel(channel);
  };
};

const collectionById = (data: GrimoireData, id: string): GrimoireCollection => {
  const collection = data.collections.find((item) => item.id === id);
  if (!collection) throw new Error(`This Collection Is No Longer Available. Refresh And Try Again`);
  return collection;
};
const collectionName = (value: string): string => {
  const name = value.trim();
  if (!name || name.length > grimoireLimits.name) throw new Error(`Use A Collection Name From 1 To ${grimoireLimits.name} Characters`);
  return name;
};
const assertSpellId = (id: string): void => { if (!isSpellId(id)) throw new Error(`This Spell Reference Is Invalid`); };
const entryById = (data: GrimoireData, id: string): GrimoireEntry => Object.hasOwn(data.entries, id) ? data.entries[id] : emptyGrimoireEntry();
const assertEntryCapacity = (data: GrimoireData, id: string): void => {
  if (!Object.hasOwn(data.entries, id) && Object.keys(data.entries).length >= grimoireLimits.entries) {
    throw new Error(`You Can Keep Notes And Progress For Up To ${grimoireLimits.entries.toLocaleString()} Spells`);
  }
};

export const grimoireService = {
  subscribe,
  getSnapshot: (): Promise<GrimoireSnapshot> => refresh(requireCurrentAccount()),
  importDevicePreview: async (): Promise<void> => {
    const scope = requireCurrentAccount();
    const legacy = await deviceGrimoireService.getSnapshot();
    assertScope(scope);
    if (legacy.error) throw new Error(legacy.error);
    if (!legacy.data.collections.length && !Object.keys(legacy.data.entries).length) throw new Error(`No Device Preview Data Was Found`);
    await update(`import-device-preview`, (data, revision) => {
      if (revision !== 0 || data.collections.length || Object.keys(data.entries).length) throw new Error(`Device Preview Import Requires An Empty New Account Grimoire`);
      Object.assign(data, cloneData(legacy.data));
    });
  },
  createCollection: (value: string): Promise<string> => update(JSON.stringify([`create`, value]), (data) => {
    const name = collectionName(value);
    if (data.collections.length >= grimoireLimits.collections) throw new Error(`You Can Create Up To ${grimoireLimits.collections} Collections`);
    if (data.nextCollectionNumber >= Number.MAX_SAFE_INTEGER) throw new Error(`Collection Number Limit Reached`);
    const number = data.nextCollectionNumber;
    const date = new Date().toISOString().replace(/[.:]/g, `-`);
    const id = createRecordId(`Collection`, number, name, date, randomUUID());
    data.nextCollectionNumber += 1;
    data.collections.push({ id, name, number, spellIds: [] });
    return id;
  }),
  renameCollection: (id: string, name: string): Promise<void> => update(JSON.stringify([`rename`, id, name]), (data) => { collectionById(data, id).name = collectionName(name); }),
  deleteCollection: (id: string): Promise<void> => update(JSON.stringify([`delete`, id]), (data) => {
    collectionById(data, id);
    data.collections = data.collections.filter((collection) => collection.id !== id);
  }),
  setCollectionSpell: (collectionId: string, spellId: string, included: boolean): Promise<void> => update(JSON.stringify([`membership`, collectionId, spellId, included]), (data) => {
    assertSpellId(spellId);
    const collection = collectionById(data, collectionId);
    const existing = collection.spellIds.includes(spellId);
    if (included && !existing && collection.spellIds.length >= grimoireLimits.spells) throw new Error(`A Collection Can Hold Up To ${grimoireLimits.spells} Spells`);
    if (included && !existing) collection.spellIds.push(spellId);
    if (!included) collection.spellIds = collection.spellIds.filter((id) => id !== spellId);
  }),
  saveNote: (spellId: string, note: string): Promise<void> => update(JSON.stringify([`note`, spellId, note]), (data) => {
    assertSpellId(spellId);
    if (note.length > grimoireLimits.note) throw new Error(`Notes Can Be Up To ${grimoireLimits.note.toLocaleString()} Characters`);
    const entry = entryById(data, spellId);
    if (!note && entry.reviews === 0) { delete data.entries[spellId]; return; }
    assertEntryCapacity(data, spellId);
    data.entries[spellId] = { ...entry, note };
  }),
  recordReview: (spellId: string, remembered: boolean): Promise<void> => update(JSON.stringify([`review`, spellId, remembered]), (data) => {
    assertSpellId(spellId);
    assertEntryCapacity(data, spellId);
    const entry = entryById(data, spellId);
    if (entry.reviews >= Number.MAX_SAFE_INTEGER) throw new Error(`Review Count Limit Reached`);
    data.entries[spellId] = {
      ...entry,
      reviews: entry.reviews + 1,
      correct: entry.correct + (remembered ? 1 : 0),
      streak: remembered ? entry.streak + 1 : 0,
      lastReviewedAt: new Date().toISOString(),
    };
  }),
  resetProgress: (spellIds: string[]): Promise<void> => update(JSON.stringify([`reset`, spellIds]), (data) => {
    spellIds.forEach(assertSpellId);
    [...new Set(spellIds)].forEach((id) => {
      const entry = Object.hasOwn(data.entries, id) ? data.entries[id] : undefined;
      if (entry?.note) data.entries[id] = { ...emptyGrimoireEntry(), note: entry.note };
      else delete data.entries[id];
    });
  }),
};
