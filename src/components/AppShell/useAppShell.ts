import { useEffect, useState } from 'react';
import { usePathname } from 'expo-router';

export const useAppShell = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: `instant` });
    const onScroll = () => {
      const hero = document.getElementById(`landing-hero`);
      setScrolled(window.scrollY > 24);
      setShowScrollTop(hero ? hero.getBoundingClientRect().bottom < 100 : window.scrollY > 480);
    };
    onScroll();
    window.addEventListener(`scroll`, onScroll, { passive: true });
    return () => window.removeEventListener(`scroll`, onScroll);
  }, [pathname]);

  const scrollToTop = () => window.scrollTo({
    top: 0,
    behavior: window.matchMedia(`(prefers-reduced-motion: reduce)`).matches ? `auto` : `smooth`,
  });

  return { pathname, scrolled, showScrollTop, scrollToTop };
};
