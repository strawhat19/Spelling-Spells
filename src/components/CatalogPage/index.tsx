import Icon from '../Icon';
import SpellCard from '../SpellCard';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { useCatalogPage } from './useCatalogPage';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, TextInput } from 'react-native';

const CatalogPage = ({ savedOnly = false }: { savedOnly?: boolean }) => {
  const router = useRouter();
  const { palette } = useTheme();
  const {
    sort, ready, error, catalogError, reloadCatalog, worlds, query, skill, world, category, results, categories,
    filtered, savedCount, shelfWorlds, unavailableCount, setSort,
    savedFilter, savedIds, setQuery, setSkill, setWorld, setCategory,
    saveScope, saveStatus, savedReady, saveMessage, refreshSaved, deviceSavedCount,
    presentation, clearing, importing, actionBusy, closeClear, confirmClear,
    requestClear, removeAll, importBookmarks, savedResolved, resultsVisible,
    resultsResolved, clearFilters, setSavedFilter,
  } = useCatalogPage(savedOnly);
  const savedView = savedOnly || savedFilter;
  const opening = (!ready && !resultsVisible) || (savedView && !resultsVisible && !error && saveStatus !== `error` && saveStatus !== `cached` && saveStatus !== `pending`);

  const groups = [
    { id: `world`, label: `World`, value: world, change: setWorld, options: (savedOnly ? shelfWorlds : worlds).map(item => ({ id: item.id, name: item.name })) },
    { id: `skill`, label: `Skill level`, value: skill, change: setSkill, options: [`Beginner`, `Intermediate`, `Advanced`].map(name => ({ id: name, name })) },
    { id: `category`, label: `Category`, value: category, change: setCategory, options: categories.map(name => ({ id: name, name })) },
  ];

  return (
    <View nativeID={savedOnly ? `saved-page` : `catalog-page`} style={styles.page}>
      <Text style={[styles.eyebrow, { color: palette.gold }]}>{savedOnly ? `A SHELF OF YOUR OWN` : `THE SPELL ARCHIVE`}</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{savedOnly ? `Your personal spellbook.` : `Find your next magic word.`}</Text>
      <Text style={[styles.description, { color: palette.muted }]}>{savedOnly ? `The words you want to keep close. Revisit a favorite, or make room for your next discovery.` : `Browse fictional spells by world, language, purpose, and skill. Every record begins with its exact spelling.`}</Text>
      {savedOnly && <Pressable nativeID={`saved-grimoire-preview`} accessibilityRole={`link`} onPress={() => router.push(`/grimoire`)} style={styles.action}><Icon name={`edit`} size={16} color={palette.gold} /><Text style={[styles.actionText, { color: palette.gold }]}>Starter Tools Preview</Text></Pressable>}
      {savedOnly && <View nativeID="saved-shelf-overview" style={[styles.shelf, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View nativeID="saved-shelf-stats" style={styles.shelfStats}>
          <View style={styles.shelfStat}><Icon name="bookmark" size={20} color={palette.gold} /><Text style={[styles.statValue, { color: palette.text }]}>{savedResolved || savedCount > 0 ? savedCount : `…`}</Text><Text style={[styles.statLabel, { color: palette.muted }]}>{savedResolved ? `Saved bookmarks` : `Unconfirmed bookmarks`}</Text></View>
          <View style={styles.shelfStat}><Icon name="world" size={20} color={palette.gold} /><Text style={[styles.statValue, { color: palette.text }]}>{savedResolved || shelfWorlds.length > 0 ? shelfWorlds.length : `…`}</Text><Text style={[styles.statLabel, { color: palette.muted }]}>{savedResolved ? `Story worlds` : `Worlds shown`}</Text></View>
        </View>
        <View style={[styles.storageNote, { borderTopColor: palette.border }]}><Text style={[styles.storageBadge, { color: palette.gold }]}>{presentation.badge.toUpperCase()}</Text><Text accessibilityLiveRegion="polite" style={[styles.storageCopy, { color: palette.muted }]}>{presentation.description}</Text></View>
      </View>}
      {savedOnly && saveScope === `account` && deviceSavedCount > 0 && <View nativeID="saved-device-import" style={[styles.shelf, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text accessibilityRole="header" style={[styles.panelTitle, { color: palette.text }]}>Bring your device bookmarks along.</Text>
        <Text style={[styles.storageCopy, { color: palette.muted }]}>{deviceSavedCount} local {deviceSavedCount === 1 ? `bookmark is` : `bookmarks are`} separate from this account. Import copies supported spell bookmarks into this account without replacing its collection. Original device bookmarks are preserved.</Text>
        <Pressable nativeID="saved-device-import-button" accessibilityRole="button" disabled={!savedReady || actionBusy || confirmClear} accessibilityState={{ disabled: !savedReady || actionBusy || confirmClear }} onPress={() => void importBookmarks()} style={[styles.action, (!savedReady || actionBusy || confirmClear) && styles.disabled]}><Icon name="bookmark" size={16} color={palette.gold} /><Text style={[styles.actionText, { color: palette.gold }]}>{importing ? `Importing…` : `Import device bookmarks`}</Text></Pressable>
      </View>}
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
      <View nativeID="catalog-sort-options" style={styles.filterGroup}>
        <Text style={[styles.filterName, { color: palette.muted }]}>Sort your {savedOnly ? `shelf` : `results`}</Text>
        <View style={styles.choices}>{[{ id: savedOnly ? `recent` as const : `catalog` as const, name: savedOnly ? `Recently saved` : `Archive order` }, { id: `name` as const, name: `Name, A–Z` }, { id: `world` as const, name: `Story world` }].map(option => <Pressable key={option.id} nativeID={`catalog-sort-${option.id}`} accessibilityRole="button" accessibilityState={{ selected: sort === option.id }} onPress={() => setSort(option.id)} style={[styles.choice, { borderColor: sort === option.id ? palette.primary : palette.border, backgroundColor: sort === option.id ? palette.panel : palette.surface }]}><Text style={[styles.choiceText, { color: sort === option.id ? palette.gold : palette.muted }]}>{option.name}</Text></Pressable>)}</View>
      </View>
      <View nativeID="catalog-toolbar" style={styles.toolbar}>
        <Text accessibilityLiveRegion="polite" style={[styles.toolbarText, { color: palette.muted }]}>{catalogError ? `Catalog unavailable` : resultsResolved ? `${results.length} spell${results.length === 1 ? `` : `s`}` : resultsVisible ? `${results.length} spells shown · account view not confirmed` : savedView ? `Your saved collection is not confirmed yet` : `Opening the archive…`}</Text>
        {!savedOnly && (
          <Pressable nativeID="catalog-saved-filter" accessibilityRole="button" accessibilityState={{ selected: savedFilter }} onPress={() => setSavedFilter(!savedFilter)} style={styles.action}>
            <Icon name="bookmark" size={16} color={savedFilter ? palette.gold : palette.muted} /><Text style={[styles.actionText, { color: savedFilter ? palette.gold : palette.text }]}>Saved only</Text>
          </Pressable>
        )}
        {filtered && <Pressable nativeID="catalog-clear-filters" onPress={clearFilters} style={styles.action} accessibilityRole="button"><Icon name="close" size={15} color={palette.muted} /><Text style={[styles.actionText, { color: palette.muted }]}>Reset filters</Text></Pressable>}
      </View>
      {catalogError && <Pressable nativeID="catalog-error-retry" accessibilityRole="button" onPress={reloadCatalog}><Text style={{ color: palette.primary }}>Try Catalog Again</Text></Pressable>}
      {error && <Text nativeID="catalog-storage-warning" accessibilityRole="alert" style={[styles.storageCopy, { color: palette.error }]}>{error}</Text>}
      {!savedOnly && (saveMessage || !savedReady) && <Text nativeID="catalog-save-status" accessibilityLiveRegion="polite" style={[styles.storageCopy, { color: palette.muted }]}>{presentation.description}</Text>}
      {saveScope === `account` && (!savedReady || saveStatus === `server`) && !actionBusy && <Pressable nativeID="catalog-retry-saved" accessibilityRole="button" onPress={refreshSaved} style={styles.action}><Icon name="bookmark" size={16} color={palette.gold} /><Text style={[styles.actionText, { color: palette.gold }]}>Reconnect saved collection</Text></Pressable>}
      {savedOnly && ready && unavailableCount > 0 && <Text nativeID="saved-unavailable-records" style={[styles.storageCopy, { color: palette.muted }]}>{unavailableCount} {savedResolved ? `saved` : `unconfirmed`} {unavailableCount === 1 ? `entry is` : `entries are`} not in this catalog. Their bookmarks are preserved until you clear the shelf.</Text>}
      {!catalogError && !opening && !resultsVisible && <View nativeID="saved-unconfirmed-state" style={[styles.empty, { borderColor: palette.border, backgroundColor: palette.surface }]}><Icon name="shield" size={29} color={palette.gold} /><Text style={[styles.emptyTitle, { color: palette.text }]}>Your shelf isn’t confirmed yet.</Text><Text style={[styles.emptyCopy, { color: palette.muted }]}>{presentation.description} This is not an empty-collection result.</Text><Pressable nativeID="saved-unconfirmed-browse" accessibilityRole="link" onPress={() => router.push(`/spells`)} style={styles.action}><Icon name="book" size={16} color={palette.gold} /><Text style={[styles.actionText, { color: palette.gold }]}>Browse the public spellbook</Text></Pressable></View>}
      {resultsVisible && results.length === 0 && (
        <View nativeID="catalog-empty" style={[styles.empty, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Icon name={savedOnly && savedIds.length === 0 ? `bookmark` : `search`} size={29} color={palette.gold} />
          <Text style={[styles.emptyTitle, { color: palette.text }]}>{!resultsResolved ? `No matches in this unconfirmed view.` : savedOnly && savedIds.length === 0 ? `A blank page, for now.` : `No spells on this page.`}</Text>
          <Text style={[styles.emptyCopy, { color: palette.muted }]}>{!resultsResolved ? `Your current account collection is not confirmed. Reconnect before treating this view as complete.` : savedOnly && savedIds.length === 0 ? `Tap the bookmark on any spell to save it to ${presentation.destination}.` : `Try a broader search or reset your filters.`}</Text>
          <Pressable nativeID="catalog-empty-action" accessibilityRole="button" onPress={savedOnly && savedIds.length === 0 ? () => router.push(`/spells`) : clearFilters} style={styles.action}><Text style={[styles.actionText, { color: palette.gold }]}>{savedOnly && savedIds.length === 0 ? `Browse the library` : `Reset filters`}</Text><Icon name="arrow-right" size={16} color={palette.gold} /></Pressable>
        </View>
      )}
      <View nativeID="catalog-results" style={styles.cards}>{resultsVisible ? results.map(spell => <SpellCard key={spell.id} spell={spell} compact />) : opening ? [0, 1].map(index => <View key={index} nativeID={`catalog-skeleton-${index}`} accessibilityLabel="Loading spell" style={[styles.empty, { minHeight: 210, backgroundColor: palette.surface, borderColor: palette.border }]}><View style={{ height: 26, width: `70%`, borderRadius: 6, backgroundColor: palette.panel }} /><View style={{ height: 14, width: `90%`, borderRadius: 6, backgroundColor: palette.panel }} /><View style={{ height: 14, width: `80%`, borderRadius: 6, backgroundColor: palette.panel }} /></View>) : null}</View>
      {savedOnly && savedCount > 0 && <Pressable nativeID="saved-shelf-browse" accessibilityRole="link" onPress={() => router.push(`/spells`)} style={styles.action}><Icon name="spark" size={17} color={palette.gold} /><Text style={[styles.actionText, { color: palette.gold }]}>Find your next spell</Text><Icon name="arrow-right" size={16} color={palette.gold} /></Pressable>}
      {savedOnly && savedIds.length > 0 && (
        <Pressable nativeID="clear-saved-spells" accessibilityRole="button" disabled={!savedReady || actionBusy} accessibilityState={{ disabled: !savedReady || actionBusy, expanded: confirmClear }} style={[styles.action, (!savedReady || actionBusy) && styles.disabled]} onPress={requestClear}>
          <Icon name="close" size={16} color={palette.error} /><Text style={[styles.actionText, { color: palette.error }]}>Clear saved spells</Text>
        </Pressable>
      )}
      {confirmClear && <View nativeID="saved-clear-confirmation" style={[styles.shelf, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text nativeID="saved-clear-heading" accessibilityRole="header" style={[styles.panelTitle, { color: palette.text }]}>Clear {saveScope === `account` ? `your account` : presentation.session ? `this session’s` : `this device’s`} shelf?</Text>
        <Text style={[styles.storageCopy, { color: palette.muted }]}>This removes every bookmark from {presentation.destination}, including all {savedCount} currently shown, not just filtered results. {saveScope === `account` ? `Separate device bookmarks are kept. ` : ``}The public spell archive and reading history are not deleted.</Text>
        <View style={styles.choices}><Pressable nativeID="saved-clear-cancel" accessibilityRole="button" disabled={actionBusy} accessibilityState={{ disabled: actionBusy }} onPress={closeClear} style={[styles.action, actionBusy && styles.disabled]}><Icon name="bookmark" size={16} color={palette.gold} /><Text style={[styles.actionText, { color: palette.gold }]}>Keep my spells</Text></Pressable><Pressable nativeID="saved-clear-confirm" accessibilityRole="button" disabled={!savedReady || actionBusy} accessibilityState={{ disabled: !savedReady || actionBusy }} onPress={() => void removeAll()} style={[styles.action, (!savedReady || actionBusy) && styles.disabled]}><Icon name="close" size={16} color={palette.error} /><Text style={[styles.actionText, { color: palette.error }]}>{clearing ? `Clearing…` : `Clear all bookmarks`}</Text></Pressable></View>
      </View>}
      {savedOnly && <Text nativeID="saved-device-note" style={[styles.storageCopy, { color: palette.muted }]}>{saveScope === `account` ? `This account shelf is private. Device bookmarks and local reading history stay separate.` : `Use a spell’s bookmark to remove it. Clearing app data can remove local bookmarks.`}</Text>}
    </View>
  );
};

export default CatalogPage;
