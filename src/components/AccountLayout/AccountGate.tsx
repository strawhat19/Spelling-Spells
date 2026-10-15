import Icon from '../Icon';
import styles from './styles.native';
import { useRouter, type Href } from 'expo-router';
import { useAccountGate } from './useAccountGate';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';

export type AccountGateProps = { ownerOnly?: boolean; returnTo?: string };

const AccountGate = ({ ownerOnly = false, returnTo = `/profile` }: AccountGateProps) => {
  const router = useRouter();
  const gate = useAccountGate(ownerOnly);
  const { account, loading } = gate;
  const { palette } = useTheme();
  if (loading) return <View nativeID='account-loading' accessibilityLabel='Checking account availability' style={styles.gate}><ActivityIndicator color={palette.primary} /><Text style={{ color: palette.muted }}>Checking account availability…</Text>{gate.identity ? <Pressable nativeID='account-loading-signout' accessibilityRole='button' disabled={gate.signingOut} accessibilityState={{ disabled: gate.signingOut, busy: gate.signingOut }} onPress={() => void gate.recover(`signout`)} style={[styles.action, { backgroundColor: palette.panel }]}><Text style={[styles.actionText, { color: palette.text }]}>{gate.signingOut ? `Signing out…` : `Sign out`}</Text></Pressable> : null}</View>;
  return <View nativeID='account-access-gate' style={[styles.gate, { borderColor: palette.border, backgroundColor: palette.surface }]}><Icon name='shield' size={29} color={palette.gold} /><Text accessibilityRole='header' style={[styles.gateTitle, { color: palette.text }]}>{gate.title}</Text><Text style={[styles.description, { color: palette.muted }]}>{gate.copy}</Text><Text style={[styles.small, { color: palette.muted }]}>{gate.statusLabel}. Public browsing and device bookmarks remain available.</Text><View style={styles.actions}>{gate.needsRecovery ? <><Pressable nativeID='account-gate-retry' disabled={gate.retrying || gate.signingOut} accessibilityState={{ disabled: gate.retrying || gate.signingOut, busy: gate.retrying }} accessibilityRole='button' onPress={() => void gate.recover(`retry`)} style={[styles.action, { backgroundColor: palette.gold }]}><Text style={[styles.actionText, { color: `#20134d` }]}>{gate.retrying ? `Retrying…` : `Retry account`}</Text></Pressable><Pressable nativeID='account-gate-signout' disabled={gate.signingOut} accessibilityState={{ disabled: gate.signingOut, busy: gate.signingOut }} accessibilityRole='button' onPress={() => void gate.recover(`signout`)} style={[styles.action, { backgroundColor: palette.panel }]}><Text style={[styles.actionText, { color: palette.text }]}>{gate.signingOut ? `Signing out…` : `Sign out`}</Text></Pressable></> : !account ? <><Pressable nativeID='account-gate-signin' accessibilityRole='link' onPress={() => router.push(`/signin?returnTo=${encodeURIComponent(returnTo)}` as Href)} style={[styles.action, { backgroundColor: palette.gold }]}><Icon name='user' size={16} color='#20134d' /><Text style={[styles.actionText, { color: `#20134d` }]}>Sign in</Text></Pressable><Pressable nativeID='account-gate-signup' accessibilityRole='link' onPress={() => router.push(`/signup`)} style={[styles.action, { backgroundColor: palette.panel }]}><Text style={[styles.actionText, { color: palette.text }]}>Create account</Text></Pressable></> : <Pressable nativeID='account-gate-profile' accessibilityRole='link' onPress={() => router.push(`/profile`)} style={[styles.action, { backgroundColor: palette.panel }]}><Text style={[styles.actionText, { color: palette.text }]}>Your profile</Text></Pressable>}</View></View>;
};

export default AccountGate;
