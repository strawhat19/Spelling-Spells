import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';
import { configurePlatformAuth, platformAuthOptions } from './authPlatform';

let client: SupabaseClient | null = null;
let recoveryClientNumber = 0;

const requestWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  const timeout = setTimeout(abort, 15000);
  if (init?.signal?.aborted) abort();
  else init?.signal?.addEventListener(`abort`, abort, { once: true });
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally {
    clearTimeout(timeout);
    init?.signal?.removeEventListener(`abort`, abort);
  }
};

export const getSupabaseClient = (): SupabaseClient => {
  if (client) return client;
  const config = getSupabaseConfig();
  if (!config) throw Object.assign(new Error(`Supabase account services need configuration.`), { code: `app/connection-required` });
  client = createClient(config.url, config.publishableKey, {
    global: { fetch: requestWithTimeout },
    auth: { ...platformAuthOptions, storageKey: `spelling-spells:${config.url}:auth` },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  configurePlatformAuth(client);
  return client;
};

export const createRecoveryClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  if (!config) throw Object.assign(new Error(`Supabase account services need configuration.`), { code: `app/connection-required` });
  const storage = new Map<string, string>();
  // Password recovery must never read or replace another tab's shared session.
  return createClient(config.url, config.publishableKey, {
    global: { fetch: requestWithTimeout },
    auth: {
      flowType: `pkce`,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `spelling-spells:recovery:${++recoveryClientNumber}`,
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => { storage.set(key, value); },
        removeItem: (key) => { storage.delete(key); },
      },
    },
  });
};
