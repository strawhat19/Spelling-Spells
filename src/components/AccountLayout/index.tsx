import Icon from '../Icon';
import styles from './styles.native';
import PageMetadata from '../PageMetadata';
import { useRouter, type Href } from 'expo-router';
import { Text, View, Image, Pressable } from 'react-native';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useAccountLayout, type AccountLayoutProps } from './useAccountLayout';

const AccountLayout = ({ title, children, description, eyebrow = `YOUR CORNER OF THE ARCHIVE` }: AccountLayoutProps) => {
  const page = useAccountLayout();
  const router = useRouter();
  const { palette } = useTheme();
  const dashboard = page.adminLinks.find((item) => item.href === `/dashboard`);
  const feedback = page.adminLinks.find((item) => item.href === `/feedback`);
  const review = page.adminLinks.find((item) => item.href === `/review`);
  const dashboardChildren = page.adminLinks.filter((item) => ![`/dashboard`, `/feedback`, `/review`].includes(item.href));
  const renderLink = (item: { href: string; label: string; icon: string }, child = false) => (
    <Pressable key={item.href} accessibilityRole='link' accessibilityLabel={item.label} accessibilityState={{ selected: page.pathname === item.href }} nativeID={`account-nav-${item.href.replaceAll(`/`, `-`)}`} onPress={() => router.push(item.href as Href)} style={[styles.navLink, child ? styles.childLink : null, page.pathname === item.href ? { backgroundColor: palette.panel } : null]}><Icon name={item.icon} color={page.pathname === item.href ? palette.gold : palette.primary} size={16} /><Text style={[styles.navText, { color: page.pathname === item.href ? palette.gold : palette.text }]}>{item.label}</Text></Pressable>
  );
  return <View nativeID='account-layout' style={styles.page}>
    <PageMetadata noIndex title={title} description={description ?? `Your private Spelling Spells workspace.`} />
    <View nativeID='account-navigation' style={[styles.navigation, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      {!page.collapsed ? <>
        <View nativeID='account-navigation-group' style={styles.group}>
          <Text style={[styles.groupLabel, { color: palette.muted }]}>ACCOUNT</Text>
          {page.accountLinks.map((item) => renderLink(item))}
          {renderLink({ href: `/saved`, label: `Saved spells`, icon: `bookmark` })}
        </View>
        {dashboard ? <View nativeID='admin-navigation-group' style={styles.group}>
          <Text style={[styles.groupLabel, { color: palette.muted }]}>ADMIN</Text>
          <View style={styles.parentRow}><View style={styles.parentLink}>{renderLink(dashboard)}</View><Pressable nativeID='account-toggle-native-dashboard' accessibilityRole='button' accessibilityLabel='Toggle dashboard pages' accessibilityState={{ expanded: page.mobileDashboard }} onPress={() => page.toggleDashboard(true)} style={styles.submenuToggle}><Icon name={page.mobileDashboard ? `up` : `down`} size={16} color={palette.primary} /></Pressable></View>
          {page.mobileDashboard ? <View nativeID='account-native-dashboard-children' style={[styles.children, { borderLeftColor: palette.border }]}>{dashboardChildren.map((item) => renderLink(item, true))}</View> : null}
          {feedback ? <>
            <View style={styles.parentRow}><View style={styles.parentLink}>{renderLink(feedback)}</View><Pressable nativeID='account-toggle-native-feedback' accessibilityRole='button' accessibilityLabel='Toggle feedback pages' accessibilityState={{ expanded: page.mobileFeedback }} onPress={() => page.toggleFeedback(true)} style={styles.submenuToggle}><Icon name={page.mobileFeedback ? `up` : `down`} size={16} color={palette.primary} /></Pressable></View>
            {page.mobileFeedback && review ? <View nativeID='account-native-feedback-children' style={[styles.children, { borderLeftColor: palette.border }]}>{renderLink(review, true)}</View> : null}
          </> : null}
        </View> : null}
      </> : null}
      <View style={[styles.bottom, { borderTopColor: palette.border }]}><Pressable nativeID='account-bottom-profile' accessibilityRole='link' onPress={() => router.push(page.account ? `/profile` : `/signin`)} style={styles.identity}><View style={[styles.avatar, { backgroundColor: palette.panel }]}>{page.avatarUrl ? <Image source={{ uri: page.avatarUrl }} onError={page.onAvatarError} style={styles.avatarImage} /> : <Text style={{ color: palette.primary }}>{page.account?.displayName.charAt(0).toUpperCase() || `?`}</Text>}</View><Text style={[styles.navText, { color: palette.text }]}>{page.account?.displayName || `Sign in to connect`}</Text></Pressable><Pressable nativeID='account-collapse-navigation' accessibilityRole='button' accessibilityLabel={page.collapsed ? `Expand account navigation` : `Collapse account navigation`} accessibilityState={{ expanded: !page.collapsed }} onPress={page.toggleCollapsed} style={styles.collapse}><Icon name={page.collapsed ? `down` : `up`} size={17} color={palette.muted} /></Pressable></View>
    </View>
    <View style={styles.heading}><Text style={[styles.eyebrow, { color: palette.muted }]}>{eyebrow}</Text><Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{title}</Text>{description ? <Text style={[styles.description, { color: palette.muted }]}>{description}</Text> : null}</View>
    {page.error ? <Text accessibilityRole='alert' style={[styles.description, { color: palette.error }]}>{page.error}</Text> : null}
    {children}
  </View>;
};

export default AccountLayout;
