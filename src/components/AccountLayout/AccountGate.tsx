import Icon from '../Icon';
import styles from './styles.native';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '../../shared/authContext';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';

export type AccountGateProps = { ownerOnly?: boolean; returnTo?: string };

const AccountGate = ({ ownerOnly = false, returnTo = `/profile` }: AccountGateProps) => {
  const router = useRouter();
  const { account, loading } = useAuth();
  const { palette } = useTheme();
  if (loading) return <View nativeID='account-loading' accessibilityLabel='Checking account availability' style={styles.gate}><ActivityIndicator color={palette.primary} /><Text style={{ color: palette.muted }}>Checking account availability…</Text></View>;
  return <View nativeID='account-access-gate' style={[styles.gate, { borderColor: palette.border, backgroundColor: palette.surface }]}><Icon name='shield' size={29} color={palette.gold} /><Text accessibilityRole='header' style={[styles.gateTitle, { color: palette.text }]}>{account ? `Reserved for the Owner.` : `Sign in to view this.`}</Text><Text style={[styles.description, { color: palette.muted }]}>{ownerOnly ? `Only the verified Owner can access private archive data and review tools.` : `Your profile, connections, and submissions become available after account services are connected.`}</Text><Text style={[styles.small, { color: palette.muted }]}>Connection unavailable. You can still explore and save spells on this device.</Text><View style={styles.actions}>{!account ? <><Pressable nativeID='account-gate-signin' accessibilityRole='link' onPress={() => router.push(`/signin?returnTo=${encodeURIComponent(returnTo)}` as Href)} style={[styles.action, { backgroundColor: palette.gold }]}><Icon name='user' size={16} color='#20134d' /><Text style={[styles.actionText, { color: `#20134d` }]}>Sign in</Text></Pressable><Pressable nativeID='account-gate-signup' accessibilityRole='link' onPress={() => router.push(`/signup`)} style={[styles.action, { backgroundColor: palette.panel }]}><Text style={[styles.actionText, { color: palette.text }]}>Create account</Text></Pressable></> : <Pressable nativeID='account-gate-profile' accessibilityRole='link' onPress={() => router.push(`/profile`)} style={[styles.action, { backgroundColor: palette.panel }]}><Text style={[styles.actionText, { color: palette.text }]}>Your profile</Text></Pressable>}</View></View>;
};

export default AccountGate;
