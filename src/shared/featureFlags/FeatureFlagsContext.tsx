import type { ReactNode } from 'react';
import { useAuth } from '../authContext/useAuth';
import { featuresAPI } from '../../api/features';
import { useBilling } from '../billing/useBilling';
import { canAccessOwner } from '../authentication/types';
import { isFeatureRole, featurePolicyAllows } from './values';
import { freePlanSlug, subscribePlanTiers, type PlanTierSnapshot } from '../plans/tiers';
import { createContext, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import type { FeatureKey, FeatureRole, FeaturePolicy, FeatureSnapshot, FeatureFlagsValue } from './types';

const loadingSnapshot: FeatureSnapshot = { settings: null, error: null, status: `loading` };
export const FeatureFlagsContext = createContext<FeatureFlagsValue | null>(null);

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const billing = useBilling();
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [tierState, setTierState] = useState<PlanTierSnapshot>({ tiers: [], error: null, status: `loading` });
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
    setTierState({ tiers: [], error: null, status: `loading` });
    const unsubscribe = subscribePlanTiers((snapshot) => { if (active) setTierState(snapshot); });
    return () => { active = false; unsubscribe(); };
  }, [retry]);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = setInterval(refresh, 30_000);
    if (typeof window !== `undefined`) window.addEventListener(`focus`, refresh);
    return () => { clearInterval(interval); if (typeof window !== `undefined`) window.removeEventListener(`focus`, refresh); };
  }, []);
  useEffect(() => {
    const expiresAt = billing.entitlement?.validUntil ? Date.parse(billing.entitlement.validUntil) : NaN;
    const startsAt = billing.entitlement?.validFrom ? Date.parse(billing.entitlement.validFrom) : NaN;
    const boundary = [startsAt, expiresAt].filter((time) => Number.isFinite(time) && time > Date.now()).sort((left, right) => left - right)?.[0];
    if (!boundary) return;
    const timeout = setTimeout(() => setNow(Date.now()), Math.min(2_147_483_647, Math.max(1, boundary - Date.now() + 1)));
    return () => clearTimeout(timeout);
  }, [now, billing.entitlement?.validFrom, billing.entitlement?.validUntil]);
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
  const entitlement = billing.entitlement;
  const currentTime = Date.now();
  const paidWindow = entitlement?.state === `paid` && Boolean(entitlement.validFrom && entitlement.validUntil && Date.parse(entitlement.validFrom) <= currentTime && Date.parse(entitlement.validUntil) > currentTime);
  const viewerPlan = viewerRole === `Guest` ? freePlanSlug : billing.status === `ready` && entitlement?.state === `free` && entitlement.planSlug === freePlanSlug ? freePlanSlug : billing.status === `ready` && paidWindow ? entitlement?.planSlug ?? null : null;
  const value = useMemo<FeatureFlagsValue>(() => ({
    ...snapshot,
    reload,
    saveFeature,
    tiers: tierState.tiers,
    tierError: tierState.error,
    tierStatus: tierState.status,
    ready: snapshot.status === `ready`,
    saving: saveState.scope === scope && saveState.saving,
    saveError: saveState.scope === scope ? saveState.error : null,
    marqueeEnabled: snapshot.status === `ready` && featurePolicyAllows(snapshot.settings?.features.marquee, viewerRole, viewerPlan, tierState.tiers, tierState.status === `ready`),
    contactEnabled: snapshot.status === `ready` && featurePolicyAllows(snapshot.settings?.features.contact, viewerRole, viewerPlan, tierState.tiers, tierState.status === `ready`),
    notificationsEnabled: snapshot.status === `ready` && featurePolicyAllows(snapshot.settings?.features.notifications, viewerRole, viewerPlan, tierState.tiers, tierState.status === `ready`),
    grimoireToolsEnabled: snapshot.status === `ready` && featurePolicyAllows(snapshot.settings?.features.grimoireTools, viewerRole, viewerPlan, tierState.tiers, tierState.status === `ready`),
    themeToggleEnabled: snapshot.status === `ready` && featurePolicyAllows(snapshot.settings?.features.themeToggle, viewerRole, viewerPlan, tierState.tiers, tierState.status === `ready`),
  }), [scope, snapshot, viewerRole, viewerPlan, tierState, saveState, reload, saveFeature]);
  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
};
