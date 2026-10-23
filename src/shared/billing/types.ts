export type BillingState = `free` | `paid` | `pending` | `unavailable`;
export type BillingAction = `checkout` | `portal` | `reconcile`;
export type BillingEntitlement = {
  state: BillingState;
  revision: number;
  planSlug: string | null;
  planName: string | null;
  validFrom: string | null;
  validUntil: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
};
export type BillingOffer = { slug: string; revision: number; available: boolean; message?: string };
export type BillingSnapshot = {
  status: `ready`;
  offers: BillingOffer[];
  message?: string;
  checkoutAvailable: boolean;
  portalAvailable: boolean;
  entitlement: BillingEntitlement;
};
export type ReconcileResult = {
  message: string;
  state: `confirmed` | `pending` | `failed`;
  entitlement?: BillingEntitlement;
};
