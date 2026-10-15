import type { Auth, User, UserCredential } from 'firebase/auth';
import type { FirebaseRuntime } from '../firebase/client';
import type { Account, AuthResult, AuthSnapshot, EmailSignIn, EmailSignUp, ProfileUpdate } from './types';
import { authFailure, getErrorCode } from '../firebase/errors';
import { firebaseConfigured } from '../firebase/config';
import { getFirebaseRuntime } from '../firebase/client';
import { normalizeProfile, readAccount } from '../models/users/User';
import { signInWithPlatformGoogle } from '../firebase/authPlatform';
import { ensurePrivateAccount, identityFromUser, readPrivateAccount } from '../firebase/accounts';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import {
  reload,
  getIdToken,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';

export const authConnectionMessage = `Account services are not connected yet. Sign-in, account creation, and cloud sync are unavailable. You can still explore the archive and keep a collection on this device.`;

const initialSnapshot = (): AuthSnapshot => ({
  account: null,
  identity: null,
  source: null,
  phase: firebaseConfigured ? `identity` : null,
  status: firebaseConfigured ? `loading` : `unavailable`,
  message: firebaseConfigured ? null : authConnectionMessage,
});

let snapshot = initialSnapshot();
let revision = 0;
let observerRevision = 0;
let sessionRevision = 0;
let observeIdentity = true;
let started = false;
let signingOut = false;
let identityKey: string | null = null;
let unsubscribeIdentity: (() => void) | null = null;
let unsubscribeAccount: (() => void) | null = null;
let hydration: Promise<AuthResult> | null = null;
let credentialQueue: Promise<unknown> = Promise.resolve();
let signOutPending: Promise<AuthResult> | null = null;
const listeners = new Set<(value: AuthSnapshot) => void>();

const publish = (next: AuthSnapshot): void => {
  snapshot = next;
  listeners.forEach((listener) => listener({ ...next }));
};

const resetAccount = (): number => {
  revision += 1;
  unsubscribeAccount?.();
  unsubscribeAccount = null;
  hydration = null;
  identityKey = null;
  return revision;
};

const identityChanged = (): Error => Object.assign(new Error(`The account session changed. Please try again.`), { code: `app/identity-changed` });
const activeAccount = (account: Account): Account => {
  if (!account.active) throw Object.assign(new Error(`This account is inactive.`), { code: `app/inactive` });
  return account;
};

const hydrate = (user: User, force = false): Promise<AuthResult> => {
  if (signingOut || !observeIdentity || getFirebaseRuntime().auth.currentUser !== user) return Promise.resolve(authFailure(identityChanged()));
  const key = `${user.uid}:${user.email ?? ``}:${user.emailVerified}`;
  if (!force && identityKey === key) {
    if (hydration) return hydration;
    if (snapshot.status === `signed-in` && snapshot.account) return Promise.resolve({ ok: true, account: snapshot.account });
  }
  const current = resetAccount();
  identityKey = key;
  const identity = identityFromUser(user);
  publish({ identity, account: null, source: null, status: `loading`, phase: `account`, message: null });
  const operation = (async (): Promise<AuthResult> => {
    try {
      const { auth, database } = getFirebaseRuntime();
      const isCurrent = (): boolean => current === revision && auth.currentUser?.uid === user.uid && !signingOut;
      const id = await ensurePrivateAccount(database, user, {
        revision: current,
        assertCurrent: () => { if (!isCurrent()) throw identityChanged(); },
      });
      if (!isCurrent()) throw identityChanged();
      const account = activeAccount(await readPrivateAccount(database, user, id));
      if (!isCurrent()) throw identityChanged();
      let firstEvent = true;
      unsubscribeAccount = onSnapshot(doc(database, `users`, id), { includeMetadataChanges: true }, (document) => {
        if (!isCurrent()) return;
        // The initial memory snapshot can immediately follow the confirmed server read above.
        if (firstEvent && document.metadata.fromCache && !document.metadata.hasPendingWrites) {
          firstEvent = false;
          return;
        }
        firstEvent = false;
        if (document.metadata.fromCache || document.metadata.hasPendingWrites) {
          publish({ identity, account: null, source: `cache`, status: `loading`, phase: `account`, message: `Waiting for the server to confirm your private account.` });
          return;
        }
        try {
          const next = activeAccount(readAccount(id, document.exists() ? document.data() : null, identityFromUser(user)));
          publish({ account: next, identity: identityFromUser(user), source: `server`, status: `signed-in`, phase: null, message: null });
        } catch (error) {
          publish({ identity, account: null, source: `server`, status: `error`, phase: null, message: authFailure(error).message });
        }
      }, (error) => {
        if (!isCurrent()) return;
        unsubscribeAccount = null;
        publish({ identity, account: null, source: null, status: `error`, phase: null, message: authFailure(error).message });
      });
      publish({ account, identity, source: `server`, status: `signed-in`, phase: null, message: null });
      return { ok: true, account };
    } catch (error) {
      const failure = authFailure(error);
      if (current === revision) publish({ identity, account: null, source: null, status: `error`, phase: null, message: failure.message });
      return failure;
    }
  })();
  hydration = operation;
  void operation.finally(() => { if (hydration === operation) hydration = null; });
  return operation;
};

const signedOut = (): void => {
  resetAccount();
  publish({ account: null, identity: null, source: null, phase: null, status: `signed-out`, message: null });
};

const start = (): FirebaseRuntime => {
  const runtime = getFirebaseRuntime();
  if (started) return runtime;
  started = true;
  const observer = ++observerRevision;
  unsubscribeIdentity = onIdTokenChanged(runtime.auth, (user) => {
    if (signingOut || observer !== observerRevision || runtime.auth.currentUser !== user) return;
    if (user && observeIdentity) void hydrate(user);
    else if (user) return;
    else signedOut();
  }, (error) => {
    if (observer !== observerRevision) return;
    resetAccount();
    publish({ account: null, identity: null, source: null, phase: null, status: `error`, message: authFailure(error).message });
  });
  return runtime;
};

const attempt = async (operation: () => Promise<AuthResult>): Promise<AuthResult> => {
  try { return await operation(); } catch (error) { return authFailure(error); }
};

const runCredentialFlow = (
  authenticate: (auth: Auth) => Promise<UserCredential>,
  finish: (user: User, assertCurrent: () => void) => Promise<AuthResult> = (user) => hydrate(user),
): Promise<AuthResult> => {
  const currentSession = ++sessionRevision;
  observeIdentity = false;
  resetAccount();
  if (firebaseConfigured) publish({ account: null, identity: null, source: null, phase: `identity`, status: `loading`, message: null });
  const credential = credentialQueue.then(async () => {
    if (signOutPending) await signOutPending;
    if (currentSession !== sessionRevision) throw identityChanged();
    const { auth } = start();
    const result = await authenticate(auth);
    if (currentSession !== sessionRevision) {
      // Local logout cannot cancel an SDK request already sent. Clear its late result
      // before allowing the next credential request to begin, and never hydrate it.
      await firebaseSignOut(auth);
      throw identityChanged();
    }
    return result.user;
  });
  credentialQueue = credential.catch(() => undefined);
  return attempt(async () => {
    let user: User;
    try { user = await credential; } catch (error) {
      if (currentSession === sessionRevision && firebaseConfigured) {
        const identity = getFirebaseRuntime().auth.currentUser;
        publish({ account: null, identity: identity ? identityFromUser(identity) : null, source: null, phase: null, status: identity ? `error` : `signed-out`, message: authFailure(error).message });
      }
      throw error;
    }
    const assertCurrent = (): void => {
      if (signingOut || currentSession !== sessionRevision || getFirebaseRuntime().auth.currentUser !== user) throw identityChanged();
    };
    assertCurrent();
    observeIdentity = true;
    publish({ account: null, identity: identityFromUser(user), source: null, phase: `account`, status: `loading`, message: null });
    const result = await finish(user, assertCurrent);
    assertCurrent();
    return result;
  });
};

const requireIdentity = async (): Promise<User> => {
  const currentSession = sessionRevision;
  const { auth } = start();
  await auth.authStateReady();
  if (signingOut || !observeIdentity || currentSession !== sessionRevision || !auth.currentUser) throw identityChanged();
  return auth.currentUser;
};

const validEmail = (email: string): string => {
  const value = email.trim();
  if (value.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`Enter a valid email address.`);
  return value;
};

export const requireCurrentAccount = (expected?: Account, expectedRevision?: number): { account: Account; runtime: FirebaseRuntime; revision: number } => {
  const runtime = start();
  const account = snapshot.account;
  if ((expectedRevision !== undefined && expectedRevision !== revision) || signingOut || snapshot.status !== `signed-in` || !account?.active || !account.roleVerified ||
    runtime.auth.currentUser?.uid !== account.firebaseUid ||
    (expected && (expected.id !== account.id || expected.firebaseUid !== account.firebaseUid))) throw identityChanged();
  return { runtime, account, revision };
};

const updateAccountProfile = (input: ProfileUpdate): Promise<AuthResult> => attempt(async () => {
  const profile = normalizeProfile(input);
  const { account, runtime } = requireCurrentAccount();
  if (profile.displayName === account.displayName && profile.avatarUrl === account.avatarUrl) return { ok: true, account };
  const user = runtime.auth.currentUser;
  if (!user) throw identityChanged();
  const current = revision;
  const reference = doc(runtime.database, `users`, account.id);
  await runTransaction(runtime.database, async (transaction) => {
    requireCurrentAccount(account, current);
    const document = await transaction.get(reference);
    requireCurrentAccount(account, current);
    const existing = activeAccount(readAccount(account.id, document.exists() ? document.data() : null, identityFromUser(user)));
    if (profile.displayName !== existing.displayName || profile.avatarUrl !== existing.avatarUrl) {
      transaction.update(reference, { ...profile, updatedAt: serverTimestamp() });
    }
  });
  if (current !== revision || runtime.auth.currentUser?.uid !== user.uid) throw identityChanged();
  const updated = activeAccount(await readPrivateAccount(runtime.database, user, account.id));
  if (current !== revision || runtime.auth.currentUser?.uid !== user.uid) throw identityChanged();
  publish({ account: updated, identity: identityFromUser(user), source: `server`, status: `signed-in`, phase: null, message: null });
  return { ok: true, account: updated };
});

export const authenticationService = {
  getSnapshot: (): AuthSnapshot => ({ ...snapshot }),
  updateProfile: updateAccountProfile,
  subscribe: (listener: (value: AuthSnapshot) => void): (() => void) => {
    listeners.add(listener);
    listener({ ...snapshot });
    if (firebaseConfigured) {
      try { start(); } catch (error) {
        publish({ account: null, identity: null, source: null, phase: null, status: `error`, message: authFailure(error).message });
      }
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size) return;
      observerRevision += 1;
      unsubscribeIdentity?.();
      unsubscribeIdentity = null;
      started = false;
      resetAccount();
      snapshot = initialSnapshot();
    };
  },
  signOut: (): Promise<AuthResult> => {
    if (signOutPending) return signOutPending;
    sessionRevision += 1;
    observeIdentity = false;
    signingOut = true;
    resetAccount();
    publish({ account: null, identity: snapshot.identity, source: null, phase: `identity`, status: `loading`, message: null });
    const operation = (async (): Promise<AuthResult> => {
      try {
        await firebaseSignOut(start().auth);
        signingOut = false;
        signedOut();
        return { ok: true, account: null };
      } catch (error) {
        signingOut = false;
        const failure = authFailure(error);
        publish({ account: null, identity: snapshot.identity, source: null, phase: null, status: `error`, message: failure.message });
        return failure;
      }
    })();
    signOutPending = operation;
    void operation.finally(() => { if (signOutPending === operation) signOutPending = null; });
    return operation;
  },
  signInWithGoogle: (): Promise<AuthResult> => runCredentialFlow(signInWithPlatformGoogle),
  signInWithEmail: (input: EmailSignIn): Promise<AuthResult> => runCredentialFlow(async (auth) => {
    const email = validEmail(input.email);
    if (!input.password || input.password.length > 128) throw new Error(`Enter your password, no longer than 128 characters.`);
    return signInWithEmailAndPassword(auth, email, input.password);
  }),
  signUpWithEmail: (input: EmailSignUp): Promise<AuthResult> => runCredentialFlow(async (auth) => {
    const email = validEmail(input.email);
    normalizeProfile({ displayName: input.displayName, avatarUrl: null });
    if (input.password.length < 12 || input.password.length > 128) throw new Error(`Choose a password between 12 and 128 characters.`);
    return createUserWithEmailAndPassword(auth, email, input.password);
  }, async (user, assertCurrent) => {
    const profile = normalizeProfile({ displayName: input.displayName, avatarUrl: null });
    let verificationError: unknown = null;
    assertCurrent();
    try { await updateFirebaseProfile(user, { displayName: profile.displayName }); } catch { /* The private profile below remains authoritative. */ }
    assertCurrent();
    try { await sendEmailVerification(user); } catch (error) { verificationError = error; }
    assertCurrent();
    const result = await hydrate(user);
    assertCurrent();
    if (!result.ok) return result;
    const savedProfile = await updateAccountProfile(profile);
    assertCurrent();
    if (!savedProfile.ok) return { ...savedProfile, message: `Your sign-in was created, but the profile could not be saved. ${savedProfile.message}` };
    if (verificationError) return { ...authFailure(verificationError), message: `Your account was created, but the verification email could not be sent. Use Resend Verification in your profile.` };
    return savedProfile;
  }),
  resetPassword: (email: string): Promise<AuthResult> => attempt(async () => {
    const address = validEmail(email);
    try { await sendPasswordResetEmail(start().auth, address); } catch (error) {
      // Keep the same response when email-enumeration protection is not enabled yet.
      if (getErrorCode(error) !== `auth/user-not-found`) throw error;
    }
    return { ok: true, account: snapshot.account };
  }),
  sendVerification: (): Promise<AuthResult> => attempt(async () => {
    const currentSession = sessionRevision;
    const user = await requireIdentity();
    if (!user.emailVerified) await sendEmailVerification(user);
    if (currentSession !== sessionRevision || getFirebaseRuntime().auth.currentUser !== user) throw identityChanged();
    return { ok: true, account: snapshot.account };
  }),
  refreshIdentity: (): Promise<AuthResult> => attempt(async () => {
    const currentSession = sessionRevision;
    const user = await requireIdentity();
    await reload(user);
    if (currentSession !== sessionRevision || getFirebaseRuntime().auth.currentUser !== user) throw identityChanged();
    await getIdToken(user, true);
    if (currentSession !== sessionRevision || getFirebaseRuntime().auth.currentUser !== user) throw identityChanged();
    return hydrate(user, true);
  }),
  retryHydration: (): Promise<AuthResult> => attempt(async () => {
    const currentSession = sessionRevision;
    const { auth } = start();
    await auth.authStateReady();
    if (signingOut || currentSession !== sessionRevision) throw identityChanged();
    if (!auth.currentUser) {
      signedOut();
      return { ok: true, account: null };
    }
    if (!observeIdentity) throw identityChanged();
    return hydrate(auth.currentUser, true);
  }),
};
