import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../shared/authContext';
import { featureRoles } from '../../shared/featureFlags/values';
import { canAccessOwner } from '../../shared/authentication/types';
import { useFeatureFlags } from '../../shared/featureFlags/useFeatureFlags';
import type { FeatureKey, FeatureRole, FeaturePolicy } from '../../shared/featureFlags/types';

export { featureRoles };
export const managedFeatures: { key: FeatureKey; icon: string; name: string }[] = [{ key: `themeToggle`, icon: `sun`, name: `Theme Toggle` }];
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
  const current = controls.scope === scope ? controls : emptyControls(scope);
  const settings = permitted ? flags.settings : null;
  const ready = permitted && flags.ready && Boolean(settings);
  const loading = auth.loading || (permitted && flags.status === `loading`);
  const mutating = flags.saving || Boolean(current.pendingKey);

  useEffect(() => {
    currentScope.current = scope;
    return () => { if (currentScope.current === scope) currentScope.current = ``; };
  }, [scope]);

  const edit = (key: FeatureKey) => {
    const policy = settings?.features?.[key];
    if (!ready || !policy || !settings || mutating || pending.current) return;
    editorToken.current += 1;
    setControls({ ...emptyControls(scope), editor: { key, revision: settings.revision, token: editorToken.current, draft: { ...policy, roles: policy.roles ? [...policy.roles] : null } } });
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
  const discardAndReload = () => {
    if (!permitted || !current.editor || mutating || pending.current || currentScope.current !== scope) return;
    setControls(emptyControls(scope));
    flags.reload();
  };
  return {
    edit, save, scope, ready, loading, settings, permitted, mutating, toggleRole, setEnabled, closeEditor, setDraftField,
    discardAndReload,
    editor: current.editor,
    pendingKey: current.pendingKey,
    busy: loading || mutating,
    error: flags.error || (permitted && flags.ready && !settings ? `Feature Settings Need Setup` : ``),
    mutationError: current.failed ? current.error || flags.saveError || `Feature Could Not Be Saved` : ``,
    reload: () => { if (!mutating && !pending.current) flags.reload(); },
  };
};

export type OwnerFeaturesPage = ReturnType<typeof useOwnerFeatures>;
