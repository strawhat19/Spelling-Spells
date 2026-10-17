import type { SpellMedia } from '../models/Spell';

const illustration = (slug: string, alt: string): SpellMedia[] => [{
  alt,
  type: `image`,
  id: `${slug}-illustration`,
  url: `/visuals/spells/${slug}.png`,
  credit: `AI-generated illustration · Spelling Spells`,
  caption: `Original illustration inspired by the spell’s fictional effect`,
}];

export const spellMedia: Partial<Record<string, SpellMedia[]>> = {
  Lumos: illustration(`lumos`, `Luminous magic illuminating a dark fantasy setting`),
  Adurna: illustration(`adurna`, `Water rising and swirling under magical control`),
  Jierda: illustration(`jierda`, `A forceful burst of magic fracturing a stone object`),
  Brisingr: illustration(`brisingr`, `Swirling flames glowing against a dark fantasy backdrop`),
  Alohomora: illustration(`alohomora`, `Magical light unlocking an ornate door`),
  Expelliarmus: illustration(`expelliarmus`, `A wand flying away amid a burst of disarming magic`),
  'Fus Ro Dah': illustration(`fus-ro-dah`, `An expanding wave of force sweeping across a rugged landscape`),
  'Expecto Patronum': illustration(`expecto-patronum`, `A luminous animal guardian casting protective light through mist`),
  'Wingardium Leviosa': illustration(`wingardium-leviosa`, `A feather suspended in the air by levitation magic`),
};
