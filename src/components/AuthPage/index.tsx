import Icon from '../Icon';
import BrandLogo from '../BrandLogo';
import styles from './styles.native';
import PageMetadata from '../PageMetadata';
import GoogleBrandMark from '../GoogleBrandMark';
import { useRouter, type Href } from 'expo-router';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, TextInput } from 'react-native';
import { useAuthPage, type AuthPageProps } from './useAuthPage';

const AuthPage = (props: AuthPageProps) => {
  const page = useAuthPage(props);
  const router = useRouter();
  const { palette } = useTheme();
  const inputStyle = [styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.panel }];
  const busy = Boolean(page.busy) || page.loading || page.signingOut;
  return (
    <View nativeID={`auth-page-${page.mode}`} style={styles.page}>
      <PageMetadata noIndex title={page.isSignUp ? `Create account` : `Sign in`} description='Sign in to your private Spelling Spells account, or explore the archive without an account.' />
      <BrandLogo size={70} />
      <Text style={[styles.eyebrow, { color: palette.gold }]}>YOUR PERSONAL ARCHIVE</Text>
      <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{page.title}</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>{page.subtitle}</Text>
      {page.loading || page.unavailable || page.status === `error` || page.signedIn ? <View nativeID='auth-connection-notice' accessibilityRole={page.status === `error` ? `alert` : undefined} accessibilityLiveRegion='polite' style={[styles.notice, { borderColor: palette.border, backgroundColor: palette.panel }]}>
        <Icon name='shield' color={palette.gold} />
        <View style={styles.noticeBody}>
          <Text style={[styles.noticeText, { color: palette.text }]}>{page.loading ? `Connecting your identity and private account…` : page.signedIn ? page.busy ? `Your identity is connected. Finishing the requested account steps…` : `You are signed in. Your private account is ready.` : page.unavailable ? `Account services are not configured here. Fields are disabled and no credentials are collected.` : page.message ?? `Your private account could not be loaded. Retry the connection or sign out.`}</Text>
          {page.status === `error` || page.identity ? <View style={styles.recoveryActions}>
            {page.status === `error` && !page.loading ? <Pressable nativeID='auth-retry-connection' disabled={busy} accessibilityRole='button' accessibilityState={{ disabled: busy, busy: page.busy === `retry` }} onPress={() => void page.retryConnection()} style={[styles.button, { borderColor: palette.border }]}><Icon name='refresh' color={palette.gold} size={16} /><Text style={[styles.buttonText, { color: palette.gold }]}>{page.busy === `retry` ? `Retrying…` : `Retry connection`}</Text></Pressable> : null}
            {page.identity ? <Pressable nativeID='auth-reset-session' disabled={page.signingOut} accessibilityRole='button' accessibilityState={{ disabled: page.signingOut, busy: page.signingOut }} onPress={() => void page.resetSession()} style={[styles.button, { borderColor: palette.border }]}><Icon name='logout' color={palette.gold} size={16} /><Text style={[styles.buttonText, { color: palette.gold }]}>{page.signingOut ? `Signing out…` : `Sign out`}</Text></Pressable> : null}
          </View> : null}
        </View>
      </View> : null}
      {page.identity && !page.identity.emailVerified ? <View nativeID='auth-verification' style={[styles.form, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text accessibilityRole='header' style={[styles.formTitle, { color: palette.text }]}>Verify your email</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>Open your verification email, then refresh your status. Account access is checked separately.</Text>
        <Pressable nativeID='auth-resend-verification' disabled={busy} accessibilityRole='button' accessibilityState={{ disabled: busy }} onPress={() => void page.resendVerification()} style={[styles.button, { borderColor: palette.border }]}><Icon name='mail' size={16} color={palette.gold} /><Text style={[styles.buttonText, { color: palette.gold }]}>{page.busy === `verify` ? `Requesting…` : `Resend verification`}</Text></Pressable>
        <Pressable nativeID='auth-refresh-verification' disabled={busy} accessibilityRole='button' accessibilityState={{ disabled: busy }} onPress={() => void page.refreshVerification()} style={[styles.button, { borderColor: palette.border }]}><Icon name='refresh' size={16} color={palette.gold} /><Text style={[styles.buttonText, { color: palette.gold }]}>{page.busy === `refresh` ? `Refreshing…` : `I verified my email`}</Text></Pressable>
      </View> : null}
      {page.signedIn ? page.busy ? <Text accessibilityLiveRegion='polite' style={[styles.copy, { color: palette.muted }]}>Finishing your account request…</Text> : <Pressable nativeID='auth-open-profile' accessibilityRole='link' onPress={() => router.replace(page.returnTo as Href)} style={[styles.button, { borderColor: palette.gold, backgroundColor: palette.gold }]}><Icon name='user' color='#20134d' size={17} /><Text style={[styles.buttonText, { color: `#20134d` }]}>Continue to your account</Text></Pressable> : <View nativeID={`auth-form-${page.mode}`} accessibilityState={{ busy }} style={[styles.form, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text accessibilityRole='header' style={[styles.formTitle, { color: palette.text }]}>{page.formTitle}</Text>
        <View nativeID='auth-switch-prompt' style={styles.switchPrompt}>
          <Text style={[styles.switchCopy, { color: palette.muted }]}>{page.isSignUp ? `Already have an account?` : `New to the archive?`}</Text>
          <Pressable nativeID='auth-switch-mode' accessibilityRole='link' onPress={() => router.push(page.switchHref as Href)} style={[styles.button, { borderColor: palette.primary, backgroundColor: palette.panel }]}><Icon name='user' size={17} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.primary }]}>{page.isSignUp ? `Sign in instead` : `Sign up instead`}</Text><Icon name='arrow-right' size={16} color={palette.primary} /></Pressable>
        </View>
        <Pressable disabled nativeID='auth-google-button' accessibilityRole='button' accessibilityState={{ disabled: true }} style={[styles.button, styles.googleButton]} accessibilityHint='Google sign-in is not configured for the native app. Use email or the website instead.'>
          <GoogleBrandMark />
          <Text nativeID='auth-google-label' style={styles.googleLabel}>Continue with Google</Text>
        </Pressable>
        <Text nativeID='auth-google-unavailable' style={[styles.small, { color: palette.muted }]}>Google sign-in is not configured for this native app. Use email or sign in on the website.</Text>
        {page.isSignUp ? <>
          <Text nativeID='auth-name-label' style={[styles.label, { color: palette.muted }]}>Display name</Text>
          <TextInput nativeID='auth-name' editable={page.editable} value={page.displayName} maxLength={80} autoComplete='name' accessibilityLabel='Display name' accessibilityHint={page.errors.displayName} placeholder='How should we call you?' placeholderTextColor={palette.muted} onChangeText={(value) => page.setField(`displayName`, value)} style={inputStyle} />
          {page.errors.displayName ? <Text nativeID='auth-name-error' accessibilityRole='alert' style={[styles.fieldError, { color: palette.error }]}>{page.errors.displayName}</Text> : null}
        </> : null}
        <Text nativeID='auth-email-label' style={[styles.label, { color: palette.muted }]}>Email address</Text>
        <TextInput nativeID='auth-email' editable={page.editable} value={page.email} maxLength={254} autoCorrect={false} autoCapitalize='none' autoComplete='email' keyboardType='email-address' accessibilityLabel='Email address' accessibilityHint={page.errors.email} placeholder='you@example.com' placeholderTextColor={palette.muted} onChangeText={(value) => page.setField(`email`, value)} style={inputStyle} />
        {page.errors.email ? <Text nativeID='auth-email-error' accessibilityRole='alert' style={[styles.fieldError, { color: palette.error }]}>{page.errors.email}</Text> : null}
        <Text nativeID='auth-password-label' style={[styles.label, { color: palette.muted }]}>Password</Text>
        <TextInput nativeID='auth-password' secureTextEntry editable={page.editable} value={page.password} maxLength={128} autoCorrect={false} autoCapitalize='none' autoComplete={page.isSignUp ? `new-password` : `current-password`} accessibilityLabel='Password' accessibilityHint={page.errors.password ?? (page.isSignUp ? `Use 12 to 128 characters` : undefined)} placeholder={page.unavailable ? `Available after account setup` : page.isSignUp ? `At least 12 characters` : `Your password`} placeholderTextColor={palette.muted} onChangeText={(value) => page.setField(`password`, value)} onSubmitEditing={() => void page.submitEmail()} style={inputStyle} />
        {page.errors.password ? <Text nativeID='auth-password-error' accessibilityRole='alert' style={[styles.fieldError, { color: palette.error }]}>{page.errors.password}</Text> : page.isSignUp ? <Text style={[styles.small, { color: palette.muted }]}>Use 12–128 characters. The sign-in provider handles your password.</Text> : null}
        <Pressable nativeID='auth-email-button' disabled={!page.editable} accessibilityRole='button' accessibilityState={{ disabled: !page.editable, busy: page.busy === `email` }} onPress={() => void page.submitEmail()} style={[styles.button, !page.editable && styles.disabled, { borderColor: palette.gold, backgroundColor: palette.gold }]}><Icon name='spark' color='#20134d' size={17} /><Text style={[styles.buttonText, { color: `#20134d` }]}>{page.busy === `email` ? `Connecting…` : page.isSignUp ? `Create account` : `Sign in`}</Text><Icon name='arrow-right' color='#20134d' size={17} /></Pressable>
        {!page.isSignUp ? <Pressable nativeID='auth-password-reset' disabled={!page.editable} accessibilityRole='button' accessibilityState={{ disabled: !page.editable, busy: page.busy === `reset` }} onPress={() => void page.requestReset()} style={styles.link}><Icon name='mail' size={16} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.primary }]}>{page.busy === `reset` ? `Requesting reset…` : `Send a password reset email`}</Text></Pressable> : null}
      </View>}
      {page.isSignUp && !page.identity ? <Pressable nativeID='auth-resend-confirmation' accessibilityRole='button' disabled={!page.editable || !page.email.trim()} accessibilityState={{ disabled: !page.editable || !page.email.trim() }} onPress={() => void page.resendConfirmation()} style={styles.link}><Icon name='mail' color={palette.primary} size={16} /><Text style={[styles.buttonText, { color: palette.primary }]}>Resend confirmation email</Text></Pressable> : null}
      {page.feedback ? <Text nativeID='auth-feedback' accessibilityRole={page.feedback.tone === `error` ? `alert` : undefined} accessibilityLiveRegion='polite' style={[styles.copy, { color: page.feedback.tone === `error` ? palette.error : palette.text }]}>{page.feedback.message}</Text> : null}
      <Pressable nativeID='auth-browse-library' accessibilityRole='link' onPress={() => router.push(`/spells`)} style={styles.link}><Icon name='book' color={palette.gold} size={18} /><Text style={[styles.buttonText, { color: palette.gold }]}>Explore without an account</Text></Pressable>
      <Text style={[styles.small, { color: palette.muted }]}>Device bookmarks remain separate from your account. Your account profile is private.</Text>
      <View style={styles.legalLinks}>
        <Pressable nativeID='auth-terms-link' accessibilityRole='link' onPress={() => router.push(`/terms`)}><Text style={[styles.small, { color: palette.primary }]}>Terms</Text></Pressable>
        <Pressable nativeID='auth-privacy-link' accessibilityRole='link' onPress={() => router.push(`/privacy`)}><Text style={[styles.small, { color: palette.primary }]}>Privacy Policy</Text></Pressable>
      </View>
    </View>
  );
};

export default AuthPage;
