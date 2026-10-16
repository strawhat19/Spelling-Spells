import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { processLock } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';

export const platformAuthOptions: SupabaseClientOptions<`public`>[`auth`] = {
  flowType: `pkce`,
  lock: processLock,
  storage: AsyncStorage,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: false,
};

export const configurePlatformAuth = (client: SupabaseClient): void => {
  if (AppState.currentState === `active`) client.auth.startAutoRefresh();
  else client.auth.stopAutoRefresh();
  AppState.addEventListener(`change`, (state) => {
    if (state === `active`) client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
};

export const getAuthRedirectUrl = (): string => `https://spelling-spells.vercel.app/auth/callback`;
export const passwordRecoveryAvailable = false;
export const signupConfirmationMessage = `If this address can receive an account email, check your inbox and spam folder to confirm it in your browser. Then return to the app and sign in with your email and password.`;
export const readAuthRedirect = (): { code: string | null; error: string | null } | null => null;
export const clearAuthRedirect = (): void => undefined;

export const signInWithPlatformGoogle = async (_client: SupabaseClient, _assertCurrent?: () => void): Promise<void> => {
  throw Object.assign(new Error(`Native Google sign-in has not been configured.`), { code: `app/unsupported-platform` });
};
