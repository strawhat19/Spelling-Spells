import type { PricingPlansProps } from './types';
import { usePlans } from '../../shared/plans/usePlans';

export const usePricingPlans = ({ variant = `landing` }: PricingPlansProps) => {
  const state = usePlans();
  return {
    ...state,
    variant,
    idPrefix: `pricing-${variant}`,
    loading: !state.ready && state.status === `loading`,
    unavailable: state.status === `error` || state.status === `unavailable`,
  };
};
