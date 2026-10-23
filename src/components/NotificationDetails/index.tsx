import Icon from '../Icon';
import Skeleton from '../Skeleton';
import styles from './styles.native';
import { useState, useEffect } from 'react';
import PageMetadata from '../PageMetadata';
import { useRouter, type Href } from 'expo-router';
import { Text, View, Linking, Pressable } from 'react-native';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useNotificationDetails } from './useNotificationDetails';
import { getNotificationDate, getNotificationIcon, getNotificationSpacing, notificationKindLabels } from '../NotificationCard/values';

const NotificationDetails = () => {
  const page = useNotificationDetails();
  const router = useRouter();
  const { palette } = useTheme();
  const [linkError, setLinkError] = useState<string | null>(null);
  const record = page.record;
  useEffect(() => setLinkError(null), [page.slug]);
  const openLink = async () => {
    if (!record?.linkUrl) return;
    setLinkError(null);
    if (record.linkUrl.startsWith(`/`)) { router.push(record.linkUrl as Href); return; }
    try { await Linking.openURL(record.linkUrl); }
    catch { setLinkError(`This Link Could Not Be Opened`); }
  };
  return <View nativeID='notification-details' style={styles.page}>
    <PageMetadata noIndex title={record?.title ?? `Notification`} description={record?.body.slice(0, 160) ?? `A note from the Spelling Spells archive.`} />
    <Pressable nativeID='notification-details-back' accessibilityRole='link' onPress={() => router.push(`/notifications`)} style={styles.back}><Icon name='arrow-left' size={16} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.primary }]}>All Notifications</Text></Pressable>
    {record ? <View nativeID={`notification-details-${record.id}`} style={[styles.article, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View nativeID='notification-details-emblem' style={[styles.emblem, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name={getNotificationIcon(record)} size={34} color={palette.primary} /></View>
      <Text nativeID='notification-details-eyebrow' style={[styles.eyebrow, { color: palette.primary }]}>A NOTE FROM SPELLING SPELLS</Text>
      <Text nativeID='notification-details-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{record.title}</Text>
      <Text nativeID='notification-details-body' style={[styles.body, { color: palette.muted }]}>{record.body}{record.linkUrl && record.linkLabel ? <>{getNotificationSpacing(record.body, record.linkLabel)}<Text nativeID='notification-details-inline-link' accessibilityRole='link' accessibilityLabel={`${record.linkLabel}${record.linkUrl.startsWith(`/`) ? `` : `, Opens in Browser`}`} onPress={() => void openLink()} style={{ color: palette.primary, textDecorationLine: `underline` }}>{record.linkLabel}</Text></> : null}{getNotificationSpacing(record.linkLabel ?? record.body, record.suffix)}{record.suffix}</Text>
      <View nativeID='notification-details-metadata' style={[styles.metadata, { borderColor: palette.border }]}>{[{ id: `number`, label: `Notification`, value: String(record.number).padStart(2, `0`) }, { id: `kind`, label: `Type`, value: notificationKindLabels[record.kind] }, { id: `created`, label: `Created`, value: getNotificationDate(record.createdAt) }, { id: `read`, label: `Read Status`, value: page.readLabel }].map((item) => <View key={item.id} nativeID={`notification-details-${item.id}`} style={styles.metadataItem}><Text style={[styles.small, { color: palette.muted }]}>{item.label}</Text>{item.id === `read` && page.readState === `loading` ? <><Text nativeID='notification-details-read-loading-status' accessibilityLiveRegion='polite' style={styles.loadingLabel}>Loading Read Status</Text><Skeleton id='notification-details-read-loading' width={45} height={12} /></> : <Text style={[styles.metadataValue, { color: palette.text }]}>{item.value}</Text>}</View>)}</View>
      <View nativeID='notification-details-actions' style={styles.actions}><Pressable nativeID='notification-details-reload' accessibilityRole='button' onPress={page.reloadDetails} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='refresh' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>Reload</Text></Pressable>{!page.isRead ? <Pressable nativeID='notification-details-mark-read' accessibilityRole='button' accessibilityState={{ disabled: page.readState !== `ready` || page.busy, busy: page.busy }} disabled={page.readState !== `ready` || page.busy} onPress={() => void page.markRead([record.id]).catch(() => undefined)} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel, opacity: page.readState !== `ready` || page.busy ? .5 : 1 }]}><Icon name='check' size={14} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{page.busy ? `Saving Read Status` : `Mark as Read`}</Text></Pressable> : null}</View>
      {page.readError ? <Text nativeID='notification-details-read-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{page.readError}</Text> : null}
      {page.actionError ? <Text nativeID='notification-details-action-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{page.actionError}</Text> : null}
      {linkError ? <Text nativeID='notification-details-link-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{linkError}</Text> : null}
      {page.readState === `loading` ? <Skeleton id='notification-details-read-scope-loading' width={220} height={10} /> : <Text nativeID='notification-details-read-scope' style={[styles.small, { color: palette.muted }]}>{page.readScopeLabel}</Text>}
    </View> : page.detailState === `loading` ? <View nativeID='notification-details-loading' style={[styles.article, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Text nativeID='notification-details-loading-status' accessibilityLiveRegion='polite' style={styles.loadingLabel}>Loading Notification</Text>
      <View nativeID='notification-details-skeleton' accessibilityState={{ busy: true }} accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={styles.loadingContent}>
        <Skeleton id='notification-details-emblem-loading' width={72} height={72} shape='circle' />
        <Skeleton id='notification-details-eyebrow-loading' width={180} height={9} />
        <Skeleton id='notification-details-title-loading' width='85%' height={40} />
        <View nativeID='notification-details-body-loading' style={styles.loadingBody}><Skeleton width='100%' height={12} /><Skeleton width='96%' height={12} /><Skeleton width='100%' height={12} /><Skeleton width='72%' height={12} /></View>
        <View nativeID='notification-details-metadata-loading' style={[styles.metadata, { borderColor: palette.border }]}>{[0, 1, 2, 3].map((index) => <View key={index} nativeID={`notification-details-metadata-skeleton-${index}`} style={styles.metadataItem}><Skeleton width={75} height={10} /><Skeleton width={90} height={12} /></View>)}</View>
      </View>
    </View> : <View nativeID='notification-details-state' accessibilityRole={page.detailState === `error` ? `alert` : undefined} style={styles.empty}><Icon name='bell' size={35} color={palette.primary} /><Text nativeID='notification-details-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{page.detailState === `error` ? `Unable to Load This Notification` : `Notification Unavailable`}</Text><Text nativeID='notification-details-state-message' style={[styles.body, { color: palette.muted }]}>{page.detailError ?? `This notification is not currently active. Browse the archive’s other updates.`}</Text><Pressable nativeID='notification-details-retry' accessibilityRole='button' onPress={page.reloadDetails} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='refresh' size={15} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>Reload</Text></Pressable></View>}
  </View>;
};

export default NotificationDetails;
