import { useAuth } from '../../shared/authContext';
import { useEffect, useRef, useState } from 'react';

type RecoveryKind = `retry` | `signout`;
type RecoveryAttempt = { scope: number; id: number };
type RecoveryState = { scope: number; retrying: boolean; signingOut: boolean; failure: string | null };

const emptyRecovery = (scope: number): RecoveryState => ({ scope, failure: null, retrying: false, signingOut: false });

export const useAccountGate = (ownerOnly: boolean) => {
  const auth = useAuth();
  const alive = useRef(true);
  const sequence = useRef(0);
  const scopeKey = `${auth.identity?.firebaseUid ?? `guest`}:${ownerOnly ? `owner` : `account`}`;
  const current = useRef({ key: scopeKey, revision: 0 });
  const locks = useRef<Record<RecoveryKind, RecoveryAttempt | null>>({ retry: null, signout: null });
  if (current.current.key !== scopeKey) current.current = { key: scopeKey, revision: current.current.revision + 1 };
  const scope = current.current.revision;
  const [state, setState] = useState(() => emptyRecovery(scope));
  const recovery = state.scope === scope ? state : emptyRecovery(scope);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      locks.current = { retry: null, signout: null };
    };
  }, []);

  const recover = async (kind: RecoveryKind) => {
    if (!auth.identity || locks.current.signout?.scope === scope ||
      (kind === `retry` && locks.current.retry?.scope === scope)) return;
    const attempt = { scope, id: ++sequence.current };
    // Signing out must not wait for a stalled account hydration request.
    if (kind === `signout`) locks.current.retry = null;
    locks.current[kind] = attempt;
    setState({ scope, failure: null, retrying: kind === `retry`, signingOut: kind === `signout` });
    const isCurrent = () => alive.current && current.current.revision === scope && locks.current[kind]?.id === attempt.id;
    try {
      const result = await (kind === `retry` ? auth.retryHydration() : auth.signOut());
      if (isCurrent() && !result.ok) setState((previous) => current.current.revision === scope && previous.scope === scope ? { ...previous, failure: result.message } : previous);
    } catch {
      if (isCurrent()) setState((previous) => current.current.revision === scope && previous.scope === scope ? { ...previous, failure: `The Account Action Could Not Be Completed. Try Again.` } : previous);
    } finally {
      if (isCurrent()) {
        locks.current[kind] = null;
        setState((previous) => current.current.revision === scope && previous.scope === scope ? { ...previous, ...(kind === `retry` ? { retrying: false } : { signingOut: false }) } : previous);
      }
    }
  };
  const unavailable = auth.status === `unavailable`;
  const needsRecovery = !auth.account && Boolean(auth.identity);
  return {
    ...auth,
    recover,
    unavailable,
    needsRecovery,
    retrying: recovery.retrying,
    signingOut: recovery.signingOut,
    title: needsRecovery ? `Your account needs attention.` : auth.account && ownerOnly ? `This space is reserved for the Owner.` : `Sign in to view this.`,
    copy: recovery.failure ?? (needsRecovery ? auth.message ?? `Your identity is signed in, but its private account could not be loaded. Retry or sign out.`
      : ownerOnly ? `The archive’s private workspace is available only to its active, verified Owner. Public browsing never unlocks private data or review tools.`
        : unavailable ? `Account services are not connected yet. The public archive and device bookmarks remain available.`
          : `Sign in to open your private profile and cross-device collection. You can always browse without an account.`),
    statusLabel: unavailable ? `Connection unavailable` : needsRecovery ? `Account unavailable` : auth.account ? `Access restricted` : `Sign-in required`,
  };
};
