export const subscribeGuestNotificationReads = (refresh: () => void): (() => void) => {
  if (typeof window === `undefined`) return () => {};
  const storage = (event: StorageEvent) => { if (!event.key || event.key === `spelling-spells:notifications:guest:v1`) refresh(); };
  const visible = () => { if (document.visibilityState === `visible`) refresh(); };
  window.addEventListener(`focus`, refresh);
  window.addEventListener(`storage`, storage);
  document.addEventListener(`visibilitychange`, visible);
  return () => {
    window.removeEventListener(`focus`, refresh);
    window.removeEventListener(`storage`, storage);
    document.removeEventListener(`visibilitychange`, visible);
  };
};
