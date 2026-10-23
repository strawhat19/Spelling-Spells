import type Stripe from 'stripe';
import { Buffer } from 'node:buffer';
import { bindingScope, withBillingOperation } from './identity';
import { BillingError, billingRpc, billingApiVersion } from './config';
import type { BillingAttempt, BillingBinding, BillingRuntime } from './types';
import { recoverAttempt, reconcileBinding, verifiedSession } from './reconcile';
import { stripeId, webhookEvents, verifyCustomer, verifyStripeAccount } from './provider';

type WebhookResource = Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice | Stripe.Charge | Stripe.Dispute | Stripe.CreditNote;
type WebhookResult = { received: true; ignored?: boolean };
const bodyLimit = 512 * 1024;
const pending = () => new BillingError(503, `webhook-confirmation-pending`, `Webhook Billing Confirmation Is Pending. Retry Delivery`);
const resourceKind = (event: Stripe.Event): WebhookResource[`object`] => event.type.startsWith(`checkout.session.`) ? `checkout.session` : event.type.startsWith(`customer.subscription.`) ? `subscription` : event.type.startsWith(`credit_note.`) ? `credit_note` : event.type.startsWith(`invoice.`) ? `invoice` : event.type.startsWith(`charge.dispute.`) ? `dispute` : `charge`;
const rawBody = async (request: Request): Promise<Buffer> => {
  const length = request.headers.get(`content-length`);
  if (length && (!/^\d+$/.test(length) || Number(length) > bodyLimit)) throw new BillingError(413, `webhook-body-too-large`, `The Webhook Body Exceeds The Supported Size`);
  if (!request.body || request.bodyUsed) throw new BillingError(400, `webhook-body-required`, `An Unmodified Webhook Body Is Required`);
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 10_000);
  try {
    while (true) {
      const next = await reader.read();
      if (timedOut) throw new BillingError(408, `webhook-body-timeout`, `Webhook Body Reading Timed Out`);
      if (next.done) break;
      size += next.value.byteLength;
      if (size > bodyLimit) { void reader.cancel().catch(() => undefined); throw new BillingError(413, `webhook-body-too-large`, `The Webhook Body Exceeds The Supported Size`); }
      chunks.push(Buffer.from(next.value));
    }
    if (!size) throw new BillingError(400, `webhook-body-required`, `An Unmodified Webhook Body Is Required`);
    return Buffer.concat(chunks, size);
  } catch (error) {
    if (error instanceof BillingError) throw error;
    throw new BillingError(503, `webhook-body-unavailable`, `The Webhook Body Could Not Be Read. Retry Delivery`);
  } finally { clearTimeout(timeout); reader.releaseLock(); }
};
const signedEvent = async (runtime: BillingRuntime, request: Request): Promise<Stripe.Event> => {
  const signature = request.headers.get(`stripe-signature`);
  if (!signature || signature.length > 4096) throw new BillingError(400, `webhook-signature-required`, `A Valid Stripe Signature Is Required`);
  if (!runtime.config.webhookSecret?.startsWith(`whsec_`)) throw new BillingError(503, `webhook-unconfigured`, `Webhook Signing Configuration Is Required`);
  const raw = await rawBody(request);
  let event: Stripe.Event;
  try { event = runtime.stripe.webhooks.constructEvent(raw, signature, runtime.config.webhookSecret); }
  catch { throw new BillingError(400, `webhook-signature-invalid`, `The Webhook Signature Could Not Be Verified`); }
  if (event.object !== `event` || !/^evt_[A-Za-z0-9]{1,250}$/.test(event.id) || !Number.isSafeInteger(event.created) || event.created < 0 || event.api_version !== billingApiVersion) {
    throw new BillingError(400, `webhook-version-invalid`, `The Webhook Event Or API Version Is Unsupported`);
  }
  if (event.livemode !== runtime.config.livemode || event.account !== undefined && event.account !== runtime.config.accountId) throw new BillingError(400, `webhook-scope-invalid`, `The Webhook Account Or Mode Does Not Match This App`);
  return event;
};
const invoiceClaimsApp = (runtime: BillingRuntime, invoice: Stripe.Invoice | null | undefined): boolean => invoice?.metadata?.app_id === runtime.config.appId || invoice?.parent?.subscription_details?.metadata?.app_id === runtime.config.appId;
const claimsApp = (runtime: BillingRuntime, resource: WebhookResource): boolean => {
  if (resource.metadata?.app_id === runtime.config.appId) return true;
  if (resource.object === `invoice`) return invoiceClaimsApp(runtime, resource);
  return resource.object === `credit_note` && typeof resource.invoice !== `string` && invoiceClaimsApp(runtime, resource.invoice);
};
const eventResource = (runtime: BillingRuntime, event: Stripe.Event): WebhookResource => {
  const resource = event.data?.object as WebhookResource | undefined;
  if (!resource || resource.object !== resourceKind(event) || typeof resource.id !== `string` || resource.id.length > 255 || resource.livemode !== runtime.config.livemode) throw new BillingError(400, `webhook-object-invalid`, `The Signed Webhook Object Is Unsupported`);
  return resource;
};
const resourceCustomer = async (runtime: BillingRuntime, resource: WebhookResource): Promise<string | null> => {
  if (resource.object !== `dispute`) return stripeId(resource.customer);
  const chargeId = stripeId(resource.charge);
  if (!chargeId || !/^ch_[A-Za-z0-9]+$/.test(chargeId)) throw pending();
  const charge = await runtime.stripe.charges.retrieve(chargeId);
  if (charge.id !== chargeId || charge.livemode !== runtime.config.livemode) throw pending();
  return stripeId(charge.customer);
};
const alreadyProcessed = async (runtime: BillingRuntime, event: Stripe.Event): Promise<boolean> => {
  const result = await billingRpc<{ alreadyProcessed: boolean }>(runtime, `event`, { ...bindingScope(runtime), eventId: event.id });
  if (typeof result?.alreadyProcessed !== `boolean`) throw pending();
  return result.alreadyProcessed;
};
const verifyCheckoutEvent = async (runtime: BillingRuntime, binding: BillingBinding, lease: Record<string, string>, resource: Stripe.Checkout.Session): Promise<boolean> => {
  let attempt = binding.attempt?.sessionId === resource.id ? binding.attempt : null;
  if (!attempt && binding.attempt && !binding.attempt.sessionId && resource.metadata?.attempt_id === binding.attempt.id) {
    const candidate = { ...binding.attempt, sessionId: resource.id };
    const session = await verifiedSession(runtime, binding, candidate);
    const status: `open` | `complete` | `expired` | null = session.status === `open` ? `open` : session.status === `complete` ? `complete` : session.status === `expired` ? `expired` : null;
    if (!status) throw pending();
    const saved = await billingRpc<{ saved: boolean }>(runtime, `save_attempt`, { ...lease, attemptId: candidate.id, sessionId: session.id, status });
    if (!saved?.saved) throw pending();
    binding.attempt = { ...candidate, status };
    attempt = binding.attempt;
  }
  if (!attempt) {
    const history = await billingRpc<BillingAttempt[]>(runtime, `approved_prices`, { ...bindingScope(runtime), authUid: binding.authUid });
    if (!Array.isArray(history) || history.length > 100) throw pending();
    attempt = history.find((item) => item.sessionId === resource.id) ?? null;
  }
  if (!attempt) { if (claimsApp(runtime, resource)) throw pending(); return false; }
  const session = await verifiedSession(runtime, binding, attempt);
  if (session.id !== resource.id) throw pending();
  return true;
};

