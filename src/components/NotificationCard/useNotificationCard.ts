import type { NotificationRecord } from '../../shared/notifications/types';
import { useNotifications } from '../../shared/notifications/NotificationsContext';

export type NotificationCardProps = {
  onNavigate?: () => void;
  idPrefix?: string;
  record: NotificationRecord;
};

export const useNotificationCard = (record: NotificationRecord, onNavigate?: () => void) => {
  const notifications = useNotifications();
  const known = notifications.readState === `ready`;
  const isRead = known && notifications.readIds.includes(record.id);
  const open = () => {
    if (known && !isRead && !notifications.busy) void notifications.markRead([record.id]).catch(() => undefined);
    onNavigate?.();
  };
  return { open, known, isRead };
};
