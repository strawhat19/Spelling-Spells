import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Alert, Linking, Pressable } from 'react-native';

type Kind = `about` | `terms` | `contact` | `privacy` | `not-found`;

const information: Record<Kind, { title: string; intro: string; sections: { title: string; copy: string }[] }> = {
  about: {
    title: `Curiosity is a kind of magic.`,
    intro: `Spelling Spells is a field guide to fictional magic: the words that light a wand, open a door, summon a shield, or change a story.`,
    sections: [
      { title: `Every word has a world`, copy: `Explore spells from books, films, and games. Every record pairs spelling and pronunciation with definitions, usage, word parts, and source references.` },
      { title: `Know what is known`, copy: `Etymology can be confirmed, suggested, or unconfirmed. Those labels distinguish sourced roots from an interpretation. Danger, utility, and skill levels are editorial reading guides rather than official rankings.` },
      { title: `A grimoire of your own`, copy: `Save favorite spells and choose a theme. This version stores your preferences on your device and needs no account or backend.` },
    ],
  },
  terms: {
    title: `Terms of use`,
    intro: `Use this archive for curiosity, research, and enjoyment of fictional worlds.`,
    sections: [
      { title: `Fiction & editorial context`, copy: `The archive describes fictional spells. Explanations, pronunciation guides, and levels are provided as an editorial reference and may vary across adaptations or interpretations.` },
      { title: `Creators & sources`, copy: `Spell names, characters, and fictional universes belong to their respective rights holders. Spelling Spells is an independent reference project and does not claim an affiliation with those creators.` },
      { title: `Local collections`, copy: `Your saved spells and preferences are stored locally. Clearing app data, removing the app, or changing devices may remove them. No account synchronization is available in this version.` },
      { title: `External references`, copy: `Source links lead to external websites whose content, availability, and terms are managed by their operators.` },
    ],
  },
  contact: {
    title: `Send a little word our way.`,
    intro: `Have a spelling correction, a source to suggest, or a favorite fictional spell missing from the collection? Reach Piratechs through its website.`,
    sections: [
      { title: `Help the archive grow`, copy: `For a correction, include the spell name, the world it appears in, and a useful source. For pronunciation, mention which book, film, game, or language guide you’re referencing.` },
      { title: `Your collection stays here`, copy: `Contacting Piratechs does not attach your locally saved collection. You choose what information to share through the external website.` },
    ],
  },
  privacy: {
    title: `Your grimoire stays with you.`,
    intro: `This version is a frontend-only app. It has no account system or app backend.`,
    sections: [
      { title: `What this device keeps`, copy: `The app stores saved spell IDs, recently viewed spell IDs, and your theme preference in local browser or device storage. These values personalize the archive on this device.` },
      { title: `Your controls`, copy: `Remove individual bookmarks or clear the saved collection on the Saved page. Clearing browser or app storage removes local preferences and history as well. There is no cross-device sync or remote backup.` },
      { title: `Browsing & references`, copy: `Spell content is bundled with the app. Opening an external source or the Piratechs website is subject to that site’s privacy practices. Network requests to obtain the app itself may also be processed by its hosting provider.` },
      { title: `No account needed`, copy: `This app does not request your name, email address, or sign-in credentials. Saved spells are not uploaded by the app.` },
    ],
  },
  'not-found': {
    title: `That page slipped away.`,
    intro: `The page you’re looking for isn’t in this grimoire. There are more stories waiting in the spell library.`,
    sections: [],
  },
};

const InfoPage = ({ kind }: { kind: Kind }) => {
  const router = useRouter();
  const { palette } = useTheme();
  const content = information[kind];

  return (
    <View nativeID={`information-page-${kind}`} style={styles.page}>
      <Text style={[styles.eyebrow, { color: palette.gold }]}>SPELLING SPELLS</Text>
      <Text nativeID={`information-title-${kind}`} accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{content.title}</Text>
      <Text style={[styles.intro, { color: palette.muted }]}>{content.intro}</Text>
      {content.sections.map((section, index) => <View key={index} nativeID={`information-section-${kind}-${index}`} style={[styles.section, { borderColor: palette.border, backgroundColor: palette.surface }]}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text><Text style={[styles.copy, { color: palette.muted }]}>{section.copy}</Text></View>)}
      {kind === `contact` ? (
        <Pressable nativeID="contact-piratechs-link" accessibilityRole="link" onPress={() => void Linking.openURL(`https://piratechs.com/`).catch(() => Alert.alert(`Couldn’t Open Website`, `Please visit piratechs.com when you’re connected.`))} style={styles.action}><Text style={[styles.actionText, { color: palette.gold }]}>Visit Piratechs</Text><Icon name="external-link" size={17} color={palette.gold} /></Pressable>
      ) : (
        <Pressable nativeID={`information-browse-${kind}`} accessibilityRole="link" onPress={() => router.push(`/spells`)} style={styles.action}><Text style={[styles.actionText, { color: palette.gold }]}>Explore the spell library</Text><Icon name="arrow-right" size={17} color={palette.gold} /></Pressable>
      )}
    </View>
  );
};

export default InfoPage;
