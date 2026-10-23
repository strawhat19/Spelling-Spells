import { randomUUID } from 'expo-crypto';
import { useLocalStorage } from '../config';
import { createRecordId } from '../common/ids';
import { lockGrimoireStorage } from './storageLock';
import { queueStorageOperation } from '../common/storage';
import { storageAdapter } from '../common/storageAdapter';
import type { GrimoireData, GrimoireEntry, GrimoireCollection, GrimoireSnapshot } from './types';

export const grimoireStorageKey = `spelling-spells:grimoire:v1`;
export const grimoireLimits = { name: 80, collections: 50, spells: 500, note: 4_000, entries: 2_000 };
const listeners = new Set<(snapshot: GrimoireSnapshot) => void>();
let sessionData: string | null = null;
let snapshot: GrimoireSnapshot | null = null;

export const emptyGrimoire = (): GrimoireData => ({ version: 1, collections: [], entries: {}, nextCollectionNumber: 1 });
export const emptyGrimoireEntry = (): GrimoireEntry => ({ note: ``, streak: 0, reviews: 0, correct: 0, lastReviewedAt: null });
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === `object` && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const hasFields = (value: Record<string, unknown>, fields: string[]): boolean => Object.keys(value).length === fields.length
  && fields.every((field) => Object.hasOwn(value, field));
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const isSpellId = (value: unknown): value is string => typeof value === `string` && value.length > 0 && value.length <= 250
  && /^[A-Za-z0-9_-]+$/.test(value) && ![`__proto__`, `constructor`, `prototype`].includes(value);
const isEntry = (value: unknown): value is GrimoireEntry => {
  if (!isObject(value) || !hasFields(value, [`note`, `streak`, `reviews`, `correct`, `lastReviewedAt`])) return false;
  if (typeof value.note !== `string` || value.note.length > grimoireLimits.note) return false;
  if (!isCount(value.reviews) || !isCount(value.correct) || !isCount(value.streak)) return false;
  if (value.correct > value.reviews || value.streak > value.correct) return false;
  if (value.reviews === 0) return value.lastReviewedAt === null;
  if (typeof value.lastReviewedAt !== `string`) return false;
  const date = new Date(value.lastReviewedAt);
  return Number.isFinite(date.getTime()) && date.toISOString() === value.lastReviewedAt;
};
const isCollection = (value: unknown): value is GrimoireCollection => isObject(value)
  && hasFields(value, [`id`, `name`, `number`, `spellIds`])
  && isCount(value.number) && value.number > 0
  && typeof value.id === `string` && value.id.length <= 350 && /^[A-Za-z0-9_-]+$/.test(value.id)
  && value.id.startsWith(`Collection_${value.number}_`)
  && typeof value.name === `string` && value.name.trim().length > 0 && value.name.length <= grimoireLimits.name
  && Array.isArray(value.spellIds) && value.spellIds.length <= grimoireLimits.spells && value.spellIds.every(isSpellId)
  && new Set(value.spellIds).size === value.spellIds.length;
