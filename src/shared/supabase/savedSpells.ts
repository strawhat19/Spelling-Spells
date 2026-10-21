import { AppState } from 'react-native';
import { authFailure, getErrorCode } from './errors';
import type { Account } from '../authentication/types';
import { authenticationService, requireCurrentAccount } from '../authentication/service';

export const SAVED_SPELL_LIMIT = 500;
export type SavedSpellsSnapshot = {
  limit: number;
  version: number | null;
  savedIds: string[];
  truncated: boolean;
  message: string | null;
  source: `server` | `cache` | null;
  status: `loading` | `live` | `server` | `cached` | `pending` | `error`;
};
export type SavedSpellsResult =
  | { ok: true }
  | { ok: false; code: `connection-required` | `denied` | `error`; message: string };

type SavedReference = { spellId: string; savedAt: number; revision: number };
type RefreshCollection = () => Promise<void>;
type CollectionObserver = { refresh: RefreshCollection; invalidate: (message: string) => void };
type ClearCheckpoint = { account: string; sessionRevision: number; references: readonly SavedReference[] };

const collections = new Map<string, Set<CollectionObserver>>();
const clearCheckpoints = new WeakMap<SavedSpellsSnapshot, ClearCheckpoint>();
let snapshotNumber = 0;
let collectionNumber = 0;
const accountKey = (account: Account): string => `${account.authUid}:${account.id}`;
const emptySnapshot = (): SavedSpellsSnapshot => ({
  source: null,
  version: null,
  message: null,
  savedIds: [],
  truncated: false,
  status: `loading`,
  limit: SAVED_SPELL_LIMIT,
});

const validateId = (id: string): void => {
  if (!id || id.length > 250 || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`The Saved Spell Reference Is Invalid`);
};

const withRequestTimeout = async <T>(operation: (signal: AbortSignal) => PromiseLike<T>, mutation = false): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const timeoutFailure = (): Error => new Error(mutation
    ? `The server did not confirm this change. Reconnect your collection before retrying.`
    : `The saved collection could not be reached. Reconnect before using this account view.`);
  try {
    const result = await operation(controller.signal);
    if (controller.signal.aborted) throw timeoutFailure();
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw timeoutFailure();
    throw error;
  } finally { clearTimeout(timeout); }
};

const readReferences = async (expected: Account, sessionRevision: number): Promise<SavedReference[]> => {
  const { client, account } = requireCurrentAccount(expected, sessionRevision);
  const { data, error } = await withRequestTimeout((signal) => client.from(`saved_spells`)
    .select(`account_id,spell_id,is_saved,saved_at,updated_at,revision`)
    .eq(`account_id`, account.id)
    .eq(`is_saved`, true)
    .order(`spell_id`)
    .limit(SAVED_SPELL_LIMIT + 1)
    .abortSignal(signal));
  requireCurrentAccount(expected, sessionRevision);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error(`The account collection returned an unsupported response. No records were replaced.`);
  const uniqueIds = new Set<string>();
  return data.map((value: unknown) => {
    if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`A saved spell reference has an unsupported format. No records were replaced.`);
    const row = value as Record<string, unknown>;
    if (row.account_id !== account.id || row.is_saved !== true || typeof row.spell_id !== `string` ||
      typeof row.saved_at !== `string` || !Number.isFinite(Date.parse(row.saved_at)) ||
      typeof row.updated_at !== `string` || !Number.isFinite(Date.parse(row.updated_at)) ||
      typeof row.revision !== `number` || !Number.isSafeInteger(row.revision) || row.revision < 1 || uniqueIds.has(row.spell_id)) {
      throw new Error(`A saved spell reference has an unsupported format. No records were replaced.`);
    }
    validateId(row.spell_id);
    uniqueIds.add(row.spell_id);
    return { spellId: row.spell_id, savedAt: Date.parse(row.saved_at), revision: row.revision };
  });
};

const refreshAccount = async (account: Account): Promise<void> => {
  await Promise.all([...(collections.get(accountKey(account)) ?? [])].map((observer) => observer.refresh()));
};

const writeWithConfirmation = async (
  expected: Account,
  sessionRevision: number,
  operation: (signal: AbortSignal) => PromiseLike<{ error: unknown | null }>,
): Promise<void> => {
  requireCurrentAccount(expected, sessionRevision);
  try {
    const { error } = await withRequestTimeout(operation, true);
    requireCurrentAccount(expected, sessionRevision);
    if (error) throw error;
  } catch (error) {
    try {
      requireCurrentAccount(expected, sessionRevision);
      collections.get(accountKey(expected))?.forEach((observer) => observer.invalidate(`The last change was not confirmed. Checking the server before enabling more changes.`));
      void refreshAccount(expected);
    } catch { /* A changed account must not receive the previous account's failure or refresh. */ }
    if (error && typeof error === `object` && `message` in error && typeof error.message === `string` &&
      /abort|timed?\s*out|timeout/i.test(error.message)) {
      throw new Error(`The server did not confirm this change. Reconnect your collection before retrying.`);
    }
    throw error;
  }
  await refreshAccount(expected);
  requireCurrentAccount(expected, sessionRevision);
};

