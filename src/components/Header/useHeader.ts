import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'expo-router';

export const useHeader = () => {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    const header = headerRef.current;
    const shell = header?.closest<HTMLElement>(`.app-shell`);
    const brand = header?.querySelector<HTMLElement>(`#header-brand`);
    if (!header || !shell) return;
    const measure = () => {
      shell.style.setProperty(`--header-offset`, `${header.getBoundingClientRect().height}px`);
      if (brand) shell.style.setProperty(`--header-brand-width`, `${brand.getBoundingClientRect().width}px`);
    };
    measure();
    const observer = typeof ResizeObserver !== `undefined` ? new ResizeObserver(measure) : null;
    observer?.observe(header);
    if (brand) observer?.observe(brand);
    window.addEventListener(`resize`, measure);
    return () => { observer?.disconnect(); window.removeEventListener(`resize`, measure); };
  }, []);

  return { pathname, menuOpen, setMenuOpen, headerRef };
};
