import { AppState } from 'react-native';
import { getErrorCode } from '../supabase/errors';
import { getSupabaseClient } from '../supabase/client';
import { canAccessOwner } from '../authentication/types';
import { requireCurrentAccount } from '../authentication/service';
import type { FeatureKey, FeaturePolicy, FeatureSettings, FeatureSnapshot } from './types';
import { featureKeys, featureScope, featureColumns, readFeatureSettings, normalizeFeaturePolicy } from './values';

type OwnerScope = ReturnType<typeof requireCurrentAccount>;
const refreshers = new Set<() => void>();
let subscriptionNumber = 0;
const ownerScope = (expected?: OwnerScope): OwnerScope => {
  const access = requireCurrentAccount(expected?.account, expected?.revision);
  if (!canAccessOwner(access.account)) throw new Error(`Owner Access Is Required To Manage Features`);
  return access;
};
const failure = (error: unknown): Pick<FeatureSnapshot, `status` | `error`> => {
  const code = getErrorCode(error);
  if (code === `app/connection-required`) return { status: `unavailable`, error: `Feature Settings Need Supabase Configuration` };
  if ([`42P01`, `PGRST202`, `PGRST205`, `42883`].includes(code)) return { status: `unavailable`, error: `The Feature Settings Database Setup Is Not Available Yet` };
  if (code === `40001`) return { status: `error`, error: `The Feature Changed On Another Device. Reload Before Trying Again` };
  if ([`42501`, `PGRST301`, `app/identity-changed`].includes(code)) return { status: `error`, error: `This Feature Action Is Not Permitted For The Current Account` };
  const message = error instanceof Error ? error.message : error && typeof error === `object` && `message` in error ? String(error.message) : `The Feature Settings Could Not Be Loaded`;
  return { status: `error`, error: message };
};
const readSettings = async (): Promise<FeatureSettings | null> => {
  const { data, error } = await getSupabaseClient().from(`feature_settings`).select(featureColumns).eq(`scope`, featureScope).limit(1).maybeSingle();
  if (error) throw error;
  return data === null ? null : readFeatureSettings(data);
};

export const featuresService = {
  getSettings: readSettings,
  subscribe: (receive: (snapshot: FeatureSnapshot) => void): (() => void) => {
    let dirty = false;
    let pending = false;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: FeatureSnapshot = { settings: null, error: null, status: `loading` };
    const emit = (value: FeatureSnapshot) => { if (!disposed) { current = value; receive(value); } };
    let client: ReturnType<typeof getSupabaseClient>;
    try { client = getSupabaseClient(); }
    catch (error) { emit({ settings: null, ...failure(error) }); return () => { disposed = true; }; }
    const refresh = async (): Promise<void> => {
      dirty = true;
      if (disposed || pending) return;
      pending = true;
      try {
        while (dirty && !disposed) {
          dirty = false;
          try {
            const settings = await readSettings();
            if (!settings && current.settings) throw new Error(`The Saved Feature Settings Are Missing`);
            emit({ settings, error: null, status: `ready` });
          } catch (error) { emit({ settings: current.settings, ...failure(error) }); }
        }
      } finally { pending = false; }
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 100); };
    const channel = client.channel(`feature-settings:${++subscriptionNumber}`).on(`postgres_changes`, {
      event: `UPDATE`, schema: `public`, table: `feature_settings`, filter: `scope=eq.${featureScope}`,
    }, schedule).subscribe((status) => { if (status === `SUBSCRIBED`) schedule(); });
    const appState = AppState.addEventListener(`change`, (state) => { if (state === `active`) schedule(); });
    const interval = setInterval(() => { if (typeof document === `undefined` || !document.hidden) schedule(); }, 60_000);
    if (typeof window !== `undefined`) window.addEventListener(`focus`, schedule);
    refreshers.add(schedule);
    emit(current);
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(interval);
      refreshers.delete(schedule);
      appState.remove();
      if (typeof window !== `undefined`) window.removeEventListener(`focus`, schedule);
      void client.removeChannel(channel);
    };
  },
  saveFeature: async (key: FeatureKey, input: FeaturePolicy, expectedRevision: number): Promise<FeatureSettings> => {
    const access = ownerScope();
    if (!featureKeys.includes(key) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new Error(`Confirm The Feature And Saved Revision Before Saving`);
    const policy = normalizeFeaturePolicy(input);
    const { data, error } = await access.client.rpc(`owner_save_feature_policy`, {
      p_key: key,
      p_policy: policy,
      p_expected_revision: expectedRevision,
      p_expected_auth_uid: access.account.authUid,
    });
    ownerScope(access);
    if (error) throw new Error(failure(error).error ?? `The Feature Could Not Be Saved`);
    const settings = readFeatureSettings(Array.isArray(data) ? data?.[0] : data);
    refreshers.forEach((refresh) => refresh());
    return settings;
  },
};
