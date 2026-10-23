import { useLocalSearchParams } from 'expo-router';
import { useGrimoire } from '../../shared/grimoire/useGrimoire';
import type { GrimoireEntry } from '../../shared/grimoire/types';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

const emptyEntry: GrimoireEntry = { note: ``, reviews: 0, correct: 0, streak: 0, lastReviewedAt: null };

export const useGrimoirePage = () => {
  const grimoire = useGrimoire();
  const catalog = useSpells();
  const params = useLocalSearchParams<{ spellId?: string | string[] }>();
  const requestedId = Array.isArray(params.spellId) ? params.spellId?.[0] : params.spellId;
  const pending = useRef(false);
  const [search, setSearch] = useState(``);
  const [name, setName] = useState(``);
  const [rename, setRename] = useState(``);
  const [addSearch, setAddSearch] = useState(``);
  const [selectedId, setSelectedId] = useState(requestedId ?? ``);
  const [collectionId, setCollectionId] = useState(``);
  const [mode, setMode] = useState<`notes` | `practice`>(`notes`);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [managing, setManaging] = useState(false);
  const [working, setWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const collection = grimoire.collections.find((item) => item.id === collectionId);
  const source = useMemo(() => collection
    ? catalog.spells.filter((spell) => collection.spellIds.includes(spell.id))
    : catalog.spells, [catalog.spells, collection]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return source.filter((spell) => `${spell.name} ${spell.sourceTitle}`.toLowerCase().includes(query));
  }, [search, source]);
  const addResults = useMemo(() => {
    const query = addSearch.trim().toLowerCase();
    return catalog.spells.filter((spell) => `${spell.name} ${spell.sourceTitle}`.toLowerCase().includes(query));
  }, [addSearch, catalog.spells]);
  const selectedSpell = source.find((spell) => spell.id === selectedId) ?? source?.[0];
  const remaining = source.filter((spell) => !reviewedIds.includes(spell.id));
  const practiceSpell = remaining.find((spell) => spell.id === selectedId) ?? remaining?.[0];
  const entry = selectedSpell ? grimoire.entries[selectedSpell.id] ?? emptyEntry : emptyEntry;
  const practiceEntry = practiceSpell ? grimoire.entries[practiceSpell.id] ?? emptyEntry : emptyEntry;
  const draft = selectedSpell ? drafts[selectedSpell.id] ?? entry.note : ``;
  const dirty = draft !== entry.note;
  const locked = !grimoire.ready || grimoire.busy || working;
  const stats = source.reduce((result, spell) => {
    const value = grimoire.entries[spell.id];
    return { notes: result.notes + (value?.note?.trim() ? 1 : 0), reviews: result.reviews + (value?.reviews ?? 0), mastered: result.mastered + ((value?.streak ?? 0) >= 3 ? 1 : 0) };
  }, { notes: 0, reviews: 0, mastered: 0 });
  const completed = source.filter((spell) => reviewedIds.includes(spell.id)).length;
  const sourceName = collection?.name ?? `All Spells`;

  useEffect(() => {
    if (!requestedId) return;
    setSelectedId(requestedId);
    setCollectionId(``);
    setMode(`notes`);
  }, [requestedId]);

  useEffect(() => { setRename(collection?.name ?? ``); }, [collection?.id, collection?.name]);
  useEffect(() => { setRevealed(false); }, [practiceSpell?.id]);

  const run = useCallback(async (operation: () => Promise<boolean>, success: string) => {
    if (pending.current || !grimoire.ready || grimoire.busy) return false;
    pending.current = true;
    setWorking(true);
    setMessage(null);
    setActionError(null);
    try {
      const confirmed = await operation();
      if (confirmed) setMessage(success);
      return confirmed;
    } catch {
      setActionError(`The Change Could Not Be Saved. Please Try Again`);
      return false;
    } finally {
      pending.current = false;
      setWorking(false);
    }
  }, [grimoire.ready, grimoire.busy]);

  const selectCollection = (id: string) => {
    if (pending.current || grimoire.busy) return;
    setCollectionId(id);
    setSearch(``);
    setAddSearch(``);
    setManaging(false);
    setRevealed(false);
    setReviewedIds([]);
    setConfirmReset(false);
    setConfirmDelete(false);
    setMessage(null);
  };
  const createCollection = async () => {
    const value = name.trim();
    if (!value) return;
    let id: string | null = null;
    const confirmed = await run(async () => { id = await grimoire.createCollection(value); return Boolean(id); }, `Collection Created`);
    if (confirmed && id) { selectCollection(id); setName(``); setManaging(true); setMessage(`Collection Created`); }
  };
  const renameCollection = async () => {
    if (!collection || !rename.trim()) return;
    await run(() => grimoire.renameCollection(collection.id, rename), `Collection Renamed`);
  };
  const deleteCollection = async () => {
    if (!collection) return;
    if (await run(() => grimoire.deleteCollection(collection.id), `Collection Deleted`)) { selectCollection(``); setMessage(`Collection Deleted. Notes And Progress Kept`); }
  };
  const setMembership = async (spellId: string, included: boolean) => {
    if (!collection) return;
    await run(() => grimoire.setCollectionSpell(collection.id, spellId, included), included ? `Spell Added To Collection` : `Spell Removed From Collection`);
  };
  const changeDraft = (value: string) => {
    if (!selectedSpell) return;
    setDrafts((current) => ({ ...current, [selectedSpell.id]: value }));
    setMessage(null);
  };
  const saveNote = async () => {
    if (!selectedSpell) return;
    const id = selectedSpell.id;
    const savedDraft = draft;
    const savedMessage = !savedDraft ? `Note Cleared` : grimoire.persisted ? `Note Saved On This Device` : `Note Saved In This Session`;
    if (await run(() => grimoire.saveNote(id, savedDraft), savedMessage)) {
      setDrafts((current) => {
        if (current[id] !== savedDraft) return current;
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };
  const review = async (remembered: boolean) => {
    if (!practiceSpell || !revealed) return;
    const id = practiceSpell.id;
    if (await run(() => grimoire.recordReview(id, remembered), remembered ? `Remembered Review Saved` : `Again Review Saved`)) {
      setReviewedIds((current) => [...current, id]);
      setRevealed(false);
    }
  };
  const resetProgress = async () => {
    if (await run(() => grimoire.resetProgress(source.map((spell) => spell.id)), `Practice Progress Reset. Notes Kept`)) {
      setReviewedIds([]);
      setConfirmReset(false);
      setRevealed(false);
    }
  };
  const restartSession = () => { setReviewedIds([]); setRevealed(false); setMessage(null); };
  const selectSpell = (id: string) => { if (pending.current || grimoire.busy) return; setSelectedId(id); setRevealed(false); setMessage(null); };
  const notifyExport = (text: string | null, failed = false) => { setMessage(failed ? null : text); setActionError(failed ? text : null); };
  const retry = async () => { setActionError(null); setMessage(null); await grimoire.refresh(); };

  return {
    mode, name, draft, dirty, entry, stats, search, rename, source, locked, message, revealed, managing, completed, collection,
    addSearch, addResults, sourceName, selectedSpell, practiceSpell, practiceEntry, confirmReset, confirmDelete,
    setName, setMode, setSearch, setRename, changeDraft, setAddSearch, setManaging, setRevealed, setConfirmReset, setConfirmDelete,
    retry, review, saveNote, selectSpell, resetProgress, notifyExport, setMembership, restartSession, selectCollection,
    createCollection, renameCollection, deleteCollection,
    ready: grimoire.ready,
    busy: grimoire.busy || working,
    persisted: grimoire.persisted,
    exportData: grimoire.exportData,
    collections: grimoire.collections,
    catalogReady: catalog.ready,
    catalogError: catalog.catalogError,
    reloadCatalog: catalog.reloadCatalog,
    filteredCount: filtered.length,
    visibleSpells: filtered.slice(0, 80),
    membershipSpells: addResults.slice(0, 60),
    error: actionError ?? grimoire.error,
    missingRequestedSpell: Boolean(requestedId && catalog.ready && !catalog.catalogError && !catalog.spells.some((spell) => spell.id === requestedId)),
  };
};
