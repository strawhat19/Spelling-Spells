import Icon from '../Icon';
import SpellCard from '../SpellCard';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { useCatalogPage } from './useCatalogPage';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Alert, Pressable, TextInput } from 'react-native';

const CatalogPage = ({ savedOnly = false }: { savedOnly?: boolean }) => {
  const router = useRouter();
  const { palette } = useTheme();
  const {
    ready, worlds, query, skill, world, category, results, categories,
    savedFilter, savedIds, setQuery, setSkill, setWorld, setCategory,
    clearFilters, setSavedFilter, clearSaved,
  } = useCatalogPage(savedOnly);

  const groups = [
    { id: `world`, label: `World`, value: world, change: setWorld, options: worlds.map(item => ({ id: item.id, name: item.name })) },
    { id: `skill`, label: `Skill level`, value: skill, change: setSkill, options: [`Beginner`, `Intermediate`, `Advanced`].map(name => ({ id: name, name })) },
    { id: `category`, label: `Category`, value: category, change: setCategory, options: categories.map(name => ({ id: name, name })) },
  ];

  return (
    <View nativeID={savedOnly ? `saved-page` : `catalog-page`} style={styles.page}>
      <Text style={[styles.eyebrow, { color: palette.gold }]}>{savedOnly ? `YOUR PERSONAL GRIMOIRE` : `THE SPELL ARCHIVE`}</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{savedOnly ? `A little magic, saved.` : `Find your next magic word.`}</Text>
      <Text style={[styles.description, { color: palette.muted }]}>{savedOnly ? `Your bookmarked spells live on this device. Revisit a favorite, or make room for something new.` : `Browse fictional spells by world, language, purpose, and skill. Every record begins with its exact spelling.`}</Text>
      <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Icon name="search" size={18} color={palette.muted} />
        <TextInput nativeID="catalog-search" accessibilityLabel="Search spells" value={query} onChangeText={setQuery} placeholder="Spell, source, language…" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text }]} />
        {query !== `` && <Pressable nativeID="clear-catalog-search" accessibilityLabel="Clear search" onPress={() => setQuery(``)}><Icon name="close" size={17} color={palette.muted} /></Pressable>}
      </View>
      <View nativeID="catalog-filter-groups" style={styles.filters}>
        {groups.map(group => (
          <View key={group.id} nativeID={`filter-group-${group.id}`} style={styles.filterGroup}>
            <Text style={[styles.filterName, { color: palette.muted }]}>{group.label}</Text>
            <View style={styles.choices}>
              {[{ id: ``, name: `All` }, ...group.options].map(option => (
                <Pressable key={option.id} nativeID={`filter-${group.id}-${option.id || `all`}`} accessibilityRole="button" accessibilityState={{ selected: group.value === option.id }} onPress={() => group.change(option.id)} style={[styles.choice, { borderColor: group.value === option.id ? palette.primary : palette.border, backgroundColor: group.value === option.id ? palette.panel : palette.surface }]}>
                  <Text style={[styles.choiceText, { color: group.value === option.id ? palette.gold : palette.muted }]}>{option.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
      <View nativeID="catalog-toolbar" style={styles.toolbar}>
        <Text style={[styles.toolbarText, { color: palette.muted }]}>{ready ? `${results.length} spell${results.length === 1 ? `` : `s`}` : `Opening the archive…`}</Text>
        {!savedOnly && (
          <Pressable nativeID="catalog-saved-filter" accessibilityRole="button" accessibilityState={{ selected: savedFilter }} onPress={() => setSavedFilter(!savedFilter)} style={styles.action}>
            <Icon name="bookmark" size={16} color={savedFilter ? palette.gold : palette.muted} /><Text style={[styles.actionText, { color: savedFilter ? palette.gold : palette.text }]}>Saved only</Text>
          </Pressable>
        )}
        <Pressable nativeID="catalog-clear-filters" onPress={clearFilters} style={styles.action} accessibilityRole="button"><Icon name="close" size={15} color={palette.muted} /><Text style={[styles.actionText, { color: palette.muted }]}>Reset filters</Text></Pressable>
      </View>
      {ready && results.length === 0 && (
        <View nativeID="catalog-empty" style={[styles.empty, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Icon name={savedOnly && savedIds.length === 0 ? `bookmark` : `search`} size={29} color={palette.gold} />
          <Text style={[styles.emptyTitle, { color: palette.text }]}>{savedOnly && savedIds.length === 0 ? `Your grimoire awaits.` : `No spells on this page.`}</Text>
          <Text style={[styles.emptyCopy, { color: palette.muted }]}>{savedOnly && savedIds.length === 0 ? `Tap the bookmark on any spell to keep it here.` : `Try a broader search or reset your filters.`}</Text>
          <Pressable nativeID="catalog-empty-action" accessibilityRole="button" onPress={savedOnly && savedIds.length === 0 ? () => router.push(`/spells`) : clearFilters} style={styles.action}><Text style={[styles.actionText, { color: palette.gold }]}>{savedOnly && savedIds.length === 0 ? `Browse the library` : `Reset filters`}</Text><Icon name="arrow-right" size={16} color={palette.gold} /></Pressable>
        </View>
      )}
      <View nativeID="catalog-results" style={styles.cards}>{ready ? results.map(spell => <SpellCard key={spell.id} spell={spell} compact />) : [0, 1].map(index => <View key={index} nativeID={`catalog-skeleton-${index}`} accessibilityLabel="Loading spell" style={[styles.empty, { minHeight: 210, backgroundColor: palette.surface, borderColor: palette.border }]}><View style={{ height: 26, width: `70%`, borderRadius: 6, backgroundColor: palette.panel }} /><View style={{ height: 14, width: `90%`, borderRadius: 6, backgroundColor: palette.panel }} /><View style={{ height: 14, width: `80%`, borderRadius: 6, backgroundColor: palette.panel }} /></View>)}</View>
      {savedOnly && savedIds.length > 0 && (
        <Pressable nativeID="clear-saved-spells" accessibilityRole="button" style={styles.action} onPress={() => Alert.alert(`Clear Saved Spells?`, `This removes ${savedIds.length} bookmark${savedIds.length === 1 ? `` : `s`} from this device. The spell library stays available.`, [{ text: `Cancel`, style: `cancel` }, { text: `Clear Saved`, style: `destructive`, onPress: () => void clearSaved() }])}>
          <Icon name="close" size={16} color={palette.error} /><Text style={[styles.actionText, { color: palette.error }]}>Clear saved spells</Text>
        </Pressable>
      )}
    </View>
  );
};

export default CatalogPage;
