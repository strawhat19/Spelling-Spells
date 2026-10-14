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
  const links = [...page.accountLinks, { href: `/saved`, label: `Saved on this device`, icon: `bookmark`, section: `account` }, ...page.adminLinks];
  return <View nativeID='account-layout' style={styles.page}>
    <PageMetadata noIndex title={title} description={description ?? `Your private Spelling Spells workspace.`} />
    <View nativeID='account-navigation' style={[styles.navigation, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      {!page.collapsed ? <View style={styles.links}>{links.map((item) => <Pressable key={item.href} accessibilityRole='link' accessibilityState={{ selected: page.pathname === item.href }} nativeID={`account-nav-${item.href.replaceAll(`/`, `-`)}`} onPress={() => router.push(item.href as Href)} style={[styles.navLink, page.pathname === item.href ? { backgroundColor: palette.panel } : null]}><Icon name={item.icon} color={page.pathname === item.href ? palette.gold : palette.primary} size={16} /><Text style={[styles.navText, { color: page.pathname === item.href ? palette.gold : palette.text }]}>{item.label}</Text></Pressable>)}</View> : null}
      <View style={[styles.bottom, { borderTopColor: palette.border }]}><Pressable nativeID='account-bottom-profile' accessibilityRole='link' onPress={() => router.push(page.account ? `/profile` : `/signin`)} style={styles.identity}><View style={[styles.avatar, { backgroundColor: palette.panel }]}>{page.avatarUrl ? <Image source={{ uri: page.avatarUrl }} style={styles.avatarImage} /> : <Text style={{ color: palette.primary }}>{page.account?.displayName.charAt(0).toUpperCase() || `?`}</Text>}</View><Text style={[styles.navText, { color: palette.text }]}>{page.account?.displayName || `Sign in to connect`}</Text></Pressable><Pressable nativeID='account-collapse-navigation' accessibilityRole='button' accessibilityLabel={page.collapsed ? `Expand account navigation` : `Collapse account navigation`} accessibilityState={{ expanded: !page.collapsed }} onPress={page.toggleCollapsed} style={styles.collapse}><Icon name={page.collapsed ? `down` : `up`} size={17} color={palette.muted} /></Pressable></View>
    </View>
    <View style={styles.heading}><Text style={[styles.eyebrow, { color: palette.muted }]}>{eyebrow}</Text><Text accessibilityRole='header' style={[styles.title, { color: palette.text }]}>{title}</Text>{description ? <Text style={[styles.description, { color: palette.muted }]}>{description}</Text> : null}</View>
    {page.error ? <Text accessibilityRole='alert' style={[styles.description, { color: palette.error }]}>{page.error}</Text> : null}
    {children}
  </View>;
};

export default AccountLayout;
