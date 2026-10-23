import Icon from '../Icon';
import PageMetadata from '../PageMetadata';
import { useEffect, useState } from 'react';
import styles from '../AuthPage/styles.native';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '../../shared/authContext';
import { Text, View, Pressable } from 'react-native';
import { useTheme } from '../../shared/themeContext/useTheme';
import { getSignInDestination } from '../../shared/authentication/returnPath';
import { readSignInContinuation, clearSignInContinuation } from '../../shared/authentication/continuation';

const AuthCallback = () => {
  const auth = useAuth();
  const router = useRouter();
  const { palette } = useTheme();
  const [continuation] = useState(readSignInContinuation);
  const destination = auth.recovery ? `/reset-password` : continuation ?? getSignInDestination(auth.account);
  useEffect(() => { void auth.completeAuthRedirect(); }, [auth.completeAuthRedirect]);
  useEffect(() => {
    if (auth.loading || (!auth.recovery && auth.status !== `signed-in`)) return;
    clearSignInContinuation();
    router.replace(destination as Href);
  }, [auth.loading, auth.status, auth.recovery, destination, router]);
  return <View nativeID='auth-callback-page' style={styles.page}>
    <PageMetadata noIndex title='Account connection' description='Complete your private account sign-in.' />
    <Icon name='shield' color={palette.gold} size={28} />
    <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{auth.loading ? `Opening your account.` : auth.status === `signed-in` ? destination === `/dashboard` ? `Opening your dashboard.` : auth.recovery ? `Opening password recovery.` : destination === `/` ? `Taking you home.` : `Opening your requested page.` : `Account connection`}</Text>
    <Text accessibilityLiveRegion='polite' style={[styles.copy, { color: palette.muted }]}>{auth.message ?? (auth.loading ? `Checking the return from your sign-in provider.` : `If the email link has expired or was opened in another browser, return to sign in and request a new link.`)}</Text>
    {!auth.loading && auth.status !== `signed-in` ? <Pressable nativeID='auth-callback-signin' accessibilityRole='link' onPress={() => router.replace(`/signin`)} style={[styles.button, { borderColor: palette.gold }]}><Icon name='user' color={palette.gold} size={16} /><Text style={[styles.buttonText, { color: palette.gold }]}>Return to sign in</Text></Pressable> : null}
  </View>;
};

export default AuthCallback;
