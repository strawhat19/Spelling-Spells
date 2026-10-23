import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import AccountLayout from '../AccountLayout';
import { Text, View, Pressable } from 'react-native';
import { useBillingReturn } from './useBillingReturn';
import AccountGate from '../AccountLayout/AccountGate';
import { useTheme } from '../../shared/themeContext/useTheme';

const BillingReturn = () => {
  const page = useBillingReturn();
  const router = useRouter();
  const { palette } = useTheme();
  return <AccountLayout title={page.title} description={`Confirm your private subscription status`}>
    {!page.allowed ? <AccountGate returnTo={page.returnTo} /> : <View nativeID={`billing-return`} style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Icon name={page.result?.state === `confirmed` ? `check` : `shield`} color={palette.primary} size={26} />
      <Text nativeID={`billing-return-message`} accessibilityLiveRegion={`polite`} style={[styles.copy, { color: palette.text }]}>{page.copy}</Text>
      <Text nativeID={`billing-return-plan`} style={[styles.copy, { color: palette.muted }]}>Current Plan: {page.billing.planLabel}</Text>
      {page.billing.error && <Text nativeID={`billing-return-error`} style={[styles.copy, { color: palette.error }]}>{page.billing.error}</Text>}
      <Text nativeID={`billing-return-native-management`} style={[styles.copy, { color: palette.muted }]}>Subscriptions are managed on the Spelling Spells website</Text>
      <Pressable nativeID={`billing-return-refresh`} accessibilityRole={`button`} disabled={Boolean(page.billing.busy)} onPress={page.refresh} style={[styles.action, { borderColor: palette.border }]}><Icon name={`refresh`} size={16} color={palette.primary} /><Text style={{ color: palette.text }}>{page.billing.busy === `reconcile` ? `Checking…` : `Refresh Confirmation`}</Text></Pressable>
      <Pressable nativeID={`billing-return-profile`} accessibilityRole={`link`} onPress={() => router.push(`/profile`)} style={[styles.action, { borderColor: palette.border }]}><Icon name={`user`} size={16} color={palette.primary} /><Text style={{ color: palette.text }}>Your Profile</Text></Pressable>
    </View>}
  </AccountLayout>;
};

export default BillingReturn;
