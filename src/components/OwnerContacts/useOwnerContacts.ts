import { useRef, useState, useEffect } from 'react';
import { contactsAPI } from '../../api/contacts';
import { useAuth } from '../../shared/authContext';
import { canAccessOwner } from '../../shared/authentication/types';
import type { ContactRecord, ContactSnapshot } from '../../shared/contacts/types';

type Filter = `all` | ContactRecord[`status`];
type Controls = { scope: string; search: string; filter: Filter; expandedId: string };
const emptyControls = (scope: string): Controls => ({ scope, search: ``, filter: `all`, expandedId: `` });
export const contactStatuses = [`new`, `read`, `archived`] as const;
export const contactStatusLabel = (status: ContactRecord[`status`]) => status === `new` ? `New` : status === `read` ? `Read` : `Archived`;
export const formatContactDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(`en-US`, { day: `numeric`, year: `numeric`, month: `short`, hour: `numeric`, minute: `2-digit` }) : `—`;
};

export const useOwnerContacts = () => {
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
  const [feedback, setFeedback] = useState({ scope: identityScope, busy: false, error: ``, notice: `` });
  const [pagination, setPagination] = useState<{ scope: string; cursors: (number | null)[] }>({ scope: identityScope, cursors: [null] });
  const [state, setState] = useState<{ scope: string; snapshot: ContactSnapshot } | null>(null);
  const cursors = pagination.scope === identityScope ? pagination.cursors : [null];
  const before = cursors?.[cursors.length - 1] ?? null;
  const scope = `${identityScope}:${before ?? `latest`}:${revision}`;
  const current = controls.scope === identityScope ? controls : emptyControls(identityScope);
  const response = feedback.scope === identityScope ? feedback : { busy: false, error: ``, notice: `` };
  const snapshot = permitted && state?.scope === scope ? state.snapshot : null;
  const ready = snapshot?.state === `ready`;
  const loading = auth.loading || (permitted && (!snapshot || snapshot.state === `loading`));
  const records = ready ? snapshot.records ?? [] : [];
  const query = current.search.trim().toLocaleLowerCase();
  const matchingRecords = records.filter((record) => (current.filter === `all` || record.status === current.filter)
    && [record.number, record.name, record.email, record.subject, record.message, contactStatusLabel(record.status)].join(` `).toLocaleLowerCase().includes(query));

  useEffect(() => {
    currentScope.current = identityScope;
    return () => { if (currentScope.current === identityScope) currentScope.current = ``; };
  }, [identityScope]);
  useEffect(() => {
    if (!permitted) return;
    let active = true;
    try {
      const unsubscribe = contactsAPI.subscribeManager((next) => {
        if (active && currentScope.current === identityScope) setState({ scope, snapshot: next });
      }, { before });
      return () => { active = false; unsubscribe(); };
    } catch (failure) {
      setState({ scope, snapshot: { state: `error`, records: null, nextCursor: null, realtime: `unavailable`, message: failure instanceof Error ? failure.message : `Contacts Could Not Be Loaded` } });
    }
    return () => { active = false; };
  }, [scope, before, permitted, identityScope]);

  const setControl = <K extends keyof Controls>(field: K, value: Controls[K]) => {
    if (!permitted || currentScope.current !== identityScope) return;
    setControls((previous) => ({ ...(previous.scope === identityScope ? previous : emptyControls(identityScope)), [field]: value }));
  };
  const changeStatus = async (record: ContactRecord, status: ContactRecord[`status`]) => {
    if (!permitted || !ready || loading || record.status === status || currentScope.current !== identityScope || pending.current?.scope === identityScope) return;
    const request = { scope: identityScope };
    pending.current = request;
    setFeedback({ scope: identityScope, busy: true, error: ``, notice: `` });
    try {
      const saved = await contactsAPI.setStatus(record, status);
      if (currentScope.current !== identityScope) return;
      setState((previous) => previous?.scope === scope && previous.snapshot.state === `ready` ? { ...previous, snapshot: { ...previous.snapshot, records: previous.snapshot.records?.map((item) => item.id === saved.id ? saved : item) ?? [] } } : previous);
      setFeedback({ scope: identityScope, busy: false, error: ``, notice: `Contact Marked ${contactStatusLabel(saved.status)}` });
    } catch (failure) {
      if (currentScope.current === identityScope) setFeedback({ scope: identityScope, busy: false, notice: ``, error: failure instanceof Error ? failure.message : `Contact Status Could Not Be Saved` });
    } finally { if (pending.current === request) pending.current = null; }
  };
  const navigate = (nextCursors: (number | null)[]) => {
    if (!permitted || response.busy || loading || currentScope.current !== identityScope) return;
    setControls(emptyControls(identityScope));
    setFeedback({ scope: identityScope, busy: false, error: ``, notice: `` });
    setPagination({ scope: identityScope, cursors: nextCursors });
  };
  return {
    ready, records, loading, snapshot, permitted, changeStatus, matchingRecords,
    busy: loading || response.busy,
    notice: response.notice,
    mutating: response.busy,
    search: current.search,
    filter: current.filter,
    expandedId: current.expandedId,
    pageNumber: cursors.length,
    hasPrevious: cursors.length > 1,
    hasNext: ready && snapshot.nextCursor !== null,
    newCount: records.filter((record) => record.status === `new`).length,
    archivedCount: records.filter((record) => record.status === `archived`).length,
    error: response.error || (!loading && snapshot?.state !== `ready` ? snapshot?.message : null) || ``,
    setSearch: (value: string) => setControl(`search`, value),
    setFilter: (value: Filter) => setControl(`filter`, value),
    toggleDetails: (record: ContactRecord) => setControl(`expandedId`, current.expandedId === record.id ? `` : record.id),
    reload: () => { if (permitted && !response.busy && currentScope.current === identityScope) { setFeedback({ scope: identityScope, busy: false, error: ``, notice: `` }); setRevision((value) => value + 1); } },
    latest: () => { if (permitted && !response.busy && !loading && currentScope.current === identityScope) { navigate([null]); setRevision((value) => value + 1); } },
    previous: () => { if (cursors.length > 1) navigate(cursors.slice(0, -1)); },
    next: () => { if (ready && snapshot.nextCursor !== null) navigate([...cursors, snapshot.nextCursor]); },
  };
};

export type OwnerContactsPage = ReturnType<typeof useOwnerContacts>;
