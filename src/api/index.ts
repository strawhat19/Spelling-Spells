import { seedSpells, seedWorlds } from '../shared/catalog/seed';
import type { Spell, World } from '../shared/models/Spell';
import type { ThemeName, StorageMode } from '../types/types';
import { appName, historyLimit, storageKeys, useLocalStorage } from '../shared/config';
import {
  storageName,
  queueStorageOperation,
  readStoredPreference,
  writeStoredPreference,
} from '../shared/common/storage';
import type {
  ThemeSnapshot,
  ThemePreference,
  SpellPreferences,
  PreferenceSnapshot,
} from '../shared/models/Preferences';

export type SpellCatalog = {
  spells: Spell[];
  worlds: World[];
};

export type ServiceHealth = {
  title: string;
  success: boolean;
  timestamp: string;
  connection: string;
  storageName: string;
  storageMode: StorageMode;
};

const emptyPreferences = (): SpellPreferences => ({
  version: 1,
  savedIds: [],
  historyIds: [],
});
const defaultTheme = (): ThemePreference => ({ version: 1, theme: `night` });
const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === `object` && value !== null && !Array.isArray(value)
);
const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === `string`)
);
const isPreferences = (value: unknown): value is SpellPreferences => (
  isObject(value)
  && value.version === 1
  && isStringArray(value.savedIds)
  && isStringArray(value.historyIds)
);
const isThemePreference = (value: unknown): value is ThemePreference => (
  isObject(value)
  && value.version === 1
  && (value.theme === `night` || value.theme === `ivory`)
);
const errorMessage = (error: unknown, fallback: string): string => (
  error instanceof Error ? error.message : fallback
);
const assertSpellExists = (id: string): void => {
  if (!seedSpells.some((spell) => spell.id === id)) {
    throw new Error(`This Spell Is Not in the Catalog`);
  }
};
const clonePreferences = (snapshot: PreferenceSnapshot): PreferenceSnapshot => ({
  ...snapshot,
  preferences: {
    ...snapshot.preferences,
    savedIds: [...snapshot.preferences.savedIds],
    historyIds: [...snapshot.preferences.historyIds],
  },
});
const cloneTheme = (snapshot: ThemeSnapshot): ThemeSnapshot => ({
  ...snapshot,
  preference: { ...snapshot.preference },
});

let preferencesState: PreferenceSnapshot | null = null;
let preferencesLoading: Promise<PreferenceSnapshot> | null = null;
let themeState: ThemeSnapshot | null = null;
let themeLoading: Promise<ThemeSnapshot> | null = null;

const loadPreferences = (): Promise<PreferenceSnapshot> => {
  if (preferencesState) return Promise.resolve(clonePreferences(preferencesState));
  if (preferencesLoading) return preferencesLoading.then(clonePreferences);

  preferencesLoading = readStoredPreference(
    storageKeys.preferences,
    `Saved spells and history`,
    isPreferences,
    emptyPreferences(),
  ).then((result) => {
    preferencesState = {
      error: result.error,
      mode: result.persisted ? `local` : `session`,
      preferences: {
        version: 1,
        savedIds: [...new Set(result.value.savedIds)],
        historyIds: [...new Set(result.value.historyIds)].slice(0, historyLimit),
      },
    };
    return clonePreferences(preferencesState);
  });
  return preferencesLoading.then(clonePreferences);
};

const loadTheme = (): Promise<ThemeSnapshot> => {
  if (themeState) return Promise.resolve(cloneTheme(themeState));
  if (themeLoading) return themeLoading.then(cloneTheme);

  themeLoading = readStoredPreference(
    storageKeys.theme,
    `Theme preference`,
    isThemePreference,
    defaultTheme(),
  ).then((result) => {
    themeState = {
      error: result.error,
      preference: { ...result.value },
      mode: result.persisted ? `local` : `session`,
    };
    return cloneTheme(themeState);
  });
  return themeLoading.then(cloneTheme);
};

