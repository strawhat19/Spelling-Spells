import { useState } from 'react';
import { usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useAuth } from '../../shared/authContext';
import { useAccountNavigation } from './navigation';
import { accountNavigation, getAccountRoute } from '../../shared/routes';
import { canAccessOwner, getAccountAvatar } from '../../shared/authentication/types';

export type AccountLayoutProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  description?: string;
  section?: `account` | `admin`;
}>;

export const useAccountLayout = () => {
  const auth = useAuth();
  const pathname = usePathname();
  const navigation = useAccountNavigation();
  const ownerAllowed = auth.status === `signed-in` && !auth.loading && canAccessOwner(auth.account);
  const accountLinks = accountNavigation.filter((route) => route.section === `account` && !route.parent);
  const adminLinks = ownerAllowed ? accountNavigation.filter((route) => route.section === `admin`) : [];
  const avatar = getAccountAvatar(auth.account);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  return { ...auth, ...navigation, pathname, adminLinks, accountLinks, ownerAllowed, activeRoute: getAccountRoute(pathname), avatarUrl: avatar === failedAvatar ? null : avatar, onAvatarError: () => setFailedAvatar(avatar) };
};
