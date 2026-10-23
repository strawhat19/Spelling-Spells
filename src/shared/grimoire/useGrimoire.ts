import { useContext } from 'react';
import type { GrimoireContextValue } from './types';
import { GrimoireContext } from './GrimoireContext';

export type { GrimoireEntry, GrimoireCollection, GrimoireContextValue } from './types';
export const useGrimoire = (): GrimoireContextValue => {
  const context = useContext(GrimoireContext);
  if (!context) throw new Error(`useGrimoire Must Be Used Within GrimoireProvider`);
  return context;
};
