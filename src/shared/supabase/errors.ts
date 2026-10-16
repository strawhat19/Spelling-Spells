import type { AuthResult } from '../authentication/types';

export const googleSignInUnavailableMessage = `Google sign-in is not available yet. Use email and password, or try again later.`;
export const googleSignInCheckFailedMessage = `Google sign-in could not be checked. Check your connection and try again, or use email and password.`;

export const getErrorCode = (error: unknown): string => {
  if (!error || typeof error !== `object`) return ``;
  const details = error as { code?: unknown; error_code?: unknown };
  return typeof details.code === `string` ? details.code : typeof details.error_code === `string` ? details.error_code : ``;
};

const providerIsUnavailable = (error: unknown): boolean => {
  if (!error || typeof error !== `object`) return false;
  const details = error as { msg?: unknown; message?: unknown; error_description?: unknown };
  const message = [details.msg, details.message, details.error_description].filter((value) => typeof value === `string`).join(` `);
  return /unsupported provider|provider.{0,60}(?:not enabled|disabled|not configured)/i.test(message);
};

export const authFailure = (error: unknown): Extract<AuthResult, { ok: false }> => {
  const code = getErrorCode(error);
  if (code === `app/connection-required`) return { ok: false, code: `connection-required`, message: `Account services need Supabase configuration. You can still browse the archive.` };
  if (code === `app/unsupported-platform`) return { ok: false, code: `unsupported`, message: `Google and email-link callbacks are available on the website. Native callbacks have not been configured.` };
  if ([`access_denied`, `app/superseded`].includes(code)) return { ok: false, code: `cancelled`, message: `The account action was cancelled. Please try again when you are ready.` };
  if ([`42501`, `PGRST301`, `user_banned`, `app/inactive`, `app/identity-changed`].includes(code)) {
    return { ok: false, code: `denied`, message: code === `app/inactive` ? `This account is inactive. Contact the site owner.` : `This account action is not permitted. Sign in again or contact the site owner.` };
  }
  if ([`unsupported_provider`, `provider_disabled`, `provider_not_enabled`, `oauth_provider_disabled`, `app/google-unavailable`].includes(code) || providerIsUnavailable(error)) {
    return { ok: false, code: `unsupported`, message: googleSignInUnavailableMessage };
  }
  const messages: Record<string, string> = {
    'invalid_credentials': `The email or password was not accepted.`,
    'email_not_confirmed': `Confirm your email address before signing in. Check your inbox or resend the confirmation email.`,
    'user_already_exists': `If this address can receive an account email, check your inbox for the next steps.`,
    'email_exists': `If this address can receive an account email, check your inbox for the next steps.`,
    'weak_password': `Choose a password that meets this project's password policy, between 12 and 128 characters.`,
    'same_password': `Choose a different password from your current one.`,
    'otp_expired': `This email link has expired or has already been used. Request a new link.`,
    'flow_state_expired': `This sign-in link expired. Start again in the same browser where you requested the link.`,
    'flow_state_not_found': `Open the newest sign-in link in the same browser where you requested it, or request a new link.`,
    'bad_code_verifier': `Open the newest sign-in link in the same browser where you requested it, or request a new link.`,
    'validation_failed': `Check the email address and account details, then try again.`,
    'signup_disabled': `Account creation is not enabled. Contact the site owner.`,
    'email_provider_disabled': `Email sign-in is not enabled. Contact the site owner.`,
    'oauth_provider_error': `Google sign-in could not be started. Use email and password, or try again later.`,
    'app/provider-check-failed': googleSignInCheckFailedMessage,
    'app/oauth-redirect-invalid': `Google sign-in could not be started safely. Use email and password, or try again later.`,
    'over_email_send_rate_limit': `Too many email requests. Please wait before requesting another email.`,
    'over_request_rate_limit': `Too many attempts. Please wait before trying again.`,
    'request_timeout': `The account service took too long. Please retry.`,
    'PGRST202': `The account database setup is not available yet. Contact the site owner.`,
    'PGRST205': `The account database setup is not available yet. Contact the site owner.`,
    'app/recovery-required': `Open a fresh password reset link before choosing a new password.`,
    'app/realtime-unavailable': `Live account updates are unavailable. Retry the connection before using private account data.`,
  };
  return {
    ok: false,
    code: `error`,
    message: messages[code] ?? (error instanceof Error && !code ? error.message : `The account action could not be completed. Check your connection and retry.`),
  };
};
