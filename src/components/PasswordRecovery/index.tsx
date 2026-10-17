import Icon from '../Icon';
import TextReveal from '../TextReveal';
import { useRouter } from 'expo-router';
import PageMetadata from '../PageMetadata';
import styles from '../AuthPage/styles.native';
import { useAuth } from '../../shared/authContext';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, TextInput } from 'react-native';

const PasswordRecovery = () => {
  const auth = useAuth();
  const router = useRouter();
  const { palette } = useTheme();
  const [password, setPassword] = useState(``);
  const [confirmation, setConfirmation] = useState(``);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const scope = auth.identity?.authUid ?? null;
  const current = useRef(scope);
  current.current = scope;
  const mounted = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    setPassword(``);
    setConfirmation(``);
    setMessage(null);
    setComplete(false);
  }, [scope]);
  const allowed = auth.recovery && !auth.loading && Boolean(scope) && !complete;
  const save = async () => {
    if (!allowed || pending.current) return;
    if (password.length < 12 || password.length > 128 || password !== confirmation) {
      setMessage(`Use 12 to 128 characters and enter the same password twice.`);
      return;
    }
    const attemptScope = scope;
    pending.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const result = await auth.updatePassword(password);
      if (!mounted.current || current.current !== attemptScope) return;
      setPassword(``);
      setConfirmation(``);
      setComplete(result.ok);
      setMessage(result.ok ? `Password updated. You can continue to your account.` : result.message);
    } catch {
      if (mounted.current && current.current === attemptScope) setMessage(`The password change could not be confirmed. Please request a new recovery email.`);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const inputStyle = [styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.panel }];
  return <View nativeID='password-recovery-page' style={styles.page}>
    <PageMetadata noIndex title='Reset password' description='Choose a new password after opening your recovery email.' />
    <Icon name='shield' color={palette.gold} size={28} />
    <Text nativeID='password-recovery-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}><TextReveal id='password-recovery-title-copy' text={`A fresh key to your spellbook.`} /></Text>
    <Text style={[styles.copy, { color: palette.muted }]}>{auth.loading ? `Checking your recovery link.` : allowed ? `Choose a password between 12 and 128 characters.` : complete ? `Your password change was confirmed.` : `Open a fresh password recovery email in the browser where you requested it. You can request a new link from sign in.`}</Text>
    {allowed ? <View nativeID='password-recovery-form' style={[styles.form, { borderColor: palette.border }]}>
      <Text style={[styles.label, { color: palette.text }]}>New password</Text>
      <TextInput nativeID='password-recovery-new' accessibilityLabel='New password' secureTextEntry autoCapitalize='none' autoCorrect={false} autoComplete='new-password' maxLength={128} editable={!busy} value={password} onChangeText={setPassword} style={inputStyle} />
      <Text style={[styles.label, { color: palette.text }]}>Confirm password</Text>
      <TextInput nativeID='password-recovery-confirm' accessibilityLabel='Confirm password' secureTextEntry autoCapitalize='none' autoCorrect={false} autoComplete='new-password' maxLength={128} editable={!busy} value={confirmation} onChangeText={setConfirmation} style={inputStyle} />
      <Pressable nativeID='password-recovery-save' accessibilityRole='button' accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void save()} style={[styles.button, { borderColor: palette.gold }]}><Icon name='shield' color={palette.gold} size={16} /><Text style={[styles.buttonText, { color: palette.gold }]}>{busy ? `Updating password.` : `Save new password`}</Text></Pressable>
    </View> : null}
    {message ? <Text nativeID='password-recovery-feedback' accessibilityLiveRegion='polite' style={[styles.copy, { color: palette.text }]}>{message}</Text> : null}
    {!auth.loading ? <Pressable nativeID='password-recovery-continue' accessibilityRole='link' onPress={() => router.replace(complete ? `/profile` : `/signin`)} style={[styles.button, { borderColor: palette.gold }]}><Icon name='user' color={palette.gold} size={16} /><Text style={[styles.buttonText, { color: palette.gold }]}>{complete ? `Continue to account` : `Return to sign in`}</Text></Pressable> : null}
  </View>;
};

export default PasswordRecovery;
