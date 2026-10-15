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

export const useOwnerRecords = (view: OwnerRecordView) => {
  const auth = useAuth();
  const permitted = !auth.loading && canAccessOwner(auth.account);
  const scope = `${auth.account?.id ?? `guest`}:${view}`;
  const [state, setState] = useState<{ scope: string; snapshot: OwnerRecordsSnapshot } | null>(null);
  useEffect(() => {
    setState(null);
    if (!permitted) return;
    let active = true;
    const unsubscribe = ownerRecordsService.subscribe(view, (snapshot) => {
      if (active) setState({ scope, snapshot });
    });
    return () => { active = false; unsubscribe(); };
  }, [permitted, scope, view]);
  return {
    ...auth,
    permitted,
    content: views[view],
    snapshot: permitted && state?.scope === scope ? state.snapshot : null,
  };
};
