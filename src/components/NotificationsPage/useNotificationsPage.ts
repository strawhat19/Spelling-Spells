import { useNotifications } from '../../shared/notifications/NotificationsContext';

export const useNotificationsPage = () => {
  const notifications = useNotifications();
  return {
    ...notifications,
    unreadLabel: notifications.unreadCount === null ? `…` : String(notifications.unreadCount),
    canMarkRead: notifications.state === `ready` && notifications.readState === `ready` && !notifications.busy,
    coverage: `Up to 100 Newest Active Notifications · Unread Count Covers This List`,
    readScopeLabel: notifications.readScope === `account` ? `Read Status Belongs to Your Account`
      : notifications.readScope === `device` ? `Read Status Is Saved on This Device` : `Read Status Applies to This Visit`,
  };
};