const isGrimoire = (value: unknown): value is GrimoireData => {
  if (!isObject(value) || !hasFields(value, [`version`, `collections`, `entries`, `nextCollectionNumber`])) return false;
  if (value.version !== 1 || !isCount(value.nextCollectionNumber) || value.nextCollectionNumber < 1) return false;
  const nextCollectionNumber = value.nextCollectionNumber;
  if (!Array.isArray(value.collections) || value.collections.length > grimoireLimits.collections || !value.collections.every(isCollection)) return false;
  const ids = value.collections.map((collection) => collection.id);
  const numbers = value.collections.map((collection) => collection.number);
  if (new Set(ids).size !== ids.length || new Set(numbers).size !== numbers.length) return false;
  if (numbers.some((number) => number >= nextCollectionNumber)) return false;
  return isObject(value.entries) && Object.keys(value.entries).length <= grimoireLimits.entries
    && Object.entries(value.entries).every(([id, entry]) => isSpellId(id) && isEntry(entry));
};
const cloneData = (data: GrimoireData): GrimoireData => ({
  ...data,
  entries: Object.fromEntries(Object.entries(data.entries).map(([id, entry]) => [id, { ...entry }])),
  collections: data.collections.map((collection) => ({ ...collection, spellIds: [...collection.spellIds] })),
});
const cloneSnapshot = (value: GrimoireSnapshot): GrimoireSnapshot => ({ ...value, data: cloneData(value.data) });
const publish = (value: GrimoireSnapshot): GrimoireSnapshot => {
  snapshot = cloneSnapshot(value);
  listeners.forEach((listener) => listener(cloneSnapshot(value)));
  return cloneSnapshot(value);
};
const messageFrom = (failure: unknown): string => failure instanceof Error ? failure.message : `Grimoire Could Not Be Updated`;
const publishFailure = (failure: unknown): GrimoireSnapshot => publish({
  persisted: false,
  error: messageFrom(failure),
  data: snapshot?.data ?? emptyGrimoire(),
});
const readData = async (): Promise<GrimoireData> => {
  let raw: string | null;
  try { raw = useLocalStorage ? await storageAdapter.getItem(grimoireStorageKey) : sessionData; }
  catch { throw new Error(`Grimoire Could Not Be Loaded. Editing Is Blocked Until Storage Is Available`); }
  if (raw === null) return emptyGrimoire();
  try {
    const value: unknown = JSON.parse(raw);
    if (!isGrimoire(value)) throw new Error(`Unsupported Grimoire Format`);
    return cloneData(value);
  } catch { throw new Error(`Saved Grimoire Is Unreadable Or Unsupported. The Original Data Is Preserved; Editing Is Blocked`); }
};
const writeData = async (data: GrimoireData): Promise<void> => {
  if (!isGrimoire(data)) throw new Error(`Grimoire Data Is Invalid`);
  const serialized = JSON.stringify(data);
  if (!useLocalStorage) { sessionData = serialized; return; }
  try { await storageAdapter.setItem(grimoireStorageKey, serialized); }
  catch { throw new Error(`Grimoire Could Not Be Saved. Try Again When Storage Is Available`); }
};
const withStorage = <T,>(operation: () => Promise<T>): Promise<T> => queueStorageOperation(
  grimoireStorageKey,
  () => lockGrimoireStorage(grimoireStorageKey, operation),
);
const update = <T,>(change: (data: GrimoireData) => T): Promise<T> => withStorage(async () => {
  const data = await readData();
  const result = change(data);
  await writeData(data);
  publish({ data, error: null, persisted: useLocalStorage });
  return result;
}).catch((failure: unknown) => {
  publishFailure(failure);
  throw failure;
});
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
  subscribe: (listener: (value: GrimoireSnapshot) => void): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  getSnapshot: (): Promise<GrimoireSnapshot> => withStorage(async () => publish({ error: null, data: await readData(), persisted: useLocalStorage })).catch(publishFailure),
  createCollection: (value: string): Promise<string> => update((data) => {
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
  renameCollection: (id: string, name: string): Promise<void> => update((data) => { collectionById(data, id).name = collectionName(name); }),
  deleteCollection: (id: string): Promise<void> => update((data) => {
    collectionById(data, id);
    data.collections = data.collections.filter((collection) => collection.id !== id);
  }),
  setCollectionSpell: (collectionId: string, spellId: string, included: boolean): Promise<void> => update((data) => {
    assertSpellId(spellId);
    const collection = collectionById(data, collectionId);
    const existing = collection.spellIds.includes(spellId);
    if (included && !existing && collection.spellIds.length >= grimoireLimits.spells) throw new Error(`A Collection Can Hold Up To ${grimoireLimits.spells} Spells`);
    if (included && !existing) collection.spellIds.push(spellId);
    if (!included) collection.spellIds = collection.spellIds.filter((id) => id !== spellId);
  }),
  saveNote: (spellId: string, note: string): Promise<void> => update((data) => {
    assertSpellId(spellId);
    if (note.length > grimoireLimits.note) throw new Error(`Notes Can Be Up To ${grimoireLimits.note.toLocaleString()} Characters`);
    const entry = entryById(data, spellId);
    if (!note && entry.reviews === 0) { delete data.entries[spellId]; return; }
    assertEntryCapacity(data, spellId);
    data.entries[spellId] = { ...entry, note };
  }),
  recordReview: (spellId: string, remembered: boolean): Promise<void> => update((data) => {
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
  resetProgress: (spellIds: string[]): Promise<void> => update((data) => {
    spellIds.forEach(assertSpellId);
    [...new Set(spellIds)].forEach((id) => {
      const entry = Object.hasOwn(data.entries, id) ? data.entries[id] : undefined;
      if (entry?.note) data.entries[id] = { ...emptyGrimoireEntry(), note: entry.note };
      else delete data.entries[id];
    });
  }),
};
