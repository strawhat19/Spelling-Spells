import type { AuthResult, AuthSnapshot, EmailSignIn, EmailSignUp } from './types';

export const authConnectionMessage = `Account services are not connected yet. Sign-in, account creation, and cloud sync are unavailable. You can still explore the archive and keep a collection on this device.`;

const snapshot: AuthSnapshot = {
  account: null,
  status: `unavailable`,
  message: authConnectionMessage,
};

const unavailable = async (): Promise<AuthResult> => ({
  ok: false,
  code: `connection-required`,
  message: authConnectionMessage,
});

// This boundary intentionally has no SDK, session storage, or credential persistence.
// Replace it with a verified provider adapter before enabling account forms.
export const authenticationService = {
  getSnapshot: (): AuthSnapshot => ({ ...snapshot }),
  signOut: unavailable,
  signInWithGoogle: unavailable,
  signInWithEmail: (_input: EmailSignIn): Promise<AuthResult> => unavailable(),
  signUpWithEmail: (_input: EmailSignUp): Promise<AuthResult> => unavailable(),
  subscribe: (listener: (value: AuthSnapshot) => void): (() => void) => {
    listener({ ...snapshot });
    return () => undefined;
  },
};
