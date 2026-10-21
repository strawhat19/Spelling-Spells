import { useHeroDeck } from './useHeroDeck';
import type { Spell } from '../../shared/models/Spell';
import type { HeroSpellCarouselProps } from './types';
import { useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { Easing, AppState, Animated, PanResponder, AccessibilityInfo, useWindowDimensions, type View, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';

export const useNativeHeroCarousel = ({ spells, ready }: HeroSpellCarouselProps) => {
  const page = useHeroDeck(spells);
  const { deck, current, count, index, next, previous, select } = page;
  const progress = useRef(new Animated.Value(0)).current;
  const stageRef = useRef<View>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const generation = useRef(0);
  const playbackGeneration = useRef(0);
  const settling = useRef<number | null>(null);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = useRef(false);
  const focusedRef = useRef(false);
  const touchingRef = useRef(false);
  const direction = useRef(1);
  const motion = useRef(false);
  const readerAllowed = useRef(false);
  const foreground = useRef(AppState.currentState === `active`);
  const [active, setActive] = useState(foreground.current);
  const [shown, setShown] = useState<Spell | null>(current ?? null);
  const [rear, setRear] = useState<Spell | null>(deck[1] ?? null);
  const [raised, setRaised] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [shuffleDirection, setShuffleDirection] = useState(1);
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [screenReaderAllowed, setScreenReaderAllowed] = useState(false);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const standby = deck[(index + 1) % Math.max(count, 1)] ?? null;

  const resetDwell = useCallback(() => {
    playbackGeneration.current += 1;
    clearTimeout(autoTimer.current);
    setPlaybackRevision((revision) => revision + 1);
  }, []);
  const beginTouch = useCallback(() => { touchingRef.current = true; setTouching(true); resetDwell(); }, [resetDwell]);
  const endTouch = useCallback((event?: GestureResponderEvent) => {
    if (event?.nativeEvent?.touches?.length) return;
    touchingRef.current = false;
    setTouching(false);
    resetDwell();
  }, [resetDwell]);
  const focusCard = useCallback(() => { focusedRef.current = true; setFocused(true); resetDwell(); }, [resetDwell]);
  const blurCard = useCallback(() => { focusedRef.current = false; setFocused(false); resetDwell(); }, [resetDwell]);

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    let readerChanged = false;
    const applyPreference = (enabled: boolean) => { motion.current = !enabled; setMotionAllowed(!enabled); resetDwell(); };
    const applyReader = (enabled: boolean) => { readerAllowed.current = !enabled; setScreenReaderAllowed(!enabled); resetDwell(); };
    const preference = AccessibilityInfo.addEventListener(`reduceMotionChanged`, (enabled) => { preferenceChanged = true; applyPreference(enabled); });
    const reader = AccessibilityInfo.addEventListener(`screenReaderChanged`, (enabled) => { readerChanged = true; applyReader(enabled); });
    const visibility = AppState.addEventListener(`change`, (state) => {
      foreground.current = state === `active`;
      if (!foreground.current) { touchingRef.current = false; setTouching(false); }
      setActive(foreground.current);
      resetDwell();
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted && !preferenceChanged) applyPreference(enabled);
    }).catch(() => undefined);
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted && !readerChanged) applyReader(enabled);
    }).catch(() => undefined);
    return () => { mounted = false; reader.remove(); preference.remove(); visibility.remove(); };
  }, [resetDwell]);

  useLayoutEffect(() => {
    const attempt = ++generation.current;
    const outgoing = shownRef.current;
    settling.current = null;
    animation.current?.stop();
    progress.setValue(0);
    setRaised(false);
    const settle = () => {
      progress.setValue(0);
      busy.current = false;
      setShuffling(false);
      setShown(current);
      setRear(standby?.id !== current?.id ? standby : null);
    };
    if (!ready || !current || !outgoing || outgoing.id === current.id || !deck.some((spell) => spell.id === outgoing.id) || !motionAllowed || !active) settle();
    else {
      busy.current = true;
      setShuffling(true);
      setRear(current);
      setShuffleDirection(direction.current);
      animation.current = Animated.timing(progress, { toValue: .5, duration: 300, isInteraction: false, useNativeDriver: true, easing: Easing.inOut(Easing.cubic) });
      animation.current.start(({ finished }) => {
        if (generation.current !== attempt) return;
        if (!finished || !motion.current || !foreground.current) { settle(); return; }
        setRaised(true);
        animation.current = Animated.timing(progress, { toValue: 1, duration: 420, isInteraction: false, useNativeDriver: true, easing: Easing.out(Easing.cubic) });
        animation.current.start(({ finished: completed }) => {
          if (generation.current !== attempt) return;
          if (!completed || !motion.current || !foreground.current) { settle(); return; }
          settling.current = attempt;
          setShown(current);
          setRear(outgoing);
          setRaised(false);
        });
      });
    }
    return () => { generation.current += 1; settling.current = null; animation.current?.stop(); progress.setValue(0); };
  }, [deck, current, ready, active, standby, progress, motionAllowed]);

  useLayoutEffect(() => {
    if (settling.current === null || settling.current !== generation.current) return;
    settling.current = null;
    progress.setValue(0);
    busy.current = false;
    setShuffling(false);
  }, [shown, progress]);

  useEffect(() => {
    if (!ready || !motionAllowed || !screenReaderAllowed || !active || shuffling || focused || touching || count < 2) return;
    let cancelled = false;
    const attempt = playbackGeneration.current;
    const allowed = () => !cancelled && attempt === playbackGeneration.current && motion.current && readerAllowed.current && foreground.current && !busy.current && !focusedRef.current && !touchingRef.current;
    const tick = () => {
      if (!allowed()) return;
      if (!stageRef.current) { autoTimer.current = setTimeout(tick, 6500); return; }
      stageRef.current.measureInWindow((_left, top, _width, height) => {
        if (!allowed()) return;
        const visibleHeight = Math.min(top + height, windowHeight) - Math.max(top, 0);
        if (height > 0 && visibleHeight >= Math.min(height * .35, 120)) { direction.current = 1; next(); }
        else autoTimer.current = setTimeout(tick, 6500);
      });
    };
    autoTimer.current = setTimeout(tick, 6500);
    return () => { cancelled = true; clearTimeout(autoTimer.current); };
  }, [ready, motionAllowed, screenReaderAllowed, active, shuffling, focused, touching, count, index, next, windowHeight, playbackRevision]);

  const change = useCallback((step: -1 | 1) => {
    resetDwell();
    if (busy.current || count < 2) return;
    direction.current = step;
    if (step === 1) next(); else previous();
  }, [count, next, previous, resetDwell]);
  const choose = useCallback((nextIndex: number) => {
    resetDwell();
    if (!busy.current) { direction.current = nextIndex > index ? 1 : -1; select(nextIndex); }
  }, [index, select, resetDwell]);
  const gestures = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => !busy.current && count > 1 && gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
    onPanResponderGrant: beginTouch,
    onPanResponderTerminationRequest: () => true,
    onShouldBlockNativeResponder: () => false,
    onPanResponderTerminate: () => endTouch(),
    onPanResponderRelease: (event, gesture) => {
      if (Math.abs(gesture.dx) > 40 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6) change(gesture.dx < 0 ? 1 : -1);
      endTouch(event);
    },
  }), [change, count, endTouch, beginTouch]);
  const measureCard = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCardSize((previousSize) => {
      const minimum = Math.max(previousSize.width === width ? previousSize.height : 0, Math.ceil(height));
      return previousSize.width === width && previousSize.height === minimum ? previousSize : { width, height: minimum };
    });
  };
  const gutter = cardSize.width > 0 && cardSize.height > 0 ? Math.max(0, (windowWidth - cardSize.width) / 2 - 10) : 0;
  const halfHeight = Math.max(cardSize.height / 2, 1);
  const swingDistance = Math.min(cardSize.width * .14, 58, gutter * .45);
  const swingAngle = Math.min(8, Math.asin(Math.min(1, (gutter - swingDistance) / halfHeight)) * 180 / Math.PI);
  const rearOffset = Math.min(10, gutter * .35);
  const rearAngle = Math.min(windowWidth <= 620 ? 2 : 4, Math.asin(Math.min(1, (gutter - rearOffset) / halfHeight)) * 180 / Math.PI);
  const frontStyle = useMemo(() => ({ transform: [
    { translateX: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [0, -shuffleDirection * swingDistance, rearOffset] }) },
    { translateY: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [0, -8, 12] }) },
    { rotateZ: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [`0deg`, `${-swingAngle * shuffleDirection}deg`, `${rearAngle}deg`] }) },
    { scale: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [1, .99, .97] }) },
  ] }), [progress, rearAngle, rearOffset, swingAngle, swingDistance, shuffleDirection]);
  const rearStyle = useMemo(() => ({ transform: [
    { translateX: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [rearOffset, rearOffset / 2, 0] }) },
    { translateY: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [12, 4, 0] }) },
    { rotateZ: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [`${rearAngle}deg`, `${rearAngle / 2}deg`, `0deg`] }) },
    { scale: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [.97, .985, 1] }) },
  ] }), [progress, rearAngle, rearOffset]);
  const visibleSpell = shown && deck.some((spell) => spell.id === shown.id) ? shown : current;
  const rearSpell = rear && rear.id !== visibleSpell?.id && deck.some((spell) => spell.id === rear.id) ? rear : null;
  const visibleIndex = Math.max(0, deck.findIndex((spell) => spell.id === visibleSpell?.id));
  return { ...page, raised, choose, change, gestures, stageRef, shuffling, frontStyle, rearStyle, rearSpell, focusCard, blurCard, beginTouch, endTouch, measureCard, visibleSpell, visibleIndex, minHeight: cardSize.height + (count > 1 ? 20 : 0), automatic: motionAllowed && screenReaderAllowed && active && !focused && !touching && count > 1 };
};
