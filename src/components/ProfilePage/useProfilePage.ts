import { useAuth } from '../../shared/authContext';
import { useEffect, useRef, useState } from 'react';
import { useBilling } from '../../shared/billing/useBilling';
import { useTheme } from '../../shared/themeContext/useTheme';
import { canAccessAccount, getAccountAvatar, type AuthResult } from '../../shared/authentication/types';

export type ProfilePageProps = { view?: `profile` | `connections` };
type ProfileAction = `save` | `verify` | `refresh` | `retry` | `signout`;
type ProfileField = `displayName` | `avatarUrl`;
type Feedback = { tone: `error` | `notice`; message: string } | null;
type EditorState = {
  scope: string;
  avatarUrl: string;
  displayName: string;
  feedback: Feedback;
  busy: ProfileAction | null;
  touched: Partial<Record<ProfileField, boolean>>;
  errors: Partial<Record<ProfileField, string>>;
};

const emptyEditor = (scope: string): EditorState => ({
  scope,
  busy: null,
  errors: {},
  touched: {},
  avatarUrl: ``,
  feedback: null,
  displayName: ``,
});

export const useProfilePage = ({ view = `profile` }: ProfilePageProps) => {
  const auth = useAuth();
  const billing = useBilling();
  const theme = useTheme();
  const confirmedScope = useRef<{ identityUid: string; accountId: string } | null>(null);
  const identityUid = auth.identity?.authUid ?? null;
  if (confirmedScope.current?.identityUid !== identityUid || auth.status === `error` || auth.status === `signed-out`) confirmedScope.current = null;
  if (identityUid && canAccessAccount(auth.account)) confirmedScope.current = { identityUid, accountId: auth.account.id };
  // A pending write temporarily hides account authority, not this identity's unsaved draft.
  const accountId = auth.account?.id ?? (auth.phase === `account` && auth.status === `loading` ? confirmedScope.current?.accountId : null);
  const scope = `${view}:${identityUid ?? `guest`}:${accountId ?? `pending`}`;
  const scopeRef = useRef(scope);
  const mounted = useRef(true);
  const operation = useRef(0);
  const pending = useRef(false);
  const signOutPending = useRef(false);
  const viewRef = useRef(view);
  const sessionKey = `${view}:${identityUid ?? `guest`}`;
  const sessionRevision = useRef({ key: sessionKey, value: 0 });
  const identityRef = useRef(identityUid);
  const [signingOut, setSigningOut] = useState(false);
  const [state, setState] = useState(() => emptyEditor(scope));
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  scopeRef.current = scope;
  viewRef.current = view;
  if (sessionRevision.current.key !== sessionKey) sessionRevision.current = { key: sessionKey, value: sessionRevision.current.value + 1 };
  identityRef.current = identityUid;
  const editor = state.scope === scope ? state : emptyEditor(scope);
  const loading = auth.loading || auth.status === `loading`;
  const allowed = !loading && auth.status === `signed-in` && canAccessAccount(auth.account);
  const displayName = editor.touched.displayName ? editor.displayName : auth.account?.displayName ?? ``;
  const avatarDraft = editor.touched.avatarUrl ? editor.avatarUrl : auth.account?.avatarUrl ?? ``;
  const confirmedAvatar = getAccountAvatar(auth.account);
  const dirty = displayName.trim() !== (auth.account?.displayName ?? ``) || avatarDraft.trim() !== (auth.account?.avatarUrl ?? ``);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current += 1;
    };
  }, []);

  useEffect(() => {
    operation.current += 1;
    pending.current = false;
    setState(emptyEditor(scope));
    setFailedAvatar(null);
  }, [scope]);

  const patch = (update: Partial<EditorState>) => setState((previous) => ({
    ...(previous.scope === scope ? previous : emptyEditor(scope)),
    ...update,
  }));

  const setField = (field: ProfileField, value: string) => {
    if (!allowed || editor.busy || pending.current || signOutPending.current) return;
    setState((previous) => {
      const current = previous.scope === scope ? previous : emptyEditor(scope);
      return { ...current, [field]: value, feedback: null, errors: { ...current.errors, [field]: undefined }, touched: { ...current.touched, [field]: true } };
    });
  };

  const run = async (action: ProfileAction, task: () => Promise<AuthResult>, message: string) => {
    if (pending.current || signOutPending.current || loading || auth.status === `unavailable`) return;
    pending.current = true;
    const attempt = ++operation.current;
    const currentScope = scope;
    const current = () => mounted.current && scopeRef.current === currentScope && operation.current === attempt;
    patch({ busy: action, feedback: null });
    try {
      const result = await task();
      if (!current()) return;
      if (result.ok) {
        patch({ ...(action === `save` ? { touched: {}, errors: {} } : {}), feedback: { tone: `notice`, message } });
      } else {
        patch({ feedback: { tone: result.code === `cancelled` || result.code === `unsupported` ? `notice` : `error`, message: result.message } });
      }
    } catch {
      if (current()) patch({ feedback: { tone: `error`, message: `The request could not be completed. Your changes have not been confirmed.` } });
    } finally {
      if (current()) {
        pending.current = false;
        patch({ busy: null });
      }
    }
  };

  const resetSession = async () => {
    if (signOutPending.current || !identityRef.current) return;
    const signingOutIdentity = identityRef.current;
    const session = sessionRevision.current.value;
    signOutPending.current = true;
    operation.current += 1;
    pending.current = false;
    setSigningOut(true);
    setState(emptyEditor(scope));
    try {
      const result = await auth.signOut();
      if (!mounted.current || sessionRevision.current.value !== session || viewRef.current !== view || identityRef.current !== signingOutIdentity) return;
      if (!result.ok) setState((previous) => ({
        ...(previous.scope === scopeRef.current ? previous : emptyEditor(scopeRef.current)),
        feedback: { tone: `error`, message: result.message },
      }));
    } catch {
      if (mounted.current && sessionRevision.current.value === session && viewRef.current === view && identityRef.current === signingOutIdentity) setState((previous) => ({
        ...(previous.scope === scopeRef.current ? previous : emptyEditor(scopeRef.current)),
        feedback: { tone: `error`, message: `Sign-out could not be confirmed. Please try again.` },
      }));
    } finally {
      signOutPending.current = false;
      if (mounted.current) setSigningOut(false);
    }
  };

  const saveProfile = async () => {
    if (!allowed || editor.busy || pending.current || signOutPending.current || !dirty) return;
    const name = displayName.trim();
    const avatar = avatarDraft.trim();
    const errors: EditorState[`errors`] = {};
    let avatarUrl: string | null = null;
    if (!name || name.length > 80) errors.displayName = `Use a display name between 1 and 80 characters.`;
    if (avatar) {
      try {
        const url = new URL(avatar);
        if (avatar.length > 2048 || url.href.length > 2048 || url.protocol !== `https:` || url.username || url.password) throw new Error(`Invalid Avatar`);
        avatarUrl = url.href;
      } catch {
        errors.avatarUrl = `Use an HTTPS image URL up to 2,048 characters without embedded credentials, or leave this blank.`;
      }
    }
    if (Object.keys(errors).length) {
      patch({ errors, feedback: { tone: `error`, message: `Please check the highlighted fields.` } });
      return;
    }
    await run(`save`, () => auth.updateProfile({ avatarUrl, displayName: name }), `Profile changes saved to your private account.`);
  };

  const connectionRequirements = [
    { id: `identity`, icon: `user`, name: `Account identity`, detail: `Your sign-in identity and private app account are loaded.`, status: allowed ? `Connected` : `Not connected`, connected: allowed },
    { id: `sync`, icon: `bookmark`, name: `Cross-device collection`, detail: `Open your spellbook to see the current connection and save status for this account. Device bookmarks remain separate.`, status: `View spellbook`, connected: false },
    { id: `contributions`, icon: `edit`, name: `Your contributions`, detail: `Open My Submissions for server-confirmed contributions and review decisions. A missing database setup is reported there.`, status: `View submissions`, connected: false },
    { id: `reporting`, icon: `chart`, name: `Archive reporting`, detail: `Provider reporting has not been connected. Account access does not enable reporting or grant an Owner role.`, status: `Not connected`, connected: false },
  ];

  return {
    ...auth,
    ...theme,
    ...editor,
    view,
    dirty,
    billing,
    loading,
    allowed,
    signingOut,
    resetSession,
    setField,
    avatarDraft,
    saveProfile,
    displayName,
    planLabel: billing.planLabel,
    connectionRequirements,
    editable: allowed && !editor.busy && !signingOut,
    showRecovery: !allowed && (auth.status === `error` || Boolean(auth.identity)),
    avatarUrl: failedAvatar === confirmedAvatar ? null : confirmedAvatar,
    avatarInitial: auth.account?.displayName.trim().charAt(0).toUpperCase() || `?`,
    onAvatarError: () => setFailedAvatar(confirmedAvatar),
    discardChanges: () => { if (!pending.current) setState(emptyEditor(scope)); },
    retryConnection: () => run(`retry`, auth.retryHydration, `Account connection refreshed.`),
    resendVerification: () => run(`verify`, auth.sendVerification, `Verification email requested. Check your inbox and spam folder.`),
    refreshVerification: () => run(`refresh`, auth.refreshIdentity, `Verification status refreshed. Your current status is shown above.`),
    title: view === `connections` ? `Private connections` : `Your profile`,
    description: view === `connections` ? `A private home for your account services. Your credentials never belong in a public profile.` : `A little about you, and the way you explore the archive.`,
  };
};
