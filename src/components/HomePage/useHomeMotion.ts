import { useRef, useMemo, useEffect } from 'react';
import { Easing, AppState, Animated, AccessibilityInfo } from 'react-native';

export const useHomeMotion = () => {
  const entrance = useRef(new Animated.Value(1)).current;
  const ambience = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    let entered = false;
    let reduceMotion = true;
    let preferenceKnown = false;
    let preferenceChanged = false;
    let active = AppState.currentState === `active`;
    let introduction: Animated.CompositeAnimation | null = null;
    let decoration: Animated.CompositeAnimation | null = null;
    const stop = () => {
      introduction?.stop();
      decoration?.stop();
      entrance.setValue(1);
      ambience.setValue(0);
    };
    const update = () => {
      stop();
      if (!preferenceKnown || reduceMotion || !active) return;
      if (!entered) {
        entered = true;
        entrance.setValue(0);
        introduction = Animated.timing(entrance, { toValue: 1, duration: 660, isInteraction: false, useNativeDriver: true, easing: Easing.out(Easing.cubic) });
        introduction.start();
      }
      decoration = Animated.loop(Animated.sequence([
        Animated.timing(ambience, { toValue: 1, duration: 10000, isInteraction: false, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(ambience, { toValue: 0, duration: 10000, isInteraction: false, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]));
      decoration.start();
    };
    const preference = AccessibilityInfo.addEventListener(`reduceMotionChanged`, (enabled) => {
      preferenceChanged = true;
      preferenceKnown = true;
      reduceMotion = enabled;
      update();
    });
    const visibility = AppState.addEventListener(`change`, (state) => {
      active = state === `active`;
      update();
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!mounted || preferenceChanged) return;
      preferenceKnown = true;
      reduceMotion = enabled;
      update();
    }).catch(() => undefined);
    return () => {
      mounted = false;
      preference.remove();
      visibility.remove();
      stop();
    };
  }, [entrance, ambience]);

  return useMemo(() => ({
    heroStyle: { opacity: entrance.interpolate({ inputRange: [0, 1], outputRange: [.92, 1] }), transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
    orbitStyle: { opacity: ambience.interpolate({ inputRange: [0, 1], outputRange: [.22, .28] }), transform: [{ translateY: ambience.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }, { scale: ambience.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }] },
    innerOrbitStyle: { opacity: ambience.interpolate({ inputRange: [0, 1], outputRange: [.16, .12] }), transform: [{ translateX: ambience.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }, { translateY: ambience.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
    watermarkStyle: { opacity: ambience.interpolate({ inputRange: [0, 1], outputRange: [.04, .06] }), transform: [{ rotate: ambience.interpolate({ inputRange: [0, 1], outputRange: [`15deg`, `17deg`] }) }, { scale: ambience.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }] },
  }), [entrance, ambience]);
};
