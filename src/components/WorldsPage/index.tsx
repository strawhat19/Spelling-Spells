import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { getWorldPath } from '../../shared/catalog/metadata';

const WorldsPage = () => {
  const router = useRouter();
  const { palette } = useTheme();
  const { worlds, spells, ready, catalogError, reloadCatalog } = useSpells();

  return (
    <View nativeID="worlds-page" style={styles.page}>
      <Text style={[styles.eyebrow, { color: palette.gold }]}>ACROSS PAGES, SCREENS & STORIES</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>Every world has its words.</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>Travel through fictional traditions of magic. Browse spells from books, films, games, and the languages their creators imagined.</Text>
      {!ready && !worlds.length && <Text style={[styles.copy, { color: palette.muted }]}>Opening the atlas…</Text>}
      {catalogError && <><Text nativeID='worlds-error' accessibilityRole='alert' style={{ color: palette.error }}>{catalogError}</Text><Pressable nativeID='worlds-retry' accessibilityRole='button' onPress={reloadCatalog}><Text style={{ color: palette.primary }}>Try Again</Text></Pressable></>}
      {!ready && !worlds.length && <View nativeID="worlds-loading-skeleton" style={[styles.card, { minHeight: 240, backgroundColor: palette.surface, borderColor: palette.border }]}>{[60, 90, 80].map((width, index) => <View key={index} nativeID={`worlds-skeleton-line-${index}`} style={{ height: index === 0 ? 30 : 15, width: `${width}%`, borderRadius: 6, backgroundColor: palette.panel }} />)}</View>}
      <View nativeID="worlds-directory" style={styles.cards}>
        {worlds.map(world => (
          <Pressable key={world.id} nativeID={`world-card-${world.id}`} accessibilityRole="link" onPress={() => router.push(getWorldPath(world))} style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Icon name="globe" size={28} color={palette.gold} />
            <Text style={[styles.medium, { color: palette.lavender }]}>{world.medium.toUpperCase()}</Text>
            <Text style={[styles.medium, { color: palette.muted }]}>{world.kind === `folklore` ? `Folklore Tradition` : `Fictional Universe`}</Text>
            <Text style={[styles.name, { color: palette.text }]}>{world.name}</Text>
            <Text style={[styles.description, { color: palette.muted }]}>{world.description}</Text>
            <View style={styles.footer}><Text style={[styles.footerText, { color: palette.gold }]}>{spells.filter(spell => spell.worldId === world.id).length} spell records</Text><Icon name="arrow-right" size={17} color={palette.gold} /></View>
          </Pressable>
        ))}
      </View>
      {ready && !catalogError && worlds.length === 0 && <Text style={[styles.copy, { color: palette.muted }]}>No universes have published entries yet.</Text>}
    </View>
  );
};

export default WorldsPage;
