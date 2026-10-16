import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppShell from '../src/components/AppShell';
import { AuthProvider } from '../src/shared/authContext';
import PwaRegistration from '../src/shared/pwa/PwaRegistration';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/shared/themeContext/ThemeContext';
import { SpellsProvider } from '../src/shared/spellsContext/SpellsContext';
import { AccountNavigationProvider } from '../src/components/AccountLayout/navigation';
import { NotificationsProvider } from '../src/shared/notifications/NotificationsContext';

const RootLayout = () => (
  <SafeAreaProvider>
    <AuthProvider>
      <ThemeProvider>
        <NotificationsProvider>
          <SpellsProvider>
            <StatusBar style='auto' />
            <PwaRegistration />
            <AccountNavigationProvider><AppShell><Slot /></AppShell></AccountNavigationProvider>
          </SpellsProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </AuthProvider>
  </SafeAreaProvider>
);

export default RootLayout;
