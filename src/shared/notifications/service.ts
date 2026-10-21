import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { Account } from '../authentication/types';
import { getSupabaseClient } from '../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authFailure, getErrorCode } from '../supabase/errors';
import { canAccessOwner, canAccessAccount } from '../authentication/types';
import { authenticationService, requireCurrentAccount } from '../authentication/service';
import type { NotificationDraft, NotificationRecord, NotificationSnapshot, NotificationReadsSnapshot, NotificationState } from './types';
import { notificationColumns, notificationIdPattern, notificationFeedLimit, notificationManagerLimit, readNotification, normalizeNotificationDraft } from './values';

type PrivateScope = { account: Account; revision: number; client: SupabaseClient };
type FeedListener = (value: NotificationSnapshot) => void;
type ReadsListener = (value: NotificationReadsSnapshot) => void;
const refreshers = new Set<() => Promise<void>>();
const creationAttempts = new Map<string, string>();
let creationScope: string | null = null;
let subscriptionNumber = 0;

const failure = (error: unknown): { state: NotificationState; message: string } => {
  const code = getErrorCode(error);
  if (code === `app/connection-required`) return { state: `unavailable`, message: `Notifications Need Supabase Configuration` };
  if ([`PGRST202`, `PGRST205`, `42P01`, `42883`].includes(code)) return { state: `unavailable`, message: `The Notification Database Setup Is Not Available Yet` };
  if ([`42501`, `PGRST301`, `app/identity-changed`, `app/notification-denied`].includes(code)) return { state: `denied`, message: `This Notification Action Is Not Permitted For The Current Account` };
  if (code === `23505`) return { state: `error`, message: `This Notification Slug Is Already In Use` };
  if (code === `40001`) return { state: `error`, message: `The Notification Changed On Another Device. Reload Before Trying Again` };
  if ([`22023`, `23514`, `23502`].includes(code)) return { state: `error`, message: `Check The Notification Fields And Try Again` };
  return { state: `error`, message: error instanceof Error && !code ? error.message : authFailure(error).message };
};

const boundedRequest = async <T>(request: (signal: AbortSignal) => PromiseLike<T>): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try { return await request(controller.signal); }
  catch (error) {
    if (controller.signal.aborted) throw new Error(`The Notification Request Was Not Confirmed. Reload Before Trying Again`);
    throw error;
  } finally { clearTimeout(timeout); }
};

const requireScope = (expected?: Account, revision?: number, owner = false): PrivateScope => {
  const scope = requireCurrentAccount(expected, revision);
  if (owner && !canAccessOwner(scope.account)) throw Object.assign(new Error(`Only The Active Verified Owner Can Manage Notifications`), { code: `app/notification-denied` });
  return scope;
};

const emptyFeed = (): NotificationSnapshot => ({ state: `loading`, records: [], message: null, nextCursor: null, realtime: `connecting` });
const emptyReads = (): NotificationReadsSnapshot => ({ state: `loading`, readIds: [], message: null });
const refreshMounted = async (): Promise<void> => { await Promise.all([...refreshers].map((refresh) => refresh())); };

