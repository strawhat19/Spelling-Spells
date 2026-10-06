import { useContext } from 'react';
import { SpellsContext } from './SpellsContext';
import type { SpellsContextValue } from './SpellsContext';

export const useSpells = (): SpellsContextValue => {
  const context = useContext(SpellsContext);
  if (!context) throw new Error(`useSpells Must Be Used Within SpellsProvider`);
  return context;
};
