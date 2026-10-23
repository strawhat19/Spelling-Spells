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

export type GrimoireSnapshot = {
  data: GrimoireData;
  persisted: boolean;
  error: string | null;
};

export type GrimoireContextValue = {
  ready: boolean;
  busy: boolean;
  persisted: boolean;
  error: string | null;
  collections: GrimoireCollection[];
  entries: Record<string, GrimoireEntry>;
  exportData: () => string;
  refresh: () => Promise<void>;
  saveNote: (spellId: string, note: string) => Promise<boolean>;
  createCollection: (name: string) => Promise<string | null>;
  resetProgress: (spellIds: string[]) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<boolean>;
  renameCollection: (id: string, name: string) => Promise<boolean>;
  recordReview: (spellId: string, remembered: boolean) => Promise<boolean>;
  setCollectionSpell: (collectionId: string, spellId: string, included: boolean) => Promise<boolean>;
};
