import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import AccountLayout from '../AccountLayout';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Linking, TextInput, Pressable } from 'react-native';
import { submissionStatusLabel, useSubmissionReview } from './useSubmissionReview';

const SubmissionReview = ({ review = false }: { review?: boolean }) => {
  const page = useSubmissionReview(review);
  const router = useRouter();
  const { palette } = useTheme();
  const buttonStyle = [styles.button, { backgroundColor: palette.panel, opacity: page.busy ? .5 : 1 }];
  return <AccountLayout section={review ? `admin` : `account`} title={review ? `Requests` : `My Submissions`} eyebrow='Private Editorial History'>
    <View nativeID={review ? `review-submissions` : `my-submissions`} style={styles.page}>
      <Text style={[styles.body, { color: palette.muted }]}>Page {page.pageNumber} / Up To 50 Records. Approval does not publish an entry.</Text>
      {page.loading ? <Text accessibilityLiveRegion='polite' style={{ color: palette.text }}>Loading Private Submissions...</Text> : !page.permitted ? <Text style={{ color: palette.text }}>Sign in with a permitted account to view these private records.</Text> : page.result?.state !== `ready` ? <Text accessibilityRole='alert' style={{ color: palette.error }}>{page.result?.message}</Text> : !page.records.length ? <Text style={{ color: palette.muted }}>No Submissions On This Page</Text> : page.records.map((record) => <View key={record.id} nativeID={`submission-${record.id}`} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.kicker, { color: palette.gold }]}>No. {record.number} / {submissionStatusLabel(record.status)}</Text>
        <Text accessibilityRole='header' style={[styles.heading, { color: palette.text }]}>{record.name}</Text>
        <Text style={[styles.body, { color: palette.muted }]}>{record.world} / Updated {new Date(record.updatedAt).toLocaleString()}</Text>
        <Text style={[styles.kicker, { color: palette.muted }]}>{record.kind === `correction` ? `Correction` : `New Entry`}</Text><Text style={[styles.body, { color: palette.text }]}>{record.definition}</Text>
        {record.pronunciation ? <Text style={[styles.body, { color: palette.muted }]}>Submitted Reading: {record.pronunciation}</Text> : null}
        {record.notes ? <Text style={[styles.body, { color: palette.muted }]}>Contributor Notes: {record.notes}</Text> : null}
        {record.reviewerNote ? <Text style={[styles.body, { color: palette.text }]}>Owner Note: {record.reviewerNote}</Text> : null}
        <Pressable accessibilityRole='link' nativeID={`submission-source-${record.id}`} onPress={() => void Linking.openURL(record.sourceUrl).catch(() => undefined)} style={buttonStyle}><Icon name='external' size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>View Submitted Source</Text></Pressable>
        {record.mediaUrl ? <Pressable accessibilityRole='link' nativeID={`submission-media-${record.id}`} onPress={() => void Linking.openURL(record.mediaUrl).catch(() => undefined)} style={buttonStyle}><Text style={{ color: palette.gold }}>View Submitted Media / Rights Not Verified</Text></Pressable> : null}
        {review ? <View style={styles.page}><Pressable accessibilityRole='button' disabled={page.busy} onPress={() => page.select(record)} style={buttonStyle}><Icon name='edit' size={16} color={palette.text} /><Text style={{ color: palette.text }}>Review</Text></Pressable><Pressable accessibilityRole='link' onPress={() => router.push({ pathname: `/catalog-editor`, params: { submission: record.id } })} style={buttonStyle}><Icon name='book' size={16} color={palette.text} /><Text style={{ color: palette.text }}>Prepare Catalog Entry</Text></Pressable></View> : null}
        {review && page.selectedId === record.id ? <View style={styles.page}>
          <Text style={[styles.body, { color: palette.muted }]}>Create and approve a catalog entry first, then select it here. Publication is separate.</Text>
          {page.approvedEntries.map((entry) => <Pressable key={entry.id} nativeID={`submission-approved-entry-${entry.id}`} accessibilityRole='button' accessibilityState={{ selected: page.entryId === entry.id }} disabled={page.busy} onPress={() => page.setEntryId(entry.id)} style={[buttonStyle, { borderColor: page.entryId === entry.id ? palette.gold : palette.border, borderWidth: 1 }]}><Text style={{ color: palette.text }}>{entry.name} / {entry.status}</Text></Pressable>)}
          <TextInput accessibilityLabel='Review Note' nativeID={`submission-note-${record.id}`} multiline maxLength={2000} editable={!page.busy} value={page.note} onChangeText={page.setNote} style={{ padding: 14, minHeight: 90, borderWidth: 1, borderColor: palette.border, borderRadius: 8, color: palette.text }} />
          {([`approved`, `changes-requested`, `rejected`] as const).map((status) => <Pressable key={status} accessibilityRole='button' nativeID={`submission-${status}-${record.id}`} disabled={page.busy} onPress={() => void page.decide(record, status)} style={buttonStyle}><Icon name={status === `approved` ? `check` : status === `rejected` ? `close` : `edit`} size={16} color={palette.gold} /><Text style={{ color: palette.gold }}>{submissionStatusLabel(status)}</Text></Pressable>)}
        </View> : null}
      </View>)}
      {page.error ? <Text accessibilityRole='alert' style={{ color: palette.error }}>{page.error}</Text> : null}
      {page.notice ? <Text accessibilityLiveRegion='polite' style={{ color: palette.gold }}>{page.notice}</Text> : null}
      <View style={styles.page}>{[{ label: `Reload`, icon: `refresh`, disabled: page.busy, action: page.reload }, { label: `Previous Page`, icon: `chevron-left`, disabled: page.busy || page.loading || !page.hasPrevious, action: page.previous }, { label: `Next Page`, icon: `chevron-right`, disabled: page.busy || page.loading || !page.hasNext, action: page.next }].map((action) => <Pressable key={action.label} accessibilityRole='button' disabled={action.disabled} onPress={action.action} style={[buttonStyle, { opacity: action.disabled ? .45 : 1 }]}><Icon name={action.icon} size={16} color={palette.text} /><Text style={{ color: palette.text }}>{action.label}</Text></Pressable>)}</View>
    </View>
  </AccountLayout>;
};

export default SubmissionReview;
