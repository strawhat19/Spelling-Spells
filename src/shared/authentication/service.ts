import { authFailure } from '../supabase/errors';
import { getSupabaseClient, createRecoveryClient } from '../supabase/client';
import { normalizeProfile } from '../models/users/User';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfigured, supabaseConfigurationMessage } from '../supabase/config';
import { ensurePrivateAccount, identityFromUser, readPrivateAccount } from '../supabase/accounts';
import type { Account, AuthResult, AuthSnapshot, EmailSignIn, EmailSignUp, ProfileUpdate } from './types';
import { clearAuthRedirect, getAuthRedirectUrl, readAuthRedirect, passwordRecoveryAvailable, signupConfirmationMessage, signInWithPlatformGoogle } from '../supabase/authPlatform';

export const authConnectionMessage = supabaseConfigurationMessage ?? `Account services need Supabase configuration.`;

const initialSnapshot = (): AuthSnapshot => ({
  account: null,
  identity: null,
  source: null,
  recovery: false,
  phase: supabaseConfigured ? `identity` : null,
  status: supabaseConfigured ? `loading` : `unavailable`,
  message: supabaseConfigured ? null : authConnectionMessage,
});

let snapshot = initialSnapshot();
let revision = 0;
let eventRevision = 0;
let observerRevision = 0;
let sessionRevision = 0;
let started = false;
let signingOut = false;
let observeIdentity = true;
let recoverySession = false;
let currentUser: User | null = null;
let identityKey: string | null = null;
let hydration: Promise<AuthResult> | null = null;
let redirectPending: Promise<AuthResult> | null = null;
let signOutPending: Promise<AuthResult> | null = null;
let unsubscribeIdentity: (() => void) | null = null;
let unsubscribeAccount: (() => void) | null = null;
let credentialQueue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(value: AuthSnapshot) => void>();

const publish = (next: Omit<AuthSnapshot, `recovery`>): void => {
  snapshot = { ...next, recovery: recoverySession };
  listeners.forEach((listener) => listener({ ...snapshot }));
};

const resetAccount = (): number => {
  revision += 1;
  unsubscribeAccount?.();
  unsubscribeAccount = null;
  identityKey = null;
  hydration = null;
  return revision;
};

const identityChanged = (): Error => Object.assign(new Error(`The account session changed. Please try again.`), { code: `app/identity-changed` });
const activeAccount = (account: Account): Account => {
  if (!account.active) throw Object.assign(new Error(`This account is inactive.`), { code: `app/inactive` });
  return account;
};

const signedOut = (message: string | null = null): void => {
  resetAccount();
  currentUser = null;
  recoverySession = false;
  publish({ account: null, identity: null, source: null, phase: null, status: `signed-out`, message });
};

const attempt = async (operation: () => Promise<AuthResult>): Promise<AuthResult> => {
  try { return await operation(); } catch (error) { return authFailure(error); }
};

