export type AccountRole = `Owner` | `Admin` | `Developer` | `Subscriber` | `Member`;
export type AuthStatus = `loading` | `unavailable` | `signed-out` | `signed-in` | `error`;

export type Account = {
  id: string;
  email: string;
  number: number;
  active: boolean;
  role: AccountRole;
  authUid: string;
  displayName: string;
  roleVerified: boolean;
  emailVerified: boolean;
  avatarUrl: string | null;
};

export type AuthIdentity = {
  email: string;
  authUid: string;
  emailVerified: boolean;
};

export type AuthSnapshot = {
  recovery: boolean;
  status: AuthStatus;
  account: Account | null;
  message: string | null;
  identity: AuthIdentity | null;
  source: `server` | `cache` | null;
  phase: `identity` | `account` | null;
};

export type EmailSignIn = { email: string; password: string };
export type EmailSignUp = EmailSignIn & { displayName: string };
export type ProfileUpdate = { displayName: string; avatarUrl: string | null };
export type AuthResult =
  | { ok: true; account: Account | null; message?: string }
  | { ok: false; code: `connection-required` | `cancelled` | `unsupported` | `denied` | `error`; message: string };

export const canAccessAccount = (account: Account | null): account is Account => Boolean(account?.active && account.roleVerified);
export const canAccessOwner = (account: Account | null): boolean =>
  Boolean(account?.active && account?.roleVerified && account?.emailVerified && account?.role === `Owner`);

export const canAccessCapability = (account: Account | null, capability: `account` | `owner`): boolean =>
  capability === `owner` ? canAccessOwner(account) : capability === `account` && canAccessAccount(account);

export const getAccountAvatar = (account: Pick<Account, `avatarUrl`> | null): string | null => {
  if (!account?.avatarUrl) return null;
  try {
    const url = new URL(account.avatarUrl);
    return url.protocol === `https:` && !url.username && !url.password && url.href.length <= 2048 ? url.href : null;
  } catch {
    return null;
  }
};
