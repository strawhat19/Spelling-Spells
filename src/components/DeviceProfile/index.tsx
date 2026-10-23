import Icon from '../Icon';
import styles from '../ProfilePage/styles.native';
import { useDeviceProfile } from './useDeviceProfile';
import { Alert, View, Text, TextInput, Pressable } from 'react-native';

const DeviceProfile = () => {
  const page = useDeviceProfile();
  const disabled = page.loading || page.busy;
  const input = [styles.input, { color: page.palette.text, borderColor: page.palette.border, backgroundColor: page.palette.panel }];
  return <View nativeID='device-profile' style={[styles.card, { borderColor: page.palette.border, backgroundColor: page.palette.surface }]}>
    <Text accessibilityRole='header' style={[styles.title, { color: page.palette.text }]}>Profile on this device</Text>
    <Text style={[styles.copy, { color: page.palette.muted }]}>Local preferences, not an account or Owner identity. Anyone using this device can see them. They are not synced or backed up and can be lost when app storage is cleared. Do not enter sensitive information.</Text>
    <Text style={{ color: page.palette.text }}>Nickname</Text>
    <TextInput nativeID='device-profile-nickname' accessibilityLabel='Device nickname' editable={!disabled} maxLength={80} value={page.value.nickname} onChangeText={(text) => page.update(`nickname`, text)} style={input} />
    <Text style={{ color: page.palette.text }}>Reading note</Text>
    <TextInput multiline nativeID='device-profile-note' accessibilityLabel='Device reading note' editable={!disabled} maxLength={500} value={page.value.readingNote} onChangeText={(text) => page.update(`readingNote`, text)} style={input} />
    <Pressable nativeID='device-profile-save' accessibilityRole='button' disabled={disabled} onPress={() => void page.persist()} style={styles.button}><Icon name='check' size={16} color={page.palette.primary} /><Text style={{ color: page.palette.primary }}>Save on this device</Text></Pressable>
    <Pressable nativeID='device-profile-clear' accessibilityRole='button' disabled={disabled} onPress={() => Alert.alert(`Clear Device Profile?`, `Remove the nickname and reading note, keeping bookmarks and contribution drafts?`, [{ text: `Keep`, style: `cancel` }, { text: `Clear`, style: `destructive`, onPress: () => void page.persist(true) }])} style={styles.button}><Icon name='trash' size={16} color={page.palette.primary} /><Text style={{ color: page.palette.primary }}>Clear device profile</Text></Pressable>
    {page.themeToggleEnabled ? <Pressable nativeID='device-profile-theme' accessibilityRole='button' onPress={() => void page.toggleTheme()} style={styles.button}><Icon name='moon' size={16} color={page.palette.primary} /><Text style={{ color: page.palette.primary }}>Use {page.theme === `night` ? `Ivory` : `Midnight`} theme</Text></Pressable> : null}
    <Text nativeID='device-profile-status' accessibilityLiveRegion='polite' style={[styles.copy, { color: page.palette.muted }]}>{page.loading ? `Loading device preferences…` : page.notice}</Text>
  </View>;
};
export default DeviceProfile;