const hydrate = (user: User, force = false): Promise<AuthResult> => {
  if (signingOut || !observeIdentity || currentUser?.id !== user.id) return Promise.resolve(authFailure(identityChanged()));
  const key = `${user.id}:${user.email ?? ``}:${user.email_confirmed_at ?? ``}`;
  if (!force && identityKey === key) {
    if (hydration) return hydration;
    if (snapshot.status === `signed-in` && snapshot.account) return Promise.resolve({ ok: true, account: snapshot.account });
  }
  const current = resetAccount();
  const session = sessionRevision;
  const identity = identityFromUser(user);
  const client = getSupabaseClient();
  identityKey = key;
  publish({ identity, account: null, source: null, status: `loading`, phase: `account`, message: null });
  const isCurrent = (): boolean => current === revision && session === sessionRevision && currentUser?.id === user.id && !signingOut && observeIdentity;
  const assertCurrent = (): void => { if (!isCurrent()) throw identityChanged(); };
  const operation = (async (): Promise<AuthResult> => {
    try {
      const id = await ensurePrivateAccount(client, user, assertCurrent);
      assertCurrent();
      const account = activeAccount(await readPrivateAccount(client, user, id));
      assertCurrent();
      let refreshRevision = 0;
      const refresh = async (): Promise<void> => {
        const request = ++refreshRevision;
        try {
          const next = activeAccount(await readPrivateAccount(client, user, id));
          if (!isCurrent() || request !== refreshRevision) return;
          const previous = snapshot.account;
          if (previous && (previous.role !== next.role || previous.emailVerified !== next.emailVerified)) {
            // Invalidate work authorized with the previous capability before publishing the new one.
            void hydrate(user, true);
            return;
          }
          publish({ account: next, identity, source: `server`, status: `signed-in`, phase: null, message: null });
        } catch (error) {
          if (!isCurrent() || request !== refreshRevision) return;
          resetAccount();
          publish({ identity, account: null, source: null, status: `error`, phase: null, message: authFailure(error).message });
        }
      };
      const channel = client.channel(`account:${user.id}:${current}`)
        .on(`postgres_changes`, { event: `INSERT`, schema: `public`, table: `accounts`, filter: `auth_uid=eq.${user.id}` }, () => { void refresh(); })
        .on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `accounts`, filter: `auth_uid=eq.${user.id}` }, () => { void refresh(); })
        .on(`postgres_changes`, { event: `INSERT`, schema: `public`, table: `profiles`, filter: `account_id=eq.${id}` }, () => { void refresh(); })
        .on(`postgres_changes`, { event: `UPDATE`, schema: `public`, table: `profiles`, filter: `account_id=eq.${id}` }, () => { void refresh(); })
        .subscribe((status) => {
          if (!isCurrent()) return;
          if (status === `SUBSCRIBED`) void refresh();
          else if ([`CLOSED`, `TIMED_OUT`, `CHANNEL_ERROR`].includes(status)) {
            resetAccount();
            publish({ identity, account: null, source: null, status: `error`, phase: null, message: authFailure({ code: `app/realtime-unavailable` }).message });
          }
        });
      unsubscribeAccount = () => { void client.removeChannel(channel); };
      publish({ account, identity, source: `server`, status: `signed-in`, phase: null, message: null });
      return { ok: true, account };
    } catch (error) {
      const failure = authFailure(error);
      if (isCurrent()) publish({ identity, account: null, source: null, status: `error`, phase: null, message: failure.message });
      return failure;
    }
  })();
  hydration = operation;
  void operation.finally(() => { if (hydration === operation) hydration = null; });
  return operation;
};

const verifiedIdentity = async (client: SupabaseClient, expected?: string): Promise<User> => {
  const session = sessionRevision;
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user || signingOut || session !== sessionRevision || currentUser?.id !== data.user.id || (expected && data.user.id !== expected)) throw identityChanged();
  return data.user;
};

const start = (): SupabaseClient => {
  const client = getSupabaseClient();
  if (started) return client;
  started = true;
  const observer = ++observerRevision;
  const { data } = client.auth.onAuthStateChange((event, session) => {
    if (observer !== observerRevision) return;
    const previousId = currentUser?.id;
    currentUser = session?.user ?? null;
    if (event === `PASSWORD_RECOVERY`) recoverySession = true;
    if (signingOut || !observeIdentity) return;
    if (previousId && previousId !== currentUser?.id) {
      sessionRevision += 1;
      resetAccount();
      recoverySession = event === `PASSWORD_RECOVERY`;
      publish({ account: null, source: null, phase: `identity`, status: `loading`, identity: currentUser ? identityFromUser(currentUser) : null, message: null });
    }
    const change = ++eventRevision;
    const currentSession = sessionRevision;
    const expected = currentUser?.id;
    // Supabase auth callbacks hold an internal lock; defer all SDK calls until it is released.
    setTimeout(() => {
      if (observer !== observerRevision || change !== eventRevision || currentSession !== sessionRevision || signingOut || !observeIdentity) return;
      if (!expected) { signedOut(); return; }
      void verifiedIdentity(client, expected).then((user) => {
        if (observer === observerRevision && change === eventRevision && currentSession === sessionRevision) void hydrate(user);
      }).catch((error) => {
        if (observer !== observerRevision || change !== eventRevision || currentSession !== sessionRevision) return;
        resetAccount();
        publish({ account: null, source: null, phase: null, status: `error`, identity: currentUser ? identityFromUser(currentUser) : null, message: authFailure(error).message });
      });
    }, 0);
  });
  unsubscribeIdentity = () => data.subscription.unsubscribe();
  if (readAuthRedirect()?.code || readAuthRedirect()?.error) setTimeout(() => { void completeAuthRedirect(); }, 0);
  return client;
};

