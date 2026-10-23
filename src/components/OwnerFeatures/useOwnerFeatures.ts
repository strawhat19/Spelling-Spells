import { plansAPI } from '../../api/plans';
import { useAuth } from '../../shared/authContext';
import { useRef, useState, useEffect } from 'react';
import type { PlansSnapshot } from '../../shared/plans/types';
import { featureRoles } from '../../shared/featureFlags/values';
import { canAccessOwner } from '../../shared/authentication/types';
import { useFeatureFlags } from '../../shared/featureFlags/useFeatureFlags';
import type { FeatureKey, FeatureRole, FeaturePolicy } from '../../shared/featureFlags/types';

export { featureRoles };
export const managedFeatures: { key: FeatureKey; icon: string; name: string }[] = [
  { key: `themeToggle`, icon: `sun`, name: `Theme Toggle` },
  { key: `marquee`, icon: `letters`, name: `Parchment Marquee` },
  { key: `contact`, icon: `mail`, name: `Contact` },
  { key: `notifications`, icon: `bell`, name: `Notifications` },
  { key: `grimoireTools`, icon: `book`, name: `Grimoire Tools` },
];
type Editor = { key: FeatureKey; token: number; revision: number; draft: FeaturePolicy };
type Controls = { scope: string; editor: Editor | null; failed: boolean; error: string; pendingKey: FeatureKey | null };
const emptyControls = (scope: string): Controls => ({ scope, editor: null, failed: false, error: ``, pendingKey: null });

