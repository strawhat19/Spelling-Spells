import { AppState } from 'react-native';
import { planCatalogLimit } from './values';
import { getErrorCode } from '../supabase/errors';
import { getSupabaseClient } from '../supabase/client';

export type PlanTier = { id: string; slug: string; number: number; displayOrder: number };
export type PlanTierSnapshot = { tiers: PlanTier[]; error: string | null; status: `loading` | `ready` | `error` | `unavailable` };
const pageSize = 25;
let subscriptionNumber = 0;
export const freePlanSlug = `free`;
export const comparePlanTiers = (left: PlanTier, right: PlanTier) => left.displayOrder - right.displayOrder || left.number - right.number;
const readTier = (value: unknown): PlanTier => {
  if (!value || typeof value !== `object` || Array.isArray(value)) throw new Error(`The Plan Tier Is Unavailable`);
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 4 || typeof row.id !== `string` || typeof row.slug !== `string` || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || row.slug.length > 80 ||
    !Number.isSafeInteger(row.number) || Number(row.number) < 1 || !Number.isSafeInteger(row.display_order) || Number(row.display_order) < 0 || Number(row.display_order) > 10_000 || !row.id.startsWith(`Plan_${row.number}_`)) throw new Error(`The Plan Tier Has An Unsupported Identity Or Rank`);
  return { id: row.id, slug: row.slug, number: row.number as number, displayOrder: row.display_order as number };
};
const getTiers = async (): Promise<PlanTier[]> => {
  const client = getSupabaseClient();
  const tiers: PlanTier[] = [];
  let cursor = 0;
  while (tiers.length <= planCatalogLimit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const result = await Promise.resolve(client.from(`pricing_plan_tiers`).select(`id,slug,number,display_order`).gt(`number`, cursor).order(`number`).limit(pageSize).abortSignal(controller.signal)).finally(() => clearTimeout(timeout));
    const { data, error } = result;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error(`The Plan Tier Index Returned An Unsupported Response`);
    const page = data.map(readTier);
    if (page.some((tier, index) => tier.number <= (index ? page?.[index - 1]?.number ?? cursor : cursor))) throw new Error(`The Plan Tier Index Has An Unsupported Order`);
    tiers.push(...page);
    if (tiers.length > planCatalogLimit) throw new Error(`The Plan Tier Index Exceeds The ${planCatalogLimit}-Plan Limit. No Partial Index Was Used`);
    if (page.length < pageSize) break;
    cursor = page.at(-1)?.number ?? cursor;
  }
  if (new Set(tiers.map((tier) => tier.id)).size !== tiers.length || new Set(tiers.map((tier) => tier.slug)).size !== tiers.length) throw new Error(`The Plan Tier Index Has Duplicate Identities`);
  return tiers.sort(comparePlanTiers);
};
const failure = (error: unknown): Pick<PlanTierSnapshot, `status` | `error`> => {
  const code = getErrorCode(error);
  if (code === `app/connection-required`) return { status: `unavailable`, error: `Plan Tiers Need Supabase Configuration` };
  if ([`42P01`, `PGRST202`, `PGRST205`, `42883`].includes(code)) return { status: `unavailable`, error: `The Plan Tier Database Setup Is Not Available Yet` };
  return { status: `error`, error: error instanceof Error ? error.message : `The Plan Tiers Could Not Be Loaded` };
};
export const subscribePlanTiers = (receive: (snapshot: PlanTierSnapshot) => void): (() => void) => {
  let dirty = false;
  let pending = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: PlanTierSnapshot = { tiers: [], error: null, status: `loading` };
  const emit = (snapshot: PlanTierSnapshot) => { if (!disposed) { current = snapshot; receive(snapshot); } };
  let client: ReturnType<typeof getSupabaseClient>;
  try { client = getSupabaseClient(); }
  catch (error) { emit({ tiers: [], ...failure(error) }); return () => { disposed = true; }; }
  const refresh = async () => {
    dirty = true;
    if (disposed || pending) return;
    pending = true;
    try {
      while (dirty && !disposed) {
        dirty = false;
        try {
          const tiers = await getTiers();
          if (dirty) continue;
          emit({ tiers, error: null, status: `ready` });
        }
        catch (error) { emit({ tiers: current.tiers, ...failure(error) }); }
      }
    } finally { pending = false; }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 100); };
  const channel = client.channel(`plan-tiers:${++subscriptionNumber}`).on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `pricing_plan_feed` }, schedule).subscribe((status) => { if (status === `SUBSCRIBED`) schedule(); });
  const foreground = AppState.addEventListener(`change`, (state) => { if (state === `active`) schedule(); });
  const interval = setInterval(() => { if (typeof document === `undefined` || !document.hidden) schedule(); }, 60_000);
  if (typeof window !== `undefined`) window.addEventListener(`focus`, schedule);
  emit(current);
  void refresh();
  return () => {
    disposed = true;
    clearTimeout(timer);
    clearInterval(interval);
    foreground.remove();
    if (typeof window !== `undefined`) window.removeEventListener(`focus`, schedule);
    void client.removeChannel(channel);
  };
};
