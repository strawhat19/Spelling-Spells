import type Stripe from 'stripe';
import { BillingError, billingRpc } from './config';
import { bindingScope } from './identity';
import { matchesBinding, stripeId, verifyCustomer } from './provider';
import type { BillingAttempt, BillingBinding, BillingRuntime, Entitlement } from './types';

const terminal = new Set([`canceled`, `incomplete_expired`]);
const pending = (): BillingError => new BillingError(409, `confirmation-pending`, `Billing Confirmation Is Pending. Refresh Or Contact Support`);
const iso = (seconds: number): string => new Date(seconds * 1_000).toISOString();
const assertSession = (runtime: BillingRuntime, binding: BillingBinding, attempt: BillingAttempt, session: Stripe.Checkout.Session): void => {
  if (session.id !== attempt.sessionId || session.livemode !== runtime.config.livemode || session.mode !== `subscription`
    || stripeId(session.customer) !== binding.customerId || session.client_reference_id !== binding.accountId
    || !matchesBinding(runtime, binding, session.metadata) || session.metadata?.attempt_id !== attempt.id) {
    throw new BillingError(403, `session-mismatch`, `This Checkout Does Not Belong To The Current Billing Account`);
  }
};
export const verifiedSession = async (runtime: BillingRuntime, binding: BillingBinding, attempt: BillingAttempt): Promise<Stripe.Checkout.Session> => {
  if (!attempt.sessionId) throw pending();
  const session = await runtime.stripe.checkout.sessions.retrieve(attempt.sessionId, { expand: [`line_items`] });
  assertSession(runtime, binding, attempt, session);
  const items = session.line_items;
  if (!items || items.has_more || items.data.length !== 1 || items.data[0]?.quantity !== 1 || items.data[0]?.price?.id !== attempt.priceId) throw pending();
  return session;
};
export const recoverAttempt = async (runtime: BillingRuntime, binding: BillingBinding, lease: Record<string, string>, attempt: BillingAttempt): Promise<Stripe.Checkout.Session | null> => {
  if (attempt.sessionId) return verifiedSession(runtime, binding, attempt);
  if (!binding.customerId) throw pending();
  const matches: Stripe.Checkout.Session[] = [];
  let after: string | undefined;
  for (let page = 0; page < 2; page += 1) {
    const sessions = await runtime.stripe.checkout.sessions.list({ customer: binding.customerId, limit: 50, ...(after ? { starting_after: after } : {}) });
    matches.push(...sessions.data.filter(session => session.metadata?.attempt_id === attempt.id && matchesBinding(runtime, binding, session.metadata)));
    if (!sessions.has_more) {
      if (matches.length > 1) throw pending();
      const session = matches[0];
      if (!session) return null;
      await billingRpc(runtime, `save_attempt`, { ...lease, attemptId: attempt.id, sessionId: session.id, status: session.status ?? `uncertain` });
      attempt.sessionId = session.id;
      return verifiedSession(runtime, binding, attempt);
    }
    after = sessions.data.at(-1)?.id;
    if (!after) break;
  }
  throw pending();
};
const paymentProvesInvoice = async (runtime: BillingRuntime, binding: BillingBinding, invoice: Stripe.Invoice, amount: number): Promise<boolean> => {
  const payments = await runtime.stripe.invoicePayments.list({ invoice: invoice.id, status: `paid`, limit: 11, expand: [`data.payment.payment_intent.latest_charge`] });
  if (payments.has_more || payments.data.length !== 1) return false;
  const payment = payments.data[0];
  if (!payment || payment.livemode !== runtime.config.livemode || stripeId(payment.invoice) !== invoice.id || payment.currency !== invoice.currency
    || (payment.amount_paid ?? 0) < amount || payment.payment.type !== `payment_intent`) return false;
  const reference = payment.payment.payment_intent;
  const intent = typeof reference === `string` ? await runtime.stripe.paymentIntents.retrieve(reference, { expand: [`latest_charge`] }) : reference;
  if (!intent || intent.status !== `succeeded` || intent.livemode !== runtime.config.livemode || stripeId(intent.customer) !== binding.customerId
    || intent.currency !== invoice.currency || intent.amount_received < invoice.amount_paid) return false;
  const referenceCharge = intent.latest_charge;
  const charge = typeof referenceCharge === `string` ? await runtime.stripe.charges.retrieve(referenceCharge) : referenceCharge;
  return Boolean(charge && charge.paid && charge.status === `succeeded` && !charge.disputed && charge.amount_refunded === 0
    && charge.livemode === runtime.config.livemode && stripeId(charge.customer) === binding.customerId && charge.amount_captured >= invoice.amount_paid);
};
const paidWindow = async (runtime: BillingRuntime, binding: BillingBinding, subscription: Stripe.Subscription, approved: BillingAttempt): Promise<{ start: number; end: number } | null> => {
  const item = subscription.items.data[0];
  if (!item || subscription.items.has_more || subscription.items.data.length !== 1 || item.quantity !== 1 || item.price.id !== approved.priceId
    || stripeId(item.price.product) !== approved.productId || item.price.unit_amount !== approved.amount || item.price.currency !== approved.currency
    || item.price.recurring?.interval !== approved.interval || item.price.recurring?.interval_count !== 1
    || item.current_period_start > Date.now() / 1_000 || item.current_period_end <= Date.now() / 1_000) return null;
  const invoices = await runtime.stripe.invoices.list({ customer: binding.customerId!, subscription: subscription.id, status: `paid`, limit: 10 });
  for (const invoice of invoices.data) {
    if (invoice.status !== `paid` || invoice.livemode !== runtime.config.livemode || stripeId(invoice.customer) !== binding.customerId
      || stripeId(invoice.parent?.subscription_details?.subscription) !== subscription.id || invoice.collection_method !== `charge_automatically`
      || invoice.currency !== approved.currency || invoice.amount_paid < approved.amount || invoice.amount_remaining !== 0
      || invoice.pre_payment_credit_notes_amount !== 0 || invoice.post_payment_credit_notes_amount !== 0
      || invoice.total_discount_amounts?.some(discount => discount.amount > 0)) continue;
    const lines = invoice.lines;
    if (lines.has_more || lines.data.length !== 1) continue;
    const line = lines.data[0];
    const parent = line?.parent?.subscription_item_details;
    if (!line || line.livemode !== runtime.config.livemode || line.quantity !== 1 || line.amount !== approved.amount || line.currency !== approved.currency
      || stripeId(line.pricing?.price_details?.price) !== approved.priceId || stripeId(parent?.subscription) !== subscription.id || stripeId(parent?.subscription_item) !== item.id || parent?.proration
      || line.period.start !== item.current_period_start || line.period.end !== item.current_period_end) continue;
    if (await paymentProvesInvoice(runtime, binding, invoice, approved.amount)) return { start: line.period.start, end: line.period.end };
  }
  if (invoices.has_more) throw pending();
  return null;
};
export const reconcileBinding = async (runtime: BillingRuntime, binding: BillingBinding, lease: Record<string, string>, event?: Stripe.Event): Promise<Entitlement> => {
  const eventFields = event ? { eventId: event.id, eventType: event.type, eventCreated: iso(event.created) } : {};
  if (!binding.customerId) throw new BillingError(409, `customer-unavailable`, `This Account Has No Connected Billing Customer`);
  await verifyCustomer(runtime, binding);
  const approved = await billingRpc<BillingAttempt[]>(runtime, `approved_prices`, { authUid: binding.authUid, ...bindingScope(runtime) });
  const subscriptions = await runtime.stripe.subscriptions.list({ customer: binding.customerId, status: `all`, limit: 21 });
  if (subscriptions.has_more) throw pending();
  const relevant = subscriptions.data.filter(subscription => matchesBinding(runtime, binding, subscription.metadata));
  if (subscriptions.data.some(subscription => !terminal.has(subscription.status) && !relevant.includes(subscription))) throw pending();
  const current = relevant.filter(subscription => !terminal.has(subscription.status));
  if (current.length > 1) throw pending();
  let subscription = current[0] ?? relevant.find(candidate => candidate.id === binding.subscriptionId);
  if (!subscription && binding.attempt?.sessionId) {
    const session = await verifiedSession(runtime, binding, binding.attempt);
    const subscriptionId = stripeId(session.subscription);
    if (session.status === `complete` && subscriptionId) {
      const direct = await runtime.stripe.subscriptions.retrieve(subscriptionId);
      if (direct.livemode !== runtime.config.livemode || stripeId(direct.customer) !== binding.customerId || !matchesBinding(runtime, binding, direct.metadata)) throw pending();
      subscription = direct;
    }
  }
  if (!subscription) return billingRpc(runtime, `commit`, { ...lease, ...eventFields, state: `free`, planSlug: null, customerId: binding.customerId, subscriptionId: null, subscriptionStatus: `none`, validFrom: null, validUntil: null, cancelAtPeriodEnd: false });
  const purchase = approved.find(attempt => attempt.id === subscription.metadata?.attempt_id);
  if (!purchase?.sessionId || subscription.livemode !== runtime.config.livemode || stripeId(subscription.customer) !== binding.customerId) throw pending();
  const checkout = await verifiedSession(runtime, binding, purchase);
  if (checkout.status !== `complete` || stripeId(checkout.subscription) !== subscription.id) throw pending();
  if (binding.attempt?.id === purchase.id && binding.attempt.status !== `complete`) {
    await billingRpc(runtime, `save_attempt`, { ...lease, attemptId: purchase.id, sessionId: purchase.sessionId, status: `complete` });
    binding.attempt.status = `complete`;
  }
  const window = subscription.status === `active` && !subscription.pause_collection && !subscription.pending_update ? await paidWindow(runtime, binding, subscription, purchase) : null;
  const state = window ? `paid` : terminal.has(subscription.status) || [`unpaid`, `past_due`, `paused`].includes(subscription.status) ? `free` : `pending`;
  const entitlement = await billingRpc<Entitlement>(runtime, `commit`, {
    ...lease, ...eventFields, state,
    planSlug: window ? purchase.planSlug : null,
    customerId: binding.customerId,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    validFrom: window ? iso(window.start) : null,
    validUntil: window ? iso(window.end) : null,
  });
  binding.subscriptionId = subscription.id;
  return entitlement;
};
