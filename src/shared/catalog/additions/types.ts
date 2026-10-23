import type { Spell } from '../../models/Spell';

export type AdditionalSpellInput = Omit<Spell,
  `id` | `media` | `etymology` | `breakdown` | `syllables` | `pronunciation` |
  `etymologyStatus` | `pronunciationNote` | `pronunciationStatus`
>;
