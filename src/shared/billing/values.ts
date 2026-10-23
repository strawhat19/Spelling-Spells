import type { BillingEntitlement, BillingSnapshot, ReconcileResult } from './types';

export const unavailableEntitlement = (): BillingEntitlement => ({ state: `unavailable`, revision: 0, planSlug: null, planName: null, validFrom: null, validUntil: null, subscriptionStatus: null, cancelAtPeriodEnd: false });
export const freeEntitlement = (): BillingEntitlement => ({ ...unavailableEntitlement(), state: `free`, planSlug: `free`, planName: `Free` });
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Billing Response Could Not Be Confirmed`);
  return value as Record<string, unknown>;
};
const nullableText = (value: unknown, maximum: number): value is string | null => value === null || typeof value === `string` && value.length > 0 && value.length <= maximum;
const nullableDate = (value: unknown): value is string | null => value === null || typeof value === `string` && Number.isFinite(Date.parse(value));
export const readEntitlement = (value: unknown): BillingEntitlement => {
  const row = object(value);
  if (![`free`, `paid`, `pending`, `unavailable`].includes(String(row.state)) || !Number.isSafeInteger(row.revision) || Number(row.revision) < 0 ||
    !nullableText(row.planSlug, 100) || !nullableText(row.planName, 120) || !nullableText(row.subscriptionStatus, 60) ||
    !nullableDate(row.validFrom) || !nullableDate(row.validUntil) || typeof row.cancelAtPeriodEnd !== `boolean`) throw new Error(`The Account Plan Could Not Be Confirmed`);
  if (row.state === `paid` && (!row.planSlug || !row.planName || !row.validFrom || !row.validUntil || Date.parse(row.validFrom) > Date.now() || Date.parse(row.validUntil) <= Date.now())) return unavailableEntitlement();
  return row as unknown as BillingEntitlement;
};
export const readBillingSnapshot = (value: unknown): BillingSnapshot => {
  const row = object(value);
  if (row.status !== `ready` || typeof row.checkoutAvailable !== `boolean` || typeof row.portalAvailable !== `boolean` || !Array.isArray(row.offers) || row.offers.length > 100 || row.message !== undefined && typeof row.message !== `string`) throw new Error(`Billing Availability Could Not Be Confirmed`);
  const offers = row.offers.map((value) => {
    const offer = object(value);
    if (typeof offer.slug !== `string` || offer.slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(offer.slug) || !Number.isSafeInteger(offer.revision) || Number(offer.revision) < 1 || typeof offer.available !== `boolean` || offer.message !== undefined && typeof offer.message !== `string`) throw new Error(`The Billing Offer Could Not Be Confirmed`);
    return { slug: offer.slug, revision: Number(offer.revision), available: offer.available, ...(typeof offer.message === `string` ? { message: offer.message } : {}) };
  });
  if (new Set(offers.map((offer) => offer.slug)).size !== offers.length) throw new Error(`The Billing Offers Could Not Be Confirmed`);
  return { status: `ready`, offers, entitlement: readEntitlement(row.entitlement), portalAvailable: row.portalAvailable, checkoutAvailable: row.checkoutAvailable, ...(typeof row.message === `string` ? { message: row.message } : {}) };
};
export const readReconcileResult = (value: unknown): ReconcileResult => {
  const row = object(value);
  if (![`confirmed`, `pending`, `failed`].includes(String(row.state)) || typeof row.message !== `string` || row.message.length > 1000) throw new Error(`Payment Confirmation Is Unavailable`);
  return { state: row.state as ReconcileResult[`state`], message: row.message, ...(row.entitlement ? { entitlement: readEntitlement(row.entitlement) } : {}) };
};
