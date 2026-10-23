import type { FeatureRole, FeaturePolicy, FeatureSettings } from './types';

export const featureScope = `global`;
export const featureRoles: FeatureRole[] = [`Guest`, `Member`, `Subscriber`, `Developer`, `Admin`, `Owner`];
export const featureRoleRank: Record<FeatureRole, number> = { Guest: 0, Member: 1, Subscriber: 2, Developer: 3, Admin: 4, Owner: 5 };
export const featureColumns = `id,number,scope,type,name,version,revision,features,created_at,updated_at`;
const featureIdPattern = /^FeatureSettings_([1-9][0-9]*)_Global_\d{4}-\d{2}-\d{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const defaultThemeTogglePolicy: FeaturePolicy = {
  roles: null,
  enabled: true,
  minimumRole: `Guest`,
  description: `Choose between the light and dark themes`,
};
export const isFeatureRole = (value: unknown): value is FeatureRole => typeof value === `string` && featureRoles.includes(value as FeatureRole);
export const normalizeFeaturePolicy = (value: unknown): FeaturePolicy => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Feature Policy Is Unavailable`);
  const policy = value as Record<string, unknown>;
  if (Object.keys(policy).length !== 4 || Object.keys(policy).some((key) => ![`roles`, `enabled`, `description`, `minimumRole`].includes(key)) ||
    typeof policy.enabled !== `boolean` || !isFeatureRole(policy.minimumRole) || typeof policy.description !== `string` ||
    !policy.description.trim() || policy.description.trim().length > 600 || /[\u0000-\u001f\u007f]/.test(policy.description)) throw new Error(`Use A Description Of 1–600 Characters And A Valid Feature Value And Minimum Role`);
  if (policy.roles !== null && (!Array.isArray(policy.roles) || policy.roles.length > featureRoles.length || policy.roles.some((role) => !isFeatureRole(role)) || new Set(policy.roles).size !== policy.roles.length)) throw new Error(`Choose Only Supported Feature Roles`);
  return {
    enabled: policy.enabled,
    minimumRole: policy.minimumRole,
    description: policy.description.trim(),
    roles: policy.roles === null ? null : featureRoles.filter((role) => (policy.roles as FeatureRole[]).includes(role)),
  };
};
export const featurePolicyAllows = (policy: FeaturePolicy, role: FeatureRole | null): boolean => Boolean(
  role && policy.enabled && isFeatureRole(role) && isFeatureRole(policy.minimumRole) &&
  featureRoleRank[role] >= featureRoleRank[policy.minimumRole] && (policy.roles === null || policy.roles.includes(role)),
);
export const readFeatureSettings = (value: unknown): FeatureSettings => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Feature Settings Are Unavailable`);
  const row = value as Record<string, unknown>;
  const match = typeof row.id === `string` ? featureIdPattern.exec(row.id) : null;
  if (!match || row.scope !== featureScope || row.type !== `FeatureSettings` || row.name !== `Global` || row.version !== 1 ||
    !Number.isSafeInteger(row.number) || row.number !== Number(match[1]) || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1 ||
    typeof row.created_at !== `string` || !Number.isFinite(Date.parse(row.created_at)) || typeof row.updated_at !== `string` || !Number.isFinite(Date.parse(row.updated_at))) throw new Error(`The Feature Settings Have An Unsupported Identity Or Version`);
  if (!row.features || typeof row.features !== `object` || Array.isArray(row.features) || Object.keys(row.features).length !== 1 || !(`themeToggle` in row.features)) throw new Error(`The Feature Settings Have An Unsupported Feature Map`);
  return {
    version: 1,
    id: row.id as string,
    number: row.number as number,
    revision: row.revision as number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    features: { themeToggle: normalizeFeaturePolicy((row.features as Record<string, unknown>).themeToggle) },
  };
};
