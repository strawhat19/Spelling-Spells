import type { NotificationRecord } from '../../shared/notifications/types';

export const notificationKindLabels = { announcement: `Announcement`, development: `Development` };
export const getNotificationIcon = (record: NotificationRecord) => record.kind === `development` ? `wand` : `bell`;
export const getNotificationHref = (record: NotificationRecord) => `/notifications/${encodeURIComponent(record.slug)}`;
export const getNotificationSpacing = (previous: string, next: string | null) => next && !/\s$/.test(previous) && !/^[\s,.;:!?)]/.test(next) ? ` ` : ``;
export const getNotificationCopy = (record: NotificationRecord) => `${record.body}${getNotificationSpacing(record.body, record.linkLabel)}${record.linkLabel ?? ``}${getNotificationSpacing(record.linkLabel ?? record.body, record.suffix)}${record.suffix ?? ``}`;
export const getNotificationDate = (date: string) => {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? `Date Unavailable` : value.toLocaleDateString(undefined, { day: `numeric`, month: `short`, year: `numeric` });
};
