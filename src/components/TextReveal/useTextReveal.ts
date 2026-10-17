import { revealWords } from './motion';
import { useRevealScope } from './RevealScope';
import { useRef, useEffect, useLayoutEffect, type RefObject } from 'react';

const useBrowserLayoutEffect = typeof window === `undefined` ? useEffect : useLayoutEffect;

export const useTextReveal = (visualRef: RefObject<HTMLSpanElement | null>, id: string, text: string, delay: number) => {
  const scope = useRevealScope();
  const localReveals = useRef(new Set<string>());
  const revealed = scope ?? localReveals.current;

  useBrowserLayoutEffect(() => {
    const element = visualRef.current;
    const key = `heading:${id}`;
    if (!element || revealed.has(key) || !window.matchMedia) return;
    const preference = window.matchMedia(`(prefers-reduced-motion: no-preference)`);
    if (!preference.matches) { revealed.add(key); return; }
    let disposed = false;
    let observer: IntersectionObserver | undefined;
    let activeReveal: ReturnType<typeof revealWords> | undefined;
    const cancel = () => { activeReveal?.cancel(); };
    const reveal = () => {
      if (disposed || revealed.has(key)) return;
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height || bounds.bottom <= 0 || bounds.top >= window.innerHeight || bounds.right <= 0 || bounds.left >= window.innerWidth) return;
      revealed.add(key);
      observer?.disconnect();
      if (!preference.matches || document.hidden) return;
      try {
        activeReveal = revealWords(element, delay);
      } catch {
        element.textContent = text;
      }
    };
    const onPreference = () => { if (!preference.matches) { revealed.add(key); observer?.disconnect(); cancel(); } };
    const onVisibility = () => { if (document.hidden) cancel(); };
    if (window.IntersectionObserver) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal();
      }, { threshold: .12 });
      observer.observe(element);
    }
    preference.addEventListener(`change`, onPreference);
    document.addEventListener(`visibilitychange`, onVisibility);
    document.addEventListener(`focusin`, cancel);
    reveal();

    return () => {
      disposed = true;
      observer?.disconnect();
      activeReveal?.dispose();
      preference.removeEventListener(`change`, onPreference);
      document.removeEventListener(`visibilitychange`, onVisibility);
      document.removeEventListener(`focusin`, cancel);
    };
  }, [visualRef, revealed, id, text, delay]);
};
