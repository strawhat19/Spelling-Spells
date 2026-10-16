import Icon from '../Icon';
import UserMenu from '../UserMenu';
import styles from './styles.native';
import BrandLogo from '../BrandLogo';
import { useAuth } from '../../shared/authContext';
import { useRouter, usePathname } from 'expo-router';
import { getAccountRoute } from '../../shared/routes';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { canAccessOwner } from '../../shared/authentication/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountShellContext, type AccountShellRail } from '../../shared/accountShellContext';
import { useRef, useMemo, useState, useEffect, useCallback, type PropsWithChildren } from 'react';
import { Text, View, Alert, Linking, Animated, Pressable, ScrollView, AccessibilityInfo, useWindowDimensions } from 'react-native';

const navigation = [
  { href: `/spells`, label: `Spell Library`, icon: `book` },
  { href: `/worlds`, label: `Worlds`, icon: `globe` },
  { href: `/pronunciation`, label: `Pronunciation`, icon: `wand` },
  { href: `/saved`, label: `Saved`, icon: `bookmark` },
  { href: `/submit`, label: `Contribute`, icon: `edit` },
] as const;

const AppShell = ({ children, sticky = true }: PropsWithChildren<{ sticky?: boolean }>) => {
  const router = useRouter();
  const pathname = usePathname();
  const { account } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [brandWidth, setBrandWidth] = useState(220);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(height);
  const [rail, setRail] = useState<AccountShellRail | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const topOpacity = useRef(new Animated.Value(0)).current;
  const { theme, palette, toggleTheme, error: themeError } = useTheme();
  const { error, dismissError } = useSpells();
  const accountShell = Boolean(getAccountRoute(pathname));
  const scope = `${pathname}:${account?.id ?? `guest`}:${canAccessOwner(account)}`;
  const clearRail = useCallback((railScope: string) => setRail((current) => current?.scope === railScope ? null : current), []);
  const shell = useMemo(() => ({ scope, sticky, brandWidth, headerHeight, viewportHeight, reducedMotion, setRail, clearRail }), [scope, sticky, brandWidth, headerHeight, viewportHeight, reducedMotion, clearRail]);
  const activeRail = sticky && width > 650 && accountShell && rail?.scope === scope ? rail : null;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(`reduceMotionChanged`, setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Animated.timing(topOpacity, {
      toValue: showTop ? 1 : 0,
      duration: reducedMotion ? 0 : 240,
      useNativeDriver: true,
    }).start();
  }, [showTop, reducedMotion, topOpacity]);

  useEffect(() => {
    setMenuOpen(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [pathname]);

  const header = (
    <View
      nativeID="spelling-header"
      onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          borderBottomColor: accountShell || scrolled ? palette.border : `transparent`,
          backgroundColor: scrolled ? `${palette.background}EB` : palette.background,
        },
      ]}
    >
      <View nativeID="header-content" style={[styles.headerRow, accountShell && styles.accountHeaderRow]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Spelling Spells home"
          nativeID="header-brand-link"
          onPress={() => router.push(`/`)}
          style={styles.brand}
        >
          <View nativeID='header-brand-content' onLayout={(event) => setBrandWidth(event.nativeEvent.layout.width + event.nativeEvent.layout.x + styles.headerRow.padding)} style={styles.brandContent}>
            <BrandLogo size={accountShell ? 36 : 48} />
            <Text numberOfLines={1} ellipsizeMode='tail' style={[styles.brandName, { color: palette.text }]}>Spelling Spells</Text>
          </View>
        </Pressable>
        <UserMenu />
        <Pressable
          nativeID="header-theme-toggle"
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${theme === `night` ? `light` : `dark`} mode`}
          onPress={() => void toggleTheme()}
          style={[styles.iconButton, { backgroundColor: palette.panel }]}
        >
          <Icon name={theme === `night` ? `sun` : `moon`} size={20} color={palette.gold} />
        </Pressable>
        <Pressable
          nativeID="header-menu-toggle"
          accessibilityRole="button"
          accessibilityLabel={menuOpen ? `Close menu` : `Open menu`}
          accessibilityState={{ expanded: menuOpen }}
          onPress={() => setMenuOpen(!menuOpen)}
          style={styles.iconButton}
        >
              <Icon name={menuOpen ? `close` : `menu`} size={23} color={palette.text} />
        </Pressable>
      </View>
      {menuOpen && (
        <View nativeID="header-navigation" style={styles.nav}>
          {navigation.map(item => (
            <Pressable
              key={item.href}
              accessibilityRole="link"
              accessibilityState={{ selected: pathname === item.href }}
              nativeID={`navigation-${item.icon}`}
              onPress={() => router.push(item.href)}
              style={styles.navLink}
            >
              <Icon name={item.icon} size={17} color={pathname === item.href ? palette.gold : palette.muted} />
              <Text style={[styles.navText, { color: pathname === item.href ? palette.gold : palette.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <AccountShellContext.Provider value={shell}>
    <View nativeID="spelling-app-shell" onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)} style={[styles.root, { backgroundColor: palette.background }]}>
      {sticky && header}
      <ScrollView
        ref={scroll}
        nativeID="spelling-page-scroll"
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        onScroll={event => {
          const y = event.nativeEvent.contentOffset.y;
          setScrolled(y > 16);
          setShowTop(y > 540);
        }}
      >
        {!sticky && header}
        {(error || themeError) && (
          <View nativeID="storage-feedback" accessibilityRole="alert" style={[styles.notice, { backgroundColor: palette.panel }]}>
            <Text style={[styles.noticeText, { color: palette.error }]}>{error || themeError}</Text>
            {error && <Pressable accessibilityLabel="Dismiss storage message" nativeID="dismiss-storage-error" onPress={dismissError}>
              <Icon name="close" size={20} color={palette.text} />
            </Pressable>}
          </View>
        )}
        {children}
        <View nativeID="spelling-footer" style={[styles.footer, { borderTopColor: palette.border, paddingBottom: insets.bottom + 26 }, activeRail && { marginLeft: activeRail.width }]}>
          <View style={styles.footerBrand}>
            <BrandLogo size={42} />
            <Text style={[styles.footerTitle, { color: palette.text }]}>Spelling Spells</Text>
          </View>
          <Text style={[styles.footerCopy, { color: palette.muted }]}>A little curiosity. A world of magic. Discover the words behind your favorite fictional spells.</Text>
          <View nativeID="footer-information-links" style={styles.footerLinks}>
            {([`about`, `terms`, `contact`, `privacy`] as const).map(page => (
              <Pressable key={page} nativeID={`footer-link-${page}`} accessibilityRole="link" onPress={() => router.push(`/${page}`)}>
                <Text style={[styles.footerLink, { color: palette.text }]}>{page === `privacy` ? `Privacy Policy` : page.charAt(0).toUpperCase() + page.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          <View nativeID="footer-bottom" style={styles.footerBottom}>
            <Text style={[styles.copyright, { color: palette.muted }]}>{`© ${new Date().getFullYear()} Spelling Spells. Fictional worlds belong to their creators.`}</Text>
            <Pressable nativeID="footer-piratechs" accessibilityRole="link" onPress={() => void Linking.openURL(`https://piratechs.com/`).catch(() => Alert.alert(`Couldn’t Open Website`, `Please visit piratechs.com when you’re connected.`))}>
              <Text style={[styles.partner, { color: palette.gold }]}>Made by Piratechs ↗</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      {activeRail ? <View nativeID='account-fixed-rail' style={[styles.accountRail, { top: headerHeight, width: activeRail.width, height: Math.max(0, viewportHeight - headerHeight) }]}>{activeRail.content}</View> : null}
      <Animated.View
        nativeID="scroll-top-container"
        pointerEvents={showTop ? `auto` : `none`}
        style={[styles.topButton, { opacity: topOpacity, bottom: insets.bottom + 20, borderColor: palette.border, backgroundColor: palette.surface }]}
      >
        <Pressable
          nativeID="scroll-to-top"
          accessibilityRole="button"
          accessibilityLabel="Scroll to top"
          onPress={() => scroll.current?.scrollTo({ y: 0, animated: !reducedMotion })}
          style={styles.topButtonContent}
        >
          <Icon name='chevron-up' size={16} color={palette.gold} />
          <Text style={[styles.topButtonText, { color: palette.text }]}>Top</Text>
        </Pressable>
      </Animated.View>
    </View>
    </AccountShellContext.Provider>
  );
};

export default AppShell;
