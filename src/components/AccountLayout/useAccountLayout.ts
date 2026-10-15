import { useState } from 'react';
import { useAuth } from '../../shared/authContext';
import { usePathname } from 'expo-router';
import { useAccountNavigation } from './navigation';
import { accountNavigation } from '../../shared/routes';
import { canAccessOwner, getAccountAvatar } from '../../shared/authentication/types';
import type { PropsWithChildren } from 'react';

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
  const accountLinks = accountNavigation.filter((route) => route.section === `account`);
  const adminLinks = canAccessOwner(auth.account) ? accountNavigation.filter((route) => route.section === `admin`) : [];
  const avatar = getAccountAvatar(auth.account);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  return { ...auth, ...navigation, pathname, adminLinks, accountLinks, avatarUrl: avatar === failedAvatar ? null : avatar, onAvatarError: () => setFailedAvatar(avatar) };
};
