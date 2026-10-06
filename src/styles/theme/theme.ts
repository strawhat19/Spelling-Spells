import type { ThemeName } from '../../types/types';

export type ThemePalette = {
  text: string;
  gold: string;
  error: string;
  muted: string;
  panel: string;
  border: string;
  primary: string;
  surface: string;
  lavender: string;
  background: string;
};

export const themePalettes: Record<ThemeName, ThemePalette> = {
  night: {
    gold: `#FFC857`,
    text: `#FFF9EA`,
    error: `#FF9DAB`,
    muted: `#BBAED5`,
    panel: `#291B46`,
    border: `#483661`,
    primary: `#B79AFF`,
    surface: `#20143D`,
    lavender: `#D8C8F2`,
    background: `#17102B`,
  },
  ivory: {
    gold: `#D79520`,
    text: `#20134D`,
    error: `#A92D4B`,
    muted: `#746386`,
    panel: `#F3ECFC`,
    border: `#DAD0E7`,
    primary: `#6039D8`,
    surface: `#FFFFFF`,
    lavender: `#D8C8F2`,
    background: `#FFF9EA`,
  },
};
