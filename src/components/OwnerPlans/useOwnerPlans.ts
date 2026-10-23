import { plansAPI } from '../../api/plans';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../shared/authContext';
import { canAccessOwner } from '../../shared/authentication/types';
import type { PlanDraft, PlanRecord, PlansSnapshot } from '../../shared/plans/types';
import { planCatalogLimit, createPlanDraft, normalizePlanDraft } from '../../shared/plans/values';

type PlanFilter = `all` | `active` | `inactive`;
type Editor = { draft: PlanDraft; price: string; order: string; features: string; record: PlanRecord | null };
type Controls = { scope: string; search: string; filter: PlanFilter; archivingId: string; editor: Editor | null };
const emptyControls = (scope: string): Controls => ({ scope, search: ``, filter: `all`, archivingId: ``, editor: null });

export const formatPlanDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(`en-US`, { day: `numeric`, year: `numeric`, month: `short` }) : `—`;
};

export const useOwnerPlans = () => {
  const auth = useAuth();
  const permitted = !auth.loading && auth.status === `signed-in` && canAccessOwner(auth.account);
  const identityKey = `${auth.status}:${auth.loading}:${auth.account?.id ?? `guest`}:${auth.account?.authUid ?? ``}:${auth.account?.role ?? ``}:${auth.account?.active ?? false}:${auth.account?.roleVerified ?? false}:${auth.account?.emailVerified ?? false}`;
  const identity = useRef({ key: identityKey, revision: 0 });
  if (identity.current.key !== identityKey) identity.current = { key: identityKey, revision: identity.current.revision + 1 };
  const identityScope = `${identityKey}:${identity.current.revision}`;
  const currentScope = useRef(identityScope);
  currentScope.current = identityScope;
  const pending = useRef<{ scope: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [controls, setControls] = useState(() => emptyControls(identityScope));
  const [feedback, setFeedback] = useState({ scope: identityScope, busy: false, row: ``, error: ``, notice: `` });
  const [state, setState] = useState<{ scope: string; snapshot: PlansSnapshot } | null>(null);
  const scope = `${identityScope}:${revision}`;
  const current = controls.scope === identityScope ? controls : emptyControls(identityScope);
  const response = feedback.scope === identityScope ? feedback : { busy: false, row: ``, error: ``, notice: `` };
  const snapshot = permitted && state?.scope === scope ? state.snapshot : null;
  const ready = snapshot?.status === `ready`;
  const loading = auth.loading || (permitted && (!snapshot || snapshot.status === `loading`));
  const plans = ready ? snapshot.plans : [];
  const query = current.search.trim().toLocaleLowerCase();
  const matchingPlans = plans.filter((plan) => (current.filter === `all` || plan.active === (current.filter === `active`))
    && [plan.number, plan.name, plan.slug, plan.description, ...plan.features].join(` `).toLocaleLowerCase().includes(query));

  useEffect(() => {
    currentScope.current = identityScope;
    return () => { if (currentScope.current === identityScope) currentScope.current = ``; };
  }, [identityScope]);
  useEffect(() => {
    if (!permitted) return;
    let active = true;
    try {
      const unsubscribe = plansAPI.subscribeOwner((next) => {
        if (active && currentScope.current === identityScope) setState({ scope, snapshot: next });
      });
      return () => { active = false; unsubscribe(); };
    } catch (failure) {
      setState({ scope, snapshot: { status: `error`, plans: [], message: failure instanceof Error ? failure.message : `Plans Could Not Be Loaded` } });
    }
    return () => { active = false; };
  }, [scope, permitted, identityScope]);

  const setControl = <K extends keyof Controls>(field: K, value: Controls[K]) => setControls((previous) => ({ ...(previous.scope === identityScope ? previous : emptyControls(identityScope)), [field]: value }));
  const clearFeedback = () => setFeedback({ scope: identityScope, busy: false, row: ``, error: ``, notice: `` });
  const runMutation = async (row: string, operation: () => Promise<unknown>, notice: string) => {
    if (!permitted || currentScope.current !== identityScope || pending.current?.scope === identityScope) return false;
    const request = { scope: identityScope };
    pending.current = request;
    setFeedback({ scope: identityScope, busy: true, row, error: ``, notice: `` });
    try {
      await operation();
      if (currentScope.current !== identityScope) return false;
      setFeedback({ scope: identityScope, busy: false, row: ``, error: ``, notice });
      return true;
    } catch (failure) {
      if (currentScope.current === identityScope) setFeedback({ scope: identityScope, busy: false, row: ``, notice: ``, error: failure instanceof Error ? failure.message : `Plan Could Not Be Saved` });
      return false;
    } finally { if (pending.current === request) pending.current = null; }
  };
  const edit = (record?: PlanRecord) => {
    if (!permitted || !ready || response.busy) return;
    const draft = createPlanDraft(record);
    clearFeedback();
    setControls({ ...current, archivingId: ``, editor: { draft, record: record ?? null, price: (draft.priceCents / 100).toFixed(2), order: String(draft.displayOrder), features: draft.features.join(`\n`) } });
  };
  const closeEditor = () => {
    if (pending.current?.scope !== identityScope) setControl(`editor`, null);
  };
  const setDraftField = <K extends keyof PlanDraft>(field: K, value: PlanDraft[K]) => {
    if (pending.current?.scope === identityScope) return;
    setControls((previous) => previous.scope === identityScope && previous.editor ? { ...previous, editor: { ...previous.editor, draft: { ...previous.editor.draft, [field]: value } } } : previous);
  };
  const setEditorText = (field: `price` | `order` | `features`, value: string) => {
    if (pending.current?.scope === identityScope) return;
    setControls((previous) => previous.scope === identityScope && previous.editor ? { ...previous, editor: { ...previous.editor, [field]: value } } : previous);
  };
  const save = async () => {
    const editor = current.editor;
    if (!editor || !permitted || pending.current?.scope === identityScope) return false;
    let draft: PlanDraft;
    try {
      const price = editor.price.trim();
      const order = editor.order.trim();
      if (!/^\d+(?:\.\d{1,2})?$/.test(price)) throw new Error(`Enter A USD Price With At Most Two Decimal Places`);
      if (!/^\d+$/.test(order)) throw new Error(`Enter A Whole Display Order From 0 To 10000`);
      const [dollars, cents = ``] = price.split(`.`);
      const priceCents = Number(dollars) * 100 + Number(cents.padEnd(2, `0`));
      draft = normalizePlanDraft({ ...editor.draft, priceCents, displayOrder: Number(order), features: editor.features.split(/\r?\n/).map((feature) => feature.trim()).filter(Boolean) });
    } catch (failure) {
      setFeedback({ scope: identityScope, busy: false, row: ``, notice: ``, error: failure instanceof Error ? failure.message : `Enter Valid Plan Details` });
      return false;
    }
    const saved = await runMutation(`editor`, () => plansAPI.savePlan(draft, editor.record ?? undefined), `Plan Saved`);
    if (saved) { setControl(`editor`, null); setRevision((value) => value + 1); }
    return saved;
  };
  const changeStatus = async (plan: PlanRecord) => {
    const saved = await runMutation(plan.id, () => plansAPI.setActive(plan, !plan.active), plan.active ? `Plan Hidden` : `Plan Published`);
    if (saved) setRevision((value) => value + 1);
  };
  const archive = async (plan: PlanRecord) => {
    if (current.archivingId !== plan.id) return;
    const saved = await runMutation(plan.id, () => plansAPI.deletePlan(plan), `Plan Archived`);
    if (saved) { setControl(`archivingId`, ``); setRevision((value) => value + 1); }
  };
  return {
    edit, save, archive, ready, plans, loading, snapshot, permitted, closeEditor, changeStatus, setDraftField, setEditorText, matchingPlans,
    busy: loading || response.busy,
    limit: planCatalogLimit,
    notice: response.notice,
    mutating: response.busy,
    pendingRow: response.row,
    search: current.search,
    filter: current.filter,
    editor: current.editor,
    archivingId: current.archivingId,
    activeCount: plans.filter((plan) => plan.active).length,
    error: response.error || (!loading && snapshot?.status !== `ready` ? snapshot?.message : null) || ``,
    setSearch: (value: string) => setControl(`search`, value),
    setFilter: (value: PlanFilter) => setControl(`filter`, value),
    cancelArchive: () => { if (!response.busy) setControl(`archivingId`, ``); },
    reload: () => { if (!response.busy) setRevision((value) => value + 1); },
    requestArchive: (plan: PlanRecord) => { if (!response.busy) { clearFeedback(); setControl(`archivingId`, plan.id); } },
  };
};

export type OwnerPlansPage = ReturnType<typeof useOwnerPlans>;
