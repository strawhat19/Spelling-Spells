import Icon from '../Icon';
import styles from './styles.native';
import AccountLayout from '../AccountLayout';
import { useRouter, type Href } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { useOwnerRecords } from './useOwnerRecords';
import { useTheme } from '../../shared/themeContext/useTheme';
import type { OwnerRecordView } from '../../shared/admin/service';

const OwnerRecords = ({ view }: { view: OwnerRecordView }) => {
  const page = useOwnerRecords(view);
  const router = useRouter();
  const { palette } = useTheme();
  return <AccountLayout section='admin' title={page.content.title} description={page.content.description} eyebrow='OWNER WORKSPACE'>
    <View nativeID={`owner-${view}-access`} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Icon name={page.content.icon} color={palette.gold} size={28} />
      <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{page.loading ? `Checking account access…` : !page.permitted ? page.account ? `Owner access required` : `Sign in to view this` : `Connection required`}</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>{page.permitted ? page.snapshot?.message ?? `Waiting for service availability.` : `Only an active, verified Owner can access private records. This preview contains no account data or fabricated totals.`}</Text>
      {!page.account && !page.loading ? <View><Pressable accessibilityRole='link' nativeID={`owner-${view}-signin`} onPress={() => router.push({ pathname: `/signin`, params: { returnTo: page.content.path } })} style={styles.action}><Icon name='user' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>Sign in</Text></Pressable><Pressable accessibilityRole='link' nativeID={`owner-${view}-signup`} onPress={() => router.push({ pathname: `/signup`, params: { returnTo: page.content.path } })} style={styles.action}><Icon name='user' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>Create account</Text></Pressable></View> : null}
    </View>
    <View nativeID={`owner-${view}-preview`} style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
      <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>Workspace layout</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>Not connected. The future record cards will include {page.content.columns.join(`, `)}. No records have been loaded.</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>{page.content.boundary}</Text>
      {view === `feedback` ? <Pressable accessibilityRole='link' nativeID='feedback-review-submissions' onPress={() => router.push(`/review` as Href)} style={styles.action}><Icon name='shield' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>Submission review</Text></Pressable> : null}
    </View>
  </AccountLayout>;
};
export default OwnerRecords;
