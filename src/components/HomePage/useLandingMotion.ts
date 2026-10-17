import { useRevealScope } from '../TextReveal/RevealScope';
import { useRef, useEffect, useLayoutEffect } from 'react';

const useBrowserLayoutEffect = typeof window === `undefined` ? useEffect : useLayoutEffect;

export const useLandingMotion = () => {
  const pageRef = useRef<HTMLDivElement>(null);
  const scope = useRevealScope();
  const localReveals = useRef(new Set<string>());
  const revealed = scope ?? localReveals.current;

  useBrowserLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !window.matchMedia || !window.IntersectionObserver) return;
    const preference = window.matchMedia(`(prefers-reduced-motion: no-preference)`);
    const animations = new Set<Animation>();
    let disposed = false;
    let heroVisible = false;

    const cancelEntrances = () => {
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
    const updateMotion = () => {
      if (disposed) return;
      page.dataset.motion = preference.matches && heroVisible && !document.hidden ? `active` : `paused`;
      if (!preference.matches || document.hidden) cancelEntrances();
    };
    const heroObserver = new IntersectionObserver(([entry]) => {
      if (disposed) return;
      heroVisible = entry?.isIntersecting ?? false;
      updateMotion();
    });
    const revealPanel = (element: HTMLElement) => {
      const key = `panel:${element.id || element.className}`;
      if (disposed) return;
      if (revealed.has(key)) { revealObserver.unobserve(element); return; }
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      revealed.add(key);
      revealObserver.unobserve(element);
      if (!preference.matches || document.hidden || !element.animate || element.contains(document.activeElement)) return;
      const animation = element.animate([
        { opacity: 0, transform: `translate3d(0, 10px, 0)` },
        { opacity: 1, transform: `translate3d(0, 0, 0)` },
      ], { fill: `backwards`, duration: 650, delay: element.id === `home-spell-stage` ? 100 : 0, easing: `cubic-bezier(.2, .7, .3, 1)` });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
      animation.oncancel = () => animations.delete(animation);
    };
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) revealPanel(entry.target as HTMLElement); });
    }, { threshold: .08 });

    const hero = page.querySelector(`#landing-hero`);
    if (hero) heroObserver.observe(hero);
    page.querySelectorAll<HTMLElement>(`.ss-home-spell-stage, .ss-home-curated-grid, .ss-home-worlds-grid, .ss-home-guide-art, .ss-home-ethos-grid`).forEach((element) => {
      revealObserver.observe(element);
      revealPanel(element);
    });
    preference.addEventListener(`change`, updateMotion);
    document.addEventListener(`visibilitychange`, updateMotion);
    page.addEventListener(`focusin`, cancelEntrances);
    updateMotion();

    return () => {
      disposed = true;
      heroObserver.disconnect();
      revealObserver.disconnect();
      cancelEntrances();
      delete page.dataset.motion;
      preference.removeEventListener(`change`, updateMotion);
      document.removeEventListener(`visibilitychange`, updateMotion);
      page.removeEventListener(`focusin`, cancelEntrances);
    };
  }, [revealed]);

  return pageRef;
};
