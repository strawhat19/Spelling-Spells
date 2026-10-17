import Icon from '../Icon';
import styles from './styles.native';
import AccountGate from './AccountGate';
import PageMetadata from '../PageMetadata';
import { useEffect, useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useAccountShell } from '../../shared/accountShellContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccountLayout, type AccountLayoutProps } from './useAccountLayout';
import { Text, View, Image, Pressable, ScrollView, LayoutAnimation, useWindowDimensions } from 'react-native';

type NavigationLink = { href: string; label: string; icon: string };

const NativeAccountNavigation = ({ desktop, railWidth }: { desktop: boolean; railWidth: number }) => {
  const page = useAccountLayout();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const shell = useAccountShell();
  const { palette } = useTheme();
  const iconOnly = desktop && page.collapsed;
  const dashboardOpen = iconOnly || (desktop ? page.desktopDashboard : page.mobileDashboard);
  const feedbackOpen = iconOnly || (desktop ? page.desktopFeedback : page.mobileFeedback);
  const dashboard = page.adminLinks.find((item) => item.href === `/dashboard`);
  const feedback = page.adminLinks.find((item) => item.href === `/feedback`);
  const feedbackChildren = page.adminLinks.filter((item) => item.parent === `/feedback`);
  const dashboardChildren = page.adminLinks.filter((item) => ![`/dashboard`, `/feedback`].includes(item.href) && item.parent !== `/feedback`);
  const animateNavigation = (action: () => void) => {
    if (!shell?.reducedMotion) LayoutAnimation.configureNext(LayoutAnimation.create(300, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    action();
  };
  const renderLink = (item: NavigationLink, child = false, parentActive = false) => {
    const active = page.pathname === item.href || page.activeRoute?.parent === item.href || parentActive;
    return <Pressable
      key={item.href}
      accessibilityRole='link'
      accessibilityLabel={item.label}
      onPress={() => router.push(item.href as Href)}
      accessibilityState={{ selected: page.pathname === item.href }}
      nativeID={`account-nav-${item.href.replaceAll(`/`, `-`)}`}
      style={[styles.navLink, child && styles.childLink, iconOnly && styles.iconLink, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? palette.primary : palette.panel }]}
    ><Icon name={item.icon} color={active ? palette.background : palette.primary} size={15} />{!iconOnly && <Text numberOfLines={1} style={[styles.navText, { color: active ? palette.background : palette.text }]}>{item.label}</Text>}</Pressable>;
  };
  const groups = <>
      <View nativeID='account-navigation-group' style={[styles.group, iconOnly && styles.collapsedGroup]}>
        {!iconOnly && <Text nativeID='account-navigation-label' style={[styles.groupLabel, { color: palette.primary }]}>{`ACCOUNT`}</Text>}
        {page.accountLinks.filter((item) => item.href === `/profile`).map((item) => renderLink(item))}
      </View>
      {dashboard ? <View nativeID='admin-navigation-group' style={[styles.group, iconOnly && styles.collapsedGroup]}>
        {!iconOnly && <Text nativeID='admin-navigation-label' style={[styles.groupLabel, { color: palette.primary }]}>{`ADMIN`}</Text>}
        <View nativeID='account-native-dashboard-row' style={styles.parentRow}>
          <View style={styles.parentLink}>{renderLink(dashboard, false, dashboardChildren.some((item) => item.href === page.pathname))}</View>
          {!iconOnly && <Pressable nativeID='account-toggle-native-dashboard' accessibilityRole='button' accessibilityLabel={`${dashboardOpen ? `Collapse` : `Expand`} Dashboard Pages`} accessibilityState={{ expanded: dashboardOpen }} onPress={() => animateNavigation(() => page.toggleDashboard(!desktop))} style={styles.submenuToggle}><Icon name={dashboardOpen ? `chevron-up` : `chevron-down`} size={16} color={palette.primary} /></Pressable>}
        </View>
        {dashboardOpen ? <View nativeID='account-native-dashboard-children' style={[styles.children, iconOnly && styles.iconChildren, { borderLeftColor: palette.border }]}>{dashboardChildren.map((item) => renderLink(item, true))}</View> : null}
        {feedback ? <>
          <View nativeID='account-native-feedback-row' style={styles.parentRow}>
            <View style={styles.parentLink}>{renderLink(feedback, false, feedbackChildren.some((item) => item.href === page.pathname))}</View>
            {!iconOnly && <Pressable nativeID='account-toggle-native-feedback' accessibilityRole='button' accessibilityLabel={`${feedbackOpen ? `Collapse` : `Expand`} Feedback Pages`} accessibilityState={{ expanded: feedbackOpen }} onPress={() => animateNavigation(() => page.toggleFeedback(!desktop))} style={styles.submenuToggle}><Icon name={feedbackOpen ? `chevron-up` : `chevron-down`} size={16} color={palette.primary} /></Pressable>}
          </View>
          {feedbackOpen && feedbackChildren.length ? <View nativeID='account-native-feedback-children' style={[styles.children, iconOnly && styles.iconChildren, { borderLeftColor: palette.border }]}>{feedbackChildren.map((item) => renderLink(item, true))}</View> : null}
        </> : null}
      </View> : null}
  </>;
  return <View
    nativeID='account-navigation'
    accessibilityLabel='Account Navigation'
    style={[styles.navigation, desktop ? styles.rail : styles.inlineNavigation, iconOnly && styles.collapsedRail, { borderColor: palette.border, backgroundColor: palette.surface }, desktop && { width: railWidth, paddingBottom: insets.bottom + 5 }]}
  >
    {desktop ? <ScrollView nativeID='account-navigation-body' showsVerticalScrollIndicator={false} style={styles.navigationScroll} contentContainerStyle={[styles.groups, iconOnly && styles.collapsedGroups]}>{groups}</ScrollView> : !page.collapsed ? <View nativeID='account-navigation-body' style={styles.groups}>{groups}</View> : null}
    <View nativeID='account-navigation-bottom' style={[styles.bottom, iconOnly && styles.iconBottom]}>
      <Pressable nativeID='account-bottom-profile' accessibilityRole='link' accessibilityLabel='Profile' onPress={() => router.push(page.account ? `/profile` : `/signin`)} style={[styles.identity, iconOnly && styles.iconIdentity]}>
        <View nativeID='account-bottom-avatar' style={[styles.avatar, { backgroundColor: palette.panel }]}>{page.avatarUrl ? <Image source={{ uri: page.avatarUrl }} onError={page.onAvatarError} style={styles.avatarImage} /> : <Text style={{ color: palette.primary }}>{page.account?.displayName?.trim()?.[0]?.toUpperCase() || `?`}</Text>}</View>
        {!iconOnly && <Text style={[styles.navText, { color: palette.text }]}>{`Profile`}</Text>}
      </Pressable>
      <Pressable nativeID='account-collapse-navigation' accessibilityRole='button' accessibilityLabel={`${page.collapsed ? `Expand` : `Collapse`} Account Navigation`} accessibilityState={{ expanded: !page.collapsed }} onPress={() => animateNavigation(page.toggleCollapsed)} style={[styles.collapse, iconOnly && styles.collapsedControl]}><Icon name={desktop ? page.collapsed ? `chevron-right` : `chevron-left` : page.collapsed ? `chevron-down` : `chevron-up`} size={17} color={palette.primary} /></Pressable>
    </View>
  </View>;
};

const AccountLayout = ({ title, children, description, section = `account`, eyebrow = `YOUR CORNER OF THE ARCHIVE` }: AccountLayoutProps) => {
  const page = useAccountLayout();
  const shell = useAccountShell();
  const { width } = useWindowDimensions();
  const { palette } = useTheme();
  const desktop = width > 650;
  const fixedRail = desktop && Boolean(shell?.sticky);
  const railWidth = page.collapsed ? 56 : shell?.brandWidth || 220;
  const railScope = shell?.scope;
  const clearRail = shell?.clearRail;
  const gutter = Math.max(18, Math.min(40, width * .024));
  const navigation = useMemo(() => <NativeAccountNavigation desktop={fixedRail} railWidth={railWidth} />, [fixedRail, railWidth]);
  useEffect(() => {
    if (fixedRail && shell) shell.setRail({ scope: shell.scope, width: railWidth, content: navigation });
    else if (shell) shell.clearRail(shell.scope);
  }, [shell, fixedRail, railWidth, navigation]);
  useEffect(() => () => { if (railScope) clearRail?.(railScope); }, [railScope, clearRail]);
  return <View nativeID='account-layout' style={[styles.page, { paddingHorizontal: gutter }, fixedRail && { paddingLeft: railWidth + Math.max(28, gutter), paddingTop: 32, paddingBottom: Math.max(32, Math.min(56, width * .04)) }]}>
    <PageMetadata noIndex title={title} description={description ?? `Your private Spelling Spells workspace.`} />
    {!fixedRail && navigation}
    <View nativeID='account-page-heading' style={styles.heading}>
      <View nativeID='account-page-eyebrow' style={styles.eyebrowRow}><View style={[styles.eyebrowLine, { backgroundColor: palette.primary }]} /><Text style={[styles.eyebrow, { color: palette.primary }]}>{eyebrow}</Text></View>
      <Text nativeID='account-page-title' accessibilityRole='header' style={[styles.title, { color: palette.text, fontSize: Math.max(34, Math.min(52, width * .04)), lineHeight: Math.max(34, Math.min(52, width * .04)) * 1.15 }]}>{title}</Text>
      {description ? <Text nativeID='account-page-description' style={[styles.description, { color: palette.muted }]}>{description}</Text> : null}
    </View>
    {page.error ? <Text nativeID='account-navigation-error' accessibilityRole='alert' style={[styles.description, { color: palette.error }]}>{page.error}</Text> : null}
    {section === `admin` && !page.ownerAllowed ? <AccountGate ownerOnly returnTo={page.pathname} /> : children}
  </View>;
};

export default AccountLayout;
