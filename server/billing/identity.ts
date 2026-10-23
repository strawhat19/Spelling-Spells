import { randomUUID } from 'node:crypto';
import { BillingError, billingRpc, createViewer } from './config';
import type { BillingActor, BillingBinding, BillingRuntime, Entitlement } from './types';

export const authenticateBilling = async (request: Request, requireVerified = true): Promise<BillingActor> => {
  const authorization = request.headers.get(`authorization`);
  if (!authorization?.startsWith(`Bearer `) || authorization.length > 8_192) throw new BillingError(401, `sign-in-required`, `Sign In To Manage Billing`);
  const token = authorization.slice(7);
  const viewer = createViewer(token);
  const { data: identity, error: identityError } = await viewer.auth.getUser(token);
  const user = identity?.user;
  if (identityError || !user || user.is_anonymous || (requireVerified && !user.email_confirmed_at)) throw new BillingError(401, `verified-session-required`, `Use A Verified Account To Manage Billing`);
  const { data: account, error: accountError } = await viewer.from(`accounts`).select(`id,auth_uid,email,role,active`).eq(`auth_uid`, user.id).single();
  if (accountError || !account?.active || account.auth_uid !== user.id || ![`Owner`, `Admin`, `Developer`, `Subscriber`, `Member`].includes(account.role)) {
    throw new BillingError(403, `account-unavailable`, `An Active Account Is Required`);
  }
  const { data: entitlement, error: entitlementError } = await viewer.rpc(`own_billing_entitlement`);
  if (entitlementError || !entitlement || ![`free`, `paid`, `pending`, `unavailable`].includes(entitlement.state)) {
    throw new BillingError(503, `entitlement-unavailable`, `Your Current Account Access Could Not Be Confirmed`);
  }
  return { viewer, entitlement: entitlement as Entitlement, id: account.id, role: account.role, authUid: user.id, emailVerified: Boolean(user.email_confirmed_at), email: user.email ?? account.email };
};
export const bindingScope = (runtime: BillingRuntime) => ({
  appId: runtime.config.appId,
  livemode: runtime.config.livemode,
  providerAccountId: runtime.config.accountId,
});
export const readBinding = (runtime: BillingRuntime, authUid: string): Promise<BillingBinding | null> => billingRpc(runtime, `read`, { authUid, ...bindingScope(runtime) });
export const withBillingOperation = async <T,>(runtime: BillingRuntime, authUid: string, operation: (binding: BillingBinding, lease: Record<string, string>) => Promise<T>): Promise<T> => {
  const operationId = randomUUID();
  const binding = await billingRpc<BillingBinding>(runtime, `acquire`, { authUid, operationId, ...bindingScope(runtime) });
  if (!binding?.leaseToken || !binding.accountId || binding.authUid !== authUid) throw new BillingError(503, `binding-unavailable`, `Billing Account Binding Could Not Be Confirmed`);
  const lease = { operationId, leaseToken: binding.leaseToken };
  try { return await operation(binding, lease); }
  finally {
    try { await billingRpc(runtime, `release`, lease); }
    catch { console.error(`Billing Lease Release Pending`); }
  }
};
