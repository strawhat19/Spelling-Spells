import Icon from '../Icon';
import { useRouter } from 'expo-router';
import { pricingCopy } from './content';
import type { PricingPlansProps } from './types';
import styles, { parchment } from './styles.native';
import { usePricingPlans } from './usePricingPlans';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, useWindowDimensions } from 'react-native';
import { formatPlanAmount, planIntervalLabel } from '../../shared/plans/values';

const PricingPlans = (props: PricingPlansProps) => {
  const router = useRouter();
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const { plans, error, variant, loading, idPrefix, signedIn, unavailable, reloadPlans, accountLoading } = usePricingPlans(props);
  return (
    <View nativeID={`${idPrefix}-section`} style={[styles.section, variant === `page` && styles.pageSection]}>
      <View nativeID={`${idPrefix}-heading`} style={styles.heading}>
        <View nativeID={`${idPrefix}-eyebrow`} style={styles.eyebrow}><Icon name={`spark`} size={14} color={palette.gold} /><Text nativeID={`${idPrefix}-eyebrow-copy`} style={[styles.eyebrowText, { color: palette.gold }]}>A LITTLE SUPPORT GOES A LONG WAY</Text></View>
        <Text nativeID={`${idPrefix}-title`} accessibilityRole={`header`} style={[styles.title, { color: palette.text }]}>{pricingCopy.title}</Text>
        <Text nativeID={`${idPrefix}-intro`} style={[styles.intro, { color: palette.muted }]}>{pricingCopy.intro}</Text>
      </View>
      {loading || unavailable || !plans.length ? (
        <View nativeID={`${idPrefix}-state`} accessibilityLiveRegion={`polite`} style={[styles.state, { borderColor: palette.border }]}>
          <Icon name={unavailable ? `info` : `book`} size={27} color={palette.gold} />
          <Text nativeID={`${idPrefix}-state-title`} style={[styles.stateTitle, { color: palette.text }]}>{loading ? `Opening the plans…` : unavailable ? `Pricing is unavailable` : `A new chapter is being written.`}</Text>
          <Text nativeID={`${idPrefix}-state-copy`} style={[styles.stateCopy, { color: palette.muted }]}>{loading ? `Gathering the latest pricing from the spellbook.` : unavailable ? error || `We couldn't load the published plans. Please try again.` : `No plans are published right now. The library is still yours to explore.`}</Text>
          {unavailable && <Pressable nativeID={`${idPrefix}-retry`} accessibilityRole={`button`} onPress={reloadPlans} style={styles.textLink}><Icon name={`refresh`} size={15} color={palette.primary} /><Text nativeID={`${idPrefix}-retry-copy`} style={[styles.textLinkCopy, { color: palette.primary }]}>Try Again</Text></Pressable>}
          {!loading && !unavailable && <Pressable nativeID={`${idPrefix}-empty-browse`} accessibilityRole={`link`} onPress={() => router.push(`/spells`)} style={styles.textLink}><Icon name={`book`} size={15} color={palette.primary} /><Text nativeID={`${idPrefix}-empty-browse-copy`} style={[styles.textLinkCopy, { color: palette.primary }]}>Browse Library</Text></Pressable>}
        </View>
      ) : (
        <View nativeID={`${idPrefix}-cards`} style={styles.cards}>
          {plans.map((plan) => {
            const free = plan.priceCents === 0;
            const starter = plan.slug === `starter`;
            const planId = `${idPrefix}-${plan.id}`;
            return (
              <View key={plan.id} nativeID={planId} style={[styles.card, { flexBasis: width >= 760 ? `45%` : `100%` }, plan.highlighted && styles.highlightedCard]}>
                <View nativeID={`${planId}-frame`} pointerEvents={`none`} style={[styles.frame, plan.highlighted && styles.highlightedFrame]} />
                <View nativeID={`${planId}-topline`} style={styles.topline}><Text nativeID={`${planId}-edition`} style={styles.edition}>{free ? `FOR THE CURIOUS` : `FOR THE DEVOTED`}</Text>{plan.highlighted && <View nativeID={`${planId}-highlight`} style={styles.highlight}><Icon name={`spark`} size={11} color={parchment.accent} /><Text nativeID={`${planId}-highlight-copy`} style={styles.highlightText}>Featured Plan</Text></View>}</View>
                <Text nativeID={`${planId}-name`} accessibilityRole={`header`} style={styles.name}>{plan.name}</Text>
                <Text nativeID={`${planId}-description`} style={styles.description}>{plan.description}</Text>
                <View nativeID={`${planId}-price`} style={styles.price}><Text nativeID={`${planId}-amount`} style={styles.amount}>{formatPlanAmount(plan)}</Text><Text nativeID={`${planId}-interval`} style={styles.interval}>{planIntervalLabel(plan)}</Text></View>
                {(plan.removesAds || free) && <View nativeID={`${planId}-reading`} style={styles.reading}><Icon name={plan.removesAds ? `spark` : `book`} size={16} color={plan.removesAds ? parchment.accent : parchment.soft} /><Text nativeID={`${planId}-reading-copy`} style={[styles.readingText, plan.removesAds && { color: parchment.accent }]}>{plan.removesAds ? `Ad-free reading when subscriptions launch` : `Ad-supported reading planned`}</Text></View>}
                <View nativeID={`${planId}-features`} style={styles.features}>{plan.features.map((feature, index) => <View key={index} nativeID={`${planId}-feature-${index}`} style={styles.feature}><Icon name={`check`} size={16} color={plan.highlighted ? parchment.accent : parchment.soft} /><Text nativeID={`${planId}-feature-${index}-copy`} style={styles.featureCopy}>{feature}</Text></View>)}</View>
                <View nativeID={`${planId}-action-area`} style={styles.actionArea}>
                  <Pressable
                    disabled={!free || accountLoading}
                    nativeID={`${planId}-action`}
                    accessibilityRole={free ? `link` : `button`}
                    accessibilityState={{ busy: free && accountLoading, disabled: !free || accountLoading }}
                    onPress={free ? () => router.push(signedIn ? `/spells` : `/signup`) : undefined}
                    style={({ pressed }) => [styles.action, !free && styles.unavailableAction, pressed && styles.pressedAction]}
                  >
                    <Icon name={free ? signedIn ? `book` : `user` : `spark`} size={16} color={free ? parchment.accent : parchment.paper} />
                    <Text nativeID={`${planId}-action-copy`} style={[styles.actionText, !free && styles.unavailableActionText]}>{free ? accountLoading ? `Loading Account…` : signedIn ? `Browse Library` : `Sign Up Free` : `Coming Soon`}</Text>
                    {free && !accountLoading && <Icon name={`arrow`} size={16} color={parchment.accent} />}
                  </Pressable>
                  {free && !accountLoading && !signedIn && <Pressable nativeID={`${planId}-signin`} accessibilityRole={`link`} onPress={() => router.push(`/signin`)} style={styles.secondaryLink}><Icon name={`user`} size={13} color={parchment.accent} /><Text nativeID={`${planId}-signin-copy`} style={styles.secondaryLinkText}>Already Have An Account? Sign In</Text></Pressable>}
                  {starter && <Pressable nativeID={`${planId}-preview`} accessibilityRole={`link`} accessibilityLabel={`Preview Starter Tools, Device-Local Preview`} onPress={() => router.push(`/grimoire`)} style={styles.secondaryLink}><Icon name={`book`} size={14} color={parchment.accent} /><Text nativeID={`${planId}-preview-copy`} style={styles.secondaryLinkText}>Preview Starter Tools</Text><Icon name={`arrow`} size={14} color={parchment.accent} /></Pressable>}
                  {starter && <Text nativeID={`${planId}-preview-note`} style={styles.previewNote}>Device-Local Preview</Text>}
                  <Text nativeID={`${planId}-availability`} style={styles.cardNote}>{free ? signedIn ? `A little curiosity is all you need.` : `The public library stays free to browse.` : `Subscriptions are not available yet.`}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View nativeID={`${idPrefix}-footer`} style={styles.footer}><Text nativeID={`${idPrefix}-availability`} style={[styles.note, { color: palette.muted }]}>{pricingCopy.availability}{`\n`}{pricingCopy.advertising}</Text>{variant === `landing` && <Pressable nativeID={`${idPrefix}-view-pricing`} accessibilityRole={`link`} onPress={() => router.push(`/pricing`)} style={styles.textLink}><Text nativeID={`${idPrefix}-view-pricing-copy`} style={[styles.textLinkCopy, { color: palette.primary }]}>Explore Plans & Details</Text><Icon name={`arrow`} size={16} color={palette.primary} /></Pressable>}</View>
    </View>
  );
};

export default PricingPlans;
