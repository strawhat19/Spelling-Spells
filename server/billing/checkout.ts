import type Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { withBillingOperation } from './identity';
import { BillingError, billingRpc } from './config';
import { recoverAttempt, reconcileBinding, verifiedSession } from './reconcile';
import type { BillingActor, BillingAttempt, BillingBinding, BillingRuntime, Entitlement } from './types';
import { stripeId, approvedOffer, matchesBinding, verifyPortal, verifyWebhook, verifyCustomer, bindingMetadata, validateHostedUrl, verifyStripeAccount } from './provider';

type Lease = Record<string, string>;
type CheckoutInput = { planSlug: string; expectedRevision: number };
type ApprovedOffer = Awaited<ReturnType<typeof approvedOffer>>;
const retryWindow = 15 * 60_000;
const terminalStatuses = new Set([`none`, `canceled`, `incomplete_expired`]);
const pending = () => new BillingError(409, `confirmation-pending`, `Billing Confirmation Is Pending. Refresh Before Starting Another Checkout`);
const existingSubscription = () => new BillingError(409, `subscription-exists`, `Your Subscription Needs Billing Management. Open Manage Billing From Your Profile`);
const fresh = (createdAt: string): boolean => {
  const age = Date.now() - Date.parse(createdAt);
  return Number.isFinite(age) && age >= -60_000 && age < retryWindow;
};
const assertActor = async (actor: BillingActor, binding: BillingBinding): Promise<void> => {
  if (binding.accountId !== actor.id || binding.authUid !== actor.authUid || binding.active === false) throw new BillingError(403, `account-mismatch`, `The Billing Account Could Not Be Confirmed`);
  const [access, account] = await Promise.all([
    actor.viewer.rpc(`own_billing_entitlement`),
    actor.viewer.from(`accounts`).select(`id,auth_uid,active`).eq(`id`, actor.id).eq(`auth_uid`, actor.authUid).single(),
  ]);
  if (access.error || !access.data || ![`free`, `paid`, `pending`, `unavailable`].includes(access.data.state) || account.error || !account.data?.active || account.data.id !== binding.accountId || account.data.auth_uid !== binding.authUid) {
    throw new BillingError(403, `active-session-required`, `Your Active Account Session Could Not Be Confirmed`);
  }
};
const recoverCustomer = async (runtime: BillingRuntime, binding: BillingBinding): Promise<Stripe.Customer | null> => {
  const start = Date.parse(binding.customerAttemptStartedAt ?? ``);
  if (!Number.isFinite(start) || start > Date.now() + 60_000) throw pending();
  const matches: Stripe.Customer[] = [];
  let after: string | undefined;
  for (let page = 0; page < 2; page += 1) {
    const customers = await runtime.stripe.customers.list({ limit: 50, created: { gte: Math.floor(start / 1_000) }, ...(after ? { starting_after: after } : {}) });
    matches.push(...customers.data.filter((customer) => customer.livemode === runtime.config.livemode && matchesBinding(runtime, binding, customer.metadata)));
    if (!customers.has_more) {
      if (matches.length > 1) throw pending();
      return matches?.[0] ?? null;
    }
    after = customers.data.at(-1)?.id;
    if (!after) break;
  }
  throw pending();
};
const ensureCustomer = async (runtime: BillingRuntime, actor: BillingActor, binding: BillingBinding, lease: Lease): Promise<void> => {
  if (binding.customerId) { await verifyCustomer(runtime, binding); return; }
  if (!binding.customerAttemptStartedAt) {
    const saved = await billingRpc<BillingBinding>(runtime, `prepare_customer`, lease);
    if (saved.bindingId !== binding.bindingId || saved.accountId !== actor.id || saved.authUid !== actor.authUid || !saved.customerAttemptStartedAt) throw pending();
    binding.customerAttemptStartedAt = saved.customerAttemptStartedAt;
  }
  let customer = await recoverCustomer(runtime, binding);
  if (!customer) {
    if (!fresh(binding.customerAttemptStartedAt ?? ``)) throw pending();
    await assertActor(actor, binding);
    try {
      customer = await runtime.stripe.customers.create({ metadata: bindingMetadata(runtime, binding) }, {
        idempotencyKey: `spelling-spells-customer-${createHash(`sha256`).update(binding.bindingId).digest(`hex`)}`,
      });
    } catch { throw pending(); }
  }
  if (customer.livemode !== runtime.config.livemode || !matchesBinding(runtime, binding, customer.metadata)) throw pending();
  try {
    const saved = await billingRpc<BillingBinding>(runtime, `save_customer`, { ...lease, customerId: customer.id });
    if (saved.bindingId !== binding.bindingId || saved.accountId !== actor.id || saved.authUid !== actor.authUid || saved.customerId !== customer.id) throw pending();
    binding.customerId = customer.id;
  } catch { throw pending(); }
};
const assertNoSubscription = (entitlement: Entitlement): void => {
  if (entitlement.state !== `free` || !entitlement.subscriptionStatus || !terminalStatuses.has(entitlement.subscriptionStatus)) throw existingSubscription();
};
const assertAttemptOffer = (attempt: BillingAttempt, offer: ApprovedOffer): void => {
  if (attempt.planId !== offer.plan.id || attempt.planSlug !== offer.plan.slug || attempt.planRevision !== offer.plan.revision || attempt.priceId !== offer.price.id || attempt.productId !== offer.product.id ||
    attempt.amount !== offer.plan.price_cents || attempt.currency !== offer.price.currency || attempt.interval !== offer.plan.interval || !attempt.idempotencyKey) {
    throw new BillingError(409, `checkout-offer-changed`, `An Existing Checkout Uses Different Terms. Resolve It Before Starting Another Checkout`);
  }
};
const saveAttempt = async (runtime: BillingRuntime, binding: BillingBinding, lease: Lease, attempt: BillingAttempt, status: `open` | `complete` | `expired` | `uncertain` | `closed`, sessionId = attempt.sessionId): Promise<void> => {
  const saved = await billingRpc<{ saved: boolean }>(runtime, `save_attempt`, { ...lease, status, sessionId, attemptId: attempt.id });
  if (!saved?.saved) throw pending();
  attempt.status = status;
  attempt.sessionId = sessionId;
  binding.attempt = attempt;
};
const clearAttempt = async (runtime: BillingRuntime, binding: BillingBinding, lease: Lease, attempt: BillingAttempt): Promise<void> => {
  const saved = await billingRpc<{ cleared: boolean }>(runtime, `clear_attempt`, { ...lease, attemptId: attempt.id });
  if (!saved?.cleared) throw pending();
  binding.attempt = null;
};
const checkoutParameters = (runtime: BillingRuntime, binding: BillingBinding, attempt: BillingAttempt): Stripe.Checkout.SessionCreateParams => {
  const letters = [...createHash(`sha256`).update(attempt.id).digest().subarray(0, 8)].map((value) => String.fromCharCode(97 + value % 26)).join(``);
  const metadata = { ...bindingMetadata(runtime, binding), attempt_id: attempt.id };
  return {
    mode: `subscription`,
    metadata,
    customer: binding.customerId!,
    allow_promotion_codes: false,
    automatic_tax: { enabled: false },
    subscription_data: { metadata },
    client_reference_id: binding.accountId,
    line_items: [{ quantity: 1, price: attempt.priceId }],
    cancel_url: `${runtime.config.origin}/billing-return?cancelled=1`,
    integration_identifier: `spelling-spells-checkout-${letters}`,
    success_url: `${runtime.config.origin}/billing-return?session_id={CHECKOUT_SESSION_ID}`,
  };
};
export const startCheckout = async (runtime: BillingRuntime, actor: BillingActor, input: CheckoutInput): Promise<{ url: string }> => {
  if (typeof input?.planSlug !== `string` || input.planSlug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.planSlug) || !Number.isSafeInteger(input?.expectedRevision) || input.expectedRevision < 1) throw new BillingError(400, `offer-invalid`, `Choose A Current Published Plan`);
  await verifyStripeAccount(runtime, true);
  return withBillingOperation(runtime, actor.authUid, async (binding, lease) => {
    await assertActor(actor, binding);
    const [offer] = await Promise.all([approvedOffer(runtime, input.planSlug, input.expectedRevision), verifyPortal(runtime), verifyWebhook(runtime)]);
    await ensureCustomer(runtime, actor, binding, lease);
    let attempt = binding.attempt;
    const recovered = attempt ? await recoverAttempt(runtime, binding, lease, attempt) : null;
    const entitlement = await reconcileBinding(runtime, binding, lease);
    assertNoSubscription(entitlement);
    if (attempt && recovered?.status === `open`) {
      assertAttemptOffer(attempt, offer);
      if (recovered.expires_at <= Date.now() / 1_000) throw pending();
      return { url: validateHostedUrl(recovered.url, `checkout.stripe.com`) };
    }
    if (attempt && recovered?.status === `complete`) {
      const subscriptionId = stripeId(recovered.subscription);
      if (!subscriptionId || attempt.sessionId !== recovered.id) throw pending();
      const subscription = await runtime.stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.id !== subscriptionId || subscription.livemode !== runtime.config.livemode || stripeId(subscription.customer) !== binding.customerId || !matchesBinding(runtime, binding, subscription.metadata) || subscription.metadata?.attempt_id !== attempt.id) throw pending();
      if (subscription.status !== `canceled` && subscription.status !== `incomplete_expired`) throw existingSubscription();
      if (entitlement.state !== `free` || entitlement.subscriptionStatus !== subscription.status || binding.subscriptionId !== subscription.id) throw pending();
      await saveAttempt(runtime, binding, lease, attempt, `closed`, recovered.id);
      await clearAttempt(runtime, binding, lease, attempt);
      attempt = null;
    } else if (attempt && recovered?.status === `expired`) {
      await saveAttempt(runtime, binding, lease, attempt, `expired`, recovered.id);
      await clearAttempt(runtime, binding, lease, attempt);
      attempt = null;
    } else if (recovered) throw pending();
    if (!attempt) {
      attempt = await billingRpc<BillingAttempt>(runtime, `prepare_attempt`, {
        ...lease,
        planId: offer.plan.id,
        planSlug: offer.plan.slug,
        priceId: offer.price.id,
        productId: offer.product.id,
        amount: offer.plan.price_cents,
        currency: offer.price.currency,
        interval: offer.plan.interval,
        planRevision: offer.plan.revision,
      });
      binding.attempt = attempt;
    }
    assertAttemptOffer(attempt, offer);
    if (attempt.sessionId || !fresh(attempt.createdAt)) throw pending();
    await assertActor(actor, binding);
    let session: Stripe.Checkout.Session | null = null;
    let sessionBound = false;
    try {
      session = await runtime.stripe.checkout.sessions.create(checkoutParameters(runtime, binding, attempt), { idempotencyKey: attempt.idempotencyKey });
      if (session.livemode !== runtime.config.livemode || session.mode !== `subscription` || stripeId(session.customer) !== binding.customerId || session.client_reference_id !== binding.accountId || !matchesBinding(runtime, binding, session.metadata) || session.metadata?.attempt_id !== attempt.id) throw pending();
      sessionBound = true;
      const status = session.status === `open` ? `open` : session.status === `complete` ? `complete` : session.status === `expired` ? `expired` : null;
      if (!status) throw pending();
      await saveAttempt(runtime, binding, lease, attempt, status, session.id);
      const verified = await verifiedSession(runtime, binding, attempt);
      if (verified.status === `open` && verified.expires_at > Date.now() / 1_000) return { url: validateHostedUrl(verified.url, `checkout.stripe.com`) };
      if (verified.status === `complete`) await reconcileBinding(runtime, binding, lease);
      throw pending();
    } catch {
      try { await saveAttempt(runtime, binding, lease, attempt, `uncertain`, sessionBound ? session?.id ?? attempt.sessionId : attempt.sessionId); } catch {}
      throw pending();
    }
  });
};
export const startPortal = async (runtime: BillingRuntime, actor: BillingActor): Promise<{ url: string }> => {
  await verifyStripeAccount(runtime);
  return withBillingOperation(runtime, actor.authUid, async (binding) => {
    await assertActor(actor, binding);
    await Promise.all([verifyPortal(runtime), verifyCustomer(runtime, binding)]);
    await assertActor(actor, binding);
    const session = await runtime.stripe.billingPortal.sessions.create({ customer: binding.customerId!, configuration: runtime.config.portalId, return_url: `${runtime.config.origin}/billing-return` });
    if (session.livemode !== runtime.config.livemode || session.customer !== binding.customerId || stripeId(session.configuration) !== runtime.config.portalId || session.return_url !== `${runtime.config.origin}/billing-return`) throw pending();
    return { url: validateHostedUrl(session.url, `billing.stripe.com`) };
  });
};