const attempt = async (operation: () => Promise<void>): Promise<SavedSpellsResult> => {
  try {
    await operation();
    return { ok: true };
  } catch (error) {
    if (getErrorCode(error) === `40001`) return { ok: false, code: `error`, message: `Your saved spells changed on another device. Reconnect and review the collection before clearing it.` };
    if (getErrorCode(error) === `22023`) return { ok: false, code: `error`, message: `Saved changes support current archive spells and at most 500 account bookmarks. Reconnect the shelf and review your selection.` };
    const failure = authFailure(error);
    return { ...failure, code: failure.code === `connection-required` || failure.code === `denied` ? failure.code : `error` };
  }
};

export const savedSpellsService = {
  subscribe: (expected: Account, listener: (value: SavedSpellsSnapshot) => void): (() => void) => {
    let disposed = false;
    let generation = 0;
    let scope: string | null = null;
    let current = emptySnapshot();
    let stopCollection: (() => void) | null = null;
    const emit = (next: SavedSpellsSnapshot): void => {
      if (disposed) return;
      current = next;
      listener(next);
    };
    const stop = (): void => {
      generation += 1;
      stopCollection?.();
      stopCollection = null;
      scope = null;
    };
    emit(current);
    const unsubscribeAuth = authenticationService.subscribe((auth) => {
      if (disposed) return;
      const account = auth.account;
      if (auth.status !== `signed-in` || !account?.active || !account.roleVerified ||
        account.id !== expected.id || account.authUid !== expected.authUid) {
        stop();
        emit({ ...emptySnapshot(), status: `error`, message: `Private saved spells are unavailable until this account is confirmed.` });
        return;
      }
      try {
        const { client, revision: sessionRevision } = requireCurrentAccount(expected);
        const nextScope = `${accountKey(account)}:${sessionRevision}`;
        if (scope === nextScope && stopCollection) return;
        stop();
        scope = nextScope;
        const activeGeneration = generation;
        let subscribed = false;
        let signature: string | null = null;
        let version: number | null = null;
        let connectionRevision = 0;
        let dirty = false;
        let inFlight: Promise<void> | null = null;
        const isCurrent = (): boolean => {
          if (disposed || activeGeneration !== generation) return false;
          try { requireCurrentAccount(expected, sessionRevision); return true; } catch { return false; }
        };
        const refresh = (): Promise<void> => {
          if (!isCurrent()) return Promise.resolve();
          dirty = true;
          if (inFlight) return inFlight.then(() => dirty && isCurrent() ? refresh() : undefined);
          const operation = (async (): Promise<void> => {
            while (dirty && isCurrent()) {
              dirty = false;
              const startedConnection = connectionRevision;
              try {
                const references = await readReferences(expected, sessionRevision);
                if (!isCurrent()) return;
                // A change received during the read requires another complete server read.
                if (dirty) continue;
                const live = subscribed && startedConnection === connectionRevision;
                const truncated = references.length > SAVED_SPELL_LIMIT;
                const savedIds = references.slice(0, SAVED_SPELL_LIMIT)
                  .sort((first, second) => first.savedAt - second.savedAt || first.spellId.localeCompare(second.spellId))
                  .map((entry) => entry.spellId);
                const nextSignature = JSON.stringify(references.map((entry) => [entry.spellId, entry.revision]));
                if (signature !== nextSignature) {
                  signature = nextSignature;
                  version = ++snapshotNumber;
                }
                const confirmed: SavedSpellsSnapshot = {
                  version,
                  savedIds,
                  truncated,
                  source: `server`,
                  status: live ? `live` : `server`,
                  limit: SAVED_SPELL_LIMIT,
                  message: truncated ? `Showing the first 500 saved spells. Bulk changes are unavailable for this partial collection.`
                    : live ? null : `The server confirmed this snapshot. Live updates are connecting; reconnect to try again.`,
                };
                clearCheckpoints.set(confirmed, { account: accountKey(account), sessionRevision, references });
                emit(confirmed);
              } catch (error) {
                if (!isCurrent()) return;
                emit({
                  ...current,
                  source: current.source ? `cache` : null,
                  status: current.source ? `cached` : `error`,
                  message: authFailure(error).message,
                });
                // A failed read cannot become a confirmed empty account collection.
                dirty = false;
              }
            }
          })();
          inFlight = operation;
          void operation.finally(() => {
            if (inFlight !== operation) return;
            inFlight = null;
            if (dirty && isCurrent()) void refresh();
          });
          return operation;
        };
        const changed = (): void => {
          if (!isCurrent()) return;
          emit({ ...current, status: `pending`, message: `Refreshing your saved spells from the server.` });
          void refresh();
        };
        // Removed bookmarks remain rows, so private sync never subscribes to unfilterable DELETE events.
        const filter = `account_id=eq.${account.id}`;
        const channel = client.channel(`saved-spells:${account.authUid}:${++collectionNumber}`)
          .on(`postgres_changes`, { event: `INSERT`, schema: `public`, table: `saved_spells`, filter }, changed)
          .on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `saved_spells`, filter }, changed);
        const key = accountKey(account);
        const observers = collections.get(key) ?? new Set<CollectionObserver>();
        const observer: CollectionObserver = {
          refresh,
          invalidate: (message) => {
            if (!isCurrent()) return;
            emit({ ...current, message, source: current.source ? `cache` : null, status: current.source ? `cached` : `error` });
          },
        };
        observers.add(observer);
        collections.set(key, observers);
        const foreground = AppState.addEventListener(`change`, (state) => { if (state === `active`) void refresh(); });
        stopCollection = () => {
          observers.delete(observer);
          if (!observers.size) collections.delete(key);
          foreground.remove();
          void client.removeChannel(channel);
        };
        emit(emptySnapshot());
        channel.subscribe((status) => {
          if (!isCurrent()) return;
          connectionRevision += 1;
          subscribed = status === `SUBSCRIBED`;
          if (!subscribed && current.source) {
            emit({ ...current, source: `cache`, status: `cached`, message: `Live updates disconnected. Reconnecting and checking the server.` });
          }
          // Subscribe/reconnect can miss earlier events; a fresh read always closes that gap.
          void refresh();
        });
        void refresh();
      } catch (error) {
        stop();
        emit({ ...emptySnapshot(), status: `error`, message: authFailure(error).message });
      }
    });
    return () => {
      disposed = true;
      stop();
      unsubscribeAuth();
    };
  },
  setSaved: (expected: Account, spellId: string, saved: boolean): Promise<SavedSpellsResult> => attempt(async () => {
    validateId(spellId);
    const { client, account, revision } = requireCurrentAccount(expected);
    await writeWithConfirmation(expected, revision, (signal) => client.rpc(`set_saved_spell`, {
      p_is_saved: saved,
      p_spell_id: spellId,
      p_expected_auth_uid: account.authUid,
    }).abortSignal(signal));
  }),
  clearSaved: (expected: Account, reviewed: SavedSpellsSnapshot): Promise<SavedSpellsResult> => attempt(async () => {
    const { client, account, revision } = requireCurrentAccount(expected);
    const checkpoint = clearCheckpoints.get(reviewed);
    if (!checkpoint || checkpoint.account !== accountKey(account) || checkpoint.sessionRevision !== revision ||
      reviewed.source !== `server` || (reviewed.status !== `live` && reviewed.status !== `server`) || reviewed.truncated) {
      throw new Error(`Review a complete server-confirmed shelf before clearing it.`);
    }
    // Clear only the reviewed snapshot; a fresh read here could include unseen remote saves.
    const references = checkpoint.references;
    if (references.length > SAVED_SPELL_LIMIT) throw new Error(`This collection exceeds the visible window. Clear individual saved spells instead.`);
    if (!references.length) return;
    requireCurrentAccount(expected, revision);
    await writeWithConfirmation(expected, revision, (signal) => client.rpc(`clear_saved_spells`, {
      p_expected_auth_uid: account.authUid,
      p_expected: references.map((entry) => ({ spell_id: entry.spellId, revision: entry.revision })),
    }).abortSignal(signal));
  }),
  importSaved: (expected: Account, ids: readonly string[]): Promise<SavedSpellsResult> => attempt(async () => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > SAVED_SPELL_LIMIT) throw new Error(`Import at most 500 saved spell references at a time.`);
    uniqueIds.forEach(validateId);
    const { client, account, revision } = requireCurrentAccount(expected);
    if (!uniqueIds.length) return;
    await writeWithConfirmation(expected, revision, (signal) => client.rpc(`import_saved_spells`, {
      p_spell_ids: uniqueIds,
      p_expected_auth_uid: account.authUid,
    }).abortSignal(signal));
  }),
};
