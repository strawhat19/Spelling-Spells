import { useAuth } from '../../shared/authContext';
import { useRef, useState, useEffect } from 'react';
import { notificationsAPI } from '../../api/notifications';
import { canAccessOwner } from '../../shared/authentication/types';
import { normalizeNotificationDraft } from '../../shared/notifications/values';
import type { NotificationDraft, NotificationRecord, NotificationSnapshot } from '../../shared/notifications/types';

type Filter = `all` | `draft` | `published`;
type Controls = { scope: string; search: string; filter: Filter; deletingId: string; editing: NotificationRecord | null; draft: NotificationDraft | null };
const emptyControls = (scope: string): Controls => ({ scope, search: ``, filter: `all`, deletingId: ``, editing: null, draft: null });
const createDraft = (record?: NotificationRecord): NotificationDraft => ({
  slug: record?.slug ?? ``,
  body: record?.body ?? ``,
  title: record?.title ?? ``,
  suffix: record?.suffix ?? null,
  kind: record?.kind ?? `announcement`,
  status: record?.status ?? `draft`,
  linkUrl: record?.linkUrl ?? null,
  linkLabel: record?.linkLabel ?? null,
});

export const formatNotificationDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(`en-US`, { day: `numeric`, year: `numeric`, month: `short` }) : `—`;
};
export const notificationStatusLabel = (status: NotificationRecord[`status`]) => status === `published` ? `Active` : `Inactive`;

