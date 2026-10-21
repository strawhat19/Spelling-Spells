import { useAuth } from '../../shared/authContext';
import { useLocalSearchParams } from 'expo-router';
import type { World } from '../../shared/models/Spell';
import { useEffect, useRef, useState, useCallback } from 'react';
import { catalogService } from '../../shared/catalog/service';
import { canAccessOwner } from '../../shared/authentication/types';
import { validSourceUrl, submissionService } from '../../shared/submissions/service';
import type { CatalogSpell, CatalogSource, CatalogStatus, OwnerCatalog } from '../../shared/catalog/types';

export type EditorKind = `spells` | `worlds` | `sources`;
export type EditorField = { key: string; label: string; lines?: boolean; options?: readonly string[]; number?: boolean };
export const editorFields: Record<EditorKind, EditorField[]> = {
  worlds: [{ key: `name`, label: `Universe Or Tradition Name` }, { key: `slug`, label: `Stable URL Slug` }, { key: `kind`, label: `Context`, options: [`fictional`, `folklore`] }, { key: `medium`, label: `Medium` }, { key: `continuity`, label: `Continuity Or Cultural Context` }, { key: `description`, label: `Original Description`, lines: true }],
  sources: [{ key: `label`, label: `Reference Title` }, { key: `url`, label: `HTTPS Source URL` }, { key: `publisher`, label: `Publisher Or Creator` }, { key: `kind`, label: `Source Type` }, { key: `locator`, label: `Edition, Chapter, Issue Or Timestamp` }, { key: `evidenceNote`, label: `Evidence And Rights Notes`, lines: true }],
  spells: [
    { key: `name`, label: `Canonical Name` }, { key: `slug`, label: `Stable URL Slug` }, { key: `entryType`, label: `Entry Type`, options: [`spell`, `ability`, `incantation`] },
    { key: `aliases`, label: `Aliases / One Per Line`, lines: true }, { key: `casters`, label: `Characters Or Casters / One Per Line`, lines: true },
    { key: `continuity`, label: `Continuity And Version` }, { key: `sourceTitle`, label: `Story Or Series` }, { key: `medium`, label: `Medium`, options: [`Books`, `Films`, `Games`, `Comics`, `Television`, `Folklore`] },
    { key: `kind`, label: `In-Story Kind Or Descriptive Label` }, { key: `category`, label: `Category` }, { key: `definition`, label: `Original Summary`, lines: true }, { key: `effect`, label: `Effect In Context`, lines: true }, { key: `usage`, label: `Use And Limitations`, lines: true },
    { key: `language`, label: `Language` }, { key: `pronunciationStatus`, label: `Pronunciation Evidence`, options: [`unavailable`, `approximate`, `verified`] }, { key: `pronunciation`, label: `Pronunciation / Leave Empty When Unsupported` }, { key: `pronunciationNote`, label: `Pronunciation Evidence Or Approximation Note`, lines: true }, { key: `syllables`, label: `Reading Syllables / One Per Line`, lines: true },
    { key: `etymology`, label: `Etymology And Uncertainty`, lines: true }, { key: `etymologyStatus`, label: `Etymology Evidence`, options: [`Unconfirmed`, `Suggested`, `Confirmed`] }, { key: `evidenceStatus`, label: `Entry Evidence`, options: [`unverified`, `verified`] },
    { key: `danger`, label: `Fictional Editorial Danger / 1-5`, number: true }, { key: `utility`, label: `Fictional Editorial Utility / 1-5`, number: true }, { key: `skill`, label: `Editorial Complexity`, options: [`Beginner`, `Intermediate`, `Advanced`] }, { key: `accent`, label: `Card Accent`, options: [`light`, `fire`, `wind`, `unlock`, `shield`, `wand`] },
  ],
};
const blankSpell = (): Record<string, unknown> => ({ id: ``, number: 0, revision: 0, status: `draft`, name: ``, slug: ``, worldId: ``, sourceTitle: ``, medium: `Books`, kind: ``, language: ``, pronunciation: ``, pronunciationNote: ``, syllables: [], definition: ``, usage: ``, etymology: ``, etymologyStatus: `Unconfirmed`, breakdown: [], danger: 1, utility: 1, skill: `Beginner`, category: ``, accent: `wand`, aliases: [], sources: [], sourceIds: [], casters: [], continuity: ``, effect: ``, entryType: `spell`, evidenceStatus: `unverified`, pronunciationStatus: `unavailable` });
const emptyCatalog: OwnerCatalog = { spells: [], worlds: [], sources: [] };
const slugify = (value: string) => value.normalize(`NFKD`).replace(/[\u0300-\u036f]/g, ``).toLowerCase().replace(/[^a-z0-9]+/g, `-`).replace(/^-|-$/g, ``);
export const useCatalogEditor = () => {
  const auth = useAuth();
  const permitted = !auth.loading && canAccessOwner(auth.account);
  const scope = `${auth.account?.id}:${auth.account?.role}:${auth.account?.active}:${auth.account?.roleVerified}:${auth.account?.emailVerified}`;
  const current = useRef(scope);
  current.current = scope;
  const pending = useRef(false);
  const prepared = useRef(``);
  const parameters = useLocalSearchParams<{ submission?: string | string[] }>();
  const submissionId = Array.isArray(parameters.submission) ? parameters.submission[0] : parameters.submission;
  const [loaded, setLoaded] = useState<{ scope: string; data: OwnerCatalog } | null>(null);
  const [kind, setKind] = useState<EditorKind>(`spells`);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState(``);
  const [search, setSearch] = useState(``);
  const [reference, setReference] = useState<{ url: string; label: string } | null>(null);
  const [feedback, setFeedback] = useState({ error: ``, notice: `` });
  const catalog = permitted && loaded?.scope === scope ? loaded.data : emptyCatalog;
  const ready = permitted && loaded?.scope === scope;
  const reload = useCallback(async () => {
    if (!permitted || pending.current) return;
    setLoading(true); setFeedback({ error: ``, notice: `` });
    try { const data = await catalogService.getOwnerCatalog(); if (current.current === scope) setLoaded({ scope, data }); }
    catch (error) { if (current.current === scope) setFeedback({ error: error instanceof Error ? error.message : `The Catalog Could Not Be Loaded`, notice: `` }); }
    finally { if (current.current === scope) setLoading(false); }
  }, [permitted, scope]);
  useEffect(() => { setDraft(null); setDirty(false); setBusy(false); setReference(null); prepared.current = ``; void reload(); }, [scope, permitted, reload]);
  useEffect(() => { current.current = scope; return () => { if (current.current === scope) current.current = ``; }; }, [scope]);
  useEffect(() => {
    let active = true;
    if (!ready || !submissionId || prepared.current === submissionId) return;
    void submissionService.getById(submissionId).then((submission) => {
      if (!active || current.current !== scope) return;
      prepared.current = submissionId;
      const world = catalog.worlds.find((item) => item.name.toLocaleLowerCase() === submission.world.toLocaleLowerCase());
      const existing = submission.kind === `correction` ? catalog.spells.find((entry) => entry.name.toLocaleLowerCase() === submission.name.toLocaleLowerCase()) : undefined;
      setKind(`spells`); setDraft({ ...(existing ?? blankSpell()), name: existing?.name ?? submission.name, slug: existing?.slug ?? slugify(submission.name), worldId: existing?.worldId ?? world?.id ?? ``, definition: submission.definition, effect: submission.definition, evidenceStatus: `unverified`, pronunciation: submission.pronunciation, pronunciationStatus: submission.pronunciation ? `approximate` : `unavailable`, pronunciationNote: submission.pronunciation ? `Contributor Reading Aid / Not Verified` : `` });
      setReference({ url: submission.sourceUrl, label: `Reference For ${submission.name}` }); setDirty(true);
      setFeedback({ error: ``, notice: `Suggestion Loaded As An Unsaved Draft. Verify Its Source And Context Before Approval` });
    }).catch((error) => { if (active && current.current === scope) setFeedback({ error: error instanceof Error ? error.message : `Suggestion Could Not Be Loaded`, notice: `` }); });
    return () => { active = false; };
  }, [ready, submissionId, scope, catalog]);
  const edit = (resource: EditorKind, record?: Record<string, unknown>) => {
    if (busy) return;
    setKind(resource); setDirty(false); setReference(null); setNote(``); setFeedback({ error: ``, notice: `` });
    setDraft(record ? { ...record } : resource === `spells` ? blankSpell() : resource === `worlds` ? { id: ``, revision: 0, name: ``, slug: ``, kind: `fictional`, medium: `Books`, description: ``, continuity: `` } : { id: ``, revision: 0, label: ``, url: ``, publisher: ``, kind: `reference`, locator: ``, evidenceNote: `` });
  };
  const update = (field: string, value: unknown) => { if (!busy) {
    setDraft((previous) => previous ? { ...previous, [field]: value,
      ...(!previous.id && field === `name` && (!previous.slug || previous.slug === slugify(String(previous.name ?? ``))) ? { slug: slugify(String(value)) } : {}),
    } : previous); setDirty(true);
  } };
  const save = async () => {
    if (!draft || !ready || pending.current) return;
    const name = String(kind === `sources` ? draft.label ?? `` : draft.name ?? ``).trim();
    if (!name || (kind === `sources` && !validSourceUrl(String(draft.url ?? ``))) || (kind !== `sources` && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(draft.slug ?? ``)))
      || (kind === `spells` && (!draft.worldId || !String(draft.definition ?? ``).trim() || !String(draft.effect ?? ``).trim()))) {
      setFeedback({ error: `Add A Name And URL Slug, Universe, Summary And Effect Or A Valid HTTPS Source URL`, notice: `` }); return;
    }
    pending.current = true; setBusy(true); setFeedback({ error: ``, notice: `` });
    try {
      let saved: unknown;
      if (kind === `spells`) {
        const ids = Array.isArray(draft.sourceIds) ? draft.sourceIds as string[] : [];
        const sources = catalog.sources.filter((source) => ids.includes(source.id)).map(({ label, url }) => ({ label, url }));
        const record: Record<string, unknown> = { ...draft, sources };
        delete record.seedPlaceholder;
        delete record.importPlaceholder;
        delete record.updatedAt;
        for (const key of [`aliases`, `casters`, `syllables`]) if (Array.isArray(record[key])) record[key] = (record[key] as string[]).map((value) => value.trim()).filter(Boolean);
        saved = await catalogService.saveSpell(record as Partial<CatalogSpell>);
      } else if (kind === `worlds`) saved = await catalogService.saveUniverse(draft as Partial<World>);
      else saved = await catalogService.saveSource(draft as Partial<CatalogSource>);
      if (current.current !== scope) return;
      setDraft(saved as Record<string, unknown>); setDirty(false);
      setFeedback({ error: ``, notice: `Record Saved. Entry Edits Return To Draft Until Reviewed Again` });
      const data = await catalogService.getOwnerCatalog();
      if (current.current === scope) setLoaded({ scope, data });
    } catch (error) { if (current.current === scope) setFeedback({ error: error instanceof Error ? error.message : `The Record Save Was Not Confirmed`, notice: `` }); }
    finally { pending.current = false; if (current.current === scope) setBusy(false); }
  };
  const setStatus = async (status: CatalogStatus) => {
    if (!draft?.id || kind !== `spells` || !ready || pending.current) return;
    if (dirty) { setFeedback({ error: `Save Your Edits Before Changing Publication Status`, notice: `` }); return; }
    if ((status === `approved` || status === `published`) && (draft.evidenceStatus !== `verified` || !String(draft.sourceTitle ?? ``).trim() || !String(draft.kind ?? ``).trim() || !String(draft.continuity ?? ``).trim() || !Array.isArray(draft.sourceIds) || !draft.sourceIds.length)) {
      setFeedback({ error: `Verify The Evidence, Add Story, Kind And Continuity, And Link Sources Before Approval Or Publication`, notice: `` }); return;
    }
    pending.current = true; setBusy(true); setFeedback({ error: ``, notice: `` });
    try {
      const saved = await catalogService.setStatus(String(draft.id), status, Number(draft.revision), note);
      if (current.current !== scope) return;
      setDraft(saved as unknown as Record<string, unknown>); setFeedback({ error: ``, notice: `Entry Status Saved / ${status}` });
      const data = await catalogService.getOwnerCatalog();
      if (current.current === scope) setLoaded({ scope, data });
    } catch (error) { if (current.current === scope) setFeedback({ error: error instanceof Error ? error.message : `The Status Change Was Not Confirmed`, notice: `` }); }
    finally { pending.current = false; if (current.current === scope) setBusy(false); }
  };
  const saveReference = async () => {
    if (!reference || !draft || pending.current || !ready) return;
    pending.current = true; setBusy(true);
    try {
      const source = await catalogService.saveSource({ label: reference.label, url: reference.url, kind: `reference`, evidenceNote: `Contributor Reference / Awaiting Owner Verification` });
      if (current.current !== scope) return;
      setLoaded({ scope, data: { ...catalog, sources: [...catalog.sources, source] } });
      setDraft((value) => value ? { ...value, sourceIds: [...(Array.isArray(value.sourceIds) ? value.sourceIds : []), source.id] } : value); setDirty(true); setReference(null);
    } catch (error) { if (current.current === scope) setFeedback({ error: error instanceof Error ? error.message : `The Reference Save Was Not Confirmed`, notice: `` }); }
    finally { pending.current = false; if (current.current === scope) setBusy(false); }
  };
  const records = catalog[kind].filter((record) => JSON.stringify(record).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return { catalog, kind, draft, loading: loading || auth.loading, busy, dirty, ready, permitted, records, search, setSearch, edit, update, save, setStatus, reload, note, setNote, reference, saveReference, ...feedback };
};
