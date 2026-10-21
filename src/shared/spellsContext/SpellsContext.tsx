import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../authContext';
import { catalogService } from '../catalog/service';
import { buildCatalog } from '../catalog/buildSnapshot';
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
  catalogError: string | null;
  spells: Spell[];
  worlds: World[];
  savedIds: string[];
  historyIds: string[];
  savedReady: boolean;
  saveRequiresSignIn: boolean;
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
  reloadCatalog: () => void;
  dismissError: () => void;
};

export const SpellsContext = createContext<SpellsContextValue | null>(null);

export const SpellsProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const router = useRouter();
  const hydrated = useRef(false);
  const scopeRef = useRef(`device`);
  const lifecycle = useRef({ key: ``, revision: 0 });
  const pending = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [spells, setSpells] = useState<Spell[]>(buildCatalog.spells);
  const [worlds, setWorlds] = useState<World[]>(buildCatalog.worlds);
  const [catalogError, setCatalogError] = useState<string | null>(null);
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
  const accountReady = !auth.loading && auth.status === `signed-in` && canAccessAccount(auth.account);
  const saveRequiresSignIn = !auth.loading && auth.status !== `loading` && !accountReady;
  const snapshot = accountReady && cloud?.scope === saveScopeKey ? cloud.snapshot : null;
  const saveBusy = operation?.scope === saveScopeKey && operation.busy;
  const saveStatus = saveScope === `device` ? `device` : snapshot?.status ?? (auth.status === `error` ? `error` : `loading`);
  const savedReady = ready && accountReady && !saveBusy && (snapshot?.status === `live` || snapshot?.status === `server`) && snapshot.source === `server` && !snapshot.truncated;
  const savedIds = useMemo(() => snapshot?.savedIds ?? [], [snapshot]);
  const saveVersion = snapshot?.version ?? null;
  const saveMessage = saveScope === `account` ? snapshot?.message ?? auth.message : null;
  const error = catalogError ?? (operation?.scope === saveScopeKey && operation.error
    ? operation.error : saveScope === `device` ? localError : snapshot?.status === `error` ? snapshot.message : null);

  const applyPreferences = useCallback((value: PreferenceSnapshot) => {
    setStorageMode(value.mode);
    setDeviceIds(value.preferences.savedIds);
    setHistoryIds(value.preferences.historyIds);
    if (value.error) setLocalError(value.error);
  }, []);

  useEffect(() => {
    let active = true;
    void preferencesAPI.getPreferences().then((preferences) => {
      if (!active) return;
      applyPreferences(preferences);
      hydrated.current = true;
    }).catch((failure: unknown) => {
      if (!active) return;
      setLocalError(failure instanceof Error ? failure.message : `Device Preferences Could Not Be Loaded`);
    });
    return () => { active = false; };
  }, [applyPreferences]);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const request = ++generation;
      try {
        const catalog = await spellsAPI.getCatalog();
        if (!active || request !== generation) return;
        setSpells(catalog.spells);
        setWorlds(catalog.worlds);
        setCatalogError(null);
      } catch (failure) {
        if (!active || request !== generation) return;
        setSpells([]);
        setWorlds([]);
        setCatalogError(failure instanceof Error ? failure.message : `The Database Catalog Could Not Be Loaded`);
      } finally { if (active && request === generation) setReady(true); }
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 150); };
    const stop = catalogService.subscribe(schedule);
    const interval = setInterval(() => { if (typeof document === `undefined` || !document.hidden) schedule(); }, 60_000);
    if (typeof window !== `undefined`) window.addEventListener(`focus`, schedule);
    void refresh();
    return () => {
      active = false;
      generation += 1;
      stop();
      clearTimeout(timer);
      clearInterval(interval);
      if (typeof window !== `undefined`) window.removeEventListener(`focus`, schedule);
    };
  }, [catalogRetry]);

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
    const account = auth.account;
    return account && snapshot ? mutateCloud(() => savedSpellsService.clearSaved(account, snapshot)) : false;
  }, [savedReady, auth.account, snapshot, mutateCloud]);

  const toggleSaved = useCallback(async (id: string): Promise<void> => {
    if (auth.loading || auth.status === `loading`) return;
    if (auth.status !== `signed-in` || !canAccessAccount(auth.account)) { router.push(`/signin`); return; }
    if (!savedReady) return;
    const account = auth.account;
    await mutateCloud(() => savedSpellsService.setSaved(account, id, !savedIds.includes(id)));
  }, [auth.loading, auth.status, auth.account, savedReady, savedIds, mutateCloud, router]);

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
  const reloadCatalog = useCallback(() => setCatalogRetry((value) => value + 1), []);
  const dismissError = useCallback(() => { setLocalError(null); setOperation(null); }, []);
  const value = useMemo<SpellsContextValue>(() => ({
    ready, error, spells, worlds, isSaved, savedIds, saveBusy, saveScope, savedReady, catalogError, reloadCatalog,
    clearSaved, historyIds, saveStatus, saveVersion, storageMode, saveMessage, saveScopeKey,
    toggleSaved, recordViewed, dismissError, refreshSaved, importDeviceSaved, saveRequiresSignIn,
    deviceSavedCount: deviceIds.length,
  }), [ready, error, spells, worlds, isSaved, savedIds, saveBusy, saveScope, savedReady, catalogError, reloadCatalog,
    clearSaved, historyIds, saveStatus, saveVersion, storageMode, saveMessage, saveScopeKey,
    toggleSaved, recordViewed, dismissError, refreshSaved, importDeviceSaved, saveRequiresSignIn, deviceIds.length]);
  return <SpellsContext.Provider value={value}>{children}</SpellsContext.Provider>;
};