const subscribeRecords = (receive: FeedListener, manager: boolean, before: number | null = null): (() => void) => {
  let disposed = false;
  let generation = 0;
  let current = emptyFeed();
  let stopCurrent: (() => void) | null = null;
  let scopeKey: string | null = null;
  const emit = (value: NotificationSnapshot): void => { if (!disposed) { current = value; receive(value); } };
  const stop = (): void => { generation += 1; stopCurrent?.(); stopCurrent = null; scopeKey = null; };
  const start = (scope: PrivateScope | null): void => {
    stop();
    const activeGeneration = generation;
    const client = scope?.client ?? getSupabaseClient();
    scopeKey = scope ? `${scope.account.id}:${scope.revision}` : `public`;
    let dirty = false;
    let subscribed = false;
    let pending: Promise<void> | null = null;
    const isCurrent = (): boolean => {
      if (disposed || generation !== activeGeneration) return false;
      try { if (scope) requireScope(scope.account, scope.revision, true); return true; } catch { return false; }
    };
    const refresh = (): Promise<void> => {
      if (!isCurrent()) return Promise.resolve();
      dirty = true;
      if (pending) return pending.then(() => dirty && isCurrent() ? refresh() : undefined);
      const operation = (async () => {
        while (dirty && isCurrent()) {
          dirty = false;
          try {
            const limit = manager ? notificationManagerLimit : notificationFeedLimit;
            const { data, error } = await boundedRequest((signal) => {
              if (scope) return client.rpc(`get_owner_notifications`, { p_before: before, p_expected_auth_uid: scope.account.authUid }).abortSignal(signal);
              return client.from(`notifications`).select(notificationColumns).eq(`status`, `published`).order(`number`, { ascending: false }).limit(limit + 1).abortSignal(signal);
            });
            if (!isCurrent()) return;
            if (error) throw error;
            if (!Array.isArray(data)) throw new Error(`The Notification List Has An Unsupported Format`);
            const rows = data.map(readNotification);
            if (!manager && rows.some((row) => row.status !== `published`)) throw new Error(`The Public Notification Feed Returned An Unpublished Record`);
            if (dirty) continue;
            const records = rows.slice(0, limit);
            emit({ state: `ready`, records, realtime: subscribed ? `subscribed` : `unavailable`, nextCursor: rows.length > limit ? records.at(-1)?.number ?? null : null, message: subscribed ? null : `The Server Snapshot Is Available. Live Updates Are Connecting Or Unavailable` });
          } catch (error) {
            if (!isCurrent()) return;
            const result = failure(error);
            emit({ ...(result.state === `denied` ? emptyFeed() : current), ...result });
            dirty = false;
          }
        }
      })();
      pending = operation;
      void operation.finally(() => {
        if (pending !== operation) return;
        pending = null;
        if (dirty && isCurrent()) void refresh();
      });
      return operation;
    };
    const channel = client.channel(`notifications:${manager ? `owner` : `public`}:${++subscriptionNumber}`)
      .on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `notification_feed_state`, filter: `id=eq.public` }, () => { void refresh(); });
    const foreground = AppState.addEventListener(`change`, (state) => { if (state === `active`) void refresh(); });
    refreshers.add(refresh);
    stopCurrent = () => { refreshers.delete(refresh); foreground.remove(); void client.removeChannel(channel); };
    emit(emptyFeed());
    channel.subscribe((status) => {
      if (!isCurrent()) return;
      subscribed = status === `SUBSCRIBED`;
      emit({ ...current, realtime: subscribed ? `subscribed` : `unavailable`, message: subscribed ? current.message : `Live Notifications Are Unavailable. Reload To Check The Server` });
      void refresh();
    });
    void refresh();
  };
  emit(current);
  let unsubscribeAuth: (() => void) | null = null;
  if (manager) {
    unsubscribeAuth = authenticationService.subscribe((auth) => {
      if (disposed) return;
      if (auth.status === `loading`) { stop(); emit(emptyFeed()); return; }
      if (auth.status !== `signed-in` || !canAccessOwner(auth.account)) {
        stop();
        emit({ ...emptyFeed(), state: auth.status === `unavailable` ? `unavailable` : `denied`, realtime: `unavailable`, message: `Only The Active Verified Owner Can Manage Notifications` });
        return;
      }
      try {
        const scope = requireScope(auth.account ?? undefined, undefined, true);
        if (scopeKey !== `${scope.account.id}:${scope.revision}`) start(scope);
      } catch (error) { stop(); emit({ ...emptyFeed(), ...failure(error), realtime: `unavailable` }); }
    });
  } else {
    try { start(null); }
    catch (error) { emit({ ...emptyFeed(), ...failure(error), realtime: `unavailable` }); }
  }
  return () => { disposed = true; stop(); unsubscribeAuth?.(); };
};

