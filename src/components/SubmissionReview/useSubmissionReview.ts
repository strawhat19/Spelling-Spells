import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../shared/authContext';
import { catalogService } from '../../shared/catalog/service';
import type { CatalogSpell } from '../../shared/catalog/types';
import { submissionService } from '../../shared/submissions/service';
import { canAccessOwner, canAccessAccount } from '../../shared/authentication/types';
import type { SubmissionRecord, SubmissionStatus, SubmissionPageResult } from '../../shared/submissions/types';

export const submissionStatusLabel = (status: SubmissionStatus) => ({ review: `In Review`, approved: `Approved`, rejected: `Rejected`, 'changes-requested': `Changes Requested` })[status];
export const useSubmissionReview = (review = false) => {
  const { account, loading: authLoading } = useAuth();
  const permitted = !authLoading && (review ? canAccessOwner(account) : canAccessAccount(account));
  const scope = `${account?.id ?? `guest`}:${account?.role}:${account?.active}:${account?.roleVerified}:${account?.emailVerified}:${review}`;
  const current = useRef(scope);
  current.current = scope;
  const pending = useRef(false);
  const [revision, setRevision] = useState(0);
  const [cursors, setCursors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<CatalogSpell[]>([]);
  const [state, setState] = useState<{ scope: string; result: SubmissionPageResult } | null>(null);
  const [selectedId, setSelectedId] = useState(``);
  const [note, setNote] = useState(``);
  const [entryId, setEntryId] = useState(``);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ error: ``, notice: `` });
  const cursor = cursors.at(-1);
  const result = permitted && state?.scope === scope ? state.result : null;
  const records = result?.state === `ready` ? result.records ?? [] : [];
  const approvedEntries = entries.filter((entry) => entry.status === `approved` || entry.status === `published`);
  useEffect(() => { setCursors([]); setSelectedId(``); setNote(``); setEntryId(``); setEntries([]); setBusy(false); setFeedback({ error: ``, notice: `` }); }, [scope]);
  useEffect(() => {
    let active = true;
    if (!permitted) { setLoading(false); return; }
    setLoading(true);
    const request = review ? submissionService.getReviewPage(cursor) : submissionService.getOwnPage(cursor);
    void request.then((value) => { if (active && current.current === scope) setState({ scope, result: value }); })
      .catch(() => { if (active && current.current === scope) setState({ scope, result: { state: `error`, message: `Submissions Could Not Be Loaded`, records: null, nextCursor: null } }); })
      .finally(() => { if (active && current.current === scope) setLoading(false); });
    return () => { active = false; };
  }, [scope, permitted, review, cursor, revision]);
  useEffect(() => {
    let active = true;
    if (review && permitted) void catalogService.getOwnerCatalog().then((catalog) => { if (active && current.current === scope) setEntries(catalog.spells); }).catch(() => {
      if (active && current.current === scope) setFeedback((value) => ({ ...value, error: `Approved Entries Could Not Be Loaded. Reload Before Approving` }));
    });
    return () => { active = false; };
  }, [scope, permitted, review, revision]);
  useEffect(() => { current.current = scope; return () => { if (current.current === scope) current.current = ``; }; }, [scope]);
  const select = (record: SubmissionRecord) => { if (!busy) { setSelectedId(record.id); setNote(record.reviewerNote ?? ``); setEntryId(record.entryId ?? ``); } };
  const decide = async (record: SubmissionRecord, status: Exclude<SubmissionStatus, `review`>) => {
    if (!review || !permitted || pending.current || current.current !== scope) return;
    if (status === `approved` && !approvedEntries.some((entry) => entry.id === entryId)) { setFeedback({ error: `Choose An Approved Or Published Entry Before Approving`, notice: `` }); return; }
    if (status !== `approved` && !note.trim()) { setFeedback({ error: `Add A Note Explaining The Review Decision`, notice: `` }); return; }
    pending.current = true; setBusy(true); setFeedback({ error: ``, notice: `` });
    try {
      await submissionService.review(record, status, note, status === `approved` ? entryId : undefined);
      if (current.current !== scope) return;
      setFeedback({ error: ``, notice: `Submission ${submissionStatusLabel(status)}` }); setSelectedId(``); setRevision((value) => value + 1);
    } catch (error) { if (current.current === scope) setFeedback({ error: error instanceof Error ? error.message : `The Review Was Not Confirmed`, notice: `` }); }
    finally { pending.current = false; if (current.current === scope) setBusy(false); }
  };
  return { account, permitted, records, result, selectedId, select, note, entryId, approvedEntries, decide,
    loading: loading || authLoading || (permitted && !result), busy, ...feedback, setNote, setEntryId,
    pageNumber: cursors.length + 1, hasPrevious: cursors.length > 0, hasNext: Boolean(result?.nextCursor),
    reload: () => { if (!busy) setRevision((value) => value + 1); },
    previous: () => { if (!busy) { setSelectedId(``); setCursors((value) => value.slice(0, -1)); } },
    next: () => { const nextCursor = result?.nextCursor; if (!busy && nextCursor) { setSelectedId(``); setCursors((value) => [...value, nextCursor]); } },
  };
};