const updatePreferences = (
  update: (current: SpellPreferences) => SpellPreferences,
): Promise<PreferenceSnapshot> => queueStorageOperation(storageKeys.preferences, async () => {
  const current = await loadPreferences();
  const preferences = update(current.preferences);
  let error = current.error;
  let mode = current.mode;

  try {
    await writeStoredPreference(storageKeys.preferences, `Saved spells and history`, preferences);
    mode = useLocalStorage ? `local` : `session`;
    error = null;
  } catch (failure) {
    mode = `session`;
    error = errorMessage(failure, `Changes are available in this session only`);
  }

  preferencesState = { preferences, error, mode };
  return clonePreferences(preferencesState);
});

export const spellsAPI = {
  getCatalog: async (): Promise<SpellCatalog> => ({
    worlds: seedWorlds.map((world) => ({ ...world })),
    spells: seedSpells.map((spell) => ({
      ...spell,
      aliases: [...spell.aliases],
      syllables: [...spell.syllables],
      sources: spell.sources.map((source) => ({ ...source })),
      breakdown: spell.breakdown.map((part) => ({ ...part })),
    })),
  }),
};

export const preferencesAPI = {
  getPreferences: loadPreferences,
  clearSaved: (): Promise<PreferenceSnapshot> => updatePreferences((current) => ({
    ...current,
    savedIds: [],
  })),
  toggleSaved: (id: string): Promise<PreferenceSnapshot> => updatePreferences((current) => {
    assertSpellExists(id);
    return {
      ...current,
      savedIds: current.savedIds.includes(id)
        ? current.savedIds.filter((savedId) => savedId !== id)
        : [...current.savedIds, id],
    };
  }),
  recordViewed: (id: string): Promise<PreferenceSnapshot> => updatePreferences((current) => {
    assertSpellExists(id);
    return {
      ...current,
      historyIds: [id, ...current.historyIds.filter((historyId) => historyId !== id)].slice(0, historyLimit),
    };
  }),
};

export const themeAPI = {
  getTheme: loadTheme,
  setTheme: (theme: ThemeName): Promise<ThemeSnapshot> => queueStorageOperation(storageKeys.theme, async () => {
    if (theme !== `night` && theme !== `ivory`) throw new Error(`Unsupported Theme`);
    const current = await loadTheme();
    const preference: ThemePreference = { version: 1, theme };
    let error = current.error;
    let mode = current.mode;

    try {
      await writeStoredPreference(storageKeys.theme, `Theme preference`, preference);
      mode = useLocalStorage ? `local` : `session`;
      error = null;
    } catch (failure) {
      mode = `session`;
      error = errorMessage(failure, `Theme changes are available in this session only`);
    }

    themeState = { preference, error, mode };
    return cloneTheme(themeState);
  }),
};

const getHealth = async (): Promise<ServiceHealth> => {
  const [preferences, theme] = await Promise.all([loadPreferences(), loadTheme()]);
  const hasError = Boolean(preferences.error || theme.error);
  const sessionOnly = preferences.mode === `session` || theme.mode === `session`;
  return {
    title: appName,
    success: !hasError,
    timestamp: new Date().toISOString(),
    storageMode: sessionOnly ? `session` : `local`,
    storageName: sessionOnly ? `Session Memory` : storageName,
    connection: sessionOnly
      ? `The catalog is bundled locally. Some or all preferences are available in this session only; no backend is connected.`
      : `The catalog is bundled locally. Preferences use browser or device storage; no backend is connected.`,
  };
};

export const api = {
  getHealth,
  getStatus: getHealth,
  getDirectory: async () => ({
    ...(await getHealth()),
    operations: [
      `getHealth`,
      `getStatus`,
      `getCatalog`,
      `getTheme`,
      `setTheme`,
      `clearSaved`,
      `toggleSaved`,
      `recordViewed`,
      `getPreferences`,
    ],
    message: `Typed asynchronous client services; these operations are not hosted HTTP endpoints.`,
  }),
};