type CredentialResult = { user: User | null; message?: string };
const runCredentialFlow = (authenticate: (client: SupabaseClient) => Promise<CredentialResult>): Promise<AuthResult> => {
  const session = ++sessionRevision;
  const pendingLogout = signOutPending;
  eventRevision += 1;
  observeIdentity = false;
  recoverySession = false;
  resetAccount();
  if (supabaseConfigured) publish({ account: null, identity: null, source: null, phase: `identity`, status: `loading`, message: null });
  const credential = credentialQueue.then(async () => {
    if (pendingLogout) await pendingLogout;
    if (session !== sessionRevision) throw identityChanged();
    const client = start();
    const result = await authenticate(client);
    if (session !== sessionRevision) {
      await client.auth.signOut({ scope: `local` });
      throw identityChanged();
    }
    if (result.user) currentUser = result.user;
    return result;
  });
  credentialQueue = credential.catch(() => undefined);
  return attempt(async () => {
    try {
      const result = await credential;
      if (session !== sessionRevision || signingOut) throw identityChanged();
      observeIdentity = true;
      if (!result.user) {
        signedOut(result.message ?? null);
        return { ok: true, account: null, message: result.message };
      }
      const user = await verifiedIdentity(getSupabaseClient(), result.user.id);
      if (session !== sessionRevision) throw identityChanged();
      return hydrate(user);
    } catch (error) {
      if (session === sessionRevision && !signingOut && supabaseConfigured) {
        observeIdentity = true;
        publish({ account: null, source: null, phase: null, status: currentUser ? `error` : `signed-out`, identity: currentUser ? identityFromUser(currentUser) : null, message: authFailure(error).message });
      }
      throw error;
    }
  });
};

export const completeAuthRedirect = (): Promise<AuthResult> => {
  if (redirectPending) return redirectPending;
  const redirect = readAuthRedirect();
  if (!supabaseConfigured) {
    if (redirect?.code || redirect?.error) clearAuthRedirect();
    return Promise.resolve({ ok: false, code: `connection-required`, message: authConnectionMessage });
  }
  if (!redirect?.code && !redirect?.error) return Promise.resolve({ ok: true, account: snapshot.account });
  clearAuthRedirect();
  if (redirect.error) {
    const failure = authFailure({ code: redirect.error });
    signedOut(failure.message);
    redirectPending = Promise.resolve(failure);
  } else {
    redirectPending = runCredentialFlow(async (client) => {
      const { data, error } = await client.auth.exchangeCodeForSession(redirect.code!);
      if (error) throw error;
      return { user: data.user };
    });
  }
  return redirectPending;
};

const validEmail = (email: string): string => {
  const value = email.trim();
  if (value.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`Enter a valid email address.`);
  return value;
};

const validPassword = (password: string): string => {
  if (password.length < 12 || password.length > 128) throw new Error(`Choose a password between 12 and 128 characters.`);
  return password;
};

export const requireCurrentAccount = (expected?: Account, expectedRevision?: number): { account: Account; client: SupabaseClient; revision: number } => {
  const client = start();
  const account = snapshot.account;
  if ((expectedRevision !== undefined && expectedRevision !== revision) || signingOut || !observeIdentity || snapshot.status !== `signed-in` || !account?.active || !account.roleVerified ||
    currentUser?.id !== account.authUid ||
    (expected && (expected.id !== account.id || expected.authUid !== account.authUid))) throw identityChanged();
  return { client, account, revision };
};

const updateAccountProfile = (input: ProfileUpdate): Promise<AuthResult> => attempt(async () => {
  const profile = normalizeProfile(input);
  const { client, account, revision: current } = requireCurrentAccount();
  if (profile.displayName === account.displayName && profile.avatarUrl === account.avatarUrl) return { ok: true, account };
  const user = await verifiedIdentity(client, account.authUid);
  requireCurrentAccount(account, current);
  const { data, error } = await client.from(`profiles`)
    .update({ avatar_url: profile.avatarUrl, display_name: profile.displayName })
    .eq(`account_id`, account.id).select(`account_id`).single();
  requireCurrentAccount(account, current);
  if (error) throw error;
  if (data?.account_id !== account.id) throw new Error(`The profile save could not be confirmed.`);
  const updated = activeAccount(await readPrivateAccount(client, user, account.id));
  requireCurrentAccount(account, current);
  if (updated.role !== account.role || updated.emailVerified !== account.emailVerified) return hydrate(user, true);
  publish({ account: updated, identity: identityFromUser(user), source: `server`, status: `signed-in`, phase: null, message: null });
  return { ok: true, account: updated };
});

