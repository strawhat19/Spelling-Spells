import { usePathname, useSegments } from 'expo-router';
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';

const excludedPaths = new Set([`/auth/callback`, `/reset-password`]);
const beforeSend = (event: BeforeSendEvent): BeforeSendEvent | null => {
  try {
    const url = new URL(event.url, window.location.origin);
    if (excludedPaths.has(url.pathname)) return null;
    url.hash = ``;
    url.search = ``;
    return { ...event, url: url.toString() };
  } catch { return null; }
};

const WebAnalytics = () => {
  const pathname = usePathname();
  const segments = useSegments();
  const route = excludedPaths.has(pathname) ? null : `/${segments.join(`/`)}`;
  return <Analytics debug={false} route={route} path={pathname} beforeSend={beforeSend} />;
};

export default WebAnalytics;
