import SpellCard from '../SpellCard';
import { useRouter } from 'expo-router';
import PageMetadata from '../PageMetadata';
import { Text, View, Pressable } from 'react-native';
import { useWorldDetailPage } from './useWorldDetailPage';
import { useTheme } from '../../shared/themeContext/useTheme';

const WorldDetailPage = () => {
  const router = useRouter();
  const { palette } = useTheme();
  const { world, ready, entries, catalogError, reloadCatalog } = useWorldDetailPage();
  return <View nativeID='world-detail-page' style={{ gap: 20, padding: 24 }}>
    <Pressable nativeID='world-detail-back' accessibilityRole='link' onPress={() => router.push(`/worlds`)}><Text style={{ color: palette.primary }}>All Universes</Text></Pressable>
    {catalogError ? <><Text accessibilityRole='alert' style={{ color: palette.error }}>{catalogError}</Text><Pressable nativeID='world-detail-retry' accessibilityRole='button' onPress={reloadCatalog}><Text style={{ color: palette.primary }}>Try Again</Text></Pressable></> : !ready && !world ? <><PageMetadata noIndex title={`Opening Universe`} description={`The requested universe is being checked against the published archive.`} /><Text style={{ color: palette.muted }}>Opening this universe…</Text></> : !world ? <Text style={{ color: palette.text }}>This universe has no published entries.</Text> : <>
      <Text style={{ color: palette.muted }}>{world.kind === `folklore` ? `Folklore Tradition` : `Fictional Universe`} · {world.medium}</Text>
      <Text accessibilityRole='header' style={{ fontSize: 34, color: palette.text }}>{world.name}</Text>
      <Text style={{ lineHeight: 24, color: palette.muted }}>{world.description}</Text>
      {world.continuity ? <Text style={{ color: palette.muted }}>{world.continuity}</Text> : null}
      {world.kind === `folklore` ? <Text style={{ color: palette.muted }}>Cultural beliefs and traditions, not proven supernatural effects.</Text> : null}
      {entries.map((spell) => <SpellCard key={spell.id} spell={spell} compact />)}
    </>}
  </View>;
};

export default WorldDetailPage;
