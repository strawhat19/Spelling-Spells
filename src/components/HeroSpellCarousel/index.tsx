import Icon from '../Icon';
import Skeleton from '../Skeleton';
import SpellCard from '../SpellCard';
import styles from './styles.native';
import type { HeroSpellCarouselProps } from './types';
import FeaturedSkeleton from '../HomePage/FeaturedSkeleton';
import { Text, View, Animated, Pressable } from 'react-native';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useNativeHeroCarousel } from './useNativeHeroCarousel';

const HeroSpellCarousel = (props: HeroSpellCarouselProps) => {
  const { palette } = useTheme();
  const page = useNativeHeroCarousel(props);
  if (!props.ready) return <View nativeID='hero-spell-carousel' style={styles.root}>
    <FeaturedSkeleton />
    <View nativeID='hero-spell-carousel-controls-loading' accessible={false} pointerEvents='none' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={[styles.controls, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View nativeID='hero-spell-carousel-previous-loading' style={styles.control}><Skeleton shape='circle' width={20} height={20} /></View>
      <View nativeID='hero-spell-carousel-position-loading' style={styles.skeletonPosition}><Skeleton width={36} height={11} /></View>
      <View nativeID='hero-spell-carousel-next-loading' style={styles.control}><Skeleton shape='circle' width={20} height={20} /></View>
    </View>
    <View nativeID='hero-spell-carousel-pagination-loading' accessible={false} pointerEvents='none' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={styles.pagination}>{[0, 1, 2, 3, 4].map((index) => <View key={index} nativeID={`hero-spell-carousel-dot-loading-${index}`} style={styles.dotTarget}><Skeleton id={`hero-spell-carousel-dot-loading-${index}-shape`} shape={index === 0 ? `line` : `circle`} width={index === 0 ? 23 : 7} height={index === 0 ? 6 : 7} /></View>)}</View>
  </View>;
  if (!page.visibleSpell) return <View nativeID='hero-spell-loading' style={[styles.empty, { borderColor: palette.border, backgroundColor: palette.surface }]}><Text style={[styles.emptyText, { color: palette.muted }]}>Your spell library is empty</Text></View>;
  return <View nativeID='hero-spell-carousel' onTouchEnd={page.endTouch} onTouchStart={page.beginTouch} onTouchCancel={() => page.endTouch()} style={styles.root}>
    <View ref={page.stageRef} collapsable={false} nativeID='hero-spell-carousel-stage' onBlur={page.blurCard} onFocus={page.focusCard} style={[styles.stage, { minHeight: page.minHeight }]} {...page.gestures.panHandlers}>
      {page.rearSpell ? <Animated.View nativeID='hero-spell-carousel-rear' accessible={false} pointerEvents='none' onLayout={page.measureCard} accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={[styles.rear, { zIndex: page.raised ? 3 : 1 }, page.rearStyle]}>
        <SpellCard key={page.rearSpell.id} idPrefix='hero-stack' spell={page.rearSpell} featured />
        {!page.raised ? <View nativeID='hero-spell-carousel-rear-cover' style={styles.cover}><View nativeID='hero-spell-carousel-rear-cover-frame' style={styles.coverFrame} /></View> : null}
      </Animated.View> : null}
      <Animated.View nativeID='hero-spell-carousel-face' onLayout={page.measureCard} pointerEvents={page.shuffling ? `none` : `auto`} accessibilityElementsHidden={page.shuffling} importantForAccessibility={page.shuffling ? `no-hide-descendants` : `auto`} style={[styles.face, { zIndex: page.raised ? 1 : 2 }, page.frontStyle]}>
        <SpellCard key={page.visibleSpell.id} idPrefix='hero' spell={page.visibleSpell} featured />
        {page.raised ? <View nativeID='hero-spell-carousel-face-cover' style={styles.cover}><View nativeID='hero-spell-carousel-face-cover-frame' style={styles.coverFrame} /></View> : null}
      </Animated.View>
    </View>
    {page.count > 1 ? <>
      <View nativeID='hero-spell-carousel-controls' style={[styles.controls, { borderColor: palette.border, backgroundColor: palette.panel }]}>
        <Pressable nativeID='hero-spell-carousel-previous' accessibilityRole='button' accessibilityLabel='Previous Featured Spell' accessibilityState={{ disabled: page.shuffling }} disabled={page.shuffling} onPress={() => page.change(-1)} style={[styles.control, page.shuffling && styles.disabled]}><Icon name='chevron-left' size={19} color={palette.gold} /></Pressable>
        <Text nativeID='hero-spell-carousel-position' accessibilityLiveRegion={page.automatic ? `none` : `polite`} accessibilityLabel={`Featured Spell ${page.visibleIndex + 1} Of ${page.count}`} style={[styles.position, { color: palette.muted }]}>{page.visibleIndex + 1} / {page.count}</Text>
        <Pressable nativeID='hero-spell-carousel-next' accessibilityRole='button' accessibilityLabel='Next Featured Spell' accessibilityState={{ disabled: page.shuffling }} disabled={page.shuffling} onPress={() => page.change(1)} style={[styles.control, page.shuffling && styles.disabled]}><Icon name='chevron-right' size={19} color={palette.gold} /></Pressable>
      </View>
      <View nativeID='hero-spell-carousel-pagination' style={styles.pagination}>{page.deck.map((spell, index) => <Pressable key={spell.id} nativeID={`hero-spell-carousel-dot-${spell.id}`} accessibilityRole='button' accessibilityLabel={`Show ${spell.name}, Spell ${index + 1} Of ${page.count}`} accessibilityState={{ disabled: page.shuffling, selected: page.visibleIndex === index }} disabled={page.shuffling} onPress={() => page.choose(index)} style={[styles.dotTarget, page.shuffling && styles.disabled]}><View accessible={false} style={[styles.dot, page.visibleIndex === index && styles.activeDot, { backgroundColor: page.visibleIndex === index ? palette.gold : palette.border }]} /></Pressable>)}</View>
    </> : null}
  </View>;
};

export default HeroSpellCarousel;
