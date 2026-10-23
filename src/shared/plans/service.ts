import { AppState } from 'react-native';
import { getErrorCode } from '../supabase/errors';
import { getSupabaseClient } from '../supabase/client';
import { canAccessOwner } from '../authentication/types';
import { requireCurrentAccount } from '../authentication/service';
import type { PlanDraft, PlanRecord, PlansSnapshot } from './types';
import { planColumns, planCatalogLimit, readPlanRecord, normalizePlanDraft } from './values';

type OwnerScope = ReturnType<typeof requireCurrentAccount>;
const refreshers = new Set<() => void>();
let subscriptionNumber = 0;
const invalidate = () => refreshers.forEach((refresh) => refresh());
const ownerScope = (expected?: OwnerScope): OwnerScope => {
  const access = requireCurrentAccount(expected?.account, expected?.revision);
  if (!canAccessOwner(access.account)) throw new Error(`Owner Access Is Required To Manage Plans`);
  return access;
};
const failure = (error: unknown): Pick<PlansSnapshot, `status` | `message`> => {
  const code = getErrorCode(error);
  if (code === `app/connection-required`) return { status: `unavailable`, message: `Pricing Needs Supabase Configuration` };
  if ([`42P01`, `PGRST202`, `PGRST205`, `42883`].includes(code)) return { status: `unavailable`, message: `The Pricing Database Setup Is Not Available Yet` };
  if (code === `23505`) return { status: `error`, message: `This Plan Slug Is Already In Use` };
  if (code === `40001`) return { status: `error`, message: `The Plan Changed On Another Device. Reload Before Trying Again` };
  if ([`42501`, `PGRST301`, `app/identity-changed`].includes(code)) return { status: `error`, message: `This Plan Action Is Not Permitted For The Current Account` };
  const message = error instanceof Error ? error.message : error && typeof error === `object` && `message` in error ? String(error.message) : `The Plan Catalog Could Not Be Loaded`;
  return { status: `error`, message };
};
const readPlans = async (owner?: OwnerScope): Promise<PlanRecord[]> => {
  if (owner) ownerScope(owner);
  const client = owner?.client ?? getSupabaseClient();
  const query = client.from(`pricing_plans`).select(planColumns).order(`display_order`).order(`number`).limit(planCatalogLimit + 1);
  const { data, error } = await (owner ? query : query.eq(`active`, true));
  if (owner) ownerScope(owner);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error(`The Plan Catalog Returned An Unsupported Response`);
  if (data.length > planCatalogLimit) throw new Error(`The Plan Catalog Exceeds The ${planCatalogLimit}-Plan Window. No Partial Catalog Was Substituted`);
  return data.map(readPlanRecord);
};
const subscribe = (receive: (value: PlansSnapshot) => void, manager: boolean): (() => void) => {
  let disposed = false;
  let pending = false;
  let dirty = false;
  let current: PlansSnapshot = { status: `loading`, plans: [], message: null };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const emit = (value: PlansSnapshot) => { if (!disposed) { current = value; receive(value); } };
  let access: OwnerScope | undefined;
  try { if (manager) access = ownerScope(); getSupabaseClient(); }
  catch (error) { emit({ plans: [], ...failure(error) }); return () => { disposed = true; }; }
  const refresh = async (): Promise<void> => {
    dirty = true;
    if (disposed || pending) return;
    pending = true;
    try {
      while (dirty && !disposed) {
        dirty = false;
        try {
          const plans = await readPlans(access);
          if (!disposed) emit({ plans, status: `ready`, message: null });
        } catch (error) {
          if (!disposed) emit({ plans: manager ? [] : current.plans, ...failure(error) });
        }
      }
    } finally { pending = false; }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 100); };
  const client = access?.client ?? getSupabaseClient();
  const channel = client.channel(`pricing-plans:${++subscriptionNumber}`).on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `pricing_plan_feed` }, schedule).subscribe((status) => { if (status === `SUBSCRIBED`) schedule(); });
  const appState = AppState.addEventListener(`change`, (state) => { if (state === `active`) schedule(); });
  const interval = setInterval(() => { if (typeof document === `undefined` || !document.hidden) schedule(); }, 60_000);
  if (typeof window !== `undefined`) window.addEventListener(`focus`, schedule);
  refreshers.add(schedule);
  emit(current);
  void refresh();
  return () => {
    disposed = true;
    refreshers.delete(schedule);
    clearInterval(interval);
    clearTimeout(timer);
    appState.remove();
    if (typeof window !== `undefined`) window.removeEventListener(`focus`, schedule);
    void client.removeChannel(channel);
  };
};

export const plansService = {
  getPublicPlans: (): Promise<PlanRecord[]> => readPlans(),
  subscribePublic: (receive: (value: PlansSnapshot) => void): (() => void) => subscribe(receive, false),
  subscribeOwner: (receive: (value: PlansSnapshot) => void): (() => void) => subscribe(receive, true),
  savePlan: async (input: PlanDraft, existing?: PlanRecord): Promise<PlanRecord> => {
    const access = ownerScope();
    const draft = normalizePlanDraft(input);
    if (existing && draft.slug !== existing.slug) throw new Error(`A Saved Plan Slug Cannot Be Changed`);
    const { data, error } = await access.client.rpc(`owner_save_pricing_plan`, { p_record: { ...draft, expectedAuthUid: access.account.authUid, ...(existing ? { id: existing.id, expectedRevision: existing.revision } : {}) } });
    ownerScope(access);
    if (error) throw new Error(failure(error).message ?? `The Plan Could Not Be Saved`);
    const plan = readPlanRecord(Array.isArray(data) ? data?.[0] : data);
    invalidate();
    return plan;
  },
  setActive: async (plan: PlanRecord, active: boolean): Promise<PlanRecord> => plansService.savePlan({ ...plan, active }, plan),
  deletePlan: async (plan: PlanRecord): Promise<void> => {
    const access = ownerScope();
    const { data, error } = await access.client.rpc(`owner_delete_pricing_plan`, { p_id: plan.id, p_expected_revision: plan.revision, p_expected_auth_uid: access.account.authUid });
    ownerScope(access);
    if (error) throw new Error(failure(error).message ?? `The Plan Could Not Be Deleted`);
    if (data !== plan.id) throw new Error(`The Database Did Not Confirm The Plan Deletion`);
    invalidate();
  },
};
