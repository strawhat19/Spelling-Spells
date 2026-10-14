import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import type { Spell } from '../../shared/models/Spell';
import { getSpellPath } from '../../shared/catalog/routes';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useSpells } from '../../shared/spellsContext/useSpells';

type Props = { spell: Spell; compact?: boolean; featured?: boolean };

const SpellCard = ({ spell, compact = false, featured = false }: Props) => {
  const router = useRouter();
  const { palette } = useTheme();
  const { isSaved, toggleSaved, worlds, ready } = useSpells();
  const saved = isSaved(spell.id);
  const world = worlds.find(item => item.id === spell.worldId);

  return (
    <View
      nativeID={`spell-card-${spell.id}`}
      style={[styles.card, featured && styles.featured, compact && styles.compact, { borderColor: palette.border, backgroundColor: palette.surface }]}
    >
      <View style={styles.top}>
        <Text style={[styles.origin, { color: palette.lavender }]}>{world?.name ?? spell.sourceTitle} · {spell.medium}</Text>
        <Pressable
          nativeID={`save-spell-${spell.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${saved ? `Unsave` : `Save`} ${spell.name}`}
          accessibilityState={{ selected: saved, disabled: !ready }}
          disabled={!ready}
          onPress={() => void toggleSaved(spell.id)}
          style={[styles.save, { backgroundColor: palette.panel }]}
        >
          <Icon name="bookmark" size={18} color={saved ? palette.gold : palette.muted} />
        </Pressable>
      </View>
      <Text nativeID={`spell-name-${spell.id}`} style={[styles.title, featured && styles.titleFeatured, { color: palette.text }]}>{spell.name}</Text>
      <Text nativeID={`spell-pronunciation-${spell.id}`} style={[styles.pronunciation, { color: palette.muted }]}>{spell.pronunciation}</Text>
      <Text style={[styles.definition, { color: palette.text }]} numberOfLines={compact ? 3 : undefined}>{spell.definition}</Text>
      {!compact && (
        <View nativeID={`spell-spelling-${spell.id}`} accessibilityLabel={`Spelling: ${spell.name.split(``).join(`, `)}`} style={styles.letters}>
          {Array.from(spell.name).map((letter, index) => (
            <Text key={index} nativeID={`spell-letter-${spell.id}-${index}`} style={[styles.letter, { color: palette.lavender, backgroundColor: palette.panel, borderColor: palette.border }]}>{letter === ` ` ? `·` : letter}</Text>
          ))}
        </View>
      )}
      <View nativeID={`spell-ratings-${spell.id}`} style={[styles.ratings, { borderTopColor: palette.border }]}>
        {[
          { name: `Danger`, value: `${spell.danger}/5` },
          { name: `Utility`, value: `${spell.utility}/5` },
          { name: `Skill`, value: spell.skill },
        ].map(rating => (
          <View key={rating.name} nativeID={`rating-${spell.id}-${rating.name}`} style={styles.rating}>
            <Text style={[styles.ratingLabel, { color: palette.muted }]}>{rating.name}</Text>
            <Text style={[styles.ratingValue, { color: palette.gold }]}>{rating.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.category, { color: palette.muted }]}>{spell.category} · {spell.language}</Text>
        <Pressable nativeID={`open-spell-${spell.id}`} accessibilityRole="link" onPress={() => router.push(getSpellPath(spell))} style={styles.open}>
          <Text style={[styles.openText, { color: palette.gold }]}>Open spell</Text>
          <Icon name="arrow-right" size={15} color={palette.gold} />
        </Pressable>
      </View>
    </View>
  );
};

export default SpellCard;
export { SpellCard };
