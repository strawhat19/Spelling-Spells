import type { ReactNode } from 'react';
import { emptyGrimoire } from './service';
import { grimoireAPI } from '../../api/grimoire';
import { subscribeGrimoireRefresh } from './refreshEvents';
import type { GrimoireContextValue, GrimoireSnapshot } from './types';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const GrimoireContext = createContext<GrimoireContextValue | null>(null);

export const GrimoireProvider = ({ children }: { children: ReactNode }) => {
  const mounted = useRef(false);
  const operations = useRef(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<GrimoireSnapshot>({ error: null, persisted: false, data: emptyGrimoire() });
  const begin = useCallback(() => { operations.current += 1; if (mounted.current) setBusy(true); }, []);
  const finish = useCallback(() => {
    operations.current = Math.max(0, operations.current - 1);
    if (mounted.current) setBusy(operations.current > 0);
  }, []);
  const apply = useCallback((value: GrimoireSnapshot) => {
    if (!mounted.current) return;
    setState(value);
    if (!value.error) setReady(true);
  }, []);
  const refresh = useCallback(async (): Promise<void> => {
    begin();
    try { apply(await grimoireAPI.getSnapshot()); }
    finally { finish(); }
  }, [apply, begin, finish]);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = grimoireAPI.subscribe(apply);
    const stopRefresh = subscribeGrimoireRefresh(() => { void refresh(); });
    void refresh();
    return () => { mounted.current = false; unsubscribe(); stopRefresh(); };
  }, [apply, refresh]);

  const mutate = useCallback(async <T,>(operation: () => Promise<T>, fallback: T): Promise<T> => {
    if (!ready) return fallback;
    begin();
    try { return await operation(); }
    catch { return fallback; }
    finally { finish(); }
  }, [ready, begin, finish]);
  const createCollection = useCallback((name: string): Promise<string | null> => mutate<string | null>(() => grimoireAPI.createCollection(name), null), [mutate]);
  const renameCollection = useCallback((id: string, name: string): Promise<boolean> => mutate(async () => { await grimoireAPI.renameCollection(id, name); return true; }, false), [mutate]);
  const deleteCollection = useCallback((id: string): Promise<boolean> => mutate(async () => { await grimoireAPI.deleteCollection(id); return true; }, false), [mutate]);
  const setCollectionSpell = useCallback((id: string, spellId: string, included: boolean): Promise<boolean> => mutate(async () => { await grimoireAPI.setCollectionSpell(id, spellId, included); return true; }, false), [mutate]);
  const saveNote = useCallback((spellId: string, note: string): Promise<boolean> => mutate(async () => { await grimoireAPI.saveNote(spellId, note); return true; }, false), [mutate]);
  const recordReview = useCallback((spellId: string, remembered: boolean): Promise<boolean> => mutate(async () => { await grimoireAPI.recordReview(spellId, remembered); return true; }, false), [mutate]);
  const resetProgress = useCallback((spellIds: string[]): Promise<boolean> => mutate(async () => { await grimoireAPI.resetProgress(spellIds); return true; }, false), [mutate]);
  const exportData = useCallback((): string => {
    if (!ready || state.error) throw new Error(state.error ?? `Load Your Grimoire Before Exporting`);
    return JSON.stringify(state.data, null, 2);
  }, [ready, state]);
  const value = useMemo<GrimoireContextValue>(() => ({
    busy, ready, refresh, saveNote, exportData, recordReview, resetProgress,
    createCollection, renameCollection, deleteCollection, setCollectionSpell,
    error: state.error,
    persisted: state.persisted,
    entries: state.data.entries,
    collections: state.data.collections,
  }), [busy, ready, state, refresh, saveNote, exportData, recordReview, resetProgress, createCollection, renameCollection, deleteCollection, setCollectionSpell]);
  return <GrimoireContext.Provider value={value}>{children}</GrimoireContext.Provider>;
};