export const receiveWebhook = async (runtime: BillingRuntime, request: Request): Promise<WebhookResult> => {
  const event = await signedEvent(runtime, request);
  if (!(webhookEvents as readonly string[]).includes(event.type)) return { received: true, ignored: true };
  const resource = eventResource(runtime, event);
  try {
    await verifyStripeAccount(runtime, false);
    if (await alreadyProcessed(runtime, event)) return { received: true };
    const customerId = await resourceCustomer(runtime, resource);
    if (!customerId || !/^cus_[A-Za-z0-9]+$/.test(customerId)) {
      if (claimsApp(runtime, resource)) throw pending();
      return { received: true, ignored: true };
    }
    const known = await billingRpc<BillingBinding | null>(runtime, `lookup`, { ...bindingScope(runtime), customerId });
    if (!known) { if (claimsApp(runtime, resource)) throw pending(); return { received: true, ignored: true }; }
    if (known.customerId !== customerId || !known.bindingId || !known.accountId || !known.authUid) throw pending();
    return await withBillingOperation(runtime, known.authUid, async (binding, lease): Promise<WebhookResult> => {
      if (binding.bindingId !== known.bindingId || binding.accountId !== known.accountId || binding.customerId !== customerId) throw pending();
      if (await alreadyProcessed(runtime, event)) return { received: true };
      await verifyCustomer(runtime, binding);
      if (binding.attempt) {
        const attempt = binding.attempt;
        const recovered = await recoverAttempt(runtime, binding, lease, attempt);
        if (recovered?.status === `expired`) {
          const saved = await billingRpc<{ saved: boolean }>(runtime, `save_attempt`, { ...lease, attemptId: attempt.id, sessionId: recovered.id, status: `expired` });
          if (!saved?.saved) throw pending();
          binding.attempt = null;
        }
      }
      if (resource.object === `checkout.session` && !await verifyCheckoutEvent(runtime, binding, lease, resource)) return { received: true, ignored: true };
      await reconcileBinding(runtime, binding, lease, event);
      return { received: true };
    });
  } catch (error) {
    if (error instanceof BillingError && error.status >= 500) throw error;
    throw pending();
  }
};
