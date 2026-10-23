import type { FeatureRole, FeaturePolicy, FeatureSettings } from './types';
import { freePlanSlug, comparePlanTiers, type PlanTier } from '../plans/tiers';

export const featureScope = `global`;
export const featureKeys = [`themeToggle`, `marquee`, `notifications`, `contact`, `grimoireTools`] as const;
export const featureRoles: FeatureRole[] = [`Guest`, `Member`, `Subscriber`, `Developer`, `Admin`, `Owner`];
export const featureRoleRank: Record<FeatureRole, number> = { Guest: 0, Member: 1, Subscriber: 2, Developer: 3, Admin: 4, Owner: 5 };
export const featureColumns = `id,number,scope,type,name,version,revision,features,created_at,updated_at`;
const featureIdPattern = /^FeatureSettings_([1-9][0-9]*)_Global_\d{4}-\d{2}-\d{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const defaultThemeTogglePolicy: FeaturePolicy = {
  plans: null,
  roles: null,
  enabled: true,
  planMode: `minimum`,
  minimumRole: `Guest`,
  description: `Choose between the light and dark themes`,
};
export const isFeatureRole = (value: unknown): value is FeatureRole => typeof value === `string` && featureRoles.includes(value as FeatureRole);
export const publicFeatureForHref = (href: string): `contact` | `notifications` | null => {
  const path = href.split(/[?#]/)?.[0]?.replace(/\/+$/, ``);
  return path === `/contact` || path === `/contact-us` ? `contact` : path === `/alerts` || path === `/notification` || path === `/notifications` || path?.startsWith(`/notifications/`) ? `notifications` : null;
};
export const normalizeFeaturePolicy = (value: unknown, legacy = false): FeaturePolicy => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Feature Policy Is Unavailable`);
  const policy = value as Record<string, unknown>;
  const keys = legacy ? [`roles`, `enabled`, `description`, `minimumRole`] : [`roles`, `plans`, `enabled`, `planMode`, `description`, `minimumRole`];
  if (Object.keys(policy).length !== keys.length || Object.keys(policy).some((key) => !keys.includes(key)) ||
    typeof policy.enabled !== `boolean` || !isFeatureRole(policy.minimumRole) || typeof policy.description !== `string` ||
    !policy.description.trim() || policy.description.trim().length > 600 || /[\u0000-\u001f\u007f]/.test(policy.description)) throw new Error(`Use A Description Of 1–600 Characters And A Valid Feature Value And Minimum Role`);
  if (policy.roles !== null && (!Array.isArray(policy.roles) || policy.roles.length > featureRoles.length || policy.roles.some((role) => !isFeatureRole(role)) || new Set(policy.roles).size !== policy.roles.length)) throw new Error(`Choose Only Supported Feature Roles`);
  if (!legacy && (policy.planMode !== `minimum` || (policy.plans !== null && (!Array.isArray(policy.plans) || policy.plans.length !== 1 || typeof policy.plans?.[0] !== `string` || policy.plans[0] === freePlanSlug || policy.plans[0].length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(policy.plans[0]))))) throw new Error(`Choose One Supported Minimum Plan Or Free And Above`);
  return {
    enabled: policy.enabled,
    planMode: `minimum`,
    plans: legacy || policy.plans === null ? null : [String((policy.plans as string[])?.[0])],
    minimumRole: policy.minimumRole,
    description: policy.description.trim(),
    roles: policy.roles === null ? null : featureRoles.filter((role) => (policy.roles as FeatureRole[]).includes(role)),
  };
};
export const featurePolicyAllows = (policy: FeaturePolicy | undefined, role: FeatureRole | null, plan: string | null, tiers: PlanTier[], tiersReady: boolean): boolean => {
  if (!policy || !role || !policy.enabled || !isFeatureRole(role) || !isFeatureRole(policy.minimumRole) || featureRoleRank[role] < featureRoleRank[policy.minimumRole] || (policy.roles !== null && !policy.roles.includes(role)) || !plan) return false;
  if (plan !== freePlanSlug && (!tiersReady || !tiers.some((tier) => tier.slug === plan))) return false;
  const threshold = policy.plans?.[0];
  if (!threshold) return true;
  if (!tiersReady || plan === freePlanSlug) return false;
  const required = tiers.find((tier) => tier.slug === threshold);
  const current = tiers.find((tier) => tier.slug === plan);
  return Boolean(current && required && comparePlanTiers(current, required) >= 0);
};
export const readFeatureSettings = (value: unknown): FeatureSettings => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Feature Settings Are Unavailable`);
  const row = value as Record<string, unknown>;
  const match = typeof row.id === `string` ? featureIdPattern.exec(row.id) : null;
  if (!match || row.scope !== featureScope || row.type !== `FeatureSettings` || row.name !== `Global` || (row.version !== 1 && row.version !== 2) ||
    !Number.isSafeInteger(row.number) || row.number !== Number(match[1]) || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1 ||
    typeof row.created_at !== `string` || !Number.isFinite(Date.parse(row.created_at)) || typeof row.updated_at !== `string` || !Number.isFinite(Date.parse(row.updated_at))) throw new Error(`The Feature Settings Have An Unsupported Identity Or Version`);
  const expectedKeys = row.version === 1 ? [`themeToggle`] : featureKeys;
  if (!row.features || typeof row.features !== `object` || Array.isArray(row.features) || Object.keys(row.features).length !== expectedKeys.length || expectedKeys.some((key) => !(key in (row.features as object)))) throw new Error(`The Feature Settings Have An Unsupported Feature Map`);
  return {
    version: row.version as 1 | 2,
    id: row.id as string,
    number: row.number as number,
    revision: row.revision as number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    features: Object.fromEntries(expectedKeys.map((key) => [key, normalizeFeaturePolicy((row.features as Record<string, unknown>)[key], row.version === 1)])),
  };
};