export const useOwnerNotifications = () => {
  const auth = useAuth();
  const permitted = !auth.loading && auth.status === `signed-in` && canAccessOwner(auth.account);
  const identityKey = `${auth.status}:${auth.loading}:${auth.account?.id ?? `guest`}:${auth.account?.authUid ?? ``}:${auth.account?.role ?? ``}:${auth.account?.active ?? false}:${auth.account?.roleVerified ?? false}:${auth.account?.emailVerified ?? false}`;
  const identity = useRef({ key: identityKey, revision: 0 });
  if (identity.current.key !== identityKey) identity.current = { key: identityKey, revision: identity.current.revision + 1 };
  const identityScope = `${identityKey}:${identity.current.revision}`;
  const currentScope = useRef(identityScope);
  currentScope.current = identityScope;
  const pending = useRef<{ scope: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [controls, setControls] = useState(() => emptyControls(identityScope));
  const [pagination, setPagination] = useState<{ scope: string; cursors: (number | null)[] }>({ scope: identityScope, cursors: [null] });
  const [feedback, setFeedback] = useState({ scope: identityScope, busy: false, error: ``, notice: `` });
  const [state, setState] = useState<{ scope: string; snapshot: NotificationSnapshot } | null>(null);
  const cursors = pagination.scope === identityScope ? pagination.cursors : [null];
  const before = cursors?.[cursors.length - 1] ?? null;
  const scope = `${identityScope}:${before ?? `latest`}:${revision}`;
  const current = controls.scope === identityScope ? controls : emptyControls(identityScope);
  const response = feedback.scope === identityScope ? feedback : { busy: false, error: ``, notice: `` };
  const snapshot = permitted && state?.scope === scope ? state.snapshot : null;
  const ready = snapshot?.state === `ready`;
  const loading = auth.loading || (permitted && (!snapshot || snapshot.state === `loading`));
  const records = ready ? snapshot.records : [];
  const query = current.search.trim().toLocaleLowerCase();
  const matchingRecords = records.filter((record) => (current.filter === `all` || record.status === current.filter)
    && [record.number, record.title, record.slug, record.body, record.kind, record.suffix, record.linkUrl, record.linkLabel, notificationStatusLabel(record.status)].join(` `).toLocaleLowerCase().includes(query));

  useEffect(() => {
    currentScope.current = identityScope;
    return () => { if (currentScope.current === identityScope) currentScope.current = ``; };
  }, [identityScope]);
  useEffect(() => {
    if (!permitted) return;
    let active = true;
    try {
      const unsubscribe = notificationsAPI.subscribeManager((next) => {
        if (active && currentScope.current === identityScope) setState({ scope, snapshot: next });
      }, { before });
      return () => { active = false; unsubscribe(); };
    } catch (failure) {
      setState({ scope, snapshot: { state: `error`, records: [], nextCursor: null, realtime: `unavailable`, message: failure instanceof Error ? failure.message : `Notifications Could Not Be Loaded` } });
    }
    return () => { active = false; };
  }, [scope, before, permitted, identityScope]);

  const setControl = <K extends keyof Controls>(field: K, value: Controls[K]) => setControls((previous) => ({ ...(previous.scope === identityScope ? previous : emptyControls(identityScope)), [field]: value }));
  const clearFeedback = () => setFeedback({ scope: identityScope, busy: false, error: ``, notice: `` });
  const runMutation = async (operation: () => Promise<unknown>, notice: string) => {
    if (!permitted || currentScope.current !== identityScope || pending.current?.scope === identityScope) return false;
    const request = { scope: identityScope };
    pending.current = request;
    setFeedback({ scope: identityScope, busy: true, error: ``, notice: `` });
    try {
      await operation();
      if (currentScope.current !== identityScope) return false;
      setFeedback({ scope: identityScope, busy: false, error: ``, notice });
      return true;
    } catch (failure) {
      if (currentScope.current === identityScope) setFeedback({ scope: identityScope, busy: false, notice: ``, error: failure instanceof Error ? failure.message : `Notification Could Not Be Saved` });
      return false;
    } finally { if (pending.current === request) pending.current = null; }
  };
  const edit = (record?: NotificationRecord) => {
    if (!permitted || loading || response.busy) return;
    clearFeedback();
    setControls({ ...current, editing: record ?? null, draft: createDraft(record), deletingId: `` });
  };
  const closeEditor = () => {
    if (pending.current?.scope === identityScope) return;
    setControls((previous) => ({ ...(previous.scope === identityScope ? previous : emptyControls(identityScope)), draft: null, editing: null }));
  };
  const setDraftField = <K extends keyof NotificationDraft>(field: K, value: NotificationDraft[K]) => {
    if (pending.current?.scope === identityScope) return;
    setControls((previous) => previous.scope === identityScope && previous.draft ? { ...previous, draft: { ...previous.draft, [field]: value } } : previous);
  };
  const save = async () => {
    if (!current.draft || !permitted || pending.current?.scope === identityScope) return false;
    let draft: NotificationDraft;
    try { draft = normalizeNotificationDraft(current.draft); }
    catch (failure) {
      setFeedback({ scope: identityScope, busy: false, notice: ``, error: failure instanceof Error ? failure.message : `Enter Valid Notification Details` });
      return false;
    }
    const saved = await runMutation(() => notificationsAPI.save(draft, current.editing ?? undefined), `Notification Saved`);
    if (saved) {
      setControls((previous) => previous.scope === identityScope ? { ...previous, draft: null, editing: null } : previous);
      if (!current.editing) setPagination({ scope: identityScope, cursors: [null] });
      setRevision((value) => value + 1);
    }
    return saved;
  };
  const changeStatus = async (record: NotificationRecord) => {
    const status = record.status === `published` ? `draft` : `published`;
    const saved = await runMutation(() => notificationsAPI.setStatus(record, status), status === `published` ? `Notification Activated` : `Notification Deactivated`);
    if (saved) setRevision((value) => value + 1);
  };
  const remove = async (record: NotificationRecord) => {
    if (current.deletingId !== record.id) return;
    const saved = await runMutation(() => notificationsAPI.remove(record), `Notification Deleted`);
    if (saved) { setControl(`deletingId`, ``); setRevision((value) => value + 1); }
  };
  return {
    edit, save, remove, ready, loading, records, snapshot, permitted, closeEditor, changeStatus, setDraftField, matchingRecords,
    busy: loading || response.busy,
    notice: response.notice,
    mutating: response.busy,
    search: current.search,
    filter: current.filter,
    draft: current.draft,
    editing: current.editing,
    deletingId: current.deletingId,
    pageNumber: cursors.length,
    hasPrevious: cursors.length > 1,
    error: response.error || (!loading && snapshot?.state !== `ready` ? snapshot?.message : null) || ``,
    activeCount: records.filter((record) => record.status === `published`).length,
    hasNext: ready && snapshot.nextCursor !== null,
    setSearch: (value: string) => setControl(`search`, value),
    setFilter: (value: Filter) => setControl(`filter`, value),
    cancelDelete: () => { if (!response.busy) setControl(`deletingId`, ``); },
    requestDelete: (record: NotificationRecord) => { if (!response.busy) { clearFeedback(); setControl(`deletingId`, record.id); } },
    reload: () => { if (!response.busy) setRevision((value) => value + 1); },
    latest: () => { if (!response.busy) { setPagination({ scope: identityScope, cursors: [null] }); setRevision((value) => value + 1); } },
    previous: () => { if (cursors.length > 1 && !response.busy) setPagination({ scope: identityScope, cursors: cursors.slice(0, -1) }); },
    next: () => { if (ready && snapshot.nextCursor !== null && !response.busy) setPagination({ scope: identityScope, cursors: [...cursors, snapshot.nextCursor] }); },
  };
};

export type OwnerNotificationsPage = ReturnType<typeof useOwnerNotifications>;