export const useOwnerFeatures = () => {
  const auth = useAuth();
  const flags = useFeatureFlags();
  const permitted = !auth.loading && auth.status === `signed-in` && canAccessOwner(auth.account);
  const identityKey = `${auth.status}:${auth.loading}:${auth.account?.id ?? `guest`}:${auth.account?.authUid ?? ``}:${auth.account?.role ?? ``}:${auth.account?.active ?? false}:${auth.account?.roleVerified ?? false}:${auth.account?.emailVerified ?? false}`;
  const identity = useRef({ key: identityKey, revision: 0 });
  if (identity.current.key !== identityKey) identity.current = { key: identityKey, revision: identity.current.revision + 1 };
  const scope = `${identityKey}:${identity.current.revision}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const editorToken = useRef(0);
  const pending = useRef<object | null>(null);
  const [controls, setControls] = useState(() => emptyControls(scope));
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [catalog, setCatalog] = useState<{ scope: string; value: PlansSnapshot } | null>(null);
  const current = controls.scope === scope ? controls : emptyControls(scope);
  const settings = permitted ? flags.settings : null;
  const ready = permitted && flags.ready && settings?.version === 2;
  const loading = auth.loading || (permitted && flags.status === `loading`);
  const mutating = flags.saving || Boolean(current.pendingKey);
  const planSnapshot = catalog?.scope === scope ? catalog.value : null;
  const plans = planSnapshot?.status === `ready` ? planSnapshot.plans : [];
  const planChoices = plans.filter((plan) => plan.slug !== `free`);
  const plansReady = ready && flags.tierStatus === `ready` && planSnapshot?.status === `ready` && plans.length === flags.tiers.length && plans.every((plan) => flags.tiers.some((tier) => tier.id === plan.id && tier.slug === plan.slug && tier.number === plan.number && tier.displayOrder === plan.displayOrder));

  useEffect(() => {
    if (!permitted) return;
    let active = true;
    setCatalog(null);
    const unsubscribe = plansAPI.subscribeOwner((value) => { if (active && currentScope.current === scope) setCatalog({ scope, value }); });
    return () => { active = false; unsubscribe(); };
  }, [scope, permitted, catalogRetry]);

  useEffect(() => {
    currentScope.current = scope;
    return () => { if (currentScope.current === scope) currentScope.current = ``; };
  }, [scope]);

  const edit = (key: FeatureKey) => {
    const policy = settings?.features?.[key];
    if (!ready || !policy || !settings || mutating || pending.current) return;
    editorToken.current += 1;
    setControls({ ...emptyControls(scope), editor: { key, revision: settings.revision, token: editorToken.current, draft: { ...policy, plans: policy.plans ? [...policy.plans] : null, roles: policy.roles ? [...policy.roles] : null } } });
  };
  const closeEditor = () => {
    if (!mutating && !pending.current) setControls((previous) => previous.scope === scope ? { ...previous, editor: null, failed: false, error: `` } : previous);
  };
  const setDraftField = <K extends keyof FeaturePolicy>(field: K, value: FeaturePolicy[K]) => {
    if (mutating || pending.current) return;
    setControls((previous) => previous.scope === scope && previous.editor ? { ...previous, failed: false, error: ``, editor: { ...previous.editor, draft: { ...previous.editor.draft, [field]: value } } } : previous);
  };
  const toggleRole = (role: FeatureRole) => {
    const selected = current.editor?.draft.roles ?? featureRoles;
    const next = selected.includes(role) ? selected.filter((item) => item !== role) : featureRoles.filter((item) => item === role || selected.includes(item));
    setDraftField(`roles`, next.length === featureRoles.length ? null : next);
  };
  const persist = async (key: FeatureKey, policy: FeaturePolicy, revision: number, token?: number) => {
    if (!ready || mutating || pending.current || currentScope.current !== scope) return false;
    const request = {};
    pending.current = request;
    setControls((previous) => ({ ...(previous.scope === scope ? previous : emptyControls(scope)), failed: false, error: ``, pendingKey: key }));
    let saved = false;
    let message = ``;
    try { saved = await flags.saveFeature(key, policy, revision); }
    catch (failure) { message = failure instanceof Error ? failure.message : `Feature Could Not Be Saved`; }
    finally { if (pending.current === request) pending.current = null; }
    if (currentScope.current !== scope) return false;
    setControls((previous) => previous.scope !== scope ? previous : {
      ...previous,
      pendingKey: null,
      failed: !saved,
      error: message,
      editor: saved && token !== undefined && previous.editor?.token === token ? null : previous.editor,
    });
    return saved;
  };
  const save = () => {
    const editor = current.editor;
    return editor ? persist(editor.key, { ...editor.draft, description: editor.draft.description.trim() }, editor.revision, editor.token) : Promise.resolve(false);
  };
  const setEnabled = (key: FeatureKey, enabled: boolean) => {
    const policy = settings?.features?.[key];
    return policy && settings && policy.enabled !== enabled ? persist(key, { ...policy, enabled }, settings.revision) : Promise.resolve(false);
  };
  const setMinimumPlan = (key: FeatureKey, slug: string) => {
    const policy = settings?.features?.[key];
    if (!policy || !settings || slug === `free`) return Promise.resolve(false);
    const clear = policy.plans?.[0] === slug;
    if (!clear && (!plansReady || !planChoices.some((plan) => plan.slug === slug))) return Promise.resolve(false);
    return persist(key, { ...policy, plans: clear ? null : [slug] }, settings.revision);
  };
  const planLabel = (policy?: FeaturePolicy) => {
    const slug = policy?.plans?.[0];
    return !policy ? `Plans Unavailable` : !slug ? `Free And Above` : `${plans.find((plan) => plan.slug === slug)?.name ?? `Unavailable Plan (${slug})`} And Above`;
  };
  const choicesFor = (policy?: FeaturePolicy) => {
    const choices = planChoices.map((plan) => ({ slug: plan.slug, name: plan.name, available: plansReady }));
    const selected = policy?.plans?.[0];
    return selected && !choices.some((choice) => choice.slug === selected) ? [...choices, { slug: selected, name: `Unavailable Plan (${selected})`, available: false }] : choices;
  };
  const discardAndReload = () => {
    if (!permitted || !current.editor || mutating || pending.current || currentScope.current !== scope) return;
    setControls(emptyControls(scope));
    flags.reload();
    setCatalogRetry((value) => value + 1);
  };
  return {
    edit, save, scope, ready, loading, settings, permitted, mutating, toggleRole, setEnabled, closeEditor, setDraftField,
    discardAndReload, plansReady, planLabel, choicesFor, setMinimumPlan,
    editor: current.editor,
    pendingKey: current.pendingKey,
    busy: loading || mutating,
    error: flags.error || (permitted && flags.ready && settings?.version !== 2 ? `Feature Settings Need The Plan Access Database Update` : ``),
    planError: flags.tierError || (planSnapshot?.status === `error` || planSnapshot?.status === `unavailable` ? planSnapshot.message : ``) || (ready && flags.tierStatus === `ready` && planSnapshot?.status === `ready` && !plansReady ? `The Catalog And Plan Tier Index Do Not Match. Reload Before Changing Plan Thresholds` : ``),
    mutationError: current.failed ? current.error || flags.saveError || `Feature Could Not Be Saved` : ``,
    reload: () => { if (!mutating && !pending.current) { flags.reload(); setCatalogRetry((value) => value + 1); } },
  };
};

export type OwnerFeaturesPage = ReturnType<typeof useOwnerFeatures>;
