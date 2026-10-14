import Icon from '../Icon';
import styles from './styles.native';
import AccountLayout from '../AccountLayout';
import AccountGate from '../AccountLayout/AccountGate';
import { Text, View, TextInput, Pressable } from 'react-native';
import { useProfilePage, connectionRequirements, type ProfilePageProps } from './useProfilePage';

const ProfilePage = (props: ProfilePageProps) => {
  const page = useProfilePage(props);
  return <AccountLayout title={page.title} description={page.description}>
    {!page.allowed ? <AccountGate returnTo={page.view === `connections` ? `/profile/connections` : `/profile`} /> : page.view === `connections` ? <View style={styles.stack}>
      <Text style={[styles.copy, { color: page.palette.muted }]}>No services are connected. This page does not collect credentials.</Text>
      {connectionRequirements.map((item) => <View nativeID={`connection-${item.id}`} key={item.id} style={[styles.card, { borderColor: page.palette.border, backgroundColor: page.palette.surface }]}><Icon name={item.icon} color={page.palette.primary} size={24} /><Text accessibilityRole='header' style={[styles.title, { color: page.palette.text }]}>{item.name}</Text><Text style={[styles.copy, { color: page.palette.muted }]}>{item.detail}</Text><Text style={[styles.small, { color: page.palette.muted }]}>{item.status}</Text></View>)}
    </View> : <View style={styles.stack}>
      <View nativeID='profile-settings' style={[styles.card, { borderColor: page.palette.border, backgroundColor: page.palette.surface }]}><Text accessibilityRole='header' style={[styles.title, { color: page.palette.text }]}>{page.account?.displayName}</Text><Text style={[styles.copy, { color: page.palette.muted }]}>Profile updates are unavailable until the persistence service is connected. No changes can be saved here yet.</Text><Text style={[styles.label, { color: page.palette.muted }]}>Name</Text><TextInput nativeID='profile-name' editable={false} value={page.account?.displayName} accessibilityLabel='Display name' style={[styles.input, { color: page.palette.text, borderColor: page.palette.border }]} /><Text style={[styles.label, { color: page.palette.muted }]}>Email</Text><TextInput nativeID='profile-email' editable={false} value={page.account?.email} accessibilityLabel='Email address' style={[styles.input, { color: page.palette.text, borderColor: page.palette.border }]} /><Text style={[styles.copy, { color: page.palette.muted }]}>Profile visibility: Private by default. No public profile is published.</Text><Pressable nativeID='profile-save' disabled accessibilityRole='button' accessibilityState={{ disabled: true }} style={[styles.button, { backgroundColor: page.palette.gold, opacity: .5 }]}><Text style={[styles.buttonText, { color: `#20134d` }]}>Save changes unavailable</Text></Pressable></View>
      <View nativeID='profile-device-settings' style={[styles.card, { borderColor: page.palette.border, backgroundColor: page.palette.surface }]}><Text accessibilityRole='header' style={[styles.title, { color: page.palette.text }]}>Make yourself at home.</Text><Text style={[styles.copy, { color: page.palette.muted }]}>Theme is saved on this device, independently of your account.</Text><Pressable nativeID='profile-toggle-theme' accessibilityRole='button' onPress={() => void page.toggleTheme()} style={[styles.button, { backgroundColor: page.palette.panel }]}><Icon name={page.theme === `night` ? `sun` : `moon`} color={page.palette.primary} size={18} /><Text style={[styles.buttonText, { color: page.palette.text }]}>Use {page.theme === `night` ? `Ivory` : `Midnight`} theme</Text></Pressable></View>
    </View>}
  </AccountLayout>;
};

export default ProfilePage;
