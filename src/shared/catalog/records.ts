import type { Spell, World } from '../models/Spell';
import type { CatalogSpell, CatalogSource, CatalogStatus } from './types';

export const catalogObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Catalog Returned An Invalid Record`);
  return value as Record<string, unknown>;
};
const text = (value: unknown, fallback = ``): string => typeof value === `string` ? value : fallback;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === `string`) : [];
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const https = (value: unknown): string => {
  const url = new URL(text(value));
  if (url.protocol !== `https:` || url.username || url.password) throw new Error(`Catalog Sources Require A Public HTTPS URL`);
  return url.href;
};

export const sourceFromRecord = (value: unknown): CatalogSource => {
  const row = catalogObject(value);
  const payload = catalogObject(row.payload ?? {});
  return { ...payload, id: text(row.id), url: https(row.url), label: text(row.label), revision: Number(row.revision) };
};
export const worldFromRecord = (value: unknown): World => {
  const row = catalogObject(value);
  const payload = catalogObject(row.payload ?? {});
  if (!text(row.id) || !text(row.name)) throw new Error(`A Catalog Universe Is Missing Its Identity`);
  return {
    id: text(row.id),
    name: text(row.name),
    slug: text(row.slug),
    medium: text(payload.medium),
    revision: Number(row.revision),
    continuity: text(payload.continuity),
    description: text(payload.description),
    kind: row.kind === `folklore` ? `folklore` : `fictional`,
  };
};
export const spellFromRecord = (value: unknown, sources?: readonly CatalogSource[]): CatalogSpell => {
  const row = catalogObject(value);
  const payload = catalogObject(row.payload);
  const placeholder = payload.seedPlaceholder === true && row.status === `draft`;
  if (!text(row.id) || !text(row.slug) || !text(row.name) || (!text(row.universe_id) && !placeholder) || !Number.isSafeInteger(row.number)) {
    throw new Error(`A Catalog Entry Is Missing Its Stable Identity`);
  }
  const sourceIds = strings(payload.sourceIds);
  const references = sources
    ? sourceIds.map((id) => sources.find((source) => source.id === id)).filter((source): source is CatalogSource => Boolean(source)).map(({ label, url }) => ({ label, url }))
    : array(payload.sources).map((value) => { const source = catalogObject(value); return { label: text(source.label), url: https(source.url) }; });
  if (row.status === `published` && (!references.length || sourceIds.some((id) => sources && !sources.some((source) => source.id === id)))) {
    throw new Error(`A Published Entry Has Missing Source Records`);
  }
  return {
    ...payload,
    importPlaceholder: placeholder,
    sourceIds,
    id: text(row.id),
    sources: references,
    slug: text(row.slug),
    name: text(row.name),
    aliases: strings(payload.aliases),
    number: Number(row.number),
    worldId: text(row.universe_id),
    status: text(row.status) as CatalogStatus,
    revision: Number(row.revision),
    updatedAt: text(row.updated_at),
    sourceTitle: text(payload.sourceTitle),
    medium: text(payload.medium, `Books`) as Spell[`medium`],
    kind: text(payload.kind),
    language: text(payload.language),
    pronunciation: text(payload.pronunciation),
    pronunciationNote: text(payload.pronunciationNote),
    syllables: strings(payload.syllables),
    definition: text(payload.definition, placeholder ? `Legacy record awaiting the catalog import` : ``),
    usage: text(payload.usage),
    etymology: text(payload.etymology),
    etymologyStatus: text(payload.etymologyStatus, `Unconfirmed`) as Spell[`etymologyStatus`],
    breakdown: array(payload.breakdown).map((item) => { const part = catalogObject(item); return { label: text(part.label), meaning: text(part.meaning) }; }),
    danger: Number(payload.danger ?? 0),
    utility: Number(payload.utility ?? 0),
    skill: text(payload.skill, `Intermediate`) as Spell[`skill`],
    category: text(payload.category),
    accent: text(payload.accent, `wand`) as Spell[`accent`],
    casters: strings(payload.casters),
    continuity: text(payload.continuity),
    effect: text(payload.effect, text(payload.definition)),
    entryType: text(payload.entryType, `spell`) as Spell[`entryType`],
    evidenceStatus: text(payload.evidenceStatus, `unverified`) as Spell[`evidenceStatus`],
    pronunciationStatus: text(payload.pronunciationStatus, payload.pronunciation ? `approximate` : `unavailable`) as Spell[`pronunciationStatus`],
  };
};
