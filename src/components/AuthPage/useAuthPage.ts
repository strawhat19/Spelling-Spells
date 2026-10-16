import { Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../shared/authContext';
import { safeReturnPath } from '../../shared/routes';
import { rememberAuthDestination } from '../../shared/authentication/returnPath';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { canAccessAccount, type AuthResult } from '../../shared/authentication/types';

export type AuthPageProps = { mode?: `signin` | `signup` };
type AuthAction = `email` | `google` | `reset` | `retry` | `signout` | `verify` | `refresh`;
type AuthField = `displayName` | `email` | `password`;
type Feedback = { tone: `error` | `notice`; message: string } | null;
type FormState = {
  scope: string;
  email: string;
  password: string;
  displayName: string;
  feedback: Feedback;
  busy: AuthAction | null;
  errors: Partial<Record<AuthField, string>>;
};

const emptyForm = (scope: string): FormState => ({
  scope,
  email: ``,
  errors: {},
  password: ``,
  busy: null,
  feedback: null,
  displayName: ``,
});

const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const useAuthPage = ({ mode = `signin` }: AuthPageProps) => {
  const auth = useAuth();
  const router = useRouter();
  const isSignUp = mode === `signup`;
  const { returnTo: requestedReturn } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const returnTo = safeReturnPath(requestedReturn);
  const scope = `${mode}:${auth.identity?.authUid ?? `guest`}`;
  const scopeRef = useRef(scope);
  const mounted = useRef(true);
  const operation = useRef(0);
  const pending = useRef(false);
  const signOutPending = useRef(false);
  const modeRef = useRef(mode);
  const sessionRevision = useRef({ key: scope, value: 0 });
  const [signingOut, setSigningOut] = useState(false);
  const transition = useRef<{ attempt: number; scope: string; mode: string; identityUid: string | null } | null>(null);
  const redirect = useRef<{ target: string; mode: string; accountId: string; identityUid: string } | null>(null);
  const identityRef = useRef(auth.identity?.authUid ?? null);
  const [state, setState] = useState<FormState>(() => emptyForm(scope));
  scopeRef.current = scope;
  modeRef.current = mode;
  if (sessionRevision.current.key !== scope) sessionRevision.current = { key: scope, value: sessionRevision.current.value + 1 };
  identityRef.current = auth.identity?.authUid ?? null;
  const activeTransition = transition.current;
  if (activeTransition?.mode === mode && !activeTransition.identityUid && identityRef.current) activeTransition.identityUid = identityRef.current;
  const ownTransition = activeTransition?.mode === mode && activeTransition.identityUid === identityRef.current;
  const form = state.scope === scope || (ownTransition && state.scope === activeTransition?.scope) ? state : emptyForm(scope);
  const signedIn = auth.status === `signed-in` && canAccessAccount(auth.account);
  const unavailable = auth.status === `unavailable`;
  const loading = auth.loading || auth.status === `loading`;
  const editable = auth.status === `signed-out` && !loading && !form.busy && !signingOut;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current += 1;
      redirect.current = null;
      transition.current = null;
    };
  }, []);

  useEffect(() => {
    const active = transition.current;
    if (active?.mode === mode && active.identityUid === identityRef.current) return;
    operation.current += 1;
    pending.current = false;
    transition.current = null;
    setState(emptyForm(scope));
    if (redirect.current?.mode !== mode || redirect.current?.identityUid !== identityRef.current) redirect.current = null;
  }, [scope, mode]);

  useEffect(() => {
    const destination = redirect.current;
    if (!destination || destination.mode !== mode || loading || !signedIn || form.busy ||
      destination.accountId !== auth.account?.id || destination.identityUid !== auth.identity?.authUid) return;
    redirect.current = null;
    router.replace(destination.target as Href);
  }, [mode, loading, signedIn, form.busy, auth.account?.id, auth.identity?.authUid, router]);

  const patch = (update: Partial<FormState>) => setState((previous) => ({
    ...(previous.scope === scope ? previous : emptyForm(scope)),
    ...update,
  }));

  const setField = (field: AuthField, value: string) => {
    if (!editable) return;
    setState((previous) => {
      const current = previous.scope === scope ? previous : emptyForm(scope);
      return { ...current, [field]: value, feedback: null, errors: { ...current.errors, [field]: undefined } };
    });
  };

  const run = async (action: AuthAction, task: () => Promise<AuthResult>, success: string, shouldRedirect = false) => {
    if (pending.current || signOutPending.current || loading || unavailable) return;
    pending.current = true;
    const attempt = ++operation.current;
    const currentScope = scope;
    if (shouldRedirect) transition.current = { attempt, mode, scope, identityUid: identityRef.current };
    const current = () => mounted.current && operation.current === attempt && (
      scopeRef.current === currentScope || (transition.current?.attempt === attempt && transition.current.mode === mode && transition.current.identityUid === identityRef.current)
    );
    const update = (value: Partial<FormState>) => setState((previous) => ({
      ...(previous.scope === currentScope || previous.scope === scopeRef.current ? previous : emptyForm(scopeRef.current)),
      ...value,
      scope: scopeRef.current,
    }));
    if (action === `signout`) redirect.current = null;
    patch({ busy: action, errors: {}, password: ``, feedback: null });
    try {
      const result = await task();
      if (!current()) return;
      if (result.ok) {
        if (shouldRedirect && result.account && canAccessAccount(result.account) && result.account.authUid === identityRef.current) {
          redirect.current = { mode, target: returnTo, accountId: result.account.id, identityUid: result.account.authUid };
        }
        update({ feedback: { tone: `notice`, message: result.message ?? success } });
      } else {
        redirect.current = null;
        const nonfatal = result.code === `cancelled` || result.code === `unsupported`;
        update({ feedback: { tone: nonfatal ? `notice` : `error`, message: action === `reset` && result.code !== `unsupported` ? `The reset request could not be completed. Please try again later.` : result.message } });
      }
    } catch {
      if (!current()) return;
      redirect.current = null;
      update({ feedback: { tone: `error`, message: `The request could not be completed. Please try again.` } });
    } finally {
      if (current()) {
        pending.current = false;
        transition.current = null;
        update({ busy: null, password: `` });
      }
    }
  };

  const resetSession = async () => {
    if (signOutPending.current || !identityRef.current) return;
    const identityUid = identityRef.current;
    const session = sessionRevision.current.value;
    signOutPending.current = true;
    operation.current += 1;
    pending.current = false;
    redirect.current = null;
    transition.current = null;
    setSigningOut(true);
    setState(emptyForm(scope));
    try {
      const result = await auth.signOut();
      if (!mounted.current || sessionRevision.current.value !== session || modeRef.current !== mode || identityRef.current !== identityUid) return;
      if (!result.ok) setState((previous) => ({
        ...(previous.scope === scopeRef.current ? previous : emptyForm(scopeRef.current)),
        feedback: { tone: `error`, message: result.message },
      }));
    } catch {
      if (mounted.current && sessionRevision.current.value === session && modeRef.current === mode && identityRef.current === identityUid) setState((previous) => ({
        ...(previous.scope === scopeRef.current ? previous : emptyForm(scopeRef.current)),
        feedback: { tone: `error`, message: `Sign-out could not be confirmed. Please try again.` },
      }));
    } finally {
      signOutPending.current = false;
      if (mounted.current) setSigningOut(false);
    }
  };

  const submitEmail = async () => {
    if (!editable || pending.current) return;
    const email = form.email.trim();
    const displayName = form.displayName.trim();
    const errors: FormState[`errors`] = {};
    if (!validEmail(email)) errors.email = `Enter a valid email address.`;
    if (isSignUp && (!displayName || displayName.length > 80)) errors.displayName = `Use a display name between 1 and 80 characters.`;
    if (!form.password || form.password.length > 128 || (isSignUp && form.password.length < 12)) {
      errors.password = isSignUp ? `Use a password between 12 and 128 characters.` : `Enter your password (up to 128 characters).`;
    }
    if (Object.keys(errors).length) {
      patch({ errors, feedback: { tone: `error`, message: `Please check the highlighted fields.` } });
      return;
    }
    const password = form.password;
    await run(`email`, () => isSignUp
      ? auth.signUpWithEmail({ email, password, displayName })
      : auth.signInWithEmail({ email, password }), `Finishing your private account connection…`, true);
  };

  const requestReset = async () => {
    if (!editable || pending.current) return;
    const email = form.email.trim();
    if (!validEmail(email)) {
      patch({ errors: { email: `Enter your email address above to request a reset link.` }, feedback: null });
      return;
    }
    await run(`reset`, () => auth.resetPassword(email), `If this address can receive a password reset, you’ll receive an email with the next steps. Check your spam folder too.`);
  };

  const signInWithGoogle = async () => {
    if (!editable || Platform.OS !== `web`) return;
    rememberAuthDestination(returnTo);
    await run(`google`, auth.signInWithGoogle, `Finishing your private account connection…`, true);
  };

  return {
    ...auth,
    ...form,
    mode,
    loading,
    signedIn,
    signingOut,
    resetSession,
    isSignUp,
    returnTo,
    editable,
    setField,
    unavailable,
    requestReset,
    resendConfirmation: () => run(`verify`, () => auth.resendVerification(form.email.trim()), `If confirmation can be resent, check your inbox and spam folder.`),
    submitEmail,
    signInWithGoogle,
    googleAvailable: Platform.OS === `web`,
    retryConnection: () => run(`retry`, auth.retryHydration, `Account connection refreshed.`),
    resendVerification: () => run(`verify`, auth.sendVerification, `Verification email requested. Check your inbox and spam folder.`),
    refreshVerification: () => run(`refresh`, auth.refreshIdentity, `Verification status refreshed. Your current status is shown above.`),
    switchHref: `${isSignUp ? `/signin` : `/signup`}?returnTo=${encodeURIComponent(returnTo)}`,
    title: isSignUp ? `Begin your next chapter.` : `Welcome back, word wanderer.`,
    formTitle: isSignUp ? `Create your account` : `Sign in to your grimoire`,
    subtitle: isSignUp
      ? `A place for your favorite spells, new discoveries, and a little everyday wonder.`
      : `Every spell you love. Every world you wander. A little magic, all in one place.`,
  };
};
