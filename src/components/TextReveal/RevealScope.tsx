import { routeAliases } from '../../shared/routes';
import { useMemo, useContext, createContext, type PropsWithChildren } from 'react';

const RevealContext = createContext<Set<string> | null>(null);

export const RevealScope = ({ pathname, children }: PropsWithChildren<{ pathname: string }>) => {
  const route = routeAliases[pathname as keyof typeof routeAliases] ?? pathname;
  const revealed = useMemo(() => new Set<string>(), [route]);
  return <RevealContext.Provider value={revealed}>{children}</RevealContext.Provider>;
};

export const useRevealScope = () => useContext(RevealContext);
