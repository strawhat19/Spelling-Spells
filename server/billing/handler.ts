import { Buffer } from 'node:buffer';
import { receiveWebhook } from './webhook';
import { startCheckout, startPortal } from './checkout';
import { BillingError, billingOrigin, billingRpc, createBillingRuntime } from './config';
import { recoverAttempt, reconcileBinding, verifiedSession } from './reconcile';
import { authenticateBilling, bindingScope, readBinding, withBillingOperation } from './identity';
import { approvedOffer, stripeId, verifyCustomer, verifyPortal, verifyStripeAccount, verifyWebhook } from './provider';
import type { BillingActor, BillingAttempt, BillingRuntime, CatalogPlan, Entitlement } from './types';

const headers = { 'Vary': `Origin`, 'Cache-Control': `private, no-store`, 'Content-Type': `application/json; charset=utf-8`, 'X-Content-Type-Options': `nosniff` };
const reply = (value: unknown, status = 200, extra?: Record<string, string>): Response => new Response(JSON.stringify(value), { status, headers: { ...headers, ...extra } });
const currentEntitlement = async (actor: BillingActor): Promise<Entitlement> => {
  const { data, error } = await actor.viewer.rpc(`own_billing_entitlement`);
  if (error || !data || ![`free`, `paid`, `pending`, `unavailable`].includes(data.state)) throw new BillingError(503, `entitlement-unavailable`, `Your Current Account Access Could Not Be Confirmed`);
  return data as Entitlement;
};
const readJson = async (request: Request): Promise<Record<string, unknown>> => {
  if (request.headers.get(`content-type`)?.split(`;`)[0]?.trim().toLowerCase() !== `application/json`) throw new BillingError(415, `json-required`, `Use A JSON Billing Request`);
  if (Number(request.headers.get(`content-length`) ?? 0) > 8_192) throw new BillingError(413, `request-too-large`, `The Billing Request Is Too Large`);
  const reader = request.body?.getReader();
  if (!reader) throw new BillingError(400, `invalid-request`, `Use A Valid Billing Request`);
  const chunks: Uint8Array[] = [];
  let length = 0;
  const deadline = Date.now() + 5_000;
  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const next = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new BillingError(408, `request-timeout`, `The Billing Request Timed Out`)), Math.max(1, deadline - Date.now())); }),
      ]).finally(() => clearTimeout(timer));
      if (next.done) break;
      length += next.value.byteLength;
      if (length > 8_192) throw new BillingError(413, `request-too-large`, `The Billing Request Is Too Large`);
      chunks.push(next.value);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString(`utf8`));
    if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`Invalid Request`);
    return value as Record<string, unknown>;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof BillingError) throw error;
    throw new BillingError(400, `invalid-request`, `Use A Valid Billing Request`);
  } finally { reader.releaseLock(); }
};
const onlyKeys = (body: Record<string, unknown>, keys: string[]): void => {
  if (Object.keys(body).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(body, key))) throw new BillingError(400, `invalid-request`, `Use The Supported Billing Request Fields`);
};
const status = async (actor: BillingActor) => {
  const base = { status: `ready`, entitlement: actor.entitlement, checkoutAvailable: false, portalAvailable: false, offers: [] as { slug: string; revision: number; available: boolean; message?: string }[] };
  let runtime: BillingRuntime;
  try { runtime = createBillingRuntime(); }
  catch { return { ...base, message: `Billing Setup Is Not Ready` }; }
  const { data, error } = await runtime.database.from(`pricing_plans`).select(`id,number,slug,name,active,revision,currency,interval,price_cents`).eq(`active`, true).gt(`price_cents`, 0).limit(101);
  if (error || !data || data.length > 100) return { ...base, message: `Billing Offers Could Not Be Confirmed` };
  let binding;
  try { await verifyStripeAccount(runtime); binding = await readBinding(runtime, actor.authUid); }
  catch { return { ...base, message: `Stripe Billing Is Temporarily Unavailable` }; }
  const [portal, webhook, activated] = await Promise.allSettled([verifyPortal(runtime), verifyWebhook(runtime), verifyStripeAccount(runtime, true)]);
  const verified = actor.emailVerified;
  const canStart = verified && webhook.status === `fulfilled` && portal.status === `fulfilled` && activated.status === `fulfilled`;
  const offers = await Promise.all((data as CatalogPlan[]).map(async plan => {
    if (!canStart) return { slug: plan.slug, revision: plan.revision, available: false, message: verified ? `Billing Setup Is Not Ready` : `Verify Your Email Before Subscribing` };
    try { await approvedOffer(runtime, plan.slug, plan.revision); return { slug: plan.slug, revision: plan.revision, available: true }; }
    catch (error) { return { slug: plan.slug, revision: plan.revision, available: false, message: error instanceof BillingError ? error.message : `This Billing Offer Is Unavailable` }; }
  }));
  let customerVerified = false;
  if (binding?.customerId && verified && portal.status === `fulfilled`) {
    try { await verifyCustomer(runtime, binding); customerVerified = true; } catch { customerVerified = false; }
  }
  const terminal = !actor.entitlement.subscriptionStatus || [`none`, `canceled`, `incomplete_expired`].includes(actor.entitlement.subscriptionStatus);
  return { ...base, offers, entitlement: await currentEntitlement(actor), portalAvailable: customerVerified,
    checkoutAvailable: terminal && actor.entitlement.state === `free` && offers.some(offer => offer.available),
    ...(!canStart ? { message: verified ? `Billing Setup Needs Attention Before New Purchases` : `Verify Your Email Before Subscribing` } : {}),
  };
};
const reconcileReturn = async (runtime: BillingRuntime, actor: BillingActor, sessionId: string) => {
  await verifyStripeAccount(runtime);
  return withBillingOperation(runtime, actor.authUid, async (binding, lease) => {
    if (binding.accountId !== actor.id || !binding.customerId) throw new BillingError(403, `session-mismatch`, `This Checkout Does Not Belong To The Current Account`);
    if (binding.attempt) await recoverAttempt(runtime, binding, lease, binding.attempt);
    const history = await billingRpc<BillingAttempt[]>(runtime, `approved_prices`, { ...bindingScope(runtime), authUid: actor.authUid });
    const attempt = history.find(candidate => candidate.sessionId === sessionId);
    if (!attempt) throw new BillingError(403, `session-mismatch`, `This Checkout Does Not Belong To The Current Account`);
    const session = await verifiedSession(runtime, binding, attempt);
    const entitlement = await reconcileBinding(runtime, binding, lease);
    await currentEntitlement(actor);
    if (session.status === `expired`) return { state: `failed`, entitlement, message: `This Checkout Expired. Your Current Account Access Is Shown Below` };
    if (session.status === `complete` && entitlement.state === `paid` && stripeId(session.subscription) === binding.subscriptionId) return { state: `confirmed`, entitlement, message: `Your Subscription And Current Paid Period Are Confirmed` };
    if (entitlement.state === `free` && [`canceled`, `incomplete_expired`, `unpaid`].includes(entitlement.subscriptionStatus ?? ``)) return { state: `failed`, entitlement, message: `This Subscription Has No Current Confirmed Paid Access. Open Billing To Review It` };
    return { state: `pending`, entitlement, message: `Payment Confirmation Is Still Pending. Refresh Before Trying Another Purchase` };
  });
};
const allowedOrigin = (request: Request): string | null => {
  const origin = request.headers.get(`origin`);
  if (!origin) {
    if (request.headers.get(`sec-fetch-site`) === `cross-site`) throw new BillingError(403, `origin-denied`, `Use Billing From The Spelling Spells Website`);
    return null;
  }
  if (origin !== billingOrigin()) throw new BillingError(403, `origin-denied`, `Use Billing From The Spelling Spells Website`);
  return origin;
};
export const billingHandler = async (request: Request): Promise<Response> => {
  let cors: Record<string, string> = {};
  try {
    const url = new URL(request.url);
    const operation = url.searchParams.get(`operation`);
    if (url.searchParams.getAll(`operation`).length !== 1 || [...url.searchParams.keys()].some(key => key !== `operation`) || ![`status`, `checkout`, `portal`, `reconcile`, `webhook`].includes(operation ?? ``)) throw new BillingError(404, `not-found`, `Billing Operation Not Found`);
    if (operation === `webhook`) {
      if (request.method !== `POST`) return reply({ error: { code: `method-not-allowed`, message: `Use POST For Webhooks` } }, 405, { Allow: `POST` });
      return reply(await receiveWebhook(createBillingRuntime(), request));
    }
    const origin = allowedOrigin(request);
    cors = origin ? { 'Access-Control-Allow-Origin': origin } : {};
    const method = operation === `status` ? `GET` : `POST`;
    if (request.method === `OPTIONS`) return new Response(null, { status: 204, headers: { ...headers, ...cors, 'Access-Control-Allow-Methods': method, 'Access-Control-Allow-Headers': `Authorization, Content-Type` } });
    if (request.method !== method) return reply({ error: { code: `method-not-allowed`, message: `Use The Supported Billing Method` } }, 405, { ...cors, Allow: method });
    const body = method === `POST` ? await readJson(request) : {};
    const actor = await authenticateBilling(request, operation !== `status`);
    if (operation === `status`) return reply(await status(actor), 200, cors);
    const runtime = createBillingRuntime();
    if (operation === `portal`) { onlyKeys(body, []); return reply(await startPortal(runtime, actor), 200, cors); }
    if (operation === `checkout`) {
      onlyKeys(body, [`planSlug`, `expectedRevision`]);
      if (typeof body.planSlug !== `string` || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.planSlug) || body.planSlug.length > 80 || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 1) throw new BillingError(400, `invalid-offer`, `Use A Current Published Billing Offer`);
      return reply(await startCheckout(runtime, actor, { planSlug: body.planSlug, expectedRevision: Number(body.expectedRevision) }), 200, cors);
    }
    onlyKeys(body, [`sessionId`]);
    if (typeof body.sessionId !== `string` || !/^cs_(?:test_|live_)?[A-Za-z0-9]{8,220}$/.test(body.sessionId)) throw new BillingError(400, `invalid-session`, `Use A Valid Checkout Return`);
    return reply(await reconcileReturn(runtime, actor, body.sessionId), 200, cors);
  } catch (error) {
    if (error instanceof BillingError) return reply({ error: { code: error.code, message: error.message } }, error.status, cors);
    console.error(`Billing Request Could Not Be Confirmed`);
    return reply({ error: { code: `billing-unavailable`, message: `Billing Could Not Be Confirmed. Refresh Before Trying Again` } }, 503, cors);
  }
};
