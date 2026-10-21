import Icon from '../Icon';
import SpellMedia from '../SpellMedia';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import styles, { parchment } from './styles.native';
import type { Spell } from '../../shared/models/Spell';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { getSpellPath } from '../../shared/catalog/routes';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { getSavedCollectionPresentation } from '../CatalogPage/savedCollectionPresentation';

type Props = { spell: Spell; compact?: boolean; featured?: boolean; idPrefix?: string };

const SpellCard = ({ spell, idPrefix, compact = false, featured = false }: Props) => {
  const router = useRouter();
  const collection = useSpells();
  const { worlds, isSaved, toggleSaved } = collection;
  const presentation = getSavedCollectionPresentation(collection);
  const saved = isSaved(spell.id);
  const world = worlds.find(item => item.id === spell.worldId);
  const elementId = idPrefix ? `${idPrefix}-${spell.id}` : spell.id;
  const hasPronunciation = Boolean(spell.pronunciation?.trim()) && spell.pronunciationStatus !== `unavailable`;
  const entryType = spell.entryType === `ability` ? `Power / Ability` : spell.entryType === `incantation` ? `Incantation` : spell.entryType === `spell` ? `Spell` : spell.kind;

  return (
    <View
      nativeID={`spell-card-${elementId}`}
      style={[styles.card, featured && styles.featured, compact && styles.compact]}
    >
      <View
        pointerEvents='none'
        accessibilityElementsHidden
        style={StyleSheet.absoluteFill}
        nativeID={`spell-parchment-${elementId}`}
        importantForAccessibility='no-hide-descendants'
      >
        <View nativeID={`spell-parchment-paper-${elementId}`} style={styles.paper} />
        {[styles.paperTop, styles.paperBottom].map((edge, index) => (
          <Svg
            key={index}
            height={8}
            width='100%'
            viewBox='0 0 300 8'
            preserveAspectRatio='none'
            style={[styles.paperEdge, edge]}
          >
            <Path
              fill={parchment.paper}
              d='M0 5 15 2 30 5 51 1 69 4 93 0 114 3 138 1 159 5 183 2 207 4 234 0 258 4 279 1 300 5V8H0Z'
            />
          </Svg>
        ))}
        <View nativeID={`spell-parchment-frame-${elementId}`} style={styles.frame} />
      </View>
      <View style={styles.top}>
        <Text style={styles.origin}>{world?.name ?? spell.sourceTitle} · {spell.medium}</Text>
        <Pressable
          nativeID={`save-spell-${elementId}`}
          accessibilityRole="button"
          accessibilityLabel={presentation.requiresSignIn ? `Sign In To Save ${spell.name}` : presentation.canSave ? `${saved ? `Remove` : `Save`} ${spell.name} ${saved ? `from` : `to`} ${presentation.destination}` : `${presentation.blockedLabel}: ${spell.name}`}
          accessibilityState={{ selected: saved, disabled: !presentation.canSave }}
          disabled={!presentation.canSave}
          onPress={() => void toggleSaved(spell.id)}
          style={[styles.save, saved && styles.saveActive, !presentation.canSave && styles.saveDisabled]}
        >
          <Icon name="bookmark" size={18} color={saved ? `#FFF9EA` : parchment.accent} />
        </Pressable>
      </View>
      <Text nativeID={`spell-name-${elementId}`} style={[styles.title, featured && styles.titleFeatured]}>{spell.name}</Text>
      {hasPronunciation && <Text nativeID={`spell-pronunciation-${elementId}`} style={styles.pronunciation}>{spell.pronunciation}{spell.pronunciationStatus === `approximate` ? ` · Approximate` : ``}</Text>}
      <Text nativeID={`spell-entry-type-${elementId}`} style={styles.origin}>{entryType} · {world?.kind === `folklore` ? `Folklore Tradition` : `Fictional Setting`}</Text>
      {!!spell.casters?.length && <Text nativeID={`spell-casters-${elementId}`} style={styles.origin}>{spell.casters.join(`, `)}</Text>}
      {!!spell.continuity && <Text nativeID={`spell-continuity-${elementId}`} style={styles.origin}>{spell.continuity}</Text>}
      <Text nativeID={`spell-effect-${elementId}`} style={styles.definition} numberOfLines={compact ? 3 : undefined}>{spell.effect || spell.definition}</Text>
      <SpellMedia spell={spell} compact idPrefix={idPrefix} />
      {!compact && (
        <View nativeID={`spell-spelling-${elementId}`} accessibilityLabel={`Spelling: ${spell.name.split(``).join(`, `)}`} style={styles.letters}>
          {Array.from(spell.name).map((letter, index) => (
            <Text key={index} nativeID={`spell-letter-${elementId}-${index}`} style={styles.letter}>{letter === ` ` ? `·` : letter}</Text>
          ))}
        </View>
      )}
      <View nativeID={`spell-ratings-${elementId}`} style={styles.ratings}>
        {[
          { name: `Danger`, value: `${spell.danger}/5` },
          { name: `Utility`, value: `${spell.utility}/5` },
          { name: `Skill`, value: spell.skill },
        ].map(rating => (
          <View key={rating.name} nativeID={`rating-${elementId}-${rating.name}`} style={styles.rating}>
            <Text style={styles.ratingLabel}>{rating.name}</Text>
            <Text style={styles.ratingValue}>{rating.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.category}>{spell.category} · {spell.language}</Text>
        <Pressable nativeID={`open-spell-${elementId}`} accessibilityRole="link" onPress={() => router.push(getSpellPath(spell))} style={styles.open}>
          <Text style={styles.openText}>Open spell</Text>
          <Icon name="arrow-right" size={15} color={parchment.accent} />
        </Pressable>
      </View>
    </View>
  );
};

export default SpellCard;
export { SpellCard };
