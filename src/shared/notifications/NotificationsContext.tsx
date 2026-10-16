import { useAuth } from '../authContext';
import { notificationsAPI } from '../../api/notifications';
import { canAccessAccount } from '../authentication/types';
import { subscribeGuestNotificationReads } from './guestReadEvents';
import type { NotificationRecord, NotificationSnapshot, NotificationReadsSnapshot } from './types';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { guestNotificationReadScope, loadGuestNotificationReads, markGuestNotificationsRead } from './guestReads';

type NotificationsValue = {
  busy: boolean;
  reload: () => void;
  readIds: string[];
  message: string | null;
  readError: string | null;
  actionError: string | null;
  unreadCount: number | null;
  records: NotificationRecord[];
  readScope: `account` | `device` | `session`;
  state: NotificationSnapshot[`state`];
  realtime: NotificationSnapshot[`realtime`];
  readState: NotificationReadsSnapshot[`state`];
  markAllRead: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);
const waitingFeed: NotificationSnapshot = { records: [], nextCursor: null, state: `loading`, message: null, realtime: `connecting` };
const waitingReads: NotificationReadsSnapshot = { readIds: [], state: `loading`, message: null };

export const NotificationsProvider = ({ children }: PropsWithChildren) => {
  const auth = useAuth();
  const [reloadNumber, setReloadNumber] = useState(0);
  const accountReady = auth.status === `signed-in` && canAccessAccount(auth.account);
  const guestReady = !auth.identity && (auth.status === `signed-out` || auth.status === `unavailable`);
  const identityScope = `${auth.status}:${auth.account?.id ?? `guest`}:${auth.account?.authUid ?? ``}:${auth.account?.role ?? ``}:${auth.account?.active ?? false}:${auth.account?.roleVerified ?? false}:${auth.account?.emailVerified ?? false}`;
  const lifecycle = useRef({ key: identityScope, epoch: 0 });
  if (lifecycle.current.key !== identityScope) lifecycle.current = { key: identityScope, epoch: lifecycle.current.epoch + 1 };
  const scope = `${identityScope}:${lifecycle.current.epoch}:${reloadNumber}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const mutationScope = useRef<string | null>(null);
  const [feedState, setFeedState] = useState<{ scope: string; value: NotificationSnapshot } | null>(null);
  const [receiptState, setReceiptState] = useState<{ scope: string; value: NotificationReadsSnapshot } | null>(null);
  const [actionState, setActionState] = useState<{ scope: string; busy: boolean; error: string | null } | null>(null);

  useEffect(() => {
    currentScope.current = scope;
    return () => { if (currentScope.current === scope) currentScope.current = `disposed`; };
  }, [scope]);

  useEffect(() => {
    let active = true;
    const unsubscribe = notificationsAPI.subscribeFeed((value) => { if (active) setFeedState({ scope, value }); });
    return () => { active = false; unsubscribe(); };
  }, [scope]);

  useEffect(() => {
    let active = true;
    if (accountReady) {
      const unsubscribe = notificationsAPI.subscribeReads((value) => { if (active) setReceiptState({ scope, value }); });
      return () => { active = false; unsubscribe(); };
    }
    if (guestReady) {
      let generation = 0;
      const refresh = () => {
        const current = ++generation;
        void loadGuestNotificationReads().then((readIds) => {
          if (active && generation === current) setReceiptState({ scope, value: { readIds, state: `ready`, message: null } });
        }).catch(() => {
          if (active && generation === current) setReceiptState((previous) => ({ scope, value: { readIds: previous?.scope === scope ? previous.value.readIds : [], state: `error`, message: `Guest read status could not be loaded. Saved data is preserved; reload to retry` } }));
        });
      };
      refresh();
      const unsubscribe = subscribeGuestNotificationReads(refresh);
      return () => { active = false; unsubscribe(); };
    } else if (auth.status !== `loading`) {
      setReceiptState({ scope, value: { readIds: [], state: `denied`, message: `Account read status is unavailable. Refresh your account before marking notifications read` } });
    }
    return () => { active = false; };
  }, [scope, accountReady, guestReady, auth.status]);

  const feed = feedState?.scope === scope ? feedState.value : waitingFeed;
  const reads = receiptState?.scope === scope ? receiptState.value : waitingReads;
  const actions = actionState?.scope === scope ? actionState : null;
  const readScope = auth.identity ? `account` : guestNotificationReadScope;
  const markRead = async (requestedIds: string[]) => {
    if (currentScope.current !== scope || mutationScope.current === scope) return;
    if (reads.state !== `ready`) {
      setActionState({ scope, busy: false, error: `Wait for read status to load, or reload to retry` });
      return;
    }
    const ids = [...new Set(requestedIds)].filter((id) => !reads.readIds.includes(id));
    if (!ids.length) return;
    mutationScope.current = scope;
    setActionState({ scope, busy: true, error: null });
    try {
      let readIds: string[] | null = null;
      if (accountReady) {
        await notificationsAPI.markRead(ids);
      } else if (guestReady) readIds = await markGuestNotificationsRead(ids);
      else throw new Error(`Account read status is unavailable`);
      if (currentScope.current !== scope) return;
      if (readIds) setReceiptState({ scope, value: { readIds, state: `ready`, message: null } });
      setActionState({ scope, busy: false, error: null });
    } catch {
      if (currentScope.current === scope) setActionState({ scope, busy: false, error: `Read status could not be saved. Reload before retrying` });
    } finally {
      if (mutationScope.current === scope) mutationScope.current = null;
    }
  };

  return <NotificationsContext.Provider value={{
    ...feed,
    readScope,
    readIds: reads.readIds,
    readState: reads.state,
    readError: reads.message,
    busy: actions?.busy ?? false,
    actionError: actions?.error ?? null,
    markRead,
    reload: () => setReloadNumber((current) => current + 1),
    markAllRead: () => feed.state === `ready` ? markRead(feed.records.map((record) => record.id)) : Promise.resolve(),
    unreadCount: feed.state === `ready` && reads.state === `ready` ? feed.records.filter((record) => !reads.readIds.includes(record.id)).length : null,
  }}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error(`NotificationsProvider Is Required`);
  return context;
};
