export const navigationStartEvent = `spelling-spells:navigation-start`;

export const getNavigationKey = (href: string, base: string) => {
  try {
    const target = new URL(href, base);
    if (target.origin !== new URL(base).origin || ![`http:`, `https:`].includes(target.protocol)) return null;
    target.searchParams.sort();
    const pathname = target.pathname.replace(/\/+$/, ``) || `/`;
    const search = target.searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  } catch { return null; }
};

export const announcePageNavigation = (href: string) => {
  if (typeof window === `undefined`) return;
  const destination = getNavigationKey(href, window.location.href);
  if (!destination) return;
  window.dispatchEvent(new CustomEvent(navigationStartEvent, { detail: { destination } }));
};
