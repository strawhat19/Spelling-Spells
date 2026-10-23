import type { PlanRecord } from '../plans/types';
import { billingEndpoint, openBillingUrl } from './platform';
import type { BillingSnapshot, ReconcileResult } from './types';
import { requireCurrentAccount } from '../authentication/service';
import { readBillingSnapshot, readReconcileResult } from './values';

const interruptible = <T,>(operation: Promise<T>, signal: AbortSignal): Promise<T> => new Promise((resolve, reject) => {
  const abort = () => reject(new Error(`The Billing Request Was Stopped`));
  signal.addEventListener(`abort`, abort, { once: true });
  if (signal.aborted) abort();
  void operation.then((value) => { signal.removeEventListener(`abort`, abort); resolve(value); }, (error) => { signal.removeEventListener(`abort`, abort); reject(error); });
});
const request = async (path: string, body?: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> => {
  const { client, account, revision } = requireCurrentAccount();
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 20000);
  if (signal?.aborted) abort();
  else signal?.addEventListener(`abort`, abort, { once: true });
  try {
    const { data, error } = await interruptible(client.auth.getSession(), controller.signal);
    requireCurrentAccount(account, revision);
    if (error || !data.session?.access_token || data.session.user.id !== account.authUid) throw new Error(`Sign In Again To Manage Billing`);
    const response = await fetch(billingEndpoint(path), {
      cache: `no-store`,
      redirect: `error`,
      credentials: `omit`,
      signal: controller.signal,
      method: body ? `POST` : `GET`,
      headers: { Accept: `application/json`, Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': `application/json` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    requireCurrentAccount(account, revision);
    const value = await response.json().catch(() => null);
    requireCurrentAccount(account, revision);
    if (!response.ok) throw new Error(typeof value?.error?.message === `string` ? value.error.message : `Billing Is Unavailable. Please Try Again`);
    return value;
  } catch (error) {
    if (controller.signal.aborted) throw new Error(signal?.aborted ? `The Billing Request Was Stopped` : `Billing Confirmation Timed Out. Refresh Before Trying Again`);
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener(`abort`, abort);
  }
};
const navigate = async (path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<void> => {
  const { account, revision } = requireCurrentAccount();
  const value = await request(path, body, signal) as { url?: unknown } | null;
  requireCurrentAccount(account, revision);
  if (signal?.aborted || typeof value?.url !== `string`) throw new Error(`The Billing Destination Could Not Be Confirmed`);
  openBillingUrl(value.url);
};
export const billingService = {
  status: async (signal?: AbortSignal): Promise<BillingSnapshot> => readBillingSnapshot(await request(`status`, undefined, signal)),
  checkout: (plan: PlanRecord, signal?: AbortSignal): Promise<void> => navigate(`checkout`, { planSlug: plan.slug, expectedRevision: plan.revision }, signal),
  portal: (signal?: AbortSignal): Promise<void> => navigate(`portal`, {}, signal),
  reconcile: async (sessionId: string, signal?: AbortSignal): Promise<ReconcileResult> => {
    if (!/^cs_(?:test_|live_)?[a-zA-Z0-9]{8,220}$/.test(sessionId)) throw new Error(`The Checkout Return Is Invalid`);
    return readReconcileResult(await request(`reconcile`, { sessionId }, signal));
  },
};
