import type { AuthResult } from '../authentication/types';

export const getErrorCode = (error: unknown): string =>
  error && typeof error === `object` && `code` in error && typeof error.code === `string` ? error.code : ``;

export const authFailure = (error: unknown): Extract<AuthResult, { ok: false }> => {
  const code = getErrorCode(error);
  if (code === `app/connection-required`) return { ok: false, code: `connection-required`, message: `Account services need Firebase configuration. You can still browse the archive.` };
  if (code === `auth/unsupported-platform`) return { ok: false, code: `unsupported`, message: `Google sign-in is available on the website. Native Google sign-in has not been configured.` };
  if ([`auth/popup-closed-by-user`, `auth/cancelled-popup-request`, `app/superseded`].includes(code)) return { ok: false, code: `cancelled`, message: `The account action was cancelled. Please try again when you are ready.` };
  if ([`permission-denied`, `firestore/permission-denied`, `auth/user-disabled`, `app/inactive`, `app/identity-changed`].includes(code)) return { ok: false, code: `denied`, message: code === `app/inactive` ? `This account is inactive. Contact the site owner.` : `This account action is not permitted. Sign in again or contact the site owner.` };
  const messages: Record<string, string> = {
    'app/emulator-forbidden': `Test emulators are disabled for this build. Remove the emulator flag before connecting a real project.`,
    'auth/invalid-email': `Enter a valid email address.`,
    'auth/invalid-credential': `The email or password was not accepted.`,
    'auth/user-not-found': `The email or password was not accepted.`,
    'auth/wrong-password': `The email or password was not accepted.`,
    'auth/email-already-in-use': `An account already uses that email. Try signing in or resetting your password.`,
    'auth/weak-password': `Choose a stronger password with at least 12 characters.`,
    'auth/password-does-not-meet-requirements': `Choose a password that meets this project's password policy.`,
    'auth/account-exists-with-different-credential': `That email uses a different sign-in method. Sign in with the original method.`,
    'auth/popup-blocked': `Your browser blocked Google sign-in. Allow the sign-in popup and try again.`,
    'auth/unauthorized-domain': `Sign-in is not enabled for this website address. Contact the site owner.`,
    'auth/operation-not-allowed': `This sign-in provider has not been enabled. Contact the site owner.`,
    'auth/too-many-requests': `Too many attempts. Please wait before trying again.`,
    'auth/network-request-failed': `The account service could not be reached. Check your connection and retry.`,
    'auth/requires-recent-login': `Sign in again before making this account change.`,
    'unavailable': `The account service could not be reached. Check your connection and retry.`,
    'deadline-exceeded': `The account service took too long. Please retry.`,
  };
  return {
    ok: false,
    code: `error`,
    message: messages[code] ?? (error instanceof Error && !code ? error.message : `The account action could not be completed. Please retry.`),
  };
};
