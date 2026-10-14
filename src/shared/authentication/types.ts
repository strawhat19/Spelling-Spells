export type AccountRole = `Owner` | `Admin` | `Developer` | `Subscriber` | `Member`;
export type AuthStatus = `unavailable` | `signed-out` | `signed-in` | `error`;

export type Account = {
  id: string;
  email: string;
  active: boolean;
  role: AccountRole;
  displayName: string;
  roleVerified: boolean;
  avatarUrl: string | null;
};

export type AuthSnapshot = {
  status: AuthStatus;
  account: Account | null;
  message: string | null;
};

export type EmailSignIn = { email: string; password: string };
export type EmailSignUp = EmailSignIn & { displayName: string };
export type AuthResult =
  | { ok: true; account: Account | null }
  | { ok: false; code: `connection-required` | `denied` | `error`; message: string };

export const canAccessAccount = (account: Account | null): account is Account => Boolean(account?.active);
export const canAccessOwner = (account: Account | null): boolean =>
  Boolean(account?.active && account?.roleVerified && account?.role === `Owner`);

export const canAccessCapability = (account: Account | null, capability: `account` | `owner`): boolean =>
  capability === `owner` ? canAccessOwner(account) : capability === `account` && canAccessAccount(account);

export const getAccountAvatar = (account: Account | null): string | null => {
  if (!account?.avatarUrl) return null;
  try {
    const url = new URL(account.avatarUrl);
    return url.protocol === `https:` && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
};