export const authenticationService = {
  completeAuthRedirect,
  updateProfile: updateAccountProfile,
  getSnapshot: (): AuthSnapshot => ({ ...snapshot }),
  subscribe: (listener: (value: AuthSnapshot) => void): (() => void) => {
    listeners.add(listener);
    listener({ ...snapshot });
    if (supabaseConfigured) {
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
    eventRevision += 1;
    observeIdentity = false;
    signingOut = true;
    resetAccount();
    publish({ account: null, identity: snapshot.identity, source: null, phase: `identity`, status: `loading`, message: null });
    const operation = (async (): Promise<AuthResult> => {
      try {
        await credentialQueue;
        const { error } = await start().auth.signOut({ scope: `local` });
        if (error) throw error;
        signingOut = false;
        observeIdentity = true;
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
  signInWithGoogle: (): Promise<AuthResult> => runCredentialFlow(async (client) => {
    await signInWithPlatformGoogle(client);
    return { user: null, message: `Continue with Google in this browser.` };
  }),
  signInWithEmail: (input: EmailSignIn): Promise<AuthResult> => runCredentialFlow(async (client) => {
    const email = validEmail(input.email);
    if (!input.password || input.password.length > 128) throw new Error(`Enter your password, no longer than 128 characters.`);
    const { data, error } = await client.auth.signInWithPassword({ email, password: input.password });
    if (error) throw error;
    return { user: data.user };
  }),
  signUpWithEmail: (input: EmailSignUp): Promise<AuthResult> => runCredentialFlow(async (client) => {
    const email = validEmail(input.email);
    const profile = normalizeProfile({ displayName: input.displayName, avatarUrl: null });
    const { data, error } = await client.auth.signUp({
      email,
      password: validPassword(input.password),
      options: { emailRedirectTo: getAuthRedirectUrl(), data: { display_name: profile.displayName } },
    });
    if (error) throw error;
    return { user: data.session?.user ?? null, message: signupConfirmationMessage };
  }),
  resetPassword: (email: string): Promise<AuthResult> => attempt(async () => {
    if (!passwordRecoveryAvailable) return { ok: false, code: `unsupported`, message: `Request and complete password recovery on the Spelling Spells website. Native recovery links have not been configured.` };
    const { error } = await start().auth.resetPasswordForEmail(validEmail(email), { redirectTo: getAuthRedirectUrl() });
    if (error) throw error;
    return { ok: true, account: snapshot.account };
  }),
  resendVerification: (email: string): Promise<AuthResult> => attempt(async () => {
    const { error } = await start().auth.resend({ type: `signup`, email: validEmail(email), options: { emailRedirectTo: getAuthRedirectUrl() } });
    if (error) throw error;
    return { ok: true, account: snapshot.account };
  }),
  sendVerification: (): Promise<AuthResult> => attempt(async () => {
    const user = await verifiedIdentity(start());
    if (user.email_confirmed_at) return { ok: true, account: snapshot.account };
    if (!user.email) throw new Error(`This account has no email address.`);
    return authenticationService.resendVerification(user.email);
  }),
  updatePassword: (password: string): Promise<AuthResult> => attempt(async () => {
    if (!recoverySession) throw Object.assign(new Error(`A recovery session is required.`), { code: `app/recovery-required` });
    validPassword(password);
    const session = sessionRevision;
    const expectedUid = currentUser?.id;
    const assertRecovery = (): void => {
      if (!expectedUid || signingOut || !recoverySession || session !== sessionRevision || currentUser?.id !== expectedUid) throw identityChanged();
    };
    assertRecovery();
    const { data: stored, error: sessionError } = await start().auth.getSession();
    assertRecovery();
    if (sessionError) throw sessionError;
    if (!stored.session || stored.session.user.id !== expectedUid) throw identityChanged();
    const accessToken = stored.session.access_token;
    const refreshToken = stored.session.refresh_token;
    const isolated = createRecoveryClient();
    const { data: verified, error: identityError } = await isolated.auth.getUser(accessToken);
    assertRecovery();
    if (identityError) throw identityError;
    if (verified.user?.id !== expectedUid) throw identityChanged();
    const { data: seeded, error: seedError } = await isolated.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    assertRecovery();
    if (seedError) throw seedError;
    if (seeded.user?.id !== expectedUid || seeded.session?.user.id !== expectedUid) throw identityChanged();
    const { data, error } = await isolated.auth.updateUser({ password });
    if (error) throw error;
    if (data.user?.id !== expectedUid) throw identityChanged();
    assertRecovery();
    recoverySession = false;
    publish({ ...snapshot, message: null });
    return { ok: true, account: snapshot.account };
  }),
  refreshIdentity: (): Promise<AuthResult> => attempt(async () => hydrate(await verifiedIdentity(start()), true)),
  retryHydration: (): Promise<AuthResult> => attempt(async () => {
    if (signingOut) throw identityChanged();
    const client = start();
    const session = sessionRevision;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (session !== sessionRevision || signingOut) throw identityChanged();
    observeIdentity = true;
    if (!data.session) { signedOut(); return { ok: true, account: null }; }
    currentUser = data.session.user;
    return hydrate(await verifiedIdentity(client, data.session.user.id), true);
  }),
};
