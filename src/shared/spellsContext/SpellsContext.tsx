import type { ReactNode } from 'react';
import { useAuth } from '../authContext';
import type { StorageMode } from '../../types/types';
import type { Spell, World } from '../models/Spell';
import type { PreferenceSnapshot } from '../models/Preferences';
import { spellsAPI, preferencesAPI } from '../../api';
import { canAccessAccount } from '../authentication/types';
import { savedSpellsService, type SavedSpellsSnapshot, type SavedSpellsResult } from '../supabase/savedSpells';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SpellsContextValue = {
  ready: boolean;
  error: string | null;
  spells: Spell[];
  worlds: World[];
  savedIds: string[];
  historyIds: string[];
  savedReady: boolean;
  saveVersion: number | null;
  saveBusy: boolean;
  saveScopeKey: string;
  deviceSavedCount: number;
  saveScope: `account` | `device`;
  saveStatus: SavedSpellsSnapshot[`status`] | `device`;
  saveMessage: string | null;
  storageMode: StorageMode | null;
  isSaved: (id: string) => boolean;
  clearSaved: () => Promise<boolean>;
  importDeviceSaved: () => Promise<boolean>;
  toggleSaved: (id: string) => Promise<void>;
  recordViewed: (id: string) => Promise<void>;
  refreshSaved: () => void;
  dismissError: () => void;
};

export const SpellsContext = createContext<SpellsContextValue | null>(null);

