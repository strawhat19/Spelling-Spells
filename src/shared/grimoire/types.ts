export type GrimoireCollection = {
  id: string;
  name: string;
  number: number;
  spellIds: string[];
};

export type GrimoireEntry = {
  note: string;
  streak: number;
  reviews: number;
  correct: number;
  lastReviewedAt: string | null;
};

export type GrimoireData = {
  version: 1;
  collections: GrimoireCollection[];
  entries: Record<string, GrimoireEntry>;
  nextCollectionNumber: number;
};

export type DeviceGrimoireSnapshot = {
  data: GrimoireData;
  persisted: boolean;
  error: string | null;
};
export type GrimoireSnapshot = DeviceGrimoireSnapshot & {
  revision: number;
  accountId: string;
  updatedAt: string | null;
  source: `cloud` | `unavailable`;
};

export type GrimoireContextValue = {
  ready: boolean;
  busy: boolean;
  scope: string;
  writable: boolean;
  authenticated: boolean;
  canImportDevicePreview: boolean;
  revision: number;
  source: `cloud` | `unavailable`;
  persisted: boolean;
  error: string | null;
  collections: GrimoireCollection[];
  entries: Record<string, GrimoireEntry>;
  exportData: () => string;
  refresh: () => Promise<void>;
  importDevicePreview: () => Promise<boolean>;
  saveNote: (spellId: string, note: string) => Promise<boolean>;
  createCollection: (name: string) => Promise<string | null>;
  resetProgress: (spellIds: string[]) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<boolean>;
  renameCollection: (id: string, name: string) => Promise<boolean>;
  recordReview: (spellId: string, remembered: boolean) => Promise<boolean>;
  setCollectionSpell: (collectionId: string, spellId: string, included: boolean) => Promise<boolean>;
};
