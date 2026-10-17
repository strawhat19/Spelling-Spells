import { canAccessOwner, type Account } from './types';

export const getSignInDestination = (account: Account | null): `/` | `/dashboard` =>
  canAccessOwner(account) ? `/dashboard` : `/`;