const subscribeReads = (receive: ReadsListener): (() => void) => {
  let disposed = false;
  let generation = 0;
  let scopeKey: string | null = null;
  let current = emptyReads();
  let stopCurrent: (() => void) | null = null;
  const emit = (next: NotificationReadsSnapshot): void => { if (!disposed) { current = next; receive(next); } };
  const stop = (): void => { generation += 1; stopCurrent?.(); stopCurrent = null; scopeKey = null; };
  emit(current);
  const unsubscribeAuth = authenticationService.subscribe((auth) => {
    if (disposed) return;
    if (auth.status === `loading`) { stop(); emit(emptyReads()); return; }
    if (auth.status === `signed-out`) { stop(); emit({ state: `ready`, readIds: [], message: null }); return; }
    if (auth.status !== `signed-in` || !canAccessAccount(auth.account)) {
      stop(); emit({ ...emptyReads(), state: auth.status === `unavailable` ? `unavailable` : `denied`, message: `Private Notification Read State Is Unavailable` }); return;
    }
    try {
      const scope = requireScope(auth.account);
      const nextKey = `${scope.account.id}:${scope.revision}`;
      if (scopeKey === nextKey) return;
      stop();
      scopeKey = nextKey;
      const activeGeneration = generation;
      let dirty = false;
      let pending: Promise<void> | null = null;
      const isCurrent = (): boolean => {
        if (disposed || activeGeneration !== generation) return false;
        try { requireScope(scope.account, scope.revision); return true; } catch { return false; }
      };
      const refresh = (): Promise<void> => {
        if (!isCurrent()) return Promise.resolve();
        dirty = true;
        if (pending) return pending.then(() => dirty && isCurrent() ? refresh() : undefined);
        const operation = (async () => {
          while (dirty && isCurrent()) {
            dirty = false;
            try {
              const ids: string[] = [];
              let cursor: string | null = null;
              while (isCurrent()) {
                const pageLimit = Math.min(500, 10_001 - ids.length);
                const { data, error } = await boundedRequest((signal) => {
                  let query = scope.client.from(`notification_receipts`).select(`notification_id`).eq(`account_id`, scope.account.id).order(`notification_id`).limit(pageLimit);
                  if (cursor) query = query.gt(`notification_id`, cursor);
                  return query.abortSignal(signal);
                });
                if (!isCurrent()) return;
                if (error) throw error;
                if (!Array.isArray(data)) throw new Error(`The Notification Read State Has An Unsupported Format`);
                for (const item of data) {
                  if (typeof item?.notification_id !== `string` || !notificationIdPattern.test(item.notification_id)) throw new Error(`The Notification Read State Has An Unsupported Record`);
                  ids.push(item.notification_id);
                }
                if (ids.length > 10_000) throw new Error(`Notification Read History Exceeds This Client's 10,000-Record Limit. Read State Is Unavailable`);
                if (data.length < pageLimit) break;
                cursor = ids.at(-1) ?? null;
              }
              if (dirty) continue;
              emit({ state: `ready`, readIds: ids, message: null });
            } catch (error) {
              if (!isCurrent()) return;
              emit({ ...current, ...failure(error) });
              dirty = false;
            }
          }
        })();
        pending = operation;
        void operation.finally(() => {
          if (pending !== operation) return;
          pending = null;
          if (dirty && isCurrent()) void refresh();
        });
        return operation;
      };
      const channel = scope.client.channel(`notification-reads:${scope.account.authUid}:${++subscriptionNumber}`)
        .on(`postgres_changes`, { event: `INSERT`, schema: `public`, table: `notification_receipts`, filter: `account_id=eq.${scope.account.id}` }, () => { void refresh(); })
        .on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `notification_feed_state`, filter: `id=eq.public` }, () => { void refresh(); });
      const foreground = AppState.addEventListener(`change`, (state) => { if (state === `active`) void refresh(); });
      refreshers.add(refresh);
      stopCurrent = () => { refreshers.delete(refresh); foreground.remove(); void scope.client.removeChannel(channel); };
      emit(emptyReads());
      channel.subscribe((status) => {
        if (!isCurrent()) return;
        if (status !== `SUBSCRIBED`) emit({ ...current, message: `Live Read Updates Are Unavailable. Reload To Check The Server` });
        void refresh();
      });
      void refresh();
    } catch (error) { stop(); emit({ ...emptyReads(), ...failure(error) }); }
  });
  return () => { disposed = true; stop(); unsubscribeAuth(); };
};

