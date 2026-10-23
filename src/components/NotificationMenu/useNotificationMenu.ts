import { usePathname } from 'expo-router';
import { useAuth } from '../../shared/authContext';
import { useState, useEffect, useCallback } from 'react';
import { useNotificationsPage } from '../NotificationsPage/useNotificationsPage';

export const useNotificationMenu = () => {
  const page = useNotificationsPage();
  const pathname = usePathname();
  const { account, status } = useAuth();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => setOpen(false), [pathname, status, account?.id, page.enabled]);
  return { ...page, open: page.enabled && open, close, setOpen };
};
