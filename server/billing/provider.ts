import type Stripe from 'stripe';
import { BillingError } from './config';
import type { BillingBinding, BillingRuntime, CatalogPlan } from './types';

export const stripeId = (value: string | { id: string } | null | undefined): string | null => typeof value === `string` ? value : value?.id ?? null;
export const bindingMetadata = (runtime: BillingRuntime, binding: BillingBinding) => ({
  app_id: runtime.config.appId,
  auth_uid: binding.authUid,
  binding_id: binding.bindingId,
  account_id: binding.accountId,
});
export const matchesBinding = (runtime: BillingRuntime, binding: BillingBinding, metadata: Stripe.Metadata | null | undefined): boolean =>
  Boolean(metadata && metadata.app_id === runtime.config.appId && metadata.binding_id === binding.bindingId
    && metadata.account_id === binding.accountId && metadata.auth_uid === binding.authUid);
export const verifyStripeAccount = async (runtime: BillingRuntime, requireCharges = false): Promise<void> => {
  const account = await runtime.stripe.accounts.retrieveCurrent();
  if (account.id !== runtime.config.accountId) throw new BillingError(503, `account-mismatch`, `Stripe Credentials Belong To A Different Account`);
  if (requireCharges && runtime.config.livemode && !account.charges_enabled) throw new BillingError(503, `activation-required`, `Stripe Live Payments Need Account Activation`);
};
export const catalogPlan = async (runtime: BillingRuntime, slug: string): Promise<CatalogPlan> => {
  const { data, error } = await runtime.database.from(`pricing_plans`).select(`id,number,slug,name,active,revision,currency,interval,price_cents`).eq(`slug`, slug).single();
  if (error || !data) throw new BillingError(409, `offer-unavailable`, `This Plan Is No Longer Available. Reload Pricing`);
  return data as CatalogPlan;
};
export const approvedOffer = async (runtime: BillingRuntime, slug: string, revision?: number) => {
  if (slug !== `starter` || !runtime.config.priceId || !runtime.config.productId) throw new BillingError(503, `offer-unconfigured`, `This Plan Is Not Connected To Stripe`);
  const plan = await catalogPlan(runtime, slug);
  if (!plan.active || plan.price_cents <= 0 || plan.currency !== `USD` || ![`month`, `year`].includes(plan.interval) || (revision !== undefined && plan.revision !== revision)) {
    throw new BillingError(409, `offer-changed`, `This Offer Changed. Reload Pricing Before Continuing`);
  }
  const price = await runtime.stripe.prices.retrieve(runtime.config.priceId, { expand: [`product`] });
  const product = price.product;
  if (!product || typeof product === `string` || `deleted` in product || !product.active || product.id !== runtime.config.productId
    || product.metadata?.app_id !== runtime.config.appId || product.metadata?.plan_id !== plan.id
    || price.livemode !== runtime.config.livemode || !price.active || price.type !== `recurring` || price.billing_scheme !== `per_unit`
    || price.unit_amount !== plan.price_cents || price.currency !== plan.currency.toLowerCase()
    || price.recurring?.interval !== plan.interval || price.recurring?.interval_count !== 1 || price.transform_quantity || price.custom_unit_amount) {
    throw new BillingError(409, `price-mismatch`, `The Published Offer Needs Its Approved Stripe Price Updated`);
  }
  return { plan, price, product };
};
export const validateHostedUrl = (value: string | null | undefined, host: `checkout.stripe.com` | `billing.stripe.com`): string => {
  if (!value) throw new BillingError(503, `hosted-url-unavailable`, `Stripe Did Not Return A Hosted Billing URL`);
  const url = new URL(value);
  if (url.protocol !== `https:` || url.hostname !== host || url.port || url.username || url.password) throw new BillingError(503, `hosted-url-invalid`, `Stripe Returned An Unexpected Billing Destination`);
  return url.href;
};
export const verifyCustomer = async (runtime: BillingRuntime, binding: BillingBinding): Promise<Stripe.Customer> => {
  if (!binding.customerId) throw new BillingError(409, `customer-unavailable`, `No Billing Customer Is Connected To This Account`);
  const customer = await runtime.stripe.customers.retrieve(binding.customerId);
  if (`deleted` in customer || customer.livemode !== runtime.config.livemode || !matchesBinding(runtime, binding, customer.metadata)) {
    throw new BillingError(409, `customer-mismatch`, `The Billing Customer Binding Needs Review`);
  }
  return customer;
};
export const verifyPortal = async (runtime: BillingRuntime): Promise<void> => {
  if (!runtime.config.portalId) throw new BillingError(503, `portal-unconfigured`, `Billing Management Is Not Configured`);
  const portal = await runtime.stripe.billingPortal.configurations.retrieve(runtime.config.portalId);
  if (!portal.active || portal.livemode !== runtime.config.livemode || portal.metadata?.app_id !== runtime.config.appId
    || portal.default_return_url !== `${runtime.config.origin}/billing-return` || !portal.features.subscription_cancel.enabled
    || portal.features.subscription_cancel.mode !== `at_period_end` || portal.features.subscription_update.enabled) {
    throw new BillingError(503, `portal-configuration-invalid`, `Billing Management Configuration Needs Review`);
  }
};
export const webhookEvents = [
  `charge.refunded`,
  `charge.dispute.created`,
  `charge.dispute.closed`,
  `credit_note.created`,
  `credit_note.voided`,
  `invoice.paid`,
  `invoice.voided`,
  `invoice.payment_failed`,
  `invoice.marked_uncollectible`,
  `customer.subscription.created`,
  `customer.subscription.updated`,
  `customer.subscription.deleted`,
  `checkout.session.completed`,
  `checkout.session.expired`,
  `checkout.session.async_payment_failed`,
  `checkout.session.async_payment_succeeded`,
] as const;
export const verifyWebhook = async (runtime: BillingRuntime): Promise<void> => {
  if (!runtime.config.webhookId || !runtime.config.webhookSecret.startsWith(`whsec_`)) throw new BillingError(503, `webhook-unconfigured`, `Verified Billing Webhooks Are Required Before Checkout`);
  const endpoint = await runtime.stripe.webhookEndpoints.retrieve(runtime.config.webhookId);
  if (endpoint.status !== `enabled` || endpoint.livemode !== runtime.config.livemode || endpoint.url !== `${runtime.config.origin}/api/billing/webhook`
    || endpoint.api_version !== `2026-09-30.endive` || !webhookEvents.every(event => endpoint.enabled_events.includes(event) || endpoint.enabled_events.includes(`*`))) {
    throw new BillingError(503, `webhook-configuration-invalid`, `The Billing Webhook Configuration Needs Review`);
  }
};
