import { readAccount } from '../models/users/User';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { Account, AuthIdentity } from '../authentication/types';

export const identityFromUser = (user: User): AuthIdentity => ({
  email: user.email ?? ``,
  authUid: user.id,
  emailVerified: Boolean(user.email_confirmed_at),
});

export const ensurePrivateAccount = async (client: SupabaseClient, user: User, assertCurrent: () => void): Promise<string> => {
  assertCurrent();
  const { data, error } = await client.rpc(`ensure_account`, { p_expected_auth_uid: user.id });
  assertCurrent();
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1 || typeof data[0]?.id !== `string` || data[0]?.auth_uid !== user.id) {
    throw new Error(`The account mapping is unavailable. Contact the site owner.`);
  }
  return data[0].id;
};

export const readPrivateAccount = async (client: SupabaseClient, user: User, id: string): Promise<Account> => {
  const account = await client.from(`accounts`).select(`id,number,auth_uid,email,role,active,created_at,updated_at`).eq(`id`, id).eq(`auth_uid`, user.id).single();
  if (account.error) throw account.error;
  const profile = await client.from(`profiles`).select(`account_id,display_name,avatar_url,privacy`).eq(`account_id`, id).single();
  if (profile.error) throw profile.error;
  return readAccount(id, { ...account.data, ...profile.data }, identityFromUser(user));
};
