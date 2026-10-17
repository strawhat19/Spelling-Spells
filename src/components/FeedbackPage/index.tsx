import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import AccountLayout from '../AccountLayout';
import { Text, View, Pressable } from 'react-native';
import { useTheme } from '../../shared/themeContext/useTheme';

const FeedbackPage = () => {
  const router = useRouter();
  const { palette } = useTheme();
  return <AccountLayout section='admin' title='Feedback' eyebrow='Owner Workspace' description='Contact messages and spell requests, kept private to the Owner.'>
    <View nativeID='feedback-destinations' style={styles.stack}>
      {([{ id: `contacts`, title: `Contacts`, icon: `mail`, href: `/contacts`, description: `Read messages sent through the contact form and manage their New, Read, or Archived status.` }, { id: `requests`, title: `Requests`, icon: `shield`, href: `/review`, description: `The spell request review service is not connected yet. Contribution drafts remain on the device until that service is available.` }] as const).map((destination) => <View key={destination.id} nativeID={`feedback-${destination.id}`} style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}><Icon name={destination.icon} size={25} color={palette.primary} /><Text nativeID={`feedback-${destination.id}-title`} accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{destination.title}</Text><Text nativeID={`feedback-${destination.id}-description`} style={[styles.copy, { color: palette.muted }]}>{destination.description}</Text><Pressable nativeID={`feedback-open-${destination.id}`} accessibilityRole='link' onPress={() => router.push(destination.href)} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name={destination.icon} size={16} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{`Open ${destination.title}`}</Text><Icon name='arrow' size={16} color={palette.primary} /></Pressable></View>)}
    </View>
  </AccountLayout>;
};

export default FeedbackPage;
