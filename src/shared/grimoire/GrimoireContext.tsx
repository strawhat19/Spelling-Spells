import type { ReactNode } from 'react';
import { emptyGrimoire } from './service';
import { grimoireAPI } from '../../api/grimoire';
import { useAuth } from '../authContext/useAuth';
import { canAccessAccount } from '../authentication/types';
import { useFeatureFlags } from '../featureFlags/useFeatureFlags';
import type { GrimoireContextValue, GrimoireSnapshot } from './types';
import { Fragment, createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const GrimoireContext = createContext<GrimoireContextValue | null>(null);
const emptySnapshot = (accountId: string): GrimoireSnapshot => ({ accountId, revision: 0, error: null, persisted: false, source: `unavailable`, updatedAt: null, data: emptyGrimoire() });

export const GrimoireProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const features = useFeatureFlags();
  const authenticated = auth.status === `signed-in` && auth.source === `server` && canAccessAccount(auth.account) && auth.identity?.authUid === auth.account?.authUid;
  const key = `${auth.status}:${auth.identity?.authUid ?? ``}:${auth.account?.id ?? ``}:${auth.account?.role ?? ``}:${auth.account?.active ?? false}:${auth.account?.roleVerified ?? false}:${auth.source ?? ``}`;
  const generation = useRef({ key, revision: 0 });
  if (generation.current.key !== key) generation.current = { key, revision: generation.current.revision + 1 };
  const scope = `${generation.current.revision}:${key}`;
  const mounted = useRef(true);
  const currentScope = useRef(scope);
  const pending = useRef<string | null>(null);
  currentScope.current = scope;
  const [state, setState] = useState<{ scope: string; snapshot: GrimoireSnapshot }>({ scope, snapshot: emptySnapshot(auth.account?.id ?? ``) });
  const [working, setWorking] = useState<{ scope: string; busy: boolean }>({ scope, busy: false });
  const snapshot = state.scope === scope && authenticated ? state.snapshot : emptySnapshot(auth.account?.id ?? ``);
  const ready = authenticated && snapshot.source === `cloud`;
  const writable = ready && features.grimoireToolsEnabled;
  const isCurrent = useCallback(() => mounted.current && currentScope.current === scope, [scope]);
  const apply = useCallback((value: GrimoireSnapshot) => {
    if (!isCurrent() || value.accountId !== auth.account?.id) return;
    setState((previous) => previous.scope === scope && previous.snapshot.revision > value.revision && !value.error ? previous : { scope, snapshot: value });
  }, [scope, auth.account?.id, isCurrent]);
  const setError = useCallback((error: unknown) => {
    if (!isCurrent()) return;
    setState((previous) => ({ scope, snapshot: { ...(previous.scope === scope ? previous.snapshot : emptySnapshot(auth.account?.id ?? ``)), error: error instanceof Error ? error.message : `The Account Grimoire Request Was Not Confirmed` } }));
  }, [scope, auth.account?.id, isCurrent]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    setState({ scope, snapshot: emptySnapshot(auth.account?.id ?? ``) });
    setWorking({ scope, busy: false });
    pending.current = null;
    if (!authenticated) return;
    try { return grimoireAPI.subscribe(apply); }
    catch (error) { setError(error); }
  }, [scope, authenticated, auth.account?.id, apply, setError]);
  const refresh = useCallback(async () => {
    if (!authenticated || !isCurrent() || pending.current === scope) return;
    setWorking({ scope, busy: true });
    try { apply(await grimoireAPI.getSnapshot()); }
    catch (error) { setError(error); }
    finally { if (isCurrent()) setWorking({ scope, busy: false }); }
  }, [scope, authenticated, apply, setError, isCurrent]);
  const mutate = useCallback(async <T,>(operation: () => Promise<T>, fallback: T, recovery = false): Promise<T> => {
    if (!ready || !isCurrent() || pending.current === scope) return fallback;
    if (!recovery && !writable) { setError(new Error(`Your Current Plan Or Feature Policy Allows Reading, Exporting And Removing Existing Grimoire Data Only`)); return fallback; }
    pending.current = scope;
    setWorking({ scope, busy: true });
    try {
      const result = await operation();
      return isCurrent() ? result : fallback;
    } catch (error) { setError(error); return fallback; }
    finally { if (pending.current === scope) pending.current = null; if (isCurrent()) setWorking({ scope, busy: false }); }
  }, [scope, ready, writable, isCurrent, setError]);
  const createCollection = useCallback((name: string) => mutate<string | null>(() => grimoireAPI.createCollection(name), null), [mutate]);
  const importDevicePreview = useCallback(() => mutate(async () => { await grimoireAPI.importDevicePreview(); return true; }, false), [mutate]);
  const renameCollection = useCallback((id: string, name: string) => mutate(async () => { await grimoireAPI.renameCollection(id, name); return true; }, false), [mutate]);
  const deleteCollection = useCallback((id: string) => mutate(async () => { await grimoireAPI.deleteCollection(id); return true; }, false, true), [mutate]);
  const setCollectionSpell = useCallback((id: string, spellId: string, included: boolean) => mutate(async () => { await grimoireAPI.setCollectionSpell(id, spellId, included); return true; }, false, !included), [mutate]);
  const saveNote = useCallback((spellId: string, note: string) => mutate(async () => { await grimoireAPI.saveNote(spellId, note); return true; }, false, note === ``), [mutate]);
  const recordReview = useCallback((spellId: string, remembered: boolean) => mutate(async () => { await grimoireAPI.recordReview(spellId, remembered); return true; }, false), [mutate]);
  const resetProgress = useCallback((spellIds: string[]) => mutate(async () => { await grimoireAPI.resetProgress(spellIds); return true; }, false, true), [mutate]);
  const exportData = useCallback(() => {
    if (!ready || !isCurrent()) throw new Error(`Load Your Account Grimoire Before Exporting`);
    return JSON.stringify(snapshot.data, null, 2);
  }, [ready, snapshot.data, isCurrent]);
  const value = useMemo<GrimoireContextValue>(() => ({
    scope, ready, writable, authenticated, refresh, saveNote, exportData, recordReview, resetProgress,
    createCollection, renameCollection, deleteCollection, setCollectionSpell, importDevicePreview,
    error: snapshot.error,
    source: snapshot.source,
    revision: snapshot.revision,
    persisted: snapshot.persisted,
    entries: snapshot.data.entries,
    collections: snapshot.data.collections,
    busy: working.scope === scope && working.busy,
    canImportDevicePreview: writable && !snapshot.error && snapshot.revision === 0 && !snapshot.data.collections.length && !Object.keys(snapshot.data.entries).length,
  }), [scope, ready, writable, authenticated, snapshot, working, refresh, saveNote, exportData, recordReview, resetProgress, createCollection, renameCollection, deleteCollection, setCollectionSpell, importDevicePreview]);
  return <GrimoireContext.Provider value={value}><Fragment key={scope}>{children}</Fragment></GrimoireContext.Provider>;
};
