import type { Spell } from '../models/Spell';

type SpellIdentity = Pick<Spell, `name` | `number` | `slug`>;
type SpellRoute = { id?: string; slug?: string };

// Published slugs stay stable even if an entry's display name is edited.
const publishedSlugs: Record<number, string> = {
  1: `lumos`,
  2: `fus-ro-dah`,
  3: `brisingr`,
  4: `alohomora`,
  5: `wingardium-leviosa`,
  6: `expelliarmus`,
  7: `expecto-patronum`,
  8: `adurna`,
  9: `jierda`,
};

export const getSpellSlug = (spell: SpellIdentity): string => {
  if (spell.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spell.slug)) return spell.slug;
  const name = spell.name.normalize(`NFKD`).replace(/[\u0300-\u036f]/g, ``)
    .toLowerCase().replace(/[^a-z0-9]+/g, `-`).replace(/^-|-$/g, ``);
  return publishedSlugs[spell.number] ?? `${name || `spell`}-${spell.number}`;
};

export const getSpellPath = (spell: SpellIdentity): `/spell/${string}` => `/spell/${getSpellSlug(spell)}`;

export const findSpellByRoute = (spells: readonly Spell[], { id, slug }: SpellRoute): Spell | undefined => (
  slug
    ? spells.find((spell) => getSpellSlug(spell) === slug)
    : spells.find((spell) => spell.id === id)
);
