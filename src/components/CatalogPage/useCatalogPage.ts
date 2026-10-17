import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { getSavedCollectionPresentation } from './savedCollectionPresentation';

export type CatalogSort = `catalog` | `recent` | `name` | `world`;

const firstValue = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? `` : value ?? ``;
const searchable = (value: string) => value.normalize(`NFKD`).replace(/[\u0300-\u036f]/g, ``).toLowerCase();

export const useCatalogPage = (savedOnly = false) => {
  const router = useRouter();
  const collection = useSpells();
  const parameters = useLocalSearchParams<{ q?: string | string[]; world?: string | string[]; skill?: string | string[]; category?: string | string[] }>();
  const [query, setQuery] = useState(firstValue(parameters.q));
  const [skill, setSkill] = useState(firstValue(parameters.skill));
  const [world, setWorld] = useState(firstValue(parameters.world));
  const [category, setCategory] = useState(firstValue(parameters.category));
  const [savedFilterRequested, setSavedFilter] = useState(savedOnly);
  const savedFilter = savedOnly || (savedFilterRequested && !collection.saveRequiresSignIn);
  const [sort, setSort] = useState<CatalogSort>(savedOnly ? `recent` : `catalog`);
  const scopeRef = useRef({ key: collection.saveScopeKey, revision: 0 });
  const mountedRef = useRef(true);
  const pendingRef = useRef<string | null>(null);
  const clearRequest = useRef<{ scope: string; version: number | null; run: () => Promise<boolean> } | null>(null);
  const [clearScope, setClearScope] = useState<string | null>(null);
  const [action, setAction] = useState<{ scope: string; kind: `clear` | `import` } | null>(null);
  const [actionError, setActionError] = useState<{ scope: string; message: string } | null>(null);
  if (scopeRef.current.key !== collection.saveScopeKey) {
    scopeRef.current = { key: collection.saveScopeKey, revision: scopeRef.current.revision + 1 };
    pendingRef.current = null;
  }
  const currentScope = () => mountedRef.current ? `${scopeRef.current.key}:${scopeRef.current.revision}` : ``;
  const scopeKey = currentScope();
  const presentation = getSavedCollectionPresentation(collection);
  const clearing = action?.scope === scopeKey && action.kind === `clear`;
  const importing = action?.scope === scopeKey && action.kind === `import`;
  const actionBusy = collection.saveBusy || clearing || importing;
  const confirmClear = clearScope === scopeKey && clearRequest.current?.version === collection.saveVersion;
  const savedResolved = collection.ready && (collection.saveScope === `account`
    ? (collection.saveStatus === `live` || collection.saveStatus === `server`) && (collection.savedReady || collection.saveBusy)
    : collection.savedReady);
  const usesSaved = savedOnly || savedFilter;
  const resultsResolved = collection.ready && (!usesSaved || savedResolved);
  const snapshotVisible = collection.ready && usesSaved && collection.saveScope === `account` && collection.savedIds.length > 0;
  const resultsVisible = resultsResolved || snapshotVisible;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; pendingRef.current = null; };
  }, []);

  useEffect(() => {
    setClearScope(null);
    clearRequest.current = null;
    setAction(null);
    setActionError(null);
  }, [scopeKey, savedOnly]);

  useEffect(() => {
    if (!clearRequest.current || actionBusy) return;
    if (clearRequest.current.version !== collection.saveVersion || !collection.savedReady) {
      clearRequest.current = null;
      setClearScope(null);
      setActionError({ scope: scopeKey, message: `Your saved shelf changed or needs a fresh connection. Review it before clearing.` });
    }
  }, [scopeKey, actionBusy, collection.saveVersion, collection.savedReady]);

  useEffect(() => {
    setQuery(firstValue(parameters.q));
    setSkill(firstValue(parameters.skill));
    setWorld(firstValue(parameters.world));
    setCategory(firstValue(parameters.category));
  }, [parameters.q, parameters.skill, parameters.world, parameters.category]);

  useEffect(() => {
    setSavedFilter(savedOnly);
    setSort(savedOnly ? `recent` : `catalog`);
  }, [savedOnly]);

  const savedSpells = useMemo(() => collection.spells.filter((spell) => collection.savedIds.includes(spell.id)), [collection.spells, collection.savedIds]);
  const shelfWorlds = useMemo(() => collection.worlds.filter((item) => savedSpells.some((spell) => spell.worldId === item.id)), [savedSpells, collection.worlds]);
  const source = savedOnly ? savedSpells : collection.spells;
  const categories = useMemo(() => [...new Set(source.map((spell) => spell.category))].sort(), [source]);
  const results = useMemo(() => {
    const search = searchable(query.trim());
    const matching = source.filter((spell) => {
      const sourceWorld = collection.worlds.find((item) => item.id === spell.worldId);
      const text = searchable([spell.name, spell.definition, spell.language, spell.sourceTitle, sourceWorld?.name, spell.category, ...spell.aliases].join(` `));
      return (!search || text.includes(search))
        && (!skill || spell.skill === skill)
        && (!world || spell.worldId === world)
        && (!category || spell.category === category)
        && (!savedFilter || collection.savedIds.includes(spell.id));
    });
    return matching.sort((left, right) => {
      if (sort === `name`) return left.name.localeCompare(right.name);
      if (sort === `recent`) return collection.savedIds.indexOf(right.id) - collection.savedIds.indexOf(left.id);
      if (sort === `world`) {
        const leftWorld = collection.worlds.find((item) => item.id === left.worldId)?.name ?? left.sourceTitle;
        const rightWorld = collection.worlds.find((item) => item.id === right.worldId)?.name ?? right.sourceTitle;
        return leftWorld.localeCompare(rightWorld) || left.name.localeCompare(right.name);
      }
      return left.number - right.number;
    });
  }, [query, skill, world, category, sort, source, savedFilter, collection.worlds, collection.savedIds]);

  const clearFilters = () => {
    setQuery(``);
    setSkill(``);
    setWorld(``);
    setCategory(``);
    setSavedFilter(savedOnly);
  };

  const changeSavedFilter = (value: boolean) => {
    if (value && collection.saveRequiresSignIn) { router.push(`/signin`); return; }
    setSavedFilter(value);
  };

  const requestClear = () => {
    if (!collection.savedReady || actionBusy) return;
    clearRequest.current = { scope: scopeKey, version: collection.saveVersion, run: collection.clearSaved };
    setClearScope(scopeKey);
  };
  const closeClear = () => {
    if (!actionBusy) { clearRequest.current = null; setClearScope(null); }
  };
  const runShelfAction = async (kind: `clear` | `import`) => {
    const scope = scopeKey;
    if (currentScope() !== scope || !collection.savedReady || actionBusy || pendingRef.current === scope) return;
    const reviewedClear = clearRequest.current;
    if (kind === `clear` && (!confirmClear || reviewedClear?.scope !== scope || reviewedClear.version !== collection.saveVersion)) return;
    if (kind === `import` && (confirmClear || collection.saveScope !== `account`)) return;
    const run = kind === `clear` ? reviewedClear?.run : collection.importDeviceSaved;
    if (!run) return;
    pendingRef.current = scope;
    setAction({ scope, kind });
    setActionError(null);
    try {
      const confirmed = await run();
      if (currentScope() !== scope) return;
      if (confirmed && kind === `clear`) { clearRequest.current = null; setClearScope(null); }
      if (!confirmed) setActionError({ scope, message: `The ${kind === `clear` ? `clear` : `import`} was not confirmed. Review the collection status before trying again.` });
    } catch {
      if (currentScope() === scope) setActionError({ scope, message: `The ${kind === `clear` ? `clear` : `import`} could not be confirmed. Please try again when your collection is available.` });
    } finally {
      if (pendingRef.current === scope) pendingRef.current = null;
      if (currentScope() === scope) setAction(null);
    }
  };

  return {
    ...collection,
    sort,
    query,
    skill,
    world,
    clearing,
    importing,
    actionBusy,
    closeClear,
    confirmClear,
    presentation,
    requestClear,
    savedResolved,
    resultsVisible,
    resultsResolved,
    results,
    setSort,
    category,
    setQuery,
    setSkill,
    setWorld,
    categories,
    savedFilter,
    savedSpells,
    shelfWorlds,
    setCategory,
    clearFilters,
    setSavedFilter: changeSavedFilter,
    removeAll: () => runShelfAction(`clear`),
    importBookmarks: () => runShelfAction(`import`),
    error: collection.error ?? (actionError?.scope === scopeKey ? actionError.message : null),
    savedCount: collection.savedIds.length,
    unavailableCount: collection.savedIds.length - savedSpells.length,
    filtered: Boolean(query.trim() || skill || world || category || (!savedOnly && savedFilter)),
  };
};
