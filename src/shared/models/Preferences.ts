import type { ThemeName, StorageMode } from '../../types/types';

export type SpellPreferences = {
  version: 1;
  savedIds: string[];
  historyIds: string[];
};

export type ThemePreference = {
  version: 1;
  theme: ThemeName;
};

export type PreferenceSnapshot = {
  mode: StorageMode;
  error: string | null;
  preferences: SpellPreferences;
};

export type ThemeSnapshot = {
  mode: StorageMode;
  error: string | null;
  preference: ThemePreference;
};
