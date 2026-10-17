import Icon from '../Icon';
import { useState } from 'react';
import styles from './styles.native';
import AccountLayout from '../AccountLayout';
import { useRouter, type Href } from 'expo-router';
import { useOwnerRecords } from './useOwnerRecords';
import { Text, View, Image, Pressable } from 'react-native';
import AccountSignInMethods from '../AccountSignInMethods';
import { useTheme } from '../../shared/themeContext/useTheme';
import type { OwnerRecordView, OwnerAccountRecord } from '../../shared/admin/service';

const OwnerRecordAvatar = ({ record }: { record: OwnerAccountRecord }) => {
  const { palette } = useTheme();
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  return <View nativeID={`owner-user-avatar-${record.id}`} accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={[styles.avatar, { backgroundColor: palette.primary, borderColor: palette.border }]}>
    {record.avatarUrl && record.avatarUrl !== failedPhoto ? <Image nativeID={`owner-user-photo-${record.id}`} source={{ uri: record.avatarUrl }} onError={() => setFailedPhoto(record.avatarUrl)} style={styles.avatarImage} /> : <Text nativeID={`owner-user-initial-${record.id}`} style={[styles.avatarInitial, { color: palette.background }]}>{record.displayName?.trim()?.[0]?.toUpperCase() || `U`}</Text>}
  </View>;
};

const OwnerRecords = ({ view }: { view: OwnerRecordView }) => {
  const page = useOwnerRecords(view);
  const router = useRouter();
  const { palette } = useTheme();
  const { snapshot } = page;
  const ready = snapshot?.state === `ready`;
  const loading = page.loading || (page.permitted && (!snapshot || snapshot.state === `loading`));
  return <AccountLayout section='admin' title={page.content.title} description={page.content.description} eyebrow='OWNER WORKSPACE'>
    {view === `feedback` ? <View nativeID={`owner-${view}-access`} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Icon name={page.content.icon} color={palette.gold} size={28} />
      <Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{page.loading ? `Checking account access.` : !page.permitted ? page.account ? `Owner access required` : `Sign in to view this` : ready ? `Private account directory` : loading ? `Loading accounts.` : `Service unavailable`}</Text>
      <Text accessibilityLiveRegion='polite' style={[styles.copy, { color: palette.muted }]}>{page.permitted ? snapshot?.message ?? `Waiting for confirmed account data.` : `Only an active, verified Owner can access private records.`}</Text>
      {!page.account && !page.loading ? <View><Pressable accessibilityRole='link' nativeID={`owner-${view}-signin`} onPress={() => router.push({ pathname: `/signin`, params: { returnTo: page.content.path } })} style={styles.action}><Icon name='user' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>Sign in</Text></Pressable><Pressable accessibilityRole='link' nativeID={`owner-${view}-signup`} onPress={() => router.push({ pathname: `/signup`, params: { returnTo: page.content.path } })} style={styles.action}><Icon name='user' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>Create account</Text></Pressable></View> : null}
    </View> : null}
    <View nativeID={`owner-${view}-records`} style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
      <View nativeID={`owner-${view}-records-heading`} style={styles.heading}>
        <Text nativeID={`owner-${view}-records-title`} accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{view === `users` ? `Users` : `Feedback workspace`}</Text>
        {page.permitted && view === `users` ? <Pressable nativeID='owner-users-reload' accessibilityRole='button' accessibilityState={{ busy: loading, disabled: loading }} disabled={loading} onPress={page.retry} style={styles.action}><Icon name='refresh' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>{loading ? `Loading` : `Reload Users`}</Text></Pressable> : null}
      </View>
      <Text nativeID={`owner-${view}-records-status`} accessibilityLiveRegion='polite' accessibilityRole={!ready && !loading ? `alert` : undefined} style={[styles.copy, { color: !ready && !loading && view === `users` ? palette.error : palette.muted }]}>{ready ? snapshot?.realtime === `subscribed` ? `Listening for account changes.` : `Server data loaded; connecting updates.` : snapshot?.message ?? (loading ? `Loading confirmed records.` : `Records unavailable. No empty-result count is assumed.`)}</Text>
      {ready && snapshot?.records?.length ? snapshot.records.map((record) => <View key={record.id} nativeID={`owner-user-${record.id}`} style={[styles.record, { borderColor: palette.border }]}>
        <View nativeID={`owner-user-identity-${record.id}`} style={styles.recordHeading}><OwnerRecordAvatar record={record} /><Text nativeID={`owner-user-name-${record.id}`} accessibilityRole='header' style={[styles.recordTitle, { color: palette.text }]}>{record.number}. {record.displayName}</Text></View>
        <View nativeID={`owner-user-email-${record.id}`} style={styles.email}><AccountSignInMethods id={`owner-user-signin-methods-${record.id}`} providers={record.authProviders} /><Text nativeID={`owner-user-email-address-${record.id}`} style={[styles.copy, styles.emailAddress, { color: palette.muted }]}>{record.email}</Text></View>
        <Text style={[styles.copy, { color: palette.muted }]}>Role: {record.role}</Text>
        <View style={styles.rowStatus}><View style={styles.statusDotWrap}><View style={[styles.statusDot, { backgroundColor: record.active ? `#38a778` : palette.muted }]} /></View><Text style={[styles.statusText, { color: record.active ? `#38a778` : palette.muted }]}>{record.active ? `Active` : `Inactive`}</Text></View>
        <Text style={[styles.copy, { color: palette.muted }]}>Read only</Text>
      </View>) : ready ? <Text style={[styles.copy, { color: palette.muted }]}>No users on this page.</Text> : null}
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
