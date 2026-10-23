import { useContext } from 'react';
import { PlansContext } from './PlansContext';

export const usePlans = () => {
  const value = useContext(PlansContext);
  if (!value) throw new Error(`Pricing Needs A Plans Provider`);
  return value;
};
