import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';

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

export const signInWithPlatformGoogle = async (client: SupabaseClient): Promise<void> => {
  const { error } = await client.auth.signInWithOAuth({
    provider: `google`,
    options: { redirectTo: getAuthRedirectUrl(), queryParams: { prompt: `select_account` } },
  });
  if (error) throw error;
};
