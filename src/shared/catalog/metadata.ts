import type { Spell, World } from '../models/Spell';
import { getSpellPath } from './routes';

export const getWorldSlug = (world: World): string => world.slug || world.id;
export const getWorldPath = (world: World): `/world/${string}` => `/world/${getWorldSlug(world)}`;
export const getSpellStructuredData = (spell: Spell, world: World | undefined, origin: string): Record<string, unknown> => ({
  '@type': `CreativeWork`,
  '@context': `https://schema.org`,
  name: spell.name,
  description: spell.definition,
  url: new URL(getSpellPath(spell), origin).href,
  keywords: [spell.entryType, spell.category, spell.sourceTitle].filter(Boolean).join(`, `),
  about: { '@type': `Thing`, name: world?.name ?? spell.sourceTitle },
  citation: spell.sources.map((source) => ({ '@type': `CreativeWork`, name: source.label, url: source.url })),
});
