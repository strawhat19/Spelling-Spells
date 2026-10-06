import { useEffect, useState } from 'react';
import { usePathname } from 'expo-router';

export const useHeader = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === `Escape`) setMenuOpen(false);
    };
    window.addEventListener(`keydown`, onKey);
    return () => window.removeEventListener(`keydown`, onKey);
  }, [menuOpen]);

  return { pathname, menuOpen, setMenuOpen };
};
