import Icon from '../Icon';
import { useState } from 'react';
import SpellCard from '../SpellCard';
import styles from './styles.native';
import SpellMedia from '../SpellMedia';
import { useRouter } from 'expo-router';
import { getPublicPageUrl } from '../PageMetadata/urls';
import { useSpellDetailPage } from './useSpellDetailPage';
import { getSpellPath } from '../../shared/catalog/routes';
import { useTheme } from '../../shared/themeContext/useTheme';
import { getSavedCollectionPresentation } from '../CatalogPage/savedCollectionPresentation';
import { Text, View, Alert, Share, Linking, Pressable } from 'react-native';

const SpellDetailPage = () => {
  const router = useRouter();
  const { palette } = useTheme();
  const collection = useSpellDetailPage();
  const { spell, world, ready, error, related, isSaved, savedReady, saveMessage, catalogError, reloadCatalog, toggleSaved } = collection;
  const presentation = getSavedCollectionPresentation(collection);

  const [sharing, setSharing] = useState(false);

  if (!spell && catalogError) return <View nativeID={`spell-detail-catalog-error`} style={[styles.page, styles.empty]}><Icon name={`book`} size={32} color={palette.gold} /><Text accessibilityRole={`header`} style={[styles.sectionTitle, { color: palette.text }]}>The archive could not be opened.</Text><Text accessibilityLiveRegion={`polite`} style={[styles.copy, { color: palette.error }]}>{catalogError}</Text><Pressable nativeID={`spell-detail-retry`} accessibilityRole={`button`} onPress={() => void reloadCatalog()} style={styles.link}><Icon name={`book`} size={16} color={palette.gold} /><Text style={[styles.linkText, { color: palette.gold }]}>Try Again</Text></Pressable><Pressable nativeID={`spell-detail-error-browse`} accessibilityRole={`link`} onPress={() => router.push(`/spells`)} style={styles.link}><Text style={[styles.linkText, { color: palette.gold }]}>Open the spell index</Text><Icon name={`arrow-right`} size={16} color={palette.gold} /></Pressable></View>;

  if (!spell) return (
    <View nativeID="spell-detail-empty" style={[styles.page, styles.empty]}>
      <Icon name="book" size={32} color={palette.gold} />
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{ready ? `This page is missing.` : `Opening the spell record…`}</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>{ready ? `We couldn’t find that spell. There are more words waiting in the archive.` : `Loading the public archive.`}</Text>
      {!ready && <View nativeID="spell-detail-skeleton" style={[styles.section, { minHeight: 240, backgroundColor: palette.surface, borderColor: palette.border }]}>{[70, 90, 60].map((width, index) => <View key={index} nativeID={`detail-skeleton-line-${index}`} style={{ height: index === 0 ? 32 : 15, width: `${width}%`, borderRadius: 6, backgroundColor: palette.panel }} />)}</View>}
      <Pressable nativeID="missing-spell-library-link" accessibilityRole="link" onPress={() => router.push(`/spells`)} style={styles.link}><Text style={[styles.linkText, { color: palette.gold }]}>Back to the library</Text><Icon name="arrow-right" size={16} color={palette.gold} /></Pressable>
    </View>
  );

  const saved = isSaved(spell.id);
  const hasPronunciation = Boolean(spell.pronunciation?.trim()) && spell.pronunciationStatus !== `unavailable`;
  const entryType = spell.entryType === `ability` ? `Power / Ability` : spell.entryType === `incantation` ? `Incantation` : spell.entryType === `spell` ? `Spell` : spell.kind;
  const shareSpell = async () => {
    if (sharing) return;
    setSharing(true);
    const url = getPublicPageUrl(getSpellPath(spell));
    try {
      await Share.share({
        title: `${spell.name} · Spelling Spells`,
        message: `${spell.name}${hasPronunciation ? ` · ${spell.pronunciation}` : ``}\n${spell.definition}\nFrom ${spell.sourceTitle}${url ? `\n${url}` : ``}`,
      });
    } catch {
      Alert.alert(`Couldn’t Open Sharing`, `Please try again. No sharing result was confirmed.`);
    } finally {
      setSharing(false);
    }
  };
  const sectionStyle = [styles.section, { backgroundColor: palette.surface, borderColor: palette.border }];
  const ratings = [
    { name: `Danger`, value: spell.danger, note: `Editorial estimate of potential harm within the fictional setting.` },
    { name: `Utility`, value: spell.utility, note: `Editorial estimate of everyday usefulness within the fictional setting.` },
  ];

  return (
    <View nativeID={`spell-detail-${spell.id}`} style={styles.page}>
      <Pressable nativeID="spell-detail-back" accessibilityRole="link" onPress={() => router.push(`/spells`)} style={styles.link}><Icon name="chevron-left" size={17} color={palette.muted} /><Text style={[styles.linkText, { color: palette.muted }]}>Spell library</Text></Pressable>
      <Text style={[styles.eyebrow, { color: palette.lavender }]}>{world?.name ?? spell.sourceTitle} · {spell.medium}</Text>
      <Text nativeID="spell-detail-title" accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{spell.name}</Text>
      {hasPronunciation && <Text nativeID="spell-detail-phonetic" style={[styles.phonetic, { color: palette.gold }]}>{spell.pronunciation}{spell.pronunciationStatus === `approximate` ? ` · Approximate` : ``}</Text>}
      <Text style={[styles.definition, { color: palette.text }]}>{spell.definition}</Text>
      <View style={styles.badges}>
        {[entryType, world?.kind === `folklore` ? `Folklore Tradition` : `Fictional Setting`, spell.language, spell.category, spell.kind].filter(Boolean).map((label, index) => <View key={index} nativeID={`spell-tag-${spell.id}-${index}`} style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.panel }]}><Text style={[styles.badgeText, { color: palette.lavender }]}>{label}</Text></View>)}
      </View>
      {!!spell.casters?.length && <Text nativeID={`spell-detail-casters-${spell.id}`} style={[styles.copy, { color: palette.muted }]}>Character / Caster: {spell.casters.join(`, `)}</Text>}
      {!!spell.continuity && <Text nativeID={`spell-detail-continuity-${spell.id}`} style={[styles.copy, { color: palette.muted }]}>Continuity / Version: {spell.continuity}</Text>}
      {world?.kind === `folklore` && <Text nativeID={`spell-detail-belief-note-${spell.id}`} style={[styles.copy, { color: palette.muted }]}>This entry describes a cultural belief or tradition. It does not establish supernatural effects.</Text>}
      {!!catalogError && <View nativeID={`spell-detail-catalog-status-${spell.id}`}><Text accessibilityLiveRegion={`polite`} style={[styles.copy, { color: palette.error }]}>{catalogError}</Text><Pressable nativeID={`spell-detail-retry-${spell.id}`} accessibilityRole={`button`} onPress={() => void reloadCatalog()} style={styles.link}><Icon name={`book`} size={16} color={palette.gold} /><Text style={[styles.linkText, { color: palette.gold }]}>Try Again</Text></Pressable></View>}
      <SpellMedia spell={spell} idPrefix='detail' />
      <Pressable nativeID={`detail-save-${spell.id}`} accessibilityRole="button" accessibilityState={{ selected: saved, disabled: !presentation.canSave }} disabled={!presentation.canSave} onPress={() => void toggleSaved(spell.id)} style={[styles.save, { opacity: presentation.canSave ? 1 : .5, backgroundColor: palette.panel, borderColor: palette.border }]}>
        <Icon name="bookmark" size={19} color={palette.gold} /><Text style={[styles.saveText, { color: palette.gold }]}>{presentation.saveLabel(saved)}</Text>
      </Pressable>
      {(error || saveMessage || !savedReady || presentation.session) && <Text nativeID={`detail-save-feedback-${spell.id}`} accessibilityLiveRegion="polite" style={[styles.copy, { color: error ? palette.error : palette.muted }]}>{error || presentation.description}</Text>}

      <Pressable nativeID={`detail-share-${spell.id}`} accessibilityRole="button" disabled={sharing} onPress={() => void shareSpell()} style={styles.link}><Icon name="external-link" size={17} color={palette.gold} /><Text style={[styles.linkText, { color: palette.gold }]}>{sharing ? `Opening sharing…` : `Share this spell`}</Text></Pressable>
      <Pressable nativeID={`detail-grimoire-${spell.id}`} accessibilityRole={`link`} onPress={() => router.push(`/grimoire?spellId=${encodeURIComponent(spell.id)}`)} style={styles.link}><Icon name={`edit`} size={17} color={palette.gold} /><Text style={[styles.linkText, { color: palette.gold }]}>Notes & Practice Preview</Text></Pressable>

      <View nativeID="spell-spelling-section" style={sectionStyle}>
        <View style={styles.sectionHeading}><Icon name="book" size={20} color={palette.gold} /><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>How to spell it</Text></View>
        <Text style={[styles.fieldLabel, { color: palette.muted }]}>EXACT SPELLING</Text>
        <View nativeID="spell-detail-letter-tiles" accessibilityLabel={Array.from(spell.name).join(`, `)} style={styles.letters}>
          {Array.from(spell.name).map((letter, index) => <Text key={index} nativeID={`detail-letter-${spell.id}-${index}`} style={[styles.letter, { color: palette.lavender, backgroundColor: palette.panel, borderColor: palette.border }]}>{letter === ` ` ? `·` : letter}</Text>)}
        </View>
        {spell.aliases.length > 0 && <Text style={[styles.copy, { color: palette.muted }]}>Also known as: {spell.aliases.join(` · `)}</Text>}
      </View>

      {hasPronunciation && <View nativeID="spell-pronunciation-section" style={sectionStyle}>
        <View style={styles.sectionHeading}><Icon name="wand" size={20} color={palette.gold} /><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>How to say it{spell.pronunciationStatus === `approximate` ? ` · Approximate` : ``}</Text></View>
        <Text style={[styles.phonetic, { color: palette.gold }]}>{spell.pronunciation}</Text>
        <View style={styles.syllables}>{spell.syllables.map((syllable, index) => <View key={index} nativeID={`detail-syllable-${spell.id}-${index}`} style={[styles.syllable, { backgroundColor: palette.panel }]}><Text style={[styles.syllableText, { color: palette.lavender }]}>{syllable}</Text></View>)}</View>
        <Text style={[styles.copy, { color: palette.muted }]}>{spell.pronunciationNote}</Text>
      </View>}

      <View nativeID="spell-origin-section" style={sectionStyle}>
        <View style={styles.sectionHeading}><Icon name="globe" size={20} color={palette.gold} /><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>Roots & word parts</Text></View>
        <Text style={[styles.fieldLabel, { color: palette.gold }]}>{spell.etymologyStatus.toUpperCase()} ETYMOLOGY</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>{spell.etymology}</Text>
        <View style={styles.breakdown}>{spell.breakdown.map((part, index) => <View key={index} nativeID={`word-part-${spell.id}-${index}`} style={styles.breakdownItem}><Text style={[styles.breakdownLabel, { color: palette.lavender }]}>{part.label}</Text><Text style={[styles.copy, { color: palette.muted }]}>{part.meaning}</Text></View>)}</View>
      </View>

      <View nativeID="spell-usage-section" style={sectionStyle}>
        <View style={styles.sectionHeading}><Icon name="spark" size={20} color={palette.gold} /><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>Usage in the story</Text></View>
        {!!spell.effect && <Text nativeID={`spell-detail-effect-${spell.id}`} style={[styles.copy, { color: palette.text }]}>{world?.kind === `folklore` ? `Reported Belief` : `Fictional Effect`}: {spell.effect}</Text>}
        <Text style={[styles.copy, { color: palette.muted }]}>{spell.usage}</Text>
        {spell.counterspell && <Text style={[styles.copy, { color: palette.lavender }]}>Counterspell or reversal: {spell.counterspell}</Text>}
      </View>

      <View nativeID="spell-levels-section" style={sectionStyle}>
        <View style={styles.sectionHeading}><Icon name="shield" size={20} color={palette.gold} /><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>The field guide</Text></View>
        {ratings.map(rating => <View key={rating.name} nativeID={`detail-rating-${spell.id}-${rating.name}`} style={styles.rating}><Text style={[styles.ratingName, { color: palette.text }]}>{rating.name} · {rating.value}/5</Text><View style={styles.ratingBars}>{Array.from({ length: 5 }, (_, index) => <View key={index} style={[styles.ratingBar, { backgroundColor: index < rating.value ? palette.gold : palette.border }]} />)}</View><Text style={[styles.ratingCopy, { color: palette.muted }]}>{rating.note}</Text></View>)}
        <Text style={[styles.ratingName, { color: palette.text }]}>Skill · {spell.skill}</Text>
        <Text style={[styles.ratingCopy, { color: palette.muted }]}>A reading guide based on the story, rather than a canonical numerical ranking.</Text>
      </View>

      <View nativeID="spell-sources-section" style={sectionStyle}>
        <View style={styles.sectionHeading}><Icon name="book" size={20} color={palette.gold} /><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>Source & further reading</Text></View>
        <Text style={[styles.copy, { color: palette.muted }]}>{spell.sourceTitle} · {spell.medium}</Text>
        {spell.sources.map((source, index) => <Pressable key={source.url} nativeID={`spell-source-${spell.id}-${index}`} accessibilityRole="link" onPress={() => void Linking.openURL(source.url).catch(() => Alert.alert(`Couldn’t Open Source`, `Please try again when you’re connected.`))} style={styles.link}><Text style={[styles.linkText, { flex: 1, color: palette.gold }]}>{source.label}</Text><Icon name="external-link" size={16} color={palette.gold} /></Pressable>)}
      </View>

      {related.length > 0 && <View nativeID="related-spells-section" style={styles.related}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>On a nearby page</Text>{related.map(item => <SpellCard key={item.id} spell={item} compact />)}</View>}
    </View>
  );
};

export default SpellDetailPage;
