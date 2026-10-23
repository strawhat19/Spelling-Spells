import type { ReactNode } from 'react';
import type { PlansSnapshot } from './types';
import { plansAPI } from '../../api/plans';
import { createContext, useEffect, useMemo, useState, useCallback } from 'react';

type PlansContextValue = PlansSnapshot & { ready: boolean; error: string | null; reloadPlans: () => void };
export const PlansContext = createContext<PlansContextValue | null>(null);

export const PlansProvider = ({ children }: { children: ReactNode }) => {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<PlansSnapshot>({ status: `loading`, plans: [], message: null });
  const reloadPlans = useCallback(() => setRetry((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    const unsubscribe = plansAPI.subscribePublic((value) => { if (active) setState(value); });
    return () => { active = false; unsubscribe(); };
  }, [retry]);
  const value = useMemo(() => ({ ...state, reloadPlans, ready: state.status !== `loading`, error: state.status === `error` || state.status === `unavailable` ? state.message : null }), [state, reloadPlans]);
  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
};
