import { getSupabaseConfig } from './config';
import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { getErrorCode, googleSignInUnavailableMessage, googleSignInCheckFailedMessage } from './errors';

export const platformAuthOptions: SupabaseClientOptions<`public`>[`auth`] = {
  flowType: `pkce`,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: false,
};

export const configurePlatformAuth = (_client: SupabaseClient): void => undefined;
export const passwordRecoveryAvailable = true;
export const signupConfirmationMessage = `If this address can receive an account email, check your inbox and spam folder to confirm it. Open the newest link in this same browser.`;

export const getAuthRedirectUrl = (): string => {
  if (typeof window === `undefined`) throw new Error(`Open the website before requesting an account email.`);
  return `${window.location.origin}/auth/callback`;
};

export const readAuthRedirect = (): { code: string | null; error: string | null } | null => {
  if (typeof window === `undefined` || window.location.pathname.replace(/\/$/, ``) !== `/auth/callback`) return null;
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  return { code: url.searchParams.get(`code`), error: url.searchParams.get(`error_code`) ?? fragment.get(`error_code`) ?? url.searchParams.get(`error`) ?? fragment.get(`error`) };
};

export const clearAuthRedirect = (): void => {
  if (typeof window !== `undefined`) window.history.replaceState(window.history.state, ``, `/auth/callback`);
};

const checkGoogleProvider = async (config: { url: string; publishableKey: string }): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      method: `GET`,
      cache: `no-store`,
      redirect: `error`,
      credentials: `omit`,
      signal: controller.signal,
      headers: { apikey: config.publishableKey, Accept: `application/json` },
    });
    if (!response.ok) throw new Error(`The public provider settings request failed.`);
    const settings: unknown = await response.json();
    const external = settings && typeof settings === `object` && `external` in settings ? settings.external : null;
    if (!external || typeof external !== `object` || !(`google` in external) || external.google !== true) {
      throw Object.assign(new Error(googleSignInUnavailableMessage), { code: `app/google-unavailable` });
    }
  } catch (error) {
    if (getErrorCode(error) === `app/google-unavailable`) throw error;
    throw Object.assign(new Error(googleSignInCheckFailedMessage), { code: `app/provider-check-failed` });
  } finally {
    clearTimeout(timeout);
  }
};

const validatedGoogleRedirect = (value: unknown, projectUrl: string, callbackUrl: string): string => {
  try {
    if (typeof value !== `string`) throw new Error();
    const url = new URL(value);
    if (
      url.origin !== new URL(projectUrl).origin || url.pathname !== `/auth/v1/authorize` ||
      url.hash || url.username || url.password || url.searchParams.get(`provider`) !== `google` ||
      url.searchParams.getAll(`provider`).length !== 1 || url.searchParams.getAll(`redirect_to`).length !== 1 ||
      url.searchParams.get(`redirect_to`) !== callbackUrl || url.searchParams.get(`code_challenge_method`) !== `s256` ||
      !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get(`code_challenge`) ?? ``)
    ) throw new Error();
    return url.href;
  } catch {
    throw Object.assign(new Error(`The Google redirect address could not be validated.`), { code: `app/oauth-redirect-invalid` });
  }
};

export const signInWithPlatformGoogle = async (client: SupabaseClient, assertCurrent: () => void = () => undefined): Promise<void> => {
  assertCurrent();
  const config = getSupabaseConfig();
  if (!config) throw Object.assign(new Error(`Supabase account services need configuration.`), { code: `app/connection-required` });
  await checkGoogleProvider(config);
  assertCurrent();
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: `google`,
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: `select_account` } },
  });
  assertCurrent();
  if (error) throw error;
  const target = validatedGoogleRedirect(data?.url, config.url, redirectTo);
  assertCurrent();
  window.location.assign(target);
};
