import { useRef, useState, useEffect } from 'react';
import { useUnstableGlobalHref } from 'expo-router';
import { getNavigationKey, navigationStartEvent } from '../../shared/navigation';

type Phase = `idle` | `active` | `finishing`;
type PendingNavigation = { id: number; source: string; destination: string; superseded: string[] };

export const usePageTransition = () => {
  const href = useUnstableGlobalHref();
  const base = typeof window === `undefined` ? `https://spelling-spells.invalid/` : window.location.href;
  const routeKey = getNavigationKey(href, base) ?? ``;
  const committed = useRef(routeKey);
  const complete = useRef<(key: string) => void>(() => undefined);
  const [phase, setPhase] = useState<Phase>(`idle`);

  useEffect(() => {
    if (typeof window.matchMedia !== `function`) return;
    const media = window.matchMedia(`(prefers-reduced-motion: reduce)`);
    let reducedMotion = media.matches;
    let generation = 0;
    let visible = false;
    let pending: PendingNavigation | null = null;
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let limitTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const clearTimers = () => {
      clearTimeout(showTimer);
      clearTimeout(limitTimer);
      clearTimeout(hideTimer);
    };
    const hide = () => {
      generation += 1;
      clearTimers();
      pending = null;
      visible = false;
      setPhase(`idle`);
    };
    const finish = (id: number) => {
      if (!pending || pending.id !== id) return;
      clearTimers();
      pending = null;
      if (!visible) { setPhase(`idle`); return; }
      setPhase(`finishing`);
      hideTimer = setTimeout(() => { if (generation === id) { visible = false; setPhase(`idle`); } }, 160);
    };
    const start = (destination: string) => {
      if (reducedMotion) return;
      if (destination === committed.current) { if (pending || visible) hide(); return; }
      const superseded = pending ? [...pending.superseded, pending.destination].slice(-16) : [];
      clearTimers();
      const id = ++generation;
      pending = { id, destination, superseded, source: committed.current };
      if (visible) setPhase(`active`);
      else showTimer = setTimeout(() => {
        if (!pending || pending.id !== id || generation !== id) return;
        visible = true;
        setPhase(`active`);
      }, 120);
      limitTimer = setTimeout(() => finish(id), 4000);
    };
    complete.current = (key) => {
      if (!pending || key === pending.source) return;
      if (key === pending.destination || !pending.superseded.includes(key)) finish(pending.id);
    };
    const navigation = (event: Event) => {
      const destination = (event as CustomEvent<{ destination?: string }>).detail?.destination;
      if (typeof destination === `string` && destination.startsWith(`/`)) start(destination);
    };
    const history = () => {
      const destination = getNavigationKey(window.location.href, window.location.href);
      if (destination) start(destination);
    };
    const preference = () => { reducedMotion = media.matches; if (reducedMotion) hide(); };
    media.addEventListener(`change`, preference);
    window.addEventListener(`popstate`, history);
    window.addEventListener(navigationStartEvent, navigation);
    return () => {
      generation += 1;
      clearTimers();
      complete.current = () => undefined;
      media.removeEventListener(`change`, preference);
      window.removeEventListener(`popstate`, history);
      window.removeEventListener(navigationStartEvent, navigation);
    };
  }, []);

  useEffect(() => {
    committed.current = routeKey;
    complete.current(routeKey);
  }, [routeKey]);

  return phase;
};
