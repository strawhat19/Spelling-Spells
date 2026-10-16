import type { AuthResult } from '../authentication/types';

export const getErrorCode = (error: unknown): string =>
  error && typeof error === `object` && `code` in error && typeof error.code === `string` ? error.code : ``;

export const authFailure = (error: unknown): Extract<AuthResult, { ok: false }> => {
  const code = getErrorCode(error);
  if (code === `app/connection-required`) return { ok: false, code: `connection-required`, message: `Account services need Supabase configuration. You can still browse the archive.` };
  if (code === `app/unsupported-platform`) return { ok: false, code: `unsupported`, message: `Google and email-link callbacks are available on the website. Native callbacks have not been configured.` };
  if ([`access_denied`, `app/superseded`].includes(code)) return { ok: false, code: `cancelled`, message: `The account action was cancelled. Please try again when you are ready.` };
  if ([`42501`, `PGRST301`, `user_banned`, `app/inactive`, `app/identity-changed`].includes(code)) {
    return { ok: false, code: `denied`, message: code === `app/inactive` ? `This account is inactive. Contact the site owner.` : `This account action is not permitted. Sign in again or contact the site owner.` };
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
    'provider_disabled': `This sign-in provider is not enabled. Contact the site owner.`,
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
