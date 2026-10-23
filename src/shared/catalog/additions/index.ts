import { spellMedia } from '../media';
import { additionalSpellsA } from './groupA';
import { additionalSpellsB } from './groupB';
import { additionalSpellsC } from './groupC';
import type { Spell } from '../../models/Spell';
import { createRecordId } from '../../common/ids';
import type { AdditionalSpellInput } from './types';

const createAdditionalSpell = (spell: AdditionalSpellInput): Spell => ({
  syllables: [],
  breakdown: [],
  pronunciation: ``,
  etymologyStatus: `Unconfirmed`,
  pronunciationStatus: `unavailable`,
  etymology: `Etymology has not been independently established for this entry.`,
  pronunciationNote: `No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.`,
  ...spell,
  media: spellMedia[spell.name] ?? [],
  id: createRecordId(`Spell`, spell.number, spell.name, `2026-10-23`, `9f30574b-478e-461c-959e-${String(spell.number).padStart(12, `0`)}`),
});

export const additionalSpells: readonly Spell[] = Object.freeze([
  ...additionalSpellsA,
  ...additionalSpellsB,
  ...additionalSpellsC,
].map(createAdditionalSpell));
