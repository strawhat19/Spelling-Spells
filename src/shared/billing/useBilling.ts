import { useContext } from 'react';
import { BillingContext } from './BillingContext';

export const useBilling = () => {
  const value = useContext(BillingContext);
  if (!value) throw new Error(`BillingProvider Is Required`);
  return value;
};