export const SpellsProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const hydrated = useRef(false);
  const scopeRef = useRef(`device`);
  const lifecycle = useRef({ key: ``, revision: 0 });
  const pending = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);
  const [operation, setOperation] = useState<{ scope: string; busy: boolean; error: string | null } | null>(null);
  const [cloud, setCloud] = useState<{ scope: string; snapshot: SavedSpellsSnapshot } | null>(null);
  const identity = auth.identity?.authUid ?? auth.account?.authUid;
  const saveScope = identity ? `account` : `device`;
  const saveScopeKey = identity ? `account:${identity}` : `device`;
  const lifecycleKey = `${saveScopeKey}:${auth.account?.id ?? auth.status}:${auth.account?.active ?? false}`;
  if (lifecycle.current.key !== lifecycleKey) lifecycle.current = { key: lifecycleKey, revision: lifecycle.current.revision + 1 };
  scopeRef.current = saveScopeKey;
  const snapshot = canAccessAccount(auth.account) && cloud?.scope === saveScopeKey ? cloud.snapshot : null;
  const saveBusy = operation?.scope === saveScopeKey && operation.busy;
  const saveStatus = saveScope === `device` ? `device` : snapshot?.status ?? (auth.status === `error` ? `error` : `loading`);
  const savedReady = ready && !auth.loading && !saveBusy && (saveScope === `device`
    ? hydrated.current
    : canAccessAccount(auth.account) && (snapshot?.status === `live` || snapshot?.status === `server`) && snapshot.source === `server` && !snapshot.truncated);
  const savedIds = saveScope === `account` ? snapshot?.savedIds ?? [] : deviceIds;
  const saveVersion = snapshot?.version ?? null;
  const saveMessage = saveScope === `account` ? snapshot?.message ?? auth.message : null;
  const error = operation?.scope === saveScopeKey && operation.error
    ? operation.error : saveScope === `device` ? localError : snapshot?.status === `error` ? snapshot.message : null;

  const applyPreferences = useCallback((value: PreferenceSnapshot) => {
    setStorageMode(value.mode);
    setDeviceIds(value.preferences.savedIds);
    setHistoryIds(value.preferences.historyIds);
    if (value.error) setLocalError(value.error);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([spellsAPI.getCatalog(), preferencesAPI.getPreferences()]).then(([catalog, preferences]) => {
      if (!active) return;
      setSpells(catalog.spells);
      setWorlds(catalog.worlds);
      applyPreferences(preferences);
      hydrated.current = true;
      setReady(true);
    }).catch((failure: unknown) => {
      if (!active) return;
      setLocalError(failure instanceof Error ? failure.message : `The Spell Catalog Could Not Be Loaded`);
      setReady(true);
    });
    return () => { active = false; };
  }, [applyPreferences]);

  useEffect(() => {
    let active = true;
    const scope = saveScopeKey;
    setCloud(null);
    setOperation(null);
    if (!canAccessAccount(auth.account)) return;
    const unsubscribe = savedSpellsService.subscribe(auth.account, (value) => {
      if (active && scopeRef.current === scope) setCloud({ scope, snapshot: value });
    });
    return () => { active = false; unsubscribe(); };
  }, [saveScopeKey, auth.account?.id, auth.account?.active, auth.account?.role, retry]);

  const mutatePreferences = useCallback(async (operation: () => Promise<PreferenceSnapshot>): Promise<boolean> => {
    if (!hydrated.current) {
      setLocalError(`Your preferences are still loading. Try again in a moment.`);
      return false;
    }
    try {
      applyPreferences(await operation());
      return true;
    } catch (failure) {
      setLocalError(failure instanceof Error ? failure.message : `Preferences Could Not Be Updated`);
      return false;
    }
  }, [applyPreferences]);

  const mutateCloud = useCallback(async (operation: () => Promise<SavedSpellsResult>): Promise<boolean> => {
    const scope = saveScopeKey;
    const revision = lifecycle.current.revision;
    const operationKey = `${scope}:${revision}`;
    if (!savedReady || pending.current === operationKey) return false;
    pending.current = operationKey;
    setOperation({ scope, busy: true, error: null });
    try {
      const result = await operation();
      if (scopeRef.current !== scope || lifecycle.current.revision !== revision) return false;
      setOperation({ scope, busy: false, error: result.ok ? null : result.message });
      return result.ok;
    } catch {
      if (scopeRef.current === scope && lifecycle.current.revision === revision) setOperation({ scope, busy: false, error: `The Account Collection Could Not Be Updated. Try Again.` });
      return false;
    } finally {
      if (pending.current === operationKey) pending.current = null;
    }
  }, [saveScopeKey, savedReady]);

  const clearSaved = useCallback(async (): Promise<boolean> => {
    if (!savedReady) return false;
    if (saveScope === `device`) return mutatePreferences(() => preferencesAPI.clearSaved());
    const account = auth.account;
    return account && snapshot ? mutateCloud(() => savedSpellsService.clearSaved(account, snapshot)) : false;
  }, [savedReady, saveScope, auth.account, snapshot, mutateCloud, mutatePreferences]);

  const toggleSaved = useCallback(async (id: string): Promise<void> => {
    if (!savedReady) return;
    if (saveScope === `device`) { await mutatePreferences(() => preferencesAPI.toggleSaved(id)); return; }
    const account = auth.account;
    if (account) await mutateCloud(() => savedSpellsService.setSaved(account, id, !savedIds.includes(id)));
  }, [savedReady, saveScope, auth.account, savedIds, mutateCloud, mutatePreferences]);

  const importDeviceSaved = useCallback(async (): Promise<boolean> => {
    const account = auth.account;
    if (!account || saveScope !== `account`) return false;
    return mutateCloud(() => savedSpellsService.importSaved(account, deviceIds));
  }, [auth.account, saveScope, deviceIds, mutateCloud]);
  const recordViewed = useCallback(async (id: string): Promise<void> => {
    await mutatePreferences(() => preferencesAPI.recordViewed(id));
  }, [mutatePreferences]);
  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);
  const refreshSaved = useCallback(() => setRetry((value) => value + 1), []);
  const dismissError = useCallback(() => { setLocalError(null); setOperation(null); }, []);
  const value = useMemo<SpellsContextValue>(() => ({
    ready, error, spells, worlds, isSaved, savedIds, saveBusy, saveScope, savedReady,
    clearSaved, historyIds, saveStatus, saveVersion, storageMode, saveMessage, saveScopeKey,
    toggleSaved, recordViewed, dismissError, refreshSaved, importDeviceSaved,
    deviceSavedCount: deviceIds.length,
  }), [ready, error, spells, worlds, isSaved, savedIds, saveBusy, saveScope, savedReady,
    clearSaved, historyIds, saveStatus, saveVersion, storageMode, saveMessage, saveScopeKey,
    toggleSaved, recordViewed, dismissError, refreshSaved, importDeviceSaved, deviceIds.length]);
  return <SpellsContext.Provider value={value}>{children}</SpellsContext.Provider>;
};
