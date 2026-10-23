import type { ReactNode } from 'react';
import { billingAPI } from '../../api/billing';
import type { PlanRecord } from '../plans/types';
import { useAuth } from '../authContext/useAuth';
import { getSupabaseClient } from '../supabase/client';
import { billingNavigationAvailable } from './platform';
import { freeEntitlement, unavailableEntitlement } from './values';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BillingAction, BillingEntitlement, BillingSnapshot, ReconcileResult } from './types';

type BillingStatus = `loading` | `ready` | `unavailable` | `error` | `signed-out`;
type BillingContextValue = {
  status: BillingStatus;
  planLabel: string;
  error: string | null;
  message: string | null;
  busy: BillingAction | null;
  offers: BillingSnapshot[`offers`];
  entitlement: BillingEntitlement;
  checkoutAvailable: boolean;
  portalAvailable: boolean;
  refresh: () => Promise<void>;
  openPortal: () => Promise<boolean>;
  checkout: (plan: PlanRecord) => Promise<boolean>;
  reconcile: (sessionId: string) => Promise<ReconcileResult>;
};
type ScopedState = { scope: string; status: BillingStatus; error: string | null; snapshot: BillingSnapshot | null };
export const BillingContext = createContext<BillingContextValue | null>(null);

export const BillingProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const signedOut = auth.status === `signed-out` && !auth.identity && !auth.account;
  const allowed = auth.status === `signed-in` && auth.source === `server` && auth.account?.active && auth.account.roleVerified && auth.identity?.authUid === auth.account.authUid;
  const initialStatus: BillingStatus = signedOut ? `signed-out` : allowed || auth.status === `loading` ? `loading` : `unavailable`;
  const scopeKey = `${auth.status}:${auth.identity?.authUid ?? ``}:${auth.account?.id ?? ``}:${auth.account?.role ?? ``}:${auth.account?.active ?? false}:${auth.account?.roleVerified ?? false}:${auth.source ?? ``}`;
  const generation = useRef({ key: scopeKey, number: 0 });
  if (generation.current.key !== scopeKey) generation.current = { key: scopeKey, number: generation.current.number + 1 };
  const scope = `${generation.current.number}:${scopeKey}`;
  const currentScope = useRef(scope);
  const mounted = useRef(true);
  const readRevision = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const pending = useRef<{ scope: string; action: BillingAction } | null>(null);
  const [clock, setClock] = useState(0);
  const [state, setState] = useState<ScopedState>({ scope, status: initialStatus, error: null, snapshot: null });
  const [action, setAction] = useState<{ scope: string; busy: BillingAction | null; error: string | null }>({ scope, busy: null, error: null });
  currentScope.current = scope;
  const isCurrent = useCallback(() => mounted.current && currentScope.current === scope, [scope]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controllers.current.forEach((controller) => controller.abort()); }; }, []);
  const refresh = useCallback(async (): Promise<void> => {
    if (!allowed || !isCurrent()) return;
    const revision = ++readRevision.current;
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      const snapshot = await billingAPI.status(controller.signal);
      if (isCurrent() && revision === readRevision.current) setState({ scope, snapshot, error: null, status: `ready` });
    } catch (error) {
      if (isCurrent() && revision === readRevision.current) setState({ scope, snapshot: null, status: `unavailable`, error: error instanceof Error ? error.message : `The Account Plan Could Not Be Loaded` });
    } finally { controllers.current.delete(controller); }
  }, [scope, allowed, isCurrent]);
  useEffect(() => {
    let active = true;
    readRevision.current += 1;
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
    pending.current = null;
    setAction({ scope, busy: null, error: null });
    setState({ scope, snapshot: null, error: null, status: initialStatus });
    if (!allowed || !auth.account) return;
    void refresh();
    const client = getSupabaseClient();
    const channel = client.channel(`billing:${auth.account.id}:${generation.current.number}`)
      .on(`postgres_changes`, { event: `*`, schema: `public`, table: `account_entitlements`, filter: `account_id=eq.${auth.account.id}` }, () => { if (active) void refresh(); })
      .subscribe((status) => {
        if (!active || !isCurrent()) return;
        if (status === `SUBSCRIBED`) void refresh();
        else if ([`CLOSED`, `TIMED_OUT`, `CHANNEL_ERROR`].includes(status)) {
          readRevision.current += 1;
          setState({ scope, snapshot: null, status: `error`, error: `Plan Updates Are Unavailable. Refresh Before Using Paid Features` });
        }
      });
    return () => { active = false; void client.removeChannel(channel); controllers.current.forEach((controller) => controller.abort()); };
  }, [scope, allowed, initialStatus, auth.account?.id, refresh, isCurrent]);
  const confirmed = state.scope === scope ? state : { scope, snapshot: null, error: null, status: initialStatus } as ScopedState;
  const snapshot = confirmed.snapshot;
  useEffect(() => {
    if (snapshot?.entitlement.state !== `paid` || !snapshot.entitlement.validUntil) return;
    const remaining = Date.parse(snapshot.entitlement.validUntil) - Date.now();
    if (remaining <= 0) { void refresh(); return; }
    const timer = setTimeout(() => { setClock(Date.now()); void refresh(); }, Math.min(remaining + 1, 2147483000));
    return () => clearTimeout(timer);
  }, [snapshot?.entitlement.validUntil, snapshot?.entitlement.state, refresh, clock]);
  const run = useCallback(async <T,>(kind: BillingAction, operation: (signal: AbortSignal) => Promise<T>, fallback: T): Promise<T> => {
    if (!allowed || !isCurrent() || pending.current?.scope === scope) return fallback;
    const controller = new AbortController();
    pending.current = { scope, action: kind };
    controllers.current.add(controller);
    setAction({ scope, busy: kind, error: null });
    try {
      const result = await operation(controller.signal);
      return isCurrent() ? result : fallback;
    } catch (error) {
      if (isCurrent()) setAction({ scope, busy: kind, error: error instanceof Error ? error.message : `The Billing Request Could Not Be Confirmed` });
      return fallback;
    } finally {
      controllers.current.delete(controller);
      if (pending.current?.scope === scope) pending.current = null;
      if (isCurrent()) setAction((previous) => previous.scope === scope ? { ...previous, busy: null } : previous);
    }
  }, [scope, allowed, isCurrent]);
  const checkout = useCallback((plan: PlanRecord): Promise<boolean> => run(`checkout`, async (signal) => { if (!billingNavigationAvailable) throw new Error(`Subscriptions Are Managed On The Spelling Spells Website`); await billingAPI.checkout(plan, signal); return true; }, false), [run]);
  const openPortal = useCallback((): Promise<boolean> => run(`portal`, async (signal) => { if (!billingNavigationAvailable) throw new Error(`Subscriptions Are Managed On The Spelling Spells Website`); await billingAPI.portal(signal); return true; }, false), [run]);
  const reconcile = useCallback((sessionId: string): Promise<ReconcileResult> => run(`reconcile`, async (signal) => {
    const result = await billingAPI.reconcile(sessionId, signal);
    if (isCurrent()) await refresh();
    return result;
  }, { state: `pending`, message: `Payment Confirmation Is Still Pending. Refresh Before Trying Another Purchase` }), [run, isCurrent, refresh]);
  const value = useMemo<BillingContextValue>(() => {
    const entitlement = signedOut ? freeEntitlement() : confirmed.status === `ready` && snapshot ? snapshot.entitlement : unavailableEntitlement();
    const effective = entitlement.state === `paid` && (!entitlement.validUntil || Date.parse(entitlement.validUntil) <= Date.now()) ? unavailableEntitlement() : entitlement;
    return {
      refresh, checkout, reconcile, openPortal,
      entitlement: effective,
      status: confirmed.status,
      offers: snapshot?.offers ?? [],
      message: snapshot?.message ?? null,
      busy: action.scope === scope ? action.busy : null,
      error: action.scope === scope && action.error ? action.error : confirmed.error,
      checkoutAvailable: billingNavigationAvailable && confirmed.status === `ready` && Boolean(snapshot?.checkoutAvailable),
      portalAvailable: billingNavigationAvailable && confirmed.status === `ready` && Boolean(snapshot?.portalAvailable),
      planLabel: confirmed.status === `loading` ? `Loading` : effective.state === `free` ? `Free` : effective.state === `paid` ? effective.planName || `Plan Unavailable` : effective.state === `pending` ? `Confirmation Pending` : `Plan Unavailable`,
    };
  }, [scope, confirmed, signedOut, snapshot, action, clock, refresh, checkout, reconcile, openPortal]);
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};
