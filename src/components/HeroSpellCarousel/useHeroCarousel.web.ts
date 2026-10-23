import { useHeroDeck } from './useHeroDeck';
import type { Spell } from '../../shared/models/Spell';
import type { MouseEvent, PointerEvent, KeyboardEvent } from 'react';
import { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';

type Shuffle = { token: number; source: string; target: string; direction: number };
type CardPose = { paper: string; transform: string; opacity: number };
type Turn = Shuffle & { poses: Map<string, CardPose>; started: boolean; committed: boolean };
const useBrowserLayoutEffect = typeof window === `undefined` ? useEffect : useLayoutEffect;

export const useHeroCarousel = (spells: Spell[], ready: boolean) => {
  const selection = useHeroDeck(spells);
  const { count, index, current, deck } = selection;
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panels = useRef(new Map<string, HTMLDivElement>());
  const animations = useRef<Animation[]>([]);
  const turn = useRef<Turn | null>(null);
  const generation = useRef(0);
  const gesture = useRef<{ id: number; x: number; y: number; swipe: boolean } | null>(null);
  const suppressedClick = useRef(0);
  const motionRef = useRef(false);
  const visibleRef = useRef(false);
  const foregroundRef = useRef(true);
  const latest = useRef(selection);
  latest.current = selection;
  const [shuffle, setShuffle] = useState<Shuffle | null>(null);
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [announcement, setAnnouncement] = useState(``);
  const turning = shuffle !== null;

  const cancelTurn = useCallback((update = true) => {
    generation.current++;
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
    turn.current = null;
    if (update) setShuffle(null);
  }, []);

  const settleTurn = useCallback(() => {
    const target = turn.current?.target;
    cancelTurn();
    const targetIndex = latest.current.deck.findIndex((spell) => spell.id === target);
    if (targetIndex >= 0) latest.current.select(targetIndex);
  }, [cancelTurn]);

  const goTo = useCallback((nextIndex: number, manual = true) => {
    if (!ready || !Number.isFinite(nextIndex) || turn.current) return;
    const value = latest.current;
    if (!value.count) return;
    if (manual) setRevision((value) => value + 1);
    const destination = ((Math.trunc(nextIndex) % value.count) + value.count) % value.count;
    const target = value.deck[destination];
    if (!target || !value.current || target.id === value.current.id) return;
    if (viewportRef.current?.contains(document.activeElement)) rootRef.current?.focus({ preventScroll: true });
    if (manual) setAnnouncement(`Spell ${destination + 1} of ${value.count}: ${target.name}`);
    const panel = panels.current.get(value.current.id);
    if (!motionRef.current || !panel?.animate) { value.select(destination); return; }
    const poses = new Map<string, CardPose>();
    panels.current.forEach((element, id) => {
      const style = getComputedStyle(element);
      const cover = element.querySelector<HTMLElement>(`.hero-carousel-card-cover`);
      poses.set(id, {
        transform: style.transform,
        paper: cover ? getComputedStyle(cover).backgroundColor : `#d8c8f2`,
        opacity: style.visibility === `visible` ? Number(style.opacity) : 0,
      });
    });
    const transition = { token: ++generation.current, source: value.current.id, target: target.id, direction: nextIndex < value.index ? -1 : 1 };
    turn.current = { ...transition, poses, started: false, committed: false };
    setShuffle(transition);
  }, [ready]);

  useBrowserLayoutEffect(() => {
    const transition = turn.current;
    if (!transition) return;
    if (!ready || !deck.some((spell) => spell.id === transition.target)) { cancelTurn(); return; }
    if (transition.committed) { cancelTurn(); return; }
    if (current?.id !== transition.source) { cancelTurn(); return; }
    if (transition.started) return;
    const source = panels.current.get(transition.source);
    const target = panels.current.get(transition.target);
    if (!source?.animate || !target?.animate || !motionAllowed) { settleTurn(); return; }
    transition.started = true;
    const direction = transition.direction;
    const bounds = source.getBoundingClientRect();
    const gutter = direction > 0 ? bounds.left : window.innerWidth - bounds.right;
    const budget = Math.max(0, gutter - 10);
    const scale = .94;
    const clearance = budget + source.clientWidth * (1 - scale) / 2;
    const distance = Math.min(240, source.clientWidth * .55, clearance * .74);
    const angle = Math.min(9, Math.asin(Math.min(1, Math.max(0, clearance - distance) / Math.max(1, source.clientHeight * .65))) * 180 / Math.PI);
    const lift = Math.min(28, source.clientHeight * .045);
    const stackStyle = getComputedStyle(viewportRef.current ?? source);
    const nearPose = stackStyle.getPropertyValue(`--hero-stack-near-transform`);
    const farPose = stackStyle.getPropertyValue(`--hero-stack-far-transform`);
    const sourceIndex = deck.findIndex((spell) => spell.id === transition.source);
    const targetIndex = deck.findIndex((spell) => spell.id === transition.target);
    const sourceRank = (sourceIndex - targetIndex + count) % count;
    const restingLayer = sourceRank === 1 ? 2 : 1;
    const restingPose = sourceRank === 1 ? nearPose : farPose;
    const incomingPose = transition.poses.get(transition.target);
    const options: KeyframeAnimationOptions = { duration: 920, fill: `both`, easing: `linear` };
    const outgoing = source.animate([
      { offset: 0, zIndex: 5, opacity: 1, transform: `translate3d(0, 0, 0) rotate(0deg) scale(1)`, easing: `cubic-bezier(.32, .04, .2, 1)` },
      { offset: .38, zIndex: 5, opacity: 1, transform: `translate3d(${-direction * distance}px, ${-lift}px, 0) rotate(${-direction * angle}deg) scale(${scale})`, easing: `ease-out` },
      { offset: .48, zIndex: 5, opacity: 0, transform: `translate3d(${-direction * distance * .98}px, ${-lift - 2}px, 0) rotate(${-direction * angle * .98}deg) scale(${scale})` },
      { offset: .49, zIndex: restingLayer, opacity: 0, transform: `translate3d(${-direction * distance * .96}px, ${-lift}px, 0) rotate(${-direction * angle * .96}deg) scale(${scale})`, easing: `cubic-bezier(.16, 1, .3, 1)` },
      { offset: 1, zIndex: restingLayer, opacity: sourceRank <= 2 ? 1 : 0, transform: restingPose },
    ], options);
    const incoming = target.animate([
      { offset: 0, opacity: incomingPose?.opacity ?? 0, transform: incomingPose?.transform ?? nearPose, easing: `cubic-bezier(.16, 1, .3, 1)` },
      { offset: .72, opacity: 1, transform: `translate3d(0, -3px, 0) rotate(${direction * .25}deg) scale(1.006)`, easing: `cubic-bezier(.22, .8, .4, 1)` },
      { offset: 1, opacity: 1, transform: `translate3d(0, 0, 0) rotate(0deg) scale(1)` },
    ], options);
    const sourceCover = source.querySelector<HTMLElement>(`.hero-carousel-card-cover`);
    const targetCover = target.querySelector<HTMLElement>(`.hero-carousel-card-cover`);
    animations.current = [outgoing, incoming];
    if (sourceCover) animations.current.push(sourceCover.animate([{ offset: 0, opacity: 0 }, { offset: .38, opacity: 0 }, { offset: .49, opacity: 1 }, { offset: 1, opacity: 1 }], options));
    if (targetCover) animations.current.push(targetCover.animate([{ offset: 0, opacity: 1, backgroundColor: incomingPose?.paper ?? `#bfa9e9` }, { offset: .4, opacity: 0 }, { offset: 1, opacity: 0 }], options));
    deck.forEach((spell, position) => {
      if (spell.id === transition.source || spell.id === transition.target) return;
      const panel = panels.current.get(spell.id);
      const pose = transition.poses.get(spell.id);
      if (!panel || !pose) return;
      const rank = (position - targetIndex + count) % count;
      const transform = rank === 1 ? nearPose : farPose;
      animations.current.push(panel.animate([
        { visibility: `visible`, opacity: pose.opacity, transform: pose.transform },
        { visibility: `visible`, opacity: rank <= 2 ? 1 : 0, transform },
      ], { ...options, easing: `cubic-bezier(.22, .8, .24, 1)` }));
      const cover = panel.querySelector<HTMLElement>(`.hero-carousel-card-cover`);
      if (cover) animations.current.push(cover.animate([{ backgroundColor: pose.paper }, { backgroundColor: getComputedStyle(cover).backgroundColor }], options));
    });
    outgoing.onfinish = () => {
      if (generation.current !== transition.token || turn.current !== transition) return;
      const targetIndex = latest.current.deck.findIndex((spell) => spell.id === transition.target);
      if (targetIndex < 0) { cancelTurn(); return; }
      transition.committed = true;
      latest.current.select(targetIndex);
    };
  }, [ready, deck, count, shuffle, current?.id, motionAllowed, cancelTurn, settleTurn]);

  useEffect(() => {
    let disposed = false;
    const preference = window.matchMedia?.(`(prefers-reduced-motion: reduce)`);
    const onPreference = () => {
      motionRef.current = Boolean(preference && !preference.matches);
      setMotionAllowed(motionRef.current);
      if (!motionRef.current) settleTurn();
    };
    const onVisibility = () => {
      foregroundRef.current = !document.hidden;
      setForeground(foregroundRef.current);
      if (!foregroundRef.current) { gesture.current = null; settleTurn(); }
    };
    const clearGesture = () => { gesture.current = null; };
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => {
      if (disposed) return;
      visibleRef.current = Boolean(entry?.isIntersecting && entry.intersectionRatio >= .3);
      setVisible(visibleRef.current);
      if (!visibleRef.current) settleTurn();
    }, { threshold: .3 }) : null;
    if (viewportRef.current && observer) observer.observe(viewportRef.current);
    else { visibleRef.current = true; setVisible(true); }
    onPreference();
    onVisibility();
    preference?.addEventListener(`change`, onPreference);
    document.addEventListener(`visibilitychange`, onVisibility);
    window.addEventListener(`pointerup`, clearGesture);
    window.addEventListener(`pointercancel`, clearGesture);
    window.addEventListener(`blur`, clearGesture);
    window.addEventListener(`resize`, settleTurn);
    return () => {
      disposed = true;
      observer?.disconnect();
      cancelTurn(false);
      preference?.removeEventListener(`change`, onPreference);
      document.removeEventListener(`visibilitychange`, onVisibility);
      window.removeEventListener(`pointerup`, clearGesture);
      window.removeEventListener(`pointercancel`, clearGesture);
      window.removeEventListener(`blur`, clearGesture);
      window.removeEventListener(`resize`, settleTurn);
    };
  }, [cancelTurn, settleTurn]);

  useEffect(() => {
    if (!ready || !motionAllowed || !visible || !foreground || turning || count < 2) return;
    let timer: number;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (motionRef.current && visibleRef.current && foregroundRef.current && !turn.current && !gesture.current && !viewportRef.current?.contains(document.activeElement)) goTo(latest.current.index + 1, false);
      timer = window.setTimeout(tick, 6500);
    };
    timer = window.setTimeout(tick, 6500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [ready, count, index, goTo, turning, visible, foreground, motionAllowed, revision]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if ((event.target as HTMLElement).closest(`input, textarea, select, [contenteditable='true']`)) return;
    const destination = event.key === `ArrowLeft` ? index - 1 : event.key === `ArrowRight` ? index + 1 : event.key === `Home` ? 0 : event.key === `End` ? count - 1 : null;
    if (destination === null || count < 2) return;
    event.preventDefault();
    goTo(destination);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressedClick.current = 0;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, swipe: event.pointerType !== `mouse` };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const origin = gesture.current;
    gesture.current = null;
    if (!origin?.swipe || origin.id !== event.pointerId) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    suppressedClick.current = Date.now() + 450;
    goTo(index + (dx < 0 ? 1 : -1));
  };
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (Date.now() > suppressedClick.current) return;
    suppressedClick.current = 0;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    ...selection, rootRef, viewportRef, panels, shuffle, turning, announcement,
    goTo, onKeyDown, onPointerDown, onPointerUp, onClickCapture,
    onPointerCancel: () => { gesture.current = null; },
  };
};