const mutate = async <T>(operation: () => Promise<T>): Promise<T> => {
  try { return await operation(); }
  catch (error) { throw Object.assign(new Error(failure(error).message), { code: getErrorCode(error) }); }
};

const save = (input: NotificationDraft, existing?: NotificationRecord): Promise<NotificationRecord> => mutate(async () => {
  const draft = normalizeNotificationDraft(input);
  const scope = requireScope(undefined, undefined, true);
  const payload = { slug: draft.slug, body: draft.body, title: draft.title, suffix: draft.suffix, kind: draft.kind, status: draft.status, link_url: draft.linkUrl, link_label: draft.linkLabel };
  const nextCreationScope = `${scope.account.id}:${scope.revision}`;
  if (creationScope !== nextCreationScope) { creationAttempts.clear(); creationScope = nextCreationScope; }
  const attemptKey = JSON.stringify(payload);
  if (!existing && !creationAttempts.has(attemptKey) && creationAttempts.size >= 50) throw new Error(`Too Many Unconfirmed Notification Drafts. Reload Before Starting Another`);
  const requestId = existing ? null : creationAttempts.get(attemptKey) ?? randomUUID();
  if (requestId) creationAttempts.set(attemptKey, requestId);
  const { data, error } = await boundedRequest((signal) => scope.client.rpc(`save_notification`, {
    p_payload: payload,
    p_id: existing?.id ?? null,
    p_request_id: requestId,
    p_expected_auth_uid: scope.account.authUid,
    p_expected_updated_at: existing?.updatedAt ?? null,
  }).abortSignal(signal));
  requireScope(scope.account, scope.revision, true);
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error(`The Server Did Not Confirm The Saved Notification. Reload Before Retrying`);
  const record = readNotification(data[0]);
  creationAttempts.delete(attemptKey);
  await refreshMounted();
  requireScope(scope.account, scope.revision, true);
  return record;
});

export const notificationsService = {
  subscribeReads,
  save,
  subscribeFeed: (receive: FeedListener): (() => void) => subscribeRecords(receive, false),
  subscribeManager: (receive: FeedListener, options: { before?: number | null } = {}): (() => void) => {
    if (options.before !== undefined && options.before !== null && (!Number.isSafeInteger(options.before) || options.before < 1)) {
      receive({ ...emptyFeed(), state: `error`, realtime: `unavailable`, message: `Use A Valid Notification Page Cursor` });
      return () => undefined;
    }
    return subscribeRecords(receive, true, options.before ?? null);
  },
  markRead: (input: string[]): Promise<void> => mutate(async () => {
    const ids = [...new Set(input)];
    if (ids.length > notificationFeedLimit || ids.some((id) => !notificationIdPattern.test(id))) throw new Error(`Mark At Most 100 Supported Notifications At A Time`);
    const scope = requireScope();
    if (!ids.length) return;
    const { error } = await boundedRequest((signal) => scope.client.rpc(`mark_notifications_read`, { p_ids: ids, p_expected_auth_uid: scope.account.authUid }).abortSignal(signal));
    requireScope(scope.account, scope.revision);
    if (error) throw error;
    await refreshMounted();
    requireScope(scope.account, scope.revision);
  }),
  setStatus: (record: NotificationRecord, status: NotificationRecord[`status`]): Promise<NotificationRecord> => save({ ...record, status }, record),
  remove: (record: NotificationRecord): Promise<void> => mutate(async () => {
    const scope = requireScope(undefined, undefined, true);
    const { error } = await boundedRequest((signal) => scope.client.rpc(`remove_notification`, { p_id: record.id, p_expected_updated_at: record.updatedAt, p_expected_auth_uid: scope.account.authUid }).abortSignal(signal));
    requireScope(scope.account, scope.revision, true);
    if (error) throw error;
    await refreshMounted();
    requireScope(scope.account, scope.revision, true);
  }),
  getPublished: (slug: string): Promise<NotificationRecord | null> => mutate(async () => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
    const { data, error } = await boundedRequest((signal) => getSupabaseClient().from(`notifications`).select(notificationColumns).eq(`status`, `published`).eq(`slug`, slug).abortSignal(signal).maybeSingle());
    if (error) throw error;
    return data ? readNotification(data) : null;
  }),
};
