import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Entitlement = {
  state: `free` | `paid` | `pending` | `unavailable`;
  planSlug: string | null;
  planName: string | null;
  validFrom: string | null;
  validUntil: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  revision: number;
};
export type CatalogPlan = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  number: number;
  revision: number;
  currency: string;
  interval: string;
  price_cents: number;
};
export type BillingConfig = {
  appId: string;
  origin: string;
  livemode: boolean;
  accountId: string;
  secretKey: string;
  supabaseUrl: string;
  databaseKey: string;
  publicKey: string;
  priceId: string;
  productId: string;
  portalId: string;
  webhookId: string;
  webhookSecret: string;
};
export type BillingAttempt = {
  id: string;
  planId: string;
  priceId: string;
  productId: string;
  planSlug: string;
  createdAt: string;
  amount: number;
  currency: string;
  interval: string;
  status: `prepared` | `open` | `complete` | `expired` | `uncertain` | `closed` | `reconciled`;
  sessionId: string | null;
  planRevision: number;
  idempotencyKey: string;
};
export type BillingBinding = {
  authUid: string;
  bindingId: string;
  accountId: string;
  createdAt: string;
  customerAttemptStartedAt: string | null;
  active?: boolean;
  customerId: string | null;
  subscriptionId: string | null;
  attempt: BillingAttempt | null;
  leaseToken?: string;
  leaseUntil?: string;
  operationId?: string;
};
export type BillingRuntime = {
  stripe: Stripe;
  database: SupabaseClient;
  config: BillingConfig;
};
export type BillingActor = {
  id: string;
  email: string;
  emailVerified: boolean;
  authUid: string;
  role: string;
  viewer: SupabaseClient;
  entitlement: Entitlement;
};
