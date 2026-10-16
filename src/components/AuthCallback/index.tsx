import { useEffect } from 'react';
import { Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Icon from '../Icon';
import PageMetadata from '../PageMetadata';
import styles from '../AuthPage/styles.native';
import { consumeAuthDestination } from '../../shared/authentication/returnPath';
import { useAuth } from '../../shared/authContext';
import { useTheme } from '../../shared/themeContext/useTheme';

const AuthCallback = () => {
  const auth = useAuth();
  const router = useRouter();
  const { palette } = useTheme();
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  useEffect(() => { void auth.completeAuthRedirect(); }, [auth.completeAuthRedirect]);
  useEffect(() => {
    if (auth.loading || (!auth.recovery && auth.status !== `signed-in`)) return;
    router.replace((auth.recovery ? `/reset-password` : consumeAuthDestination(next)) as Href);
  }, [auth.loading, auth.status, auth.recovery, next, router]);
  return <View nativeID='auth-callback-page' style={styles.page}>
    <PageMetadata noIndex title='Account connection' description='Complete your private account sign-in.' />
    <Icon name='shield' color={palette.gold} size={28} />
    <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{auth.loading ? `Opening your account.` : auth.status === `signed-in` ? `Taking you to your account.` : `Account connection`}</Text>
    <Text accessibilityLiveRegion='polite' style={[styles.copy, { color: palette.muted }]}>{auth.message ?? (auth.loading ? `Checking the return from your sign-in provider.` : `If the email link has expired or was opened in another browser, return to sign in and request a new link.`)}</Text>
    {!auth.loading && auth.status !== `signed-in` ? <Pressable nativeID='auth-callback-signin' accessibilityRole='link' onPress={() => router.replace(`/signin`)} style={[styles.button, { borderColor: palette.gold }]}><Icon name='user' color={palette.gold} size={16} /><Text style={[styles.buttonText, { color: palette.gold }]}>Return to sign in</Text></Pressable> : null}
  </View>;
};

export default AuthCallback;
