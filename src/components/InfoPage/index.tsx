import Icon from '../Icon';
import PageMetadata from '../PageMetadata';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Alert, Linking, Pressable } from 'react-native';
import { informationPages, privacyResources, type InfoKind } from './content';

const InfoPage = ({ kind }: { kind: InfoKind }) => {
  const router = useRouter();
  const { palette } = useTheme();
  const content = informationPages[kind];

  return (
    <View nativeID={`information-page-${kind}`} style={styles.page}>
      <PageMetadata title={content.kicker} description={content.intro} noIndex={kind === `not-found`} canonicalPath={kind === `not-found` ? undefined : `/${kind}`} />
      <Text style={[styles.eyebrow, { color: palette.gold }]}>SPELLING SPELLS</Text>
      <Text nativeID={`information-title-${kind}`} accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{content.title}</Text>
      <Text style={[styles.intro, { color: palette.muted }]}>{content.intro}</Text>
      {content.sections.map((section, index) => <View key={index} nativeID={`information-section-${kind}-${index}`} style={[styles.section, { borderColor: palette.border, backgroundColor: palette.surface }]}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text><Text style={[styles.copy, { color: palette.muted }]}>{section.body}</Text></View>)}
      {kind === `privacy` ? <View nativeID={`info-privacy-google-resources`} style={[styles.section, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text nativeID={`info-privacy-google-resources-title`} accessibilityRole={`header`} style={[styles.sectionTitle, { color: palette.text }]}>Google Privacy Resources</Text>
        <Text nativeID={`info-privacy-google-resources-copy`} style={[styles.copy, { color: palette.muted }]}>Advertising is off here. These external Google pages explain data use and advertising preferences that may apply if ads are introduced.</Text>
        {privacyResources.map((resource) => <Pressable key={resource.id} nativeID={`info-privacy-resource-${resource.id}`} accessibilityRole={`link`} accessibilityLabel={resource.label} accessibilityHint={`Opens An External Google Website`} onPress={() => void Linking.openURL(resource.url).catch(() => Alert.alert(`Couldn’t Open Website`, `Please try this Google link again when you’re connected.`))} style={styles.action}><Text style={[styles.actionText, { flexShrink: 1, color: palette.gold }]}>{resource.label}</Text><Icon name={`external-link`} size={17} color={palette.gold} /></Pressable>)}
      </View> : null}
      {kind === `contact` ? (
        <Pressable nativeID="contact-piratechs-link" accessibilityRole="link" onPress={() => void Linking.openURL(`https://piratechs.com/`).catch(() => Alert.alert(`Couldn’t Open Website`, `Please visit piratechs.com when you’re connected.`))} style={styles.action}><Text style={[styles.actionText, { color: palette.gold }]}>Visit Piratechs</Text><Icon name="external-link" size={17} color={palette.gold} /></Pressable>
      ) : (
        <Pressable nativeID={`information-browse-${kind}`} accessibilityRole="link" onPress={() => router.push(`/spells`)} style={styles.action}><Text style={[styles.actionText, { color: palette.gold }]}>Explore the spell library</Text><Icon name="arrow-right" size={17} color={palette.gold} /></Pressable>
      )}
      {([`help`, `guidelines`, `data-privacy`, `privacy`, `contact`] as const).filter((route) => route !== kind).map((route) => <Pressable key={route} nativeID={`info-${kind}-link-${route}`} accessibilityRole='link' onPress={() => router.push(`/${route}`)} style={styles.action}><Icon name='book' size={16} color={palette.gold} /><Text style={[styles.actionText, { color: palette.gold }]}>{route === `data-privacy` ? `Your Data` : route === `guidelines` ? `Editorial Guidelines` : route[0].toUpperCase() + route.slice(1)}</Text></Pressable>)}
    </View>
  );
};

export default InfoPage;
