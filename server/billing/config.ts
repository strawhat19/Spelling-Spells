import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { BillingConfig, BillingRuntime } from './types';

export const billingApiVersion = `2026-09-30.endive`;
export class BillingError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const value = (name: string): string => process.env[name]?.trim() ?? ``;
const required = (name: string): string => {
  const result = value(name);
  if (!result) throw new BillingError(503, `configuration-required`, `${name} Is Not Configured`);
  return result;
};
export const billingOrigin = (): string => {
  const origin = new URL(required(`BILLING_SITE_URL`));
  if (origin.protocol !== `https:` || origin.username || origin.password || origin.port || origin.pathname !== `/` || origin.search || origin.hash) {
    throw new BillingError(503, `configuration-invalid`, `Billing Site URL Must Be An HTTPS Origin`);
  }
  return origin.origin;
};
export const billingConfiguration = (): BillingConfig => {
  const mode = required(`STRIPE_LIVE_MODE`);
  if (mode !== `true` && mode !== `false`) throw new BillingError(503, `configuration-invalid`, `Stripe Mode Must Be Explicit`);
  const livemode = mode === `true`;
  const accountId = required(`STRIPE_ACCOUNT_ID`);
  const secretKey = required(`STRIPE_BILLING_SERVER_KEY`);
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId) || !new RegExp(`^(sk|rk)_${livemode ? `live` : `test`}_[A-Za-z0-9]+$`).test(secretKey)) {
    throw new BillingError(503, `configuration-invalid`, `Stripe Account And Key Mode Must Match The Intended Environment`);
  }
  const databaseKey = required(`SUPABASE_SECRET_KEY`);
  const publicKey = required(`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`);
  if (databaseKey === publicKey || databaseKey.startsWith(`sb_publishable_`)) throw new BillingError(503, `configuration-invalid`, `Billing Requires A Server-Only Database Key`);
  return {
    livemode, accountId, secretKey,
    origin: billingOrigin(),
    appId: required(`BILLING_APP_ID`),
    databaseKey, publicKey,
    supabaseUrl: required(`EXPO_PUBLIC_SUPABASE_URL`),
    portalId: value(`STRIPE_PORTAL_CONFIGURATION_ID`),
    productId: value(`STRIPE_STARTER_PRODUCT_ID`),
    priceId: value(`STRIPE_STARTER_PRICE_ID`),
    webhookId: value(`STRIPE_WEBHOOK_ENDPOINT_ID`),
    webhookSecret: value(`STRIPE_WEBHOOK_SECRET`),
  };
};
export const createDatabase = (url: string, key: string, token?: string) => createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }),
  },
});
export const createBillingRuntime = (): BillingRuntime => {
  const config = billingConfiguration();
  return {
    config,
    database: createDatabase(config.supabaseUrl, config.databaseKey),
    stripe: new Stripe(config.secretKey, { timeout: 6_000, maxNetworkRetries: 1, apiVersion: billingApiVersion }),
  };
};
export const createViewer = (token: string) => createDatabase(required(`EXPO_PUBLIC_SUPABASE_URL`), required(`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), token);
export const billingRpc = async <T,>(runtime: BillingRuntime, action: string, payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await runtime.database.rpc(`billing_operation`, { p_action: action, p_payload: payload });
  if (error) {
    if (error.code === `55P03` || /Lease|Operation In Progress/i.test(error.message)) throw new BillingError(409, `confirmation-pending`, `Billing Confirmation Is In Progress. Refresh Before Trying Again`);
    throw new BillingError(503, `persistence-unavailable`, `Billing State Could Not Be Confirmed`);
  }
  return data as T;
};
