import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import AccountLayout from '../AccountLayout';
import AccountGate from '../AccountLayout/AccountGate';
import { useProfilePage, type ProfilePageProps } from './useProfilePage';
import { Image, Text, View, TextInput, Pressable, useWindowDimensions } from 'react-native';

const ProfilePage = (props: ProfilePageProps) => {
  const page = useProfilePage(props);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const busy = Boolean(page.busy) || page.loading || page.signingOut;
  const cardStyle = [styles.card, { borderColor: page.palette.border, backgroundColor: page.palette.surface }];
  const inputStyle = [styles.input, { color: page.palette.text, borderColor: page.palette.border, backgroundColor: page.palette.panel }];
  const secondaryStyle = [styles.button, { backgroundColor: page.palette.panel }];
  const verificationActions = page.identity && !page.identity.emailVerified ? <View nativeID='profile-verification-actions' style={styles.actions}>
    <Pressable nativeID='profile-resend-verification' disabled={busy} accessibilityRole='button' accessibilityState={{ disabled: busy, busy: page.busy === `verify` }} onPress={() => void page.resendVerification()} style={secondaryStyle}><Icon name='mail' size={16} color={page.palette.primary} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>{page.busy === `verify` ? `Requesting…` : `Resend verification`}</Text></Pressable>
    <Pressable nativeID='profile-refresh-verification' disabled={busy} accessibilityRole='button' accessibilityState={{ disabled: busy, busy: page.busy === `refresh` }} onPress={() => void page.refreshVerification()} style={secondaryStyle}><Icon name='refresh' size={16} color={page.palette.primary} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>{page.busy === `refresh` ? `Refreshing…` : `I verified my email`}</Text></Pressable>
  </View> : null;

  return <AccountLayout title={page.title} description={page.description}>
    {!page.allowed ? page.showRecovery ? <View nativeID='profile-connection-recovery' style={cardStyle}>
      <Icon name='shield' size={24} color={page.palette.gold} />
      <Text accessibilityRole='header' style={[styles.title, { color: page.palette.text }]}>{page.loading ? `Connecting your private account` : `Private account unavailable`}</Text>
      <Text accessibilityRole={page.loading ? undefined : `alert`} accessibilityLiveRegion='polite' style={[styles.copy, { color: page.palette.muted }]}>{page.loading ? `Waiting for the server to confirm your private account. You can sign out without waiting.` : page.message ?? `Your identity is signed in, but the private account could not be loaded. Retry the connection or sign out before changing accounts.`}</Text>
      <Pressable nativeID='profile-retry-connection' disabled={busy} accessibilityRole='button' accessibilityState={{ disabled: busy, busy: page.busy === `retry` }} onPress={() => void page.retryConnection()} style={secondaryStyle}><Icon name='refresh' size={16} color={page.palette.primary} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>{page.busy === `retry` ? `Retrying…` : `Retry connection`}</Text></Pressable>
      {page.identity ? <Pressable nativeID='profile-reset-session' disabled={page.signingOut} accessibilityRole='button' accessibilityState={{ disabled: page.signingOut, busy: page.signingOut }} onPress={() => void page.resetSession()} style={secondaryStyle}><Icon name='logout' size={16} color={page.palette.primary} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>{page.signingOut ? `Signing out…` : `Sign out`}</Text></Pressable> : null}
      {verificationActions ? <><Text style={[styles.copy, { color: page.palette.muted }]}>Your email is not verified. You can request a new verification email without access to this profile.</Text>{verificationActions}</> : null}
    </View> : <AccountGate returnTo={page.view === `connections` ? `/profile/connections` : `/profile`} /> : page.view === `connections` ? <View nativeID='profile-connections' style={styles.stack}>
      <Text style={[styles.copy, { color: page.palette.muted }]}>Your account identity is connected. Each service has its own status. This page does not collect provider credentials.</Text>
      {page.connectionRequirements.map((item) => <View nativeID={`connection-${item.id}`} key={item.id} style={cardStyle}>
        <Icon name={item.icon} color={page.palette.primary} size={24} />
        <Text accessibilityRole='header' style={[styles.title, { color: page.palette.text }]}>{item.name}</Text>
        <Text style={[styles.copy, { color: page.palette.muted }]}>{item.detail}</Text>
        {item.id === `sync` ? <Pressable nativeID='connection-open-spellbook' accessibilityRole='link' onPress={() => router.push(`/saved`)} style={secondaryStyle}><Icon name='bookmark' size={16} color={page.palette.primary} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>{item.status}</Text></Pressable> : <Text nativeID={`connection-status-${item.id}`} style={[styles.small, { color: item.connected ? page.palette.primary : page.palette.muted }]}>{item.status}</Text>}
      </View>)}
    </View> : <View nativeID='profile-details' style={[styles.stack, width > 1100 ? styles.columns : null]}>
      <View nativeID='profile-settings' accessibilityState={{ busy }} style={[cardStyle, width > 1100 ? styles.settings : null]}>
        <View style={styles.identity}>
          <View style={[styles.avatar, { borderColor: page.palette.border, backgroundColor: page.palette.panel }]}>{page.avatarUrl ? <Image nativeID='profile-avatar-image' source={{ uri: page.avatarUrl }} accessibilityIgnoresInvertColors accessible={false} onError={page.onAvatarError} style={styles.avatarImage} /> : <Text style={[styles.avatarInitial, { color: page.palette.primary }]}>{page.avatarInitial}</Text>}</View>
          <View style={styles.identityCopy}><Text accessibilityRole='header' style={[styles.title, { color: page.palette.text }]}>{page.account?.displayName}</Text><Text style={[styles.small, { color: page.palette.muted }]}>Private account profile</Text></View>
        </View>
        <Text style={[styles.copy, { color: page.palette.muted }]}>Edit your name and avatar. Email, account access, and identity are managed separately.</Text>
        <Text nativeID='profile-name-label' style={[styles.label, { color: page.palette.muted }]}>Display name</Text>
        <TextInput nativeID='profile-name' editable={page.editable} value={page.displayName} maxLength={80} autoComplete='name' accessibilityLabel='Display name' accessibilityHint={page.errors.displayName ?? `Use 1 to 80 characters`} onChangeText={(value) => page.setField(`displayName`, value)} style={inputStyle} />
        {page.errors.displayName ? <Text nativeID='profile-name-error' accessibilityRole='alert' style={[styles.small, { color: page.palette.error }]}>{page.errors.displayName}</Text> : null}
        <Text nativeID='profile-avatar-label' style={[styles.label, { color: page.palette.muted }]}>Avatar image URL</Text>
        <TextInput nativeID='profile-avatar' editable={page.editable} value={page.avatarDraft} maxLength={2048} keyboardType='url' autoCorrect={false} autoCapitalize='none' accessibilityLabel='Avatar image URL' accessibilityHint={page.errors.avatarUrl ?? `Use an HTTPS image URL, or leave blank for your initial`} placeholder='https://example.com/avatar.jpg' placeholderTextColor={page.palette.muted} onChangeText={(value) => page.setField(`avatarUrl`, value)} style={inputStyle} />
        {page.errors.avatarUrl ? <Text nativeID='profile-avatar-error' accessibilityRole='alert' style={[styles.small, { color: page.palette.error }]}>{page.errors.avatarUrl}</Text> : <Text style={[styles.small, { color: page.palette.muted }]}>HTTPS images load from their host after saving. Leave blank to use your initial. Uploads are not supported.</Text>}
        <Text nativeID='profile-email-label' style={[styles.label, { color: page.palette.muted }]}>Email address</Text>
        <TextInput nativeID='profile-email' editable={false} value={page.account?.email ?? ``} accessibilityLabel='Email address, read only' style={inputStyle} />
        <Text nativeID='profile-email-status' style={[styles.small, { color: page.palette.muted }]}>{page.identity?.emailVerified ? `Verified email` : `Email not yet verified`}. Managed by your sign-in provider.</Text>
        {verificationActions}
        <Text style={[styles.copy, { color: page.palette.muted }]}>Private account. No public profile is published.</Text>
        <Text nativeID='profile-save-state' accessibilityLiveRegion='polite' style={[styles.small, { color: page.palette.muted }]}>{page.busy === `save` ? `Waiting for confirmation…` : page.dirty ? `Unsaved changes` : `Showing your current account details`}</Text>
        <Pressable nativeID='profile-save' disabled={!page.editable || !page.dirty} accessibilityRole='button' accessibilityState={{ disabled: !page.editable || !page.dirty, busy: page.busy === `save` }} onPress={() => void page.saveProfile()} style={[styles.button, (!page.editable || !page.dirty) && styles.disabled, { backgroundColor: page.palette.gold }]}><Icon name='check' color='#20134d' size={17} /><Text style={[styles.buttonText, { color: `#20134d` }]}>{page.busy === `save` ? `Saving…` : `Save changes`}</Text></Pressable>
        {page.dirty ? <Pressable nativeID='profile-discard-changes' disabled={busy} accessibilityRole='button' accessibilityState={{ disabled: busy }} onPress={page.discardChanges} style={secondaryStyle}><Icon name='close' color={page.palette.primary} size={16} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>Discard changes</Text></Pressable> : null}
      </View>
      <View nativeID='profile-metadata' style={[cardStyle, width > 1100 ? styles.metadata : null]}>
        <Text accessibilityRole='header' style={[styles.metadataTitle, { color: page.palette.text }]}>Account Details</Text>
        <Text style={[styles.copy, { color: page.palette.muted }]}>Account No. {page.account?.number}</Text>
        <Text nativeID='profile-role' style={[styles.copy, { color: page.palette.muted }]}>Access: {page.account?.roleVerified ? page.account.role : `Unverified`} (read only)</Text>
        <Text nativeID='profile-plan' style={[styles.copy, { color: page.palette.muted }]}>{page.planLabel}</Text>
        <Text style={[styles.copy, { color: page.palette.muted }]}>Profile: Private</Text>
        <Pressable nativeID='profile-data-choices' accessibilityRole='link' onPress={() => router.push(`/data-privacy`)} style={secondaryStyle}><Icon name='shield' color={page.palette.primary} size={17} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>Your data and choices</Text></Pressable>
        <Pressable nativeID='profile-open-connections' accessibilityRole='link' onPress={() => router.push(`/profile/connections`)} style={secondaryStyle}><Icon name='link' color={page.palette.primary} size={17} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>Private connections</Text></Pressable>
        <Pressable nativeID='profile-open-spellbook' accessibilityRole='link' onPress={() => router.push(`/saved`)} style={secondaryStyle}><Icon name='bookmark' color={page.palette.primary} size={17} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>Your spellbook</Text></Pressable>
        <Pressable nativeID='profile-open-submissions' accessibilityRole='link' onPress={() => router.push(`/submissions`)} style={secondaryStyle}><Icon name='edit' color={page.palette.primary} size={17} /><Text style={[styles.buttonText, { color: page.palette.primary }]}>My submissions</Text></Pressable>
        <View nativeID='profile-device-settings' style={[styles.deviceSettings, { borderTopColor: page.palette.border }]}>
          <Text accessibilityRole='header' style={[styles.title, { color: page.palette.text }]}>Make yourself at home.</Text>
          <Text style={[styles.copy, { color: page.palette.muted }]}>Theme is saved on this device, independently of your account.</Text>
          <Pressable nativeID='profile-toggle-theme' accessibilityRole='button' onPress={() => void page.toggleTheme()} style={secondaryStyle}><Icon name={page.theme === `night` ? `sun` : `moon`} color={page.palette.primary} size={18} /><Text style={[styles.buttonText, { color: page.palette.text }]}>Use {page.theme === `night` ? `Ivory` : `Midnight`} theme</Text></Pressable>
        </View>
      </View>
    </View>}
    {page.feedback ? <Text nativeID='profile-feedback' accessibilityRole={page.feedback.tone === `error` ? `alert` : undefined} accessibilityLiveRegion='polite' style={[styles.feedback, { color: page.feedback.tone === `error` ? page.palette.error : page.palette.text }]}>{page.feedback.message}</Text> : null}
  </AccountLayout>;
};

export default ProfilePage;
