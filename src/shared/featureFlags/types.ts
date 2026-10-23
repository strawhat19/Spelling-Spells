import type { AccountRole } from '../authentication/types';

export type FeatureKey = `themeToggle`;
export type FeatureRole = `Guest` | AccountRole;
export type FeatureStatus = `loading` | `ready` | `error` | `unavailable`;
export type FeaturePolicy = {
  enabled: boolean;
  description: string;
  minimumRole: FeatureRole;
  roles: FeatureRole[] | null;
};
export type FeatureSettings = {
  id: string;
  number: number;
  version: 1;
  revision: number;
  createdAt: string;
  updatedAt: string;
  features: { themeToggle: FeaturePolicy };
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
  themeToggleEnabled: boolean;
  saveFeature: (key: FeatureKey, policy: FeaturePolicy, expectedRevision: number) => Promise<boolean>;
};
