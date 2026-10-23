import { useAuth } from '../../shared/authContext';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useBilling } from '../../shared/billing/useBilling';
import type { ReconcileResult } from '../../shared/billing/types';
import { canAccessAccount } from '../../shared/authentication/types';

const first = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] ?? `` : value ?? ``;
export const useBillingReturn = () => {
  const auth = useAuth();
  const billing = useBilling();
  const params = useLocalSearchParams<{ session_id?: string | string[]; cancelled?: string | string[] }>();
  const sessionId = first(params.session_id);
  const cancelled = first(params.cancelled) === `1`;
  const validSession = /^cs_(?:test_|live_)?[a-zA-Z0-9]{8,220}$/.test(sessionId);
  const allowed = auth.status === `signed-in` && canAccessAccount(auth.account);
  const scope = `${auth.status}:${auth.identity?.authUid ?? ``}:${auth.account?.id ?? ``}:${sessionId}:${cancelled}`;
  const currentScope = useRef(scope);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ scope: string; value: ReconcileResult | null }>({ scope, value: null });
  currentScope.current = scope;
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    setResult({ scope, value: null });
    if (!allowed) return;
    if (cancelled || !sessionId) { void billing.refresh(); return; }
    if (!validSession) { setResult({ scope, value: { state: `failed`, message: `This checkout return could not be verified. Open billing from your profile` } }); return; }
    const reconcile = async () => {
      attempts += 1;
      const value = await billing.reconcile(sessionId);
      if (!active || currentScope.current !== scope) return;
      setResult({ scope, value });
      if (value.state === `pending` && attempts < 6) timer = setTimeout(() => void reconcile(), 2500);
    };
    void reconcile();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [scope, allowed, cancelled, sessionId, validSession, retry, billing.reconcile, billing.refresh]);
  const confirmed = result.scope === scope ? result.value : null;
  return {
    auth,
    billing,
    allowed,
    cancelled,
    result: confirmed,
    refresh: () => setRetry((value) => value + 1),
    returnTo: validSession ? `/billing-return?session_id=${encodeURIComponent(sessionId)}` : cancelled ? `/billing-return?cancelled=1` : `/billing-return`,
    title: cancelled ? `Checkout closed` : !sessionId ? `Your billing status` : confirmed?.state === `confirmed` ? `Payment confirmed` : confirmed?.state === `failed` ? `Payment not confirmed` : `Confirming your subscription`,
    copy: cancelled ? `You returned without completing this checkout. This does not cancel an existing subscription. Your current account access is shown below.` : !sessionId ? `Your account's confirmed plan is shown below. Manage your subscription through billing.` : confirmed?.message ?? `Checking the checkout session with the server. Access updates only after your subscription and paid period are confirmed.`,
  };
};
