import Skeleton from '../Skeleton';
import styles from './styles.native';
import { Text, View } from 'react-native';
import cardStyles from '../SpellCard/styles.native';
import { useTheme } from '../../shared/themeContext/useTheme';

const FeaturedSkeleton = () => {
  const { palette } = useTheme();
  return <>
    <Text nativeID='hero-spell-loading-status' accessibilityLiveRegion='polite' style={styles.featuredLoadingStatus}>Loading Featured Spell</Text>
    <View
      accessible={false}
      pointerEvents='none'
      nativeID='hero-spell-loading'
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      style={[cardStyles.card, cardStyles.featured, styles.featuredSkeleton, { borderColor: palette.border, backgroundColor: palette.surface }]}
    >
      <View nativeID='hero-spell-skeleton-top' style={cardStyles.top}><Skeleton id='hero-spell-skeleton-origin' width='55%' height={11} /><Skeleton id='hero-spell-skeleton-save' shape='circle' width={40} height={40} /></View>
      <Skeleton id='hero-spell-skeleton-title' width='65%' height={46} />
      <View nativeID='hero-spell-skeleton-pronunciation-row' style={styles.featuredSkeletonPronunciation}><Skeleton id='hero-spell-skeleton-pronunciation' width='48%' height={14} /></View>
      <View nativeID='hero-spell-skeleton-definition' style={styles.featuredSkeletonDefinition}><Skeleton id='hero-spell-skeleton-definition-first' height={14} /><Skeleton id='hero-spell-skeleton-definition-second' width='86%' height={14} /></View>
      <View nativeID='hero-spell-skeleton-media' style={styles.featuredSkeletonMedia}><Skeleton id='hero-spell-skeleton-media-image' shape='block' height='100%' /></View>
      <View nativeID='hero-spell-skeleton-letters' style={cardStyles.letters}>{[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} id={`hero-spell-skeleton-letter-${index}`} width={29} height={32} />)}</View>
      <View nativeID='hero-spell-skeleton-ratings' style={[cardStyles.ratings, { borderTopColor: palette.border }]}>{[0, 1, 2].map((index) => <View key={index} nativeID={`hero-spell-skeleton-rating-${index}`} style={cardStyles.rating}><Skeleton id={`hero-spell-skeleton-rating-label-${index}`} width={44} height={10} /><Skeleton id={`hero-spell-skeleton-rating-value-${index}`} width={30} height={12} /></View>)}</View>
      <View nativeID='hero-spell-skeleton-footer' style={[cardStyles.footer, styles.featuredSkeletonFooter]}><Skeleton id='hero-spell-skeleton-category' width='48%' height={11} /><Skeleton id='hero-spell-skeleton-open' width={82} height={12} /></View>
    </View>
  </>;
};

export default FeaturedSkeleton;
