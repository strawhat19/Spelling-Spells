import type { AccountRole } from '../authentication/types';
import type { PlanTier, PlanTierSnapshot } from '../plans/tiers';

export type FeatureKey = `themeToggle` | `marquee` | `notifications` | `contact` | `grimoireTools`;
export type FeatureRole = `Guest` | AccountRole;
export type FeatureStatus = `loading` | `ready` | `error` | `unavailable`;
export type FeaturePolicy = {
  enabled: boolean;
  planMode: `minimum`;
  plans: [string] | null;
  description: string;
  minimumRole: FeatureRole;
  roles: FeatureRole[] | null;
};
export type FeatureSettings = {
  id: string;
  number: number;
  version: 1 | 2;
  revision: number;
  createdAt: string;
  updatedAt: string;
  features: Partial<Record<FeatureKey, FeaturePolicy>>;
};
export type FeatureSnapshot = {
  status: FeatureStatus;
  error: string | null;
  settings: FeatureSettings | null;
};
export type FeatureFlagsValue = FeatureSnapshot & {
  ready: boolean;
  saving: boolean;
  reload: () => void;
  saveError: string | null;
  tiers: PlanTier[];
  tierError: string | null;
  tierStatus: PlanTierSnapshot[`status`];
  marqueeEnabled: boolean;
  contactEnabled: boolean;
  notificationsEnabled: boolean;
  grimoireToolsEnabled: boolean;
  themeToggleEnabled: boolean;
  saveFeature: (key: FeatureKey, policy: FeaturePolicy, expectedRevision: number) => Promise<boolean>;
};
