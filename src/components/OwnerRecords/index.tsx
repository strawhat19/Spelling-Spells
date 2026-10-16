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
  const { snapshot } = page;
  const ready = snapshot?.state === `ready`;
  const loading = page.loading || (page.permitted && (!snapshot || snapshot.state === `loading`));
  return <AccountLayout section='admin' title={page.content.title} description={page.content.description} eyebrow='OWNER WORKSPACE'>
    <View nativeID={`owner-${view}-access`} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Icon name={page.content.icon} color={palette.gold} size={28} />
      <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{page.loading ? `Checking account access.` : !page.permitted ? page.account ? `Owner access required` : `Sign in to view this` : ready ? `Private account directory` : loading ? `Loading accounts.` : `Service unavailable`}</Text>
      <Text accessibilityLiveRegion='polite' style={[styles.copy, { color: palette.muted }]}>{page.permitted ? snapshot?.message ?? `Waiting for confirmed account data.` : `Only an active, verified Owner can access private records.`}</Text>
      {!page.account && !page.loading ? <View><Pressable accessibilityRole='link' nativeID={`owner-${view}-signin`} onPress={() => router.push({ pathname: `/signin`, params: { returnTo: page.content.path } })} style={styles.action}><Icon name='user' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>Sign in</Text></Pressable><Pressable accessibilityRole='link' nativeID={`owner-${view}-signup`} onPress={() => router.push({ pathname: `/signup`, params: { returnTo: page.content.path } })} style={styles.action}><Icon name='user' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>Create account</Text></Pressable></View> : null}
      {page.permitted && view === `users` ? <Pressable nativeID='owner-users-reload' accessibilityRole='button' accessibilityState={{ disabled: loading }} disabled={loading} onPress={page.retry} style={styles.action}><Icon name='refresh' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>{loading ? `Loading` : `Reload accounts`}</Text></Pressable> : null}
    </View>
    <View nativeID={`owner-${view}-records`} style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
      <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{view === `users` ? `Account records` : `Feedback workspace`}</Text>
      <Text style={[styles.copy, { color: palette.muted }]}>{ready ? snapshot?.realtime === `subscribed` ? `Listening for account changes.` : `Server data loaded; connecting updates.` : loading ? `Loading confirmed records.` : `Records unavailable. No empty-result count is assumed.`}</Text>
      {ready && snapshot?.records?.length ? snapshot.records.map((record) => <View key={record.id} nativeID={`owner-user-${record.id}`} style={[styles.record, { borderColor: palette.border }]}>
        <Text accessibilityRole='header' style={[styles.recordTitle, { color: palette.text }]}>{record.number}. {record.displayName}</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>{record.email}</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>Role: {record.role}</Text>
        <View style={styles.rowStatus}><View style={styles.statusDotWrap}><View style={[styles.statusDot, { backgroundColor: record.active ? `#38a778` : palette.muted }]} /></View><Text style={[styles.statusText, { color: record.active ? `#38a778` : palette.muted }]}>{record.active ? `Active` : `Inactive`}</Text></View>
        <Text style={[styles.copy, { color: palette.muted }]}>Read only</Text>
      </View>) : ready ? <Text style={[styles.copy, { color: palette.muted }]}>No accounts on this page.</Text> : null}
      {page.permitted && view === `users` ? <View nativeID='owner-users-pagination' style={styles.pagination}>
        <Pressable nativeID='owner-users-previous' accessibilityRole='button' accessibilityState={{ disabled: !page.hasPrevious || loading }} disabled={!page.hasPrevious || loading} onPress={page.previous} style={[styles.action, { opacity: !page.hasPrevious || loading ? .5 : 1 }]}><Icon name='arrow' size={15} color={palette.gold} /><Text style={{ color: palette.gold }}>Previous</Text></Pressable>
        <Text style={[styles.copy, { color: palette.muted }]}>Page {page.pageNumber}</Text>
        <Pressable nativeID='owner-users-next' accessibilityRole='button' accessibilityState={{ disabled: !ready || snapshot?.nextCursor == null || loading }} disabled={!ready || snapshot?.nextCursor == null || loading} onPress={page.next} style={[styles.action, { opacity: !ready || snapshot?.nextCursor == null || loading ? .5 : 1 }]}><Text style={{ color: palette.gold }}>Older accounts</Text><Icon name='arrow-right' size={15} color={palette.gold} /></Pressable>
      </View> : null}
      <Text style={[styles.copy, { color: palette.muted }]}>{page.content.boundary}</Text>
      {view === `feedback` ? <Pressable accessibilityRole='link' nativeID='feedback-review-submissions' onPress={() => router.push(`/review` as Href)} style={styles.action}><Icon name='shield' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>Submission review</Text></Pressable> : null}
    </View>
  </AccountLayout>;
};
export default OwnerRecords;
