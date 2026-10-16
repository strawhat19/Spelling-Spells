import type { Account, AccountRole, AuthIdentity, ProfileUpdate } from '../../authentication/types';

export type UserRecord = {
  id: string;
  email: string;
  number: number;
  active: boolean;
  role: AccountRole;
  privacy: `private`;
  auth_uid: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
};

const roles = new Set<AccountRole>([`Owner`, `Admin`, `Member`, `Developer`, `Subscriber`]);
const accountId = /^User_([1-9][0-9]*)_Account_\d{4}-\d{2}-\d{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const normalizeProfile = (input: ProfileUpdate): ProfileUpdate => {
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 80) throw new Error(`Use a display name between 1 and 80 characters.`);
  const avatarUrl = input.avatarUrl?.trim() || null;
  if (avatarUrl) {
    let url: URL;
    try { url = new URL(avatarUrl); } catch { throw new Error(`Use a valid HTTPS avatar address.`); }
    if (url.protocol !== `https:` || !url.hostname || url.username || url.password || avatarUrl.length > 2048) {
      throw new Error(`Use an HTTPS avatar address without credentials, no longer than 2,048 characters.`);
    }
  }
  return { avatarUrl, displayName };
};

export const readAccount = (id: string, value: unknown, identity: AuthIdentity): Account => {
  if (!value || typeof value !== `object`) throw new Error(`The private account record is unavailable.`);
  const data = value as Partial<UserRecord>;
  const match = accountId.exec(id);
  if (
    !match || data.id !== id || data.auth_uid !== identity.authUid ||
    !Number.isSafeInteger(data.number) || data.number !== Number(match[1]) ||
    typeof data.email !== `string` || !data.email || data.email.length > 320 ||
    typeof data.active !== `boolean` || !roles.has(data.role as AccountRole) ||
    data.privacy !== `private` || typeof data.display_name !== `string` ||
    (data.avatar_url !== null && typeof data.avatar_url !== `string`) ||
    typeof data.created_at !== `string` || !Number.isFinite(Date.parse(data.created_at)) ||
    typeof data.updated_at !== `string` || !Number.isFinite(Date.parse(data.updated_at))
  ) throw new Error(`The private account record has an unsupported format. Contact the site owner.`);
  const profile = normalizeProfile({ displayName: data.display_name, avatarUrl: data.avatar_url });
  return {
    id,
    ...profile,
    roleVerified: true,
    role: data.role as AccountRole,
    email: identity.email,
    active: data.active,
    number: data.number as number,
    authUid: identity.authUid,
    emailVerified: identity.emailVerified,
  };
};
