import { useLocalStorage } from '../config';
import { withGuestNotificationLock } from './guestReadLock';
import { queueStorageOperation } from '../common/storage';
import { storageAdapter } from '../common/storageAdapter';

const key = `spelling-spells:notifications:guest:v1`;
const limit = 2000;
let sessionReadIds: string[] = [];

const readIds = (value: unknown): string[] => {
  const saved = value as { version?: unknown; readIds?: unknown } | null;
  if (saved?.version !== 1 || !Array.isArray(saved.readIds) || saved.readIds.length > limit || saved.readIds.some((id) => typeof id !== `string` || !id || id.length > 200) || new Set(saved.readIds).size !== saved.readIds.length) {
    throw new Error(`Guest read status has an unsupported saved format. The original data is preserved`);
  }
  return saved.readIds;
};

export const guestNotificationReadScope = useLocalStorage ? `device` : `session`;

const loadGuestReads = async (): Promise<string[]> => {
  if (!useLocalStorage) return [...sessionReadIds];
  const raw = await storageAdapter.getItem(key);
  if (raw === null) return [];
  try { return readIds(JSON.parse(raw)); }
  catch { throw new Error(`Guest read status could not be loaded. The original data is preserved; reload to retry`); }
};

export const loadGuestNotificationReads = (): Promise<string[]> => queueStorageOperation(key, () => withGuestNotificationLock(loadGuestReads));

export const markGuestNotificationsRead = (ids: string[]): Promise<string[]> => queueStorageOperation(key, () => withGuestNotificationLock(async () => {
  if (ids.some((id) => !id || id.length > 200) || ids.length > 100) throw new Error(`This read request is invalid`);
  const previous = await loadGuestReads();
  const merged = [...new Set([...previous.filter((id) => !ids.includes(id)), ...ids])].slice(-limit);
  if (useLocalStorage) await storageAdapter.setItem(key, JSON.stringify({ version: 1, readIds: merged }));
  else sessionReadIds = merged;
  return merged;
}));
