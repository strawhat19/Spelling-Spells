import type { PricingPlansProps } from './types';
import { usePlans } from '../../shared/plans/usePlans';
import { useAuth } from '../../shared/authContext/useAuth';

export const usePricingPlans = ({ variant = `landing` }: PricingPlansProps) => {
  const state = usePlans();
  const { status, account, loading: accountLoading } = useAuth();
  return {
    ...state,
    variant,
    accountLoading,
    idPrefix: `pricing-${variant}`,
    signedIn: status === `signed-in` && Boolean(account),
    loading: !state.ready && state.status === `loading`,
    unavailable: state.status === `error` || state.status === `unavailable`,
  };
};
