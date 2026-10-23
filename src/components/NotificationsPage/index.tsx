import Icon from '../Icon';
import Skeleton from '../Skeleton';
import styles from './styles.native';
import PageMetadata from '../PageMetadata';
import NotificationCard from '../NotificationCard';
import { Text, View, Pressable } from 'react-native';
import { useNotificationsPage } from './useNotificationsPage';
import { useTheme } from '../../shared/themeContext/useTheme';

const NotificationsPage = () => {
  const page = useNotificationsPage();
  const { palette } = useTheme();
  const countPending = page.state === `loading` || (page.state === `ready` && page.readState === `loading`);
  return <View nativeID='notifications-page' style={styles.page}>
    <PageMetadata noIndex title='Notifications' canonicalPath='/notifications' description='The latest notes and announcements from Spelling Spells.' />
    <View nativeID='notifications-page-heading' style={styles.heading}><View style={styles.eyebrowRow}><Icon name='bell' size={15} color={palette.primary} /><Text nativeID='notifications-page-eyebrow' style={[styles.eyebrow, { color: palette.primary }]}>FROM THE ARCHIVE</Text></View><Text nativeID='notifications-page-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>Stay in the know.</Text><Text nativeID='notifications-page-description' style={[styles.copy, { color: palette.muted }]}>The latest notes and announcements from Spelling Spells, all in one place.</Text></View>
    <View nativeID='notifications-page-updates' style={[styles.updates, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      {countPending ? <Text nativeID='notifications-page-loading-status' accessibilityLiveRegion='polite' style={styles.loadingLabel}>{page.state === `loading` ? `Loading Notifications` : `Loading Read Status`}</Text> : null}
      <View nativeID='notifications-page-toolbar' style={styles.toolbar}>
        <View style={styles.headingCopy}>
          <Text nativeID='notifications-page-list-title' accessibilityRole='header' style={[styles.sectionTitle, { color: palette.text }]}>Notifications</Text>
          {countPending ? <Skeleton id='notifications-page-count-loading' width={190} height={10} /> : <Text nativeID='notifications-page-count' accessibilityLiveRegion='polite' style={[styles.small, { color: palette.muted }]}>{page.state !== `ready` ? `Notifications Unavailable` : `${page.records.length} Notification(s) · ${page.unreadLabel} Unread`}</Text>}
        </View>
        <View nativeID='notifications-page-actions' style={styles.actions}><Pressable nativeID='notifications-page-reload' accessibilityRole='button' onPress={page.reload} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='refresh' size={15} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>Reload</Text></Pressable><Pressable nativeID='notifications-page-read-all' accessibilityRole='button' accessibilityState={{ disabled: !page.canMarkRead || !page.unreadCount, busy: page.busy }} disabled={!page.canMarkRead || !page.unreadCount} onPress={() => void page.markAllRead().catch(() => undefined)} style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel, opacity: !page.canMarkRead || !page.unreadCount ? .5 : 1 }]}><Icon name='check-all' size={15} color={palette.primary} /><Text style={[styles.buttonText, { color: palette.text }]}>{page.busy ? `Saving Read Status` : `Mark All Read`}</Text></Pressable></View>
      </View>
      {page.message && page.state !== `loading` ? <Text nativeID='notifications-page-message' accessibilityRole={page.state === `error` || page.state === `denied` ? `alert` : undefined} style={[styles.small, { color: page.state === `error` || page.state === `denied` ? palette.error : palette.muted }]}>{page.message}</Text> : null}
      <View nativeID='notifications-page-list' accessibilityState={{ busy: page.state === `loading` }}>
        {page.state === `loading` && !page.records.length ? <View nativeID='notifications-page-loading' accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>{[0, 1, 2].map((index) => <View key={index} nativeID={`notifications-page-skeleton-${index}`} style={[styles.skeletonRow, { borderBottomColor: palette.border }]}><Skeleton width={36} height={36} shape='circle' /><View style={styles.skeletonCopy}><Skeleton width={`${72 - index * 9}%`} height={22} /><Skeleton width='100%' height={12} /><Skeleton width='82%' height={12} /></View><Skeleton width={15} height={15} /></View>)}</View> : page.records.length ? page.records.map((record) => <NotificationCard record={record} key={record.id} idPrefix='notifications-page-card' />) : <View nativeID='notifications-page-empty' style={styles.empty}><Icon name='bell' size={30} color={palette.primary} /><Text accessibilityRole='header' style={[styles.sectionTitle, { color: palette.text }]}>{page.state === `ready` ? `You’re All Caught Up` : `Notifications Unavailable`}</Text><Text style={[styles.copy, { color: palette.muted }]}>{page.state === `ready` ? `New updates will appear here.` : `Reload to reconnect to the archive’s announcements.`}</Text></View>}
      </View>
      {page.readError ? <Text nativeID='notifications-page-read-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{page.readError}</Text> : null}
      {page.actionError ? <Text nativeID='notifications-page-action-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{page.actionError}</Text> : null}
      <View nativeID='notifications-page-footer' style={[styles.footer, { borderTopColor: palette.border }]}><Text nativeID='notifications-page-coverage' style={[styles.small, { color: palette.muted }]}>{page.coverage}</Text>{page.readState === `loading` ? <Skeleton id='notifications-page-read-scope-loading' width={220} height={10} /> : <Text nativeID='notifications-page-read-scope' style={[styles.small, { color: palette.muted }]}>{page.readScopeLabel}</Text>}{page.state === `loading` ? <Skeleton id='notifications-page-live-status-loading' width={145} height={10} /> : <Text nativeID='notifications-page-live-status' style={[styles.small, { color: palette.muted }]}>{page.realtime === `subscribed` && page.state === `ready` ? `Live Announcements` : page.realtime === `connecting` ? `Connecting to Announcements` : `Live Updates Unavailable`}</Text>}</View>
    </View>
  </View>;
};

export default NotificationsPage;
