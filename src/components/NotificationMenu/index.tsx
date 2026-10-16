import Icon from '../Icon';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import NotificationCard from '../NotificationCard';
import { useRef, useState, useEffect } from 'react';
import { useNotificationMenu } from './useNotificationMenu';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useAccountShell } from '../../shared/accountShellContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, Modal, Pressable, ScrollView, findNodeHandle, AccessibilityInfo, useWindowDimensions } from 'react-native';

const NotificationMenu = () => {
  const page = useNotificationMenu();
  const router = useRouter();
  const shell = useAccountShell();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { width, height } = useWindowDimensions();
  const trigger = useRef<View>(null);
  const closeButton = useRef<View>(null);
  const restoreFocus = useRef(true);
  const wasOpen = useRef(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 44, height: 44 });
  const focus = (target: View | null) => {
    target?.focus();
    const node = findNodeHandle(target);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };
  const close = (restore = true) => { restoreFocus.current = restore; page.close(); };
  const toggle = () => {
    if (page.open) { close(); return; }
    restoreFocus.current = true;
    page.reload();
    trigger.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => setAnchor({ x, y, width: measuredWidth, height: measuredHeight }));
    page.setOpen(true);
  };
  useEffect(() => {
    if (page.open) { wasOpen.current = true; return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (!restoreFocus.current) return;
    const timeout = setTimeout(() => focus(trigger.current), 100);
    return () => clearTimeout(timeout);
  }, [page.open]);
  const top = Math.max(insets.top + 12, Math.min(anchor.y + anchor.height + 10, height - insets.bottom - 180));
  const unreadDescription = page.unreadCount === null ? `Unread Count ${page.state === `loading` || page.readState === `loading` ? `Loading` : `Unavailable`}` : `${page.unreadCount} Unread`;
  return <>
    <Pressable ref={trigger} nativeID='header-notifications-trigger' accessibilityRole='button' accessibilityLabel={`Notifications, ${unreadDescription}`} accessibilityState={{ expanded: page.open }} onPress={toggle} style={[styles.trigger, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='bell' size={20} color={palette.primary} />{page.unreadCount === null || page.unreadCount > 0 ? <View nativeID='header-notifications-badge' style={[styles.badge, { borderColor: palette.background, backgroundColor: palette.gold }]}><Text style={styles.badgeText}>{page.unreadLabel}</Text></View> : null}</Pressable>
    <Modal transparent visible={page.open} statusBarTranslucent onRequestClose={() => close()} onShow={() => focus(closeButton.current)} onDismiss={() => { if (restoreFocus.current) focus(trigger.current); }} animationType={shell?.reducedMotion ? `none` : `fade`}>
      <View nativeID='notifications-menu-overlay' style={styles.overlay}>
        <Pressable nativeID='notifications-menu-dismiss' accessible={false} onPress={() => close()} style={styles.backdrop} />
        <View nativeID='header-notifications-panel' accessibilityViewIsModal onAccessibilityEscape={() => close()} accessibilityLabel='Notifications' style={[styles.panel, { top, width: Math.min(400, width - 36), maxHeight: height - top - insets.bottom - 18, right: Math.max(18, Math.min(width - anchor.x - anchor.width, width - Math.min(400, width - 36) - 18)), borderColor: palette.border, backgroundColor: palette.surface }]}>
          <ScrollView nativeID='header-notifications-scroll' bounces={false} style={styles.scroll} contentContainerStyle={styles.content}>
            <View nativeID='header-notifications-heading' style={styles.heading}><View style={styles.headingCopy}><Text nativeID='header-notifications-eyebrow' style={[styles.eyebrow, { color: palette.muted }]}>FROM THE ARCHIVE</Text><Text nativeID='header-notifications-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>Notifications</Text></View><Pressable ref={closeButton} nativeID='header-notifications-close' accessibilityRole='button' accessibilityLabel='Close Notifications' onPress={() => close()} style={[styles.close, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='close' size={18} color={palette.text} /></Pressable></View>
            <View nativeID='header-notifications-toolbar' style={[styles.toolbar, { borderBottomColor: palette.border }]}><Text nativeID='header-notifications-count' accessibilityLiveRegion='polite' style={[styles.count, { color: palette.muted }]}>{unreadDescription}</Text><Pressable nativeID='header-notifications-read-all' accessibilityRole='button' accessibilityState={{ disabled: !page.canMarkRead || !page.unreadCount, busy: page.busy }} disabled={!page.canMarkRead || !page.unreadCount} onPress={() => void page.markAllRead().catch(() => undefined)} style={[styles.action, { opacity: !page.canMarkRead || !page.unreadCount ? .5 : 1 }]}><Icon name='check-all' size={14} color={palette.primary} /><Text style={[styles.actionText, { color: palette.primary }]}>{page.busy ? `Saving` : `Mark All Read`}</Text></Pressable><Pressable nativeID='header-notifications-reload' accessibilityRole='button' accessibilityLabel='Reload Notifications' onPress={page.reload} style={styles.action}><Icon name='refresh' size={15} color={palette.primary} /></Pressable></View>
            {page.message ? <Text nativeID='header-notifications-message' accessibilityRole={page.state === `error` || page.state === `denied` ? `alert` : undefined} style={[styles.small, { color: page.state === `error` || page.state === `denied` ? palette.error : palette.muted }]}>{page.message}</Text> : null}
            <View nativeID='header-notifications-list' accessibilityState={{ busy: page.state === `loading` }}>
              {page.state === `loading` && !page.records.length ? <View nativeID='header-notifications-loading' style={styles.empty}><Icon name='bell' size={25} color={palette.primary} /><Text style={[styles.copy, { color: palette.muted }]}>Loading Notifications…</Text></View> : page.records.length ? page.records.map((record) => <NotificationCard key={record.id} record={record} idPrefix='notification-menu-card' onNavigate={() => close(false)} />) : <View nativeID='header-notifications-empty' style={styles.empty}><Icon name='bell' size={25} color={palette.primary} /><Text style={[styles.emptyTitle, { color: palette.text }]}>{page.state === `ready` ? `You’re All Caught Up` : `Notifications Unavailable`}</Text><Text style={[styles.copy, { color: palette.muted }]}>{page.state === `ready` ? `New updates will appear here.` : `Reload to reconnect.`}</Text></View>}
            </View>
            {page.readError ? <Text nativeID='header-notifications-read-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{page.readError}</Text> : null}
            {page.actionError ? <Text nativeID='header-notifications-action-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{page.actionError}</Text> : null}
            <View nativeID='header-notifications-footer' style={[styles.footer, { borderTopColor: palette.border }]}><Text nativeID='header-notifications-coverage' style={[styles.small, { color: palette.muted }]}>{page.coverage}</Text><Text nativeID='header-notifications-read-scope' style={[styles.small, { color: palette.muted }]}>{page.readScopeLabel}</Text><Pressable nativeID='header-notifications-view-all' accessibilityRole='link' onPress={() => { close(false); router.push(`/notifications`); }} style={styles.viewAll}><Text style={[styles.actionText, { color: palette.primary }]}>View All Notifications</Text><Icon name='arrow-right' size={15} color={palette.primary} /></Pressable></View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
};

export default NotificationMenu;
