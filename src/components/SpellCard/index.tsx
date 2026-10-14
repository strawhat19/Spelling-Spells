import Icon from '../Icon';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import styles, { parchment } from './styles.native';
import type { Spell } from '../../shared/models/Spell';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { getSpellPath } from '../../shared/catalog/routes';
import { useSpells } from '../../shared/spellsContext/useSpells';

type Props = { spell: Spell; compact?: boolean; featured?: boolean };

const SpellCard = ({ spell, compact = false, featured = false }: Props) => {
  const router = useRouter();
  const { isSaved, toggleSaved, worlds, ready } = useSpells();
  const saved = isSaved(spell.id);
  const world = worlds.find(item => item.id === spell.worldId);

  return (
    <View
      nativeID={`spell-card-${spell.id}`}
      style={[styles.card, featured && styles.featured, compact && styles.compact]}
    >
      <View
        pointerEvents='none'
        accessibilityElementsHidden
        style={StyleSheet.absoluteFill}
        nativeID={`spell-parchment-${spell.id}`}
        importantForAccessibility='no-hide-descendants'
      >
        <View nativeID={`spell-parchment-paper-${spell.id}`} style={styles.paper} />
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
        <View nativeID={`spell-parchment-frame-${spell.id}`} style={styles.frame} />
      </View>
      <View style={styles.top}>
        <Text style={styles.origin}>{world?.name ?? spell.sourceTitle} · {spell.medium}</Text>
        <Pressable
          nativeID={`save-spell-${spell.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${saved ? `Unsave` : `Save`} ${spell.name}`}
          accessibilityState={{ selected: saved, disabled: !ready }}
          disabled={!ready}
          onPress={() => void toggleSaved(spell.id)}
          style={[styles.save, saved && styles.saveActive, !ready && styles.saveDisabled]}
        >
          <Icon name="bookmark" size={18} color={saved ? `#FFF9EA` : parchment.accent} />
        </Pressable>
      </View>
      <Text nativeID={`spell-name-${spell.id}`} style={[styles.title, featured && styles.titleFeatured]}>{spell.name}</Text>
      <Text nativeID={`spell-pronunciation-${spell.id}`} style={styles.pronunciation}>{spell.pronunciation}</Text>
      <Text style={styles.definition} numberOfLines={compact ? 3 : undefined}>{spell.definition}</Text>
      {!compact && (
        <View nativeID={`spell-spelling-${spell.id}`} accessibilityLabel={`Spelling: ${spell.name.split(``).join(`, `)}`} style={styles.letters}>
          {Array.from(spell.name).map((letter, index) => (
            <Text key={index} nativeID={`spell-letter-${spell.id}-${index}`} style={styles.letter}>{letter === ` ` ? `·` : letter}</Text>
          ))}
        </View>
      )}
      <View nativeID={`spell-ratings-${spell.id}`} style={styles.ratings}>
        {[
          { name: `Danger`, value: `${spell.danger}/5` },
          { name: `Utility`, value: `${spell.utility}/5` },
          { name: `Skill`, value: spell.skill },
        ].map(rating => (
          <View key={rating.name} nativeID={`rating-${spell.id}-${rating.name}`} style={styles.rating}>
            <Text style={styles.ratingLabel}>{rating.name}</Text>
            <Text style={styles.ratingValue}>{rating.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.category}>{spell.category} · {spell.language}</Text>
        <Pressable nativeID={`open-spell-${spell.id}`} accessibilityRole="link" onPress={() => router.push(getSpellPath(spell))} style={styles.open}>
          <Text style={styles.openText}>Open spell</Text>
          <Icon name="arrow-right" size={15} color={parchment.accent} />
        </Pressable>
      </View>
    </View>
  );
};

export default SpellCard;
export { SpellCard };
