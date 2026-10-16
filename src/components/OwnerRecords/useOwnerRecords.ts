import { useEffect, useState } from 'react';
import { useAuth } from '../../shared/authContext';
import { canAccessOwner } from '../../shared/authentication/types';
import { ownerRecordsService, type OwnerRecordView, type OwnerRecordsSnapshot } from '../../shared/admin/service';

const views = {
  users: {
    icon: `user`, title: `Archive accounts`, path: `/users`,
    description: `An Owner-only place for account status, with private data kept private.`,
    columns: [`No.`, `Name`, `Email`, `Role`, `Status`, `Actions`],
    boundary: `Role assignment, suspension and account deletion require trusted server operations. Profile edits cannot grant privileges.`,
  },
  feedback: {
    icon: `edit`, title: `Reader feedback`, path: `/feedback`,
    description: `A quiet editorial inbox for corrections, support and reader suggestions.`,
    columns: [`No.`, `Subject`, `Kind`, `Status`, `Updated`, `Actions`],
    boundary: `Future feedback stays private to its authorized reviewers. A device draft is not a sent message, and review is not publication.`,
  },
} as const;

export const useOwnerRecords = (view: OwnerRecordView, enabled = true) => {
  const auth = useAuth();
  const permitted = auth.status === `signed-in` && !auth.loading && canAccessOwner(auth.account);
  const identityScope = `${auth.account?.id ?? `guest`}:${auth.account?.authUid ?? ``}:${auth.account?.role ?? ``}:${auth.account?.active ?? false}:${auth.account?.roleVerified ?? false}:${auth.account?.emailVerified ?? false}:${view}`;
  const [pagination, setPagination] = useState<{ scope: string; cursors: (number | null)[] }>({ scope: identityScope, cursors: [null] });
  const [retryNumber, setRetryNumber] = useState(0);
  const cursors = pagination.scope === identityScope ? pagination.cursors : [null];
  const before = cursors[cursors.length - 1];
  const scope = `${identityScope}:${before ?? `latest`}:${retryNumber}`;
  const [state, setState] = useState<{ scope: string; snapshot: OwnerRecordsSnapshot } | null>(null);
  useEffect(() => {
    setState(null);
    if (!permitted || !enabled) return;
    let active = true;
    const unsubscribe = ownerRecordsService.subscribe(view, (snapshot) => {
      if (active) setState({ scope, snapshot });
    }, { before });
    return () => { active = false; unsubscribe(); };
  }, [before, enabled, permitted, scope, view]);
  const snapshot = enabled && permitted && state?.scope === scope ? state.snapshot : null;
  return {
    ...auth,
    permitted,
    content: views[view],
    snapshot,
    pageNumber: cursors.length,
    hasPrevious: cursors.length > 1,
    retry: () => setRetryNumber((current) => current + 1),
    previous: () => {
      if (cursors.length > 1) setPagination({ scope: identityScope, cursors: cursors.slice(0, -1) });
    },
    next: () => {
      if (snapshot?.state === `ready` && snapshot.nextCursor !== null) {
        setPagination({ scope: identityScope, cursors: [...cursors, snapshot.nextCursor] });
      }
    },
  };
};
