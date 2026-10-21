import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { usePronunciationPage } from './usePronunciationPage';
import { getSpellPath } from '../../shared/catalog/routes';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, TextInput } from 'react-native';

const PronunciationPage = () => {
  const router = useRouter();
  const { palette } = useTheme();
  const { ready, query, results, selected, catalogError, reloadCatalog, setQuery, setSelectedId } = usePronunciationPage();

  return (
    <View nativeID="pronunciation-page" style={styles.page}>
      <Text style={[styles.eyebrow, { color: palette.gold }]}>LET THE WORDS FIND THEIR VOICE</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>Say it like you mean it.</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>Read the phonetic guide, take it one syllable at a time, and discover the sounds behind a fictional spell.</Text>
      <View nativeID="pronunciation-search" style={[styles.search, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Icon name="search" size={18} color={palette.muted} />
        <TextInput nativeID="pronunciation-search-input" accessibilityLabel="Search pronunciation guides" value={query} onChangeText={value => { setQuery(value); setSelectedId(``); }} placeholder="Find a spell to pronounce…" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text }]} />
        {query !== `` && <Pressable nativeID="pronunciation-clear-search" accessibilityLabel="Clear search" onPress={() => { setQuery(``); setSelectedId(``); }}><Icon name="close" size={17} color={palette.muted} /></Pressable>}
      </View>
      {!!catalogError && <View nativeID={`pronunciation-catalog-error`}><Text accessibilityLiveRegion={`polite`} style={[styles.copy, { color: palette.error }]}>{catalogError}</Text><Pressable nativeID={`pronunciation-catalog-retry`} accessibilityRole={`button`} onPress={() => void reloadCatalog()} style={styles.link}><Icon name={`book`} size={16} color={palette.gold} /><Text style={[styles.linkText, { color: palette.gold }]}>Try Again</Text></Pressable></View>}
      {!ready && !catalogError && <Text style={[styles.copy, { color: palette.muted }]}>Opening the pronunciation guide…</Text>}
      {!ready && !catalogError && <View nativeID="pronunciation-loading-skeleton" style={[styles.record, { minHeight: 280, backgroundColor: palette.surface, borderColor: palette.border }]}>{[70, 55, 90].map((width, index) => <View key={index} nativeID={`pronunciation-skeleton-line-${index}`} style={{ height: index === 0 ? 31 : 15, width: `${width}%`, borderRadius: 6, backgroundColor: palette.panel }} />)}</View>}
      <View nativeID="pronunciation-spell-options" style={styles.choices}>
        {ready && !catalogError && results.map(spell => <Pressable key={spell.id} nativeID={`pronunciation-select-${spell.id}`} accessibilityRole="button" accessibilityState={{ selected: spell.id === selected?.id }} onPress={() => setSelectedId(spell.id)} style={[styles.choice, { borderColor: spell.id === selected?.id ? palette.primary : palette.border, backgroundColor: spell.id === selected?.id ? palette.panel : palette.surface }]}><Icon name="wand" size={14} color={spell.id === selected?.id ? palette.gold : palette.muted} /><Text style={[styles.choiceText, { color: spell.id === selected?.id ? palette.gold : palette.text }]}>{spell.name}</Text></Pressable>)}
      </View>
      {ready && !catalogError && results.length === 0 && <Text nativeID="pronunciation-empty" style={[styles.copy, { color: palette.muted }]}>{query.trim() ? `No available sound guides match this search. Try a name, language or source.` : `No pronunciation guides are available in the published archive yet. Entries without a supported guide remain available in the spell index.`}</Text>}
      {ready && !catalogError && selected && results.length > 0 && (
        <View nativeID={`pronunciation-record-${selected.id}`} style={[styles.record, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.origin, { color: palette.lavender }]}>{selected.sourceTitle} · {selected.language}</Text>
          <Text accessibilityRole="header" style={[styles.name, { color: palette.text }]}>{selected.name}</Text>
          <Text nativeID="pronunciation-selected-guide" style={[styles.phonetic, { color: palette.gold }]}>{selected.pronunciation}{selected.pronunciationStatus === `approximate` ? ` · Approximate` : ``}</Text>
          <Text style={[styles.label, { color: palette.muted }]}>TAKE IT SYLLABLE BY SYLLABLE</Text>
          <View nativeID="pronunciation-syllables" style={styles.syllables}>{selected.syllables.map((syllable, index) => <View key={index} nativeID={`pronunciation-syllable-${selected.id}-${index}`} style={[styles.syllable, { backgroundColor: palette.panel }]}><Text style={[styles.syllableText, { color: palette.lavender }]}>{syllable}</Text></View>)}</View>
          <Text style={[styles.note, { color: palette.muted }]}>{selected.pronunciationNote}</Text>
          <Text style={[styles.note, { color: palette.text }]}>{selected.definition}</Text>
          <Pressable nativeID="pronunciation-open-record" accessibilityRole="link" onPress={() => router.push(getSpellPath(selected))} style={styles.link}><Text style={[styles.linkText, { color: palette.gold }]}>Read the full spell record</Text><Icon name="arrow-right" size={16} color={palette.gold} /></Pressable>
        </View>
      )}
      <View nativeID="pronunciation-reading-notes" style={[styles.tips, { borderColor: palette.border, backgroundColor: palette.panel }]}>
        <Text accessibilityRole="header" style={[styles.tipsTitle, { color: palette.text }]}>A note on reading the magic.</Text>
        {[
          { title: `Stress has a place`, text: `Capitalized syllables in a phonetic guide show the sound to emphasize. Hyphens separate sounds rather than letters.` },
          { title: `Sound is not spelling`, text: `Use the record’s letter tiles for exact spelling. A pronunciation guide uses familiar English sounds to help you read it.` },
          { title: `Stories have variations`, text: `Performances, adaptations, and invented languages can differ. Each spell notes its pronunciation context instead of pretending every reading is definitive.` },
        ].map((tip, index) => <View key={index} nativeID={`pronunciation-tip-${index}`} style={styles.tip}><Text style={[styles.tipTitle, { color: palette.lavender }]}>{tip.title}</Text><Text style={[styles.tipText, { color: palette.muted }]}>{tip.text}</Text></View>)}
      </View>
    </View>
  );
};

export default PronunciationPage;
