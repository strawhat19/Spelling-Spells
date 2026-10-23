import { useEffect } from 'react';
import type { PricingPlansProps } from './types';
import { usePlans } from '../../shared/plans/usePlans';
import { useAuth } from '../../shared/authContext/useAuth';
import { useBilling } from '../../shared/billing/useBilling';
import { canAccessOwner } from '../../shared/authentication/types';

export const usePricingPlans = ({ variant = `landing` }: PricingPlansProps) => {
  const state = usePlans();
  const billing = useBilling();
  const { status, account, loading: accountLoading } = useAuth();
  const catalogRevision = state.plans.map((plan) => `${plan.id}:${plan.revision}`).join(`|`);
  useEffect(() => { if (status === `signed-in` && state.status === `ready`) void billing.refresh(); }, [catalogRevision, status, state.status, billing.refresh]);
  return {
    ...state,
    billing,
    variant,
    accountLoading,
    owner: canAccessOwner(account),
    idPrefix: `pricing-${variant}`,
    signedIn: status === `signed-in` && Boolean(account),
    loading: !state.ready && state.status === `loading`,
    unavailable: state.status === `error` || state.status === `unavailable`,
  };
};
