import type {
  SpellAccent,
  SpellMedium,
  SkillLevel,
  EtymologyStatus,
} from '../../types/types';

export type SpellMedia = {
  id: string;
  url: string;
  alt: string;
  type: `image` | `video`;
  credit?: string;
  poster?: string;
  caption?: string;
  sourceUrl?: string;
};

export type Spell = {
  id: string;
  number: number;
  name: string;
  worldId: string;
  sourceTitle: string;
  medium: SpellMedium;
  kind: string;
  language: string;
  pronunciation: string;
  pronunciationNote: string;
  syllables: string[];
  definition: string;
  usage: string;
  etymology: string;
  etymologyStatus: EtymologyStatus;
  breakdown: { label: string; meaning: string }[];
  danger: number;
  utility: number;
  skill: SkillLevel;
  category: string;
  accent: SpellAccent;
  counterspell?: string;
  aliases: string[];
  media?: SpellMedia[];
  sources: { label: string; url: string }[];
};

export type World = {
  id: string;
  name: string;
  medium: string;
  description: string;
};

export type SpellRecord = Spell;
