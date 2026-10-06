import { storageAdapter } from './storageAdapter';
import { useLocalStorage } from '../config';

type StoredRead<T> = {
  value: T;
  error: string | null;
  persisted: boolean;
};

const sessionValues = new Map<string, string>();
const protectedKeys = new Map<string, string>();
const operationQueues = new Map<string, Promise<unknown>>();

export const storageName = useLocalStorage ? storageAdapter.name : `Session Memory`;

export const queueStorageOperation = <T,>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const previous = operationQueues.get(key) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  operationQueues.set(key, result);
  void result.finally(() => {
    if (operationQueues.get(key) === result) operationQueues.delete(key);
  }).catch(() => undefined);
  return result;
};

export const readStoredPreference = async <T,>(
  key: string,
  label: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): Promise<StoredRead<T>> => {
  let raw: string | null;
  try {
    raw = useLocalStorage
      ? await storageAdapter.getItem(key)
      : sessionValues.get(key) ?? null;
  } catch {
    const error = `${label} could not be loaded from ${storageAdapter.name}. Changes will stay in this session only.`;
    protectedKeys.set(key, error);
    return { value: fallback, error, persisted: false };
  }

  if (raw === null) {
    return { value: fallback, error: null, persisted: useLocalStorage };
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (!isValid(value)) throw new Error(`Unrecognized Storage Format`);
    return { value, error: null, persisted: useLocalStorage };
  } catch {
    const error = `${label} has an unreadable or unsupported saved format. The original data is preserved; changes will stay in this session only.`;
    protectedKeys.set(key, error);
    return { value: fallback, error, persisted: false };
  }
};

export const writeStoredPreference = async (
  key: string,
  label: string,
  value: unknown,
): Promise<void> => {
  const serialized = JSON.stringify(value);
  sessionValues.set(key, serialized);
  if (!useLocalStorage) return;

  const protectionError = protectedKeys.get(key);
  if (protectionError) throw new Error(protectionError);

  try {
    await storageAdapter.setItem(key, serialized);
  } catch {
    const error = `${label} could not be saved to ${storageAdapter.name}. Your changes are available in this session only.`;
    protectedKeys.set(key, error);
    throw new Error(error);
  }
};
