import type { Spell, World } from '../models/Spell';

export type CatalogStatus = `draft` | `review` | `approved` | `rejected` | `published` | `unpublished`;
export type CatalogSpell = Spell & { status: CatalogStatus; revision: number; updatedAt?: string; importPlaceholder?: boolean };
export type CatalogSource = {
  id: string;
  url: string;
  label: string;
  kind?: string;
  locator?: string;
  revision?: number;
  publisher?: string;
  evidenceNote?: string;
};
export type PublicCatalog = { spells: Spell[]; worlds: World[] };
export type OwnerCatalog = { spells: CatalogSpell[]; worlds: World[]; sources: CatalogSource[] };
