import type { ReactNode } from 'react';
import type { Spell, World } from '../models/Spell';
import type { PreferenceSnapshot } from '../models/Preferences';
import { spellsAPI, preferencesAPI } from '../../api';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SpellsContextValue = {
  spells: Spell[];
  worlds: World[];
  savedIds: string[];
  historyIds: string[];
  ready: boolean;
  error: string | null;
  toggleSaved: (id: string) => Promise<void>;
  isSaved: (id: string) => boolean;
  clearSaved: () => Promise<void>;
  recordViewed: (id: string) => Promise<void>;
  dismissError: () => void;
};

export const SpellsContext = createContext<SpellsContextValue | null>(null);

export const SpellsProvider = ({ children }: { children: ReactNode }) => {
  const hydrated = useRef(false);
  const [ready, setReady] = useState(false);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const applyPreferences = useCallback((snapshot: PreferenceSnapshot) => {
    setSavedIds(snapshot.preferences.savedIds);
    setHistoryIds(snapshot.preferences.historyIds);
    if (snapshot.error) setError(snapshot.error);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      spellsAPI.getCatalog(),
      preferencesAPI.getPreferences(),
    ]).then(([catalog, preferences]) => {
      if (!active) return;
      setSpells(catalog.spells);
      setWorlds(catalog.worlds);
      applyPreferences(preferences);
      hydrated.current = true;
      setReady(true);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(failure instanceof Error ? failure.message : `The Spell Catalog Could Not Be Loaded`);
      setReady(true);
    });
    return () => { active = false; };
  }, [applyPreferences]);

  const mutatePreferences = useCallback(async (
    operation: () => Promise<PreferenceSnapshot>,
  ): Promise<void> => {
    if (!hydrated.current) {
      setError(`Your preferences are still loading. Try again in a moment.`);
      return;
    }
    try {
      applyPreferences(await operation());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : `Preferences Could Not Be Updated`);
    }
  }, [applyPreferences]);

  const clearSaved = useCallback(
    () => mutatePreferences(() => preferencesAPI.clearSaved()),
    [mutatePreferences],
  );
  const toggleSaved = useCallback(
    (id: string) => mutatePreferences(() => preferencesAPI.toggleSaved(id)),
    [mutatePreferences],
  );
  const recordViewed = useCallback(
    (id: string) => mutatePreferences(() => preferencesAPI.recordViewed(id)),
    [mutatePreferences],
  );
  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);
  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo<SpellsContextValue>(() => ({
    ready,
    error,
    spells,
    worlds,
    isSaved,
    savedIds,
    clearSaved,
    historyIds,
    toggleSaved,
    recordViewed,
    dismissError,
  }), [
    ready,
    error,
    spells,
    worlds,
    isSaved,
    savedIds,
    clearSaved,
    historyIds,
    toggleSaved,
    recordViewed,
    dismissError,
  ]);

  return <SpellsContext.Provider value={value}>{children}</SpellsContext.Provider>;
};
