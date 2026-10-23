import Icon from '../Icon';
import Skeleton from '../Skeleton';
import styles from './styles.native';
import { useRouter } from 'expo-router';
import NotificationCard from '../NotificationCard';
import { useRef, useState, useEffect } from 'react';
import { useNotificationMenu } from './useNotificationMenu';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useAccountShell } from '../../shared/accountShellContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, Modal, Easing, Animated, Pressable, ScrollView, findNodeHandle, AccessibilityInfo, useWindowDimensions } from 'react-native';

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
  const open = useRef(page.open);
  const motion = useRef(new Animated.Value(0)).current;
  const [present, setPresent] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 44, height: 44 });
  open.current = page.open;
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
    let cancelled = false;
    if (page.open) setPresent(true);
    const animation = Animated.timing(motion, {
      useNativeDriver: true,
      toValue: page.open ? 1 : 0,
      duration: shell?.reducedMotion ? 0 : page.open ? 220 : 180,
      easing: page.open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
    animation.start(({ finished }) => { if (finished && !cancelled && !open.current) setPresent(false); });
    return () => { cancelled = true; animation.stop(); };
  }, [page.open, shell?.reducedMotion, motion]);
  useEffect(() => {
    if (present) { wasOpen.current = true; return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (!restoreFocus.current) return;
    const timeout = setTimeout(() => focus(trigger.current), 100);
    return () => clearTimeout(timeout);
  }, [present]);
  const top = Math.max(insets.top + 12, Math.min(anchor.y + anchor.height + 10, height - insets.bottom - 180));
  const countPending = page.state === `loading` || (page.state === `ready` && page.readState === `loading`);
  const unreadDescription = page.unreadCount === null ? `Unread Count ${countPending ? `Loading` : `Unavailable`}` : `${page.unreadCount} Unread`;
  if (!page.enabled) return null;
  return <>
    <Pressable ref={trigger} nativeID='header-notifications-trigger' accessibilityRole='button' accessibilityLabel={`Notifications, ${unreadDescription}`} accessibilityState={{ expanded: page.open }} onPress={toggle} style={[styles.trigger, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='bell' size={20} color={palette.primary} />{page.unreadCount === null || page.unreadCount > 0 ? <View nativeID='header-notifications-badge' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={[styles.badge, { borderColor: palette.background, backgroundColor: countPending ? palette.panel : palette.gold }]}>{countPending ? <Skeleton id='header-notifications-badge-skeleton' width={10} height={7} /> : <Text style={styles.badgeText}>{page.unreadLabel}</Text>}</View> : null}</Pressable>
    <Modal transparent visible={present} statusBarTranslucent onRequestClose={() => close()} onShow={() => { if (open.current) focus(closeButton.current); }} onDismiss={() => { if (!open.current && restoreFocus.current) focus(trigger.current); }} animationType='none'>
      <Animated.View nativeID='notifications-menu-overlay' pointerEvents={page.open ? `auto` : `none`} accessibilityElementsHidden={!page.open} importantForAccessibility={page.open ? `auto` : `no-hide-descendants`} style={[styles.overlay, { opacity: motion }]}>
        <Pressable nativeID='notifications-menu-dismiss' accessible={false} onPress={() => close()} style={styles.backdrop} />
        <Animated.View nativeID='header-notifications-panel' accessibilityViewIsModal={page.open} onAccessibilityEscape={() => close()} accessibilityLabel='Notifications' style={[styles.panel, { top, width: Math.min(400, width - 36), maxHeight: height - top - insets.bottom - 18, right: Math.max(18, Math.min(width - anchor.x - anchor.width, width - Math.min(400, width - 36) - 18)), borderColor: palette.border, backgroundColor: palette.surface, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
          <ScrollView nativeID='header-notifications-scroll' bounces={false} style={styles.scroll} contentContainerStyle={styles.content}>
            {countPending ? <Text nativeID='header-notifications-loading-status' accessibilityLiveRegion='polite' style={styles.loadingLabel}>{page.state === `loading` ? `Loading Notifications` : `Loading Read Status`}</Text> : null}
            <View nativeID='header-notifications-heading' style={styles.heading}><View style={styles.headingCopy}><Text nativeID='header-notifications-eyebrow' style={[styles.eyebrow, { color: palette.muted }]}>FROM THE ARCHIVE</Text><Text nativeID='header-notifications-title' accessibilityRole='header' style={[styles.title, { color: palette.text }]}>Notifications</Text></View><Pressable ref={closeButton} nativeID='header-notifications-close' accessibilityRole='button' accessibilityLabel='Close Notifications' onPress={() => close()} style={[styles.close, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name='close' size={18} color={palette.text} /></Pressable></View>
            <View nativeID='header-notifications-toolbar' style={[styles.toolbar, { borderBottomColor: palette.border }]}>{countPending ? <View nativeID='header-notifications-count-loading' style={styles.countSkeleton}><Skeleton width={100} height={10} /></View> : <Text nativeID='header-notifications-count' accessibilityLiveRegion='polite' style={[styles.count, { color: palette.muted }]}>{unreadDescription}</Text>}<Pressable nativeID='header-notifications-read-all' accessibilityRole='button' accessibilityState={{ disabled: !page.canMarkRead || !page.unreadCount, busy: page.busy }} disabled={!page.canMarkRead || !page.unreadCount} onPress={() => void page.markAllRead().catch(() => undefined)} style={[styles.action, { opacity: !page.canMarkRead || !page.unreadCount ? .5 : 1 }]}><Icon name='check-all' size={14} color={palette.primary} /><Text style={[styles.actionText, { color: palette.primary }]}>{page.busy ? `Saving` : `Mark All Read`}</Text></Pressable><Pressable nativeID='header-notifications-reload' accessibilityRole='button' accessibilityLabel='Reload Notifications' onPress={page.reload} style={styles.action}><Icon name='refresh' size={15} color={palette.primary} /></Pressable></View>
            {page.message && page.state !== `loading` ? <Text nativeID='header-notifications-message' accessibilityRole={page.state === `error` || page.state === `denied` ? `alert` : undefined} style={[styles.small, { color: page.state === `error` || page.state === `denied` ? palette.error : palette.muted }]}>{page.message}</Text> : null}
            <View nativeID='header-notifications-list' accessibilityState={{ busy: page.state === `loading` }}>
              {page.state === `loading` && !page.records.length ? <View nativeID='header-notifications-loading' accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>{[0, 1, 2].map((index) => <View key={index} nativeID={`header-notifications-skeleton-${index}`} style={[styles.skeletonRow, { borderBottomColor: palette.border }]}><Skeleton width={36} height={36} shape='circle' /><View style={styles.skeletonCopy}><Skeleton width={`${72 - index * 9}%`} height={21} /><Skeleton width='100%' height={11} /><Skeleton width='82%' height={11} /></View><Skeleton width={14} height={14} /></View>)}</View> : page.records.length ? page.records.map((record) => <NotificationCard key={record.id} record={record} idPrefix='notification-menu-card' onNavigate={() => close(false)} />) : <View nativeID='header-notifications-empty' style={styles.empty}><Icon name='bell' size={25} color={palette.primary} /><Text style={[styles.emptyTitle, { color: palette.text }]}>{page.state === `ready` ? `You’re All Caught Up` : `Notifications Unavailable`}</Text><Text style={[styles.copy, { color: palette.muted }]}>{page.state === `ready` ? `New updates will appear here.` : `Reload to reconnect.`}</Text></View>}
            </View>
            {page.readError ? <Text nativeID='header-notifications-read-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{page.readError}</Text> : null}
            {page.actionError ? <Text nativeID='header-notifications-action-error' accessibilityRole='alert' style={[styles.small, { color: palette.error }]}>{page.actionError}</Text> : null}
            <View nativeID='header-notifications-footer' style={[styles.footer, { borderTopColor: palette.border }]}><Text nativeID='header-notifications-coverage' style={[styles.small, { color: palette.muted }]}>{page.coverage}</Text>{page.readState === `loading` ? <Skeleton id='header-notifications-read-scope-loading' width={210} height={9} /> : <Text nativeID='header-notifications-read-scope' style={[styles.small, { color: palette.muted }]}>{page.readScopeLabel}</Text>}<Pressable nativeID='header-notifications-view-all' accessibilityRole='link' onPress={() => { close(false); router.push(`/notifications`); }} style={styles.viewAll}><Text style={[styles.actionText, { color: palette.primary }]}>View All Notifications</Text><Icon name='arrow-right' size={15} color={palette.primary} /></Pressable></View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  </>;
};

export default NotificationMenu;
