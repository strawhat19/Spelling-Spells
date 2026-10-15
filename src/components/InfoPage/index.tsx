import { informationPages, type InfoKind } from './content';
import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Alert, Linking, Pressable } from 'react-native';

const InfoPage = ({ kind }: { kind: InfoKind }) => {
  const router = useRouter();
  const { palette } = useTheme();
  const content = informationPages[kind];

  return (
    <View nativeID={`information-page-${kind}`} style={styles.page}>
      <Text style={[styles.eyebrow, { color: palette.gold }]}>SPELLING SPELLS</Text>
      <Text nativeID={`information-title-${kind}`} accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{content.title}</Text>
      <Text style={[styles.intro, { color: palette.muted }]}>{content.intro}</Text>
      {content.sections.map((section, index) => <View key={index} nativeID={`information-section-${kind}-${index}`} style={[styles.section, { borderColor: palette.border, backgroundColor: palette.surface }]}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text><Text style={[styles.copy, { color: palette.muted }]}>{section.body}</Text></View>)}
      {kind === `contact` ? (
        <Pressable nativeID="contact-piratechs-link" accessibilityRole="link" onPress={() => void Linking.openURL(`https://piratechs.com/`).catch(() => Alert.alert(`Couldn’t Open Website`, `Please visit piratechs.com when you’re connected.`))} style={styles.action}><Text style={[styles.actionText, { color: palette.gold }]}>Visit Piratechs</Text><Icon name="external-link" size={17} color={palette.gold} /></Pressable>
      ) : (
        <Pressable nativeID={`information-browse-${kind}`} accessibilityRole="link" onPress={() => router.push(`/spells`)} style={styles.action}><Text style={[styles.actionText, { color: palette.gold }]}>Explore the spell library</Text><Icon name="arrow-right" size={17} color={palette.gold} /></Pressable>
      )}
    </View>
  );
};

export default InfoPage;
