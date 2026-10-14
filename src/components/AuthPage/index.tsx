import Icon from '../Icon';
import BrandLogo from '../BrandLogo';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import PageMetadata from '../PageMetadata';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, TextInput } from 'react-native';
import { useAuthPage, type AuthPageProps } from './useAuthPage';

const AuthPage = (props: AuthPageProps) => {
  const page = useAuthPage(props);
  const router = useRouter();
  const { palette } = useTheme();
  return (
    <View nativeID={`auth-page-${page.mode}`} style={styles.page}>
      <PageMetadata noIndex title={page.isSignUp ? `Create account` : `Sign in`} description='Account services are not connected yet. Browse the spell archive without an account.' />
      <BrandLogo size={70} />
      <Text style={[styles.eyebrow, { color: palette.gold }]}>YOUR PERSONAL ARCHIVE</Text>
      <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{page.title}</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>{page.subtitle}</Text>
      <View nativeID='auth-connection-notice' accessibilityRole='alert' style={[styles.notice, { borderColor: palette.border, backgroundColor: palette.panel }]}>
        <Icon name='shield' color={palette.gold} />
        <Text style={[styles.noticeText, { color: palette.muted }]}>Account services are not connected. Sign-in and account creation are unavailable. No credentials are collected.</Text>
      </View>
      <View style={[styles.form, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <Text accessibilityRole='header' style={[styles.formTitle, { color: palette.text }]}>{page.formTitle}</Text>
        <Pressable nativeID='auth-google-button' disabled accessibilityRole='button' accessibilityState={{ disabled: true }} style={[styles.button, styles.disabled, { borderColor: palette.border }]}><Text style={[styles.buttonText, { color: palette.text }]}>G   Continue with Google</Text></Pressable>
        {page.isSignUp ? <><Text style={[styles.label, { color: palette.muted }]}>Display name</Text><TextInput nativeID='auth-name' editable={false} accessibilityLabel='Display name unavailable' placeholder='Available after account setup' placeholderTextColor={palette.muted} style={[styles.input, { color: palette.muted, borderColor: palette.border }]} /></> : null}
        <Text style={[styles.label, { color: palette.muted }]}>Email address</Text>
        <TextInput nativeID='auth-email' editable={false} accessibilityLabel='Email address unavailable' placeholder='you@example.com' placeholderTextColor={palette.muted} style={[styles.input, { color: palette.muted, borderColor: palette.border }]} />
        <Text style={[styles.label, { color: palette.muted }]}>Password</Text>
        <TextInput nativeID='auth-password' editable={false} secureTextEntry accessibilityLabel='Password unavailable' placeholder='Available after account setup' placeholderTextColor={palette.muted} style={[styles.input, { color: palette.muted, borderColor: palette.border }]} />
        <Pressable nativeID='auth-email-button' disabled accessibilityRole='button' accessibilityState={{ disabled: true }} style={[styles.button, styles.disabled, { backgroundColor: palette.gold }]}><Text style={[styles.buttonText, { color: `#20134d` }]}>{page.isSignUp ? `Create account` : `Sign in`}</Text><Icon name='arrow-right' color='#20134d' size={17} /></Pressable>
        <Pressable nativeID='auth-switch-mode' accessibilityRole='link' onPress={() => router.push(page.isSignUp ? `/signin` : `/signup`)} style={styles.link}><Text style={[styles.copy, { color: palette.primary }]}>{page.isSignUp ? `Already have an account? Sign in` : `New here? Create an account`}</Text></Pressable>
      </View>
      <Pressable nativeID='auth-browse-library' accessibilityRole='link' onPress={() => router.push(`/spells`)} style={styles.link}><Icon name='book' color={palette.gold} size={18} /><Text style={[styles.buttonText, { color: palette.gold }]}>Explore without an account</Text></Pressable>
      <Text style={[styles.small, { color: palette.muted }]}>Your saved spells remain on this device. No account or agreement is created here.</Text>
    </View>
  );
};

export default AuthPage;
