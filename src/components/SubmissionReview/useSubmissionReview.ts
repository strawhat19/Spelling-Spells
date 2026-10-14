import { useEffect, useState } from 'react';
import { useAuth } from '../../shared/authContext';
import { submissionService } from '../../shared/submissions/service';
import type { SubmissionPageResult } from '../../shared/submissions/types';
import { canAccessOwner, canAccessAccount } from '../../shared/authentication/types';

export const useSubmissionReview = (review = false) => {
  const { account, loading: authLoading } = useAuth();
  const permitted = review ? canAccessOwner(account) : canAccessAccount(account);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionPageResult | null>(null);

  useEffect(() => {
    let active = true;
    setResult(null);
    setLoading(false);
    if (authLoading || !permitted) return () => { active = false; };
    setLoading(true);
    const request = review ? submissionService.getReviewPage() : submissionService.getOwnPage();
    void request.then((value) => { if (active) setResult(value); }).catch(() => {
      if (active) setResult({ state: `error`, message: `The submission service could not be reached. No changes were made.`, records: null, nextCursor: null });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account?.id, authLoading, permitted, review]);

  return { account, permitted, loading: loading || authLoading, result };
};
