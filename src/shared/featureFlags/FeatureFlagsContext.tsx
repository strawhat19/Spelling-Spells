import type { ReactNode } from 'react';
import { useAuth } from '../authContext/useAuth';
import { featuresAPI } from '../../api/features';
import { canAccessOwner } from '../authentication/types';
import { isFeatureRole, featurePolicyAllows } from './values';
import { createContext, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import type { FeatureKey, FeatureRole, FeaturePolicy, FeatureSnapshot, FeatureFlagsValue } from './types';

const loadingSnapshot: FeatureSnapshot = { settings: null, error: null, status: `loading` };
export const FeatureFlagsContext = createContext<FeatureFlagsValue | null>(null);

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const [retry, setRetry] = useState(0);
  const scopeKey = `${auth.status}:${auth.identity?.authUid ?? ``}:${auth.account?.id ?? ``}:${auth.account?.role ?? ``}:${auth.account?.active ?? false}:${auth.account?.roleVerified ?? false}:${auth.account?.emailVerified ?? false}:${auth.source ?? ``}`;
  const scopeGeneration = useRef({ key: scopeKey, number: 0 });
  if (scopeGeneration.current.key !== scopeKey) scopeGeneration.current = { key: scopeKey, number: scopeGeneration.current.number + 1 };
  const scope = `${scopeGeneration.current.number}:${scopeKey}`;
  const mounted = useRef(true);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const pendingSave = useRef<string | null>(null);
  const [state, setState] = useState<{ scope: string; snapshot: FeatureSnapshot }>({ scope, snapshot: loadingSnapshot });
  const [saveState, setSaveState] = useState<{ scope: string; saving: boolean; error: string | null }>({ scope, saving: false, error: null });
  const reload = useCallback(() => setRetry((value) => value + 1), []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setState({ scope, snapshot: loadingSnapshot });
    setSaveState({ scope, saving: false, error: null });
    const unsubscribe = featuresAPI.subscribe((snapshot) => {
      if (!active || currentScope.current !== scope) return;
      setState((previous) => {
        if (snapshot.status === `ready` && previous.scope === scope && previous.snapshot.settings && (!snapshot.settings || snapshot.settings.revision < previous.snapshot.settings.revision)) return previous;
        return { scope, snapshot };
      });
    });
    return () => { active = false; unsubscribe(); };
  }, [scope, retry]);
  const saveFeature = useCallback(async (key: FeatureKey, policy: FeaturePolicy, expectedRevision: number): Promise<boolean> => {
    if (pendingSave.current === scope) return false;
    if (auth.status !== `signed-in` || !canAccessOwner(auth.account)) {
      setSaveState({ scope, saving: false, error: `Owner Access Is Required To Manage Features` });
      return false;
    }
    pendingSave.current = scope;
    setSaveState({ scope, saving: true, error: null });
    try {
      const settings = await featuresAPI.saveFeature(key, policy, expectedRevision);
      if (!mounted.current || currentScope.current !== scope) return false;
      setState((previous) => previous.scope === scope && previous.snapshot.settings && previous.snapshot.settings.revision > settings.revision ? previous : { scope, snapshot: { settings, error: null, status: `ready` } });
      setSaveState({ scope, saving: false, error: null });
      return true;
    } catch (error) {
      if (mounted.current && currentScope.current === scope) setSaveState({ scope, saving: false, error: error instanceof Error ? error.message : `The Feature Could Not Be Saved` });
      return false;
    } finally { if (pendingSave.current === scope) pendingSave.current = null; }
  }, [scope, auth.status, auth.account]);
  const snapshot = state.scope === scope ? state.snapshot : loadingSnapshot;
  const viewerRole: FeatureRole | null = auth.status === `signed-out` && !auth.identity && !auth.account ? `Guest` :
    auth.status === `signed-in` && auth.source === `server` && auth.account?.active && auth.account.roleVerified && auth.identity?.authUid === auth.account.authUid && isFeatureRole(auth.account.role) ? auth.account.role : null;
  const value = useMemo<FeatureFlagsValue>(() => ({
    ...snapshot,
    reload,
    saveFeature,
    ready: snapshot.status === `ready`,
    saving: saveState.scope === scope && saveState.saving,
    saveError: saveState.scope === scope ? saveState.error : null,
    themeToggleEnabled: snapshot.status === `ready` && Boolean(snapshot.settings && featurePolicyAllows(snapshot.settings.features.themeToggle, viewerRole)),
  }), [scope, snapshot, viewerRole, saveState, reload, saveFeature]);
  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
};
