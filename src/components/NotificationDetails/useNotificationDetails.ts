import { useAuth } from '../../shared/authContext';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { notificationsAPI } from '../../api/notifications';
import { useNotificationsPage } from '../NotificationsPage/useNotificationsPage';
import type { NotificationRecord, NotificationState } from '../../shared/notifications/types';

type DetailsSnapshot = { slug: string; state: NotificationState; record: NotificationRecord | null; error: string | null };

export const useNotificationDetails = () => {
  const page = useNotificationsPage();
  const { account } = useAuth();
  const parameters = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = (Array.isArray(parameters.slug) ? parameters.slug?.[0] : parameters.slug) ?? ``;
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<DetailsSnapshot | null>(null);
  const attemptedRead = useRef(``);
  const current = snapshot?.slug === slug ? snapshot : null;
  const record = current?.record ?? null;
  const readScope = `${account?.id ?? `guest`}:${page.readScope}:${record?.id ?? ``}`;
  const isRead = page.readState === `ready` && Boolean(record && page.readIds.includes(record.id));
  useEffect(() => {
    let active = true;
    if (!page.enabled) {
      setSnapshot({ slug, state: `denied`, record: null, error: `Notifications Are Not Available For This Account` });
      return;
    }
    if (!slug || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setSnapshot({ slug, state: `ready`, record: null, error: null });
      return;
    }
    setSnapshot({ slug, state: `loading`, record: null, error: null });
    void notificationsAPI.getPublished(slug).then((result) => {
      if (active) setSnapshot({ slug, state: `ready`, record: result, error: null });
    }).catch((error: unknown) => {
      if (active) setSnapshot({ slug, state: `error`, record: null, error: error instanceof Error ? error.message : `This Notification Could Not Be Loaded` });
    });
    return () => { active = false; };
  }, [slug, revision, page.enabled, page.records]);
  useEffect(() => {
    if (!page.enabled || !record || page.readState !== `ready` || page.busy || isRead || attemptedRead.current === readScope) return;
    attemptedRead.current = readScope;
    void page.markRead([record.id]).catch(() => undefined);
  }, [record, page.readState, page.busy, page.markRead, isRead, readScope]);
  return {
    ...page,
    slug,
    record: page.enabled ? record : null,
    isRead,
    detailError: page.enabled ? current?.error ?? null : page.message,
    detailState: page.enabled ? current?.state ?? `loading` : page.state,
    readLabel: page.readState === `loading` ? `Loading` : page.readState !== `ready` ? `Unavailable` : isRead ? `Read` : `Unread`,
    reloadDetails: () => { attemptedRead.current = ``; setRevision((value) => value + 1); page.reload(); },
  };
};
