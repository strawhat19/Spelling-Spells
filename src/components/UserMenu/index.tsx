import Icon from '../Icon';
import Skeleton from '../Skeleton';
import styles from './styles.native';
import { useAuth } from '../../shared/authContext';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useAccountShell } from '../../shared/accountShellContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { canAccessOwner, getAccountAvatar, getAccountPlanLabel } from '../../shared/authentication/types';
import { Text, View, Image, Modal, Pressable, ScrollView, findNodeHandle, AccessibilityInfo, useWindowDimensions } from 'react-native';

const UserMenu = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const shell = useAccountShell();
  const { width, height } = useWindowDimensions();
  const trigger = useRef<View>(null);
  const profileLink = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(``);
  const [panelHeight, setPanelHeight] = useState(280);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 44, height: 44 });
  const { palette } = useTheme();
  const { account, loading, signOut } = useAuth();
  const photo = getAccountAvatar(account);
  const owner = canAccessOwner(account);
  const focus = (target: View | null) => {
    target?.focus();
    const node = findNodeHandle(target);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };
  const close = () => setOpen(false);
  const navigate = (href: `/profile` | `/dashboard`) => { close(); router.push(href); };
  useEffect(() => { setOpen(false); setError(``); }, [pathname, account?.id, owner]);
  const toggle = () => {
    if (!account) { router.push(`/signin`); return; }
    trigger.current?.measureInWindow((x, y, triggerWidth, triggerHeight) => setAnchor({ x, y, width: triggerWidth, height: triggerHeight }));
    setOpen((current) => !current);
  };
  const handleSignOut = async () => {
    setBusy(true);
    setError(``);
    try {
      const result = await signOut();
      if (!result.ok) { setError(result.message); return; }
      close();
      router.replace(`/`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : `Could Not Sign Out`);
    } finally { setBusy(false); }
  };
  return <>
    <Pressable
      ref={trigger}
      onPress={toggle}
      disabled={loading || busy}
      nativeID='header-account-link'
      accessibilityRole={account ? `button` : `link`}
      accessibilityState={{ busy: loading || busy, expanded: account ? open : undefined }}
      accessibilityLabel={loading ? `Loading Account` : account ? `${account.displayName} Account Menu` : `Sign In`}
      style={[styles.button, { borderColor: palette.border, backgroundColor: palette.panel }, !loading && !account && [styles.signInButton, { borderColor: palette.gold, shadowColor: palette.primary }]]}
    >
      {loading ? <Skeleton id='header-account-loading' shape='circle' width={30} height={30} /> : account ? photo && photo !== failedPhoto ? <Image nativeID='header-account-avatar' source={{ uri: photo }} onError={() => setFailedPhoto(photo)} style={styles.avatar} /> : <Text nativeID='header-account-initial' style={[styles.initial, { color: palette.gold }]}>{account.displayName?.trim()?.[0]?.toUpperCase() || `A`}</Text> : <View nativeID='header-signin-artwork' accessible={false} pointerEvents='none' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={styles.signInArtwork}>
        <View nativeID='header-signin-ring' style={[styles.signInRing, { borderColor: palette.gold }]} />
        <Icon name='user' size={20} color={palette.primary} />
        <View nativeID='header-signin-spark' style={styles.signInSpark}><Icon name='spark' size={8} color={palette.gold} /></View>
        <View nativeID='header-signin-star' style={[styles.signInStar, { backgroundColor: palette.gold }]} />
      </View>}
    </Pressable>
    <Modal transparent visible={open && Boolean(account)} statusBarTranslucent onRequestClose={close} onShow={() => focus(profileLink.current)} onDismiss={() => focus(trigger.current)} animationType={shell?.reducedMotion ? `none` : `fade`}>
      <View nativeID='account-menu-overlay' style={styles.overlay}>
        <Pressable nativeID='account-menu-dismiss' accessible={false} onPress={close} style={styles.backdrop} />
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          nativeID='account-menu-panel'
          accessibilityLabel='Account Menu'
          onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
          style={[styles.options, {
            borderColor: palette.border,
            maxWidth: width - 36,
            backgroundColor: palette.surface,
            maxHeight: height - insets.top - insets.bottom - 36,
            right: Math.max(18, width - anchor.x - anchor.width),
            top: Math.max(insets.top + 18, Math.min(anchor.y + anchor.height + 8, height - insets.bottom - panelHeight - 18)),
          }]}
        >
          <ScrollView bounces={false} contentContainerStyle={styles.optionsContent}>
            <View nativeID='account-menu-heading' style={[styles.heading, { borderBottomColor: palette.border }]}>
              <View nativeID='account-menu-identity' style={styles.identityRow}>
                <Text numberOfLines={1} nativeID='account-menu-name' style={[styles.name, { color: palette.text }]}>{account?.displayName}</Text>
                <View nativeID='account-menu-role-pill' style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panel }]}><Icon name={owner ? `shield` : `user`} size={10} color={palette.text} /><Text numberOfLines={1} accessibilityLabel={`Role: ${account?.role}`} style={[styles.pillText, { color: palette.text }]}>{account?.role}</Text></View>
              </View>
              <View nativeID='account-menu-email-row' style={styles.identityRow}>
                <Text numberOfLines={1} nativeID='account-menu-email' style={[styles.email, { color: palette.muted }]}>{account?.email}</Text>
                {account?.role !== `Owner` ? <View nativeID='account-menu-plan-pill' style={[styles.pill, { borderColor: palette.primary, backgroundColor: palette.panel }]}><Icon name='check' size={10} color={palette.primary} /><Text numberOfLines={1} accessibilityLabel={`Plan: ${getAccountPlanLabel(account)}`} style={[styles.pillText, { color: palette.primary }]}>{getAccountPlanLabel(account)}</Text></View> : null}
              </View>
            </View>
            <Pressable ref={profileLink} nativeID='account-menu-profile' accessibilityRole='link' onPress={() => navigate(`/profile`)} style={styles.item}><Icon name='user' size={16} color={palette.primary} /><Text style={[styles.itemText, { color: palette.text }]}>{`Profile`}</Text></Pressable>
            {owner ? <Pressable nativeID='account-menu-dashboard' accessibilityRole='link' onPress={() => navigate(`/dashboard`)} style={styles.item}><Icon name='dashboard' size={16} color={palette.primary} /><Text style={[styles.itemText, { color: palette.text }]}>{`Dashboard`}</Text></Pressable> : null}
            {error ? <Text nativeID='account-menu-error' accessibilityRole='alert' style={[styles.error, { color: palette.error }]}>{error}</Text> : null}
            <Pressable disabled={busy} nativeID='account-menu-signout' accessibilityRole='button' accessibilityState={{ busy }} onPress={() => void handleSignOut()} style={[styles.item, styles.signout, { borderTopColor: palette.border }]}><Icon name='logout' size={16} color={palette.error} /><Text style={[styles.itemText, { color: palette.error }]}>{busy ? `Signing Out` : `Sign Out`}</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
};

export default UserMenu;
