import { Slot } from 'expo-router';
import { AuthProvider } from '../src/shared/authContext';
import { AccountNavigationProvider } from '../src/components/AccountLayout/navigation';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppShell from '../src/components/AppShell';
import PwaRegistration from '../src/shared/pwa/PwaRegistration';
import { ThemeProvider } from '../src/shared/themeContext/ThemeContext';
import { SpellsProvider } from '../src/shared/spellsContext/SpellsContext';

const RootLayout = () => (
  <SafeAreaProvider>
    <AuthProvider>
    <ThemeProvider>
      <SpellsProvider>
        <StatusBar style='auto' />
        <PwaRegistration />
        <AccountNavigationProvider><AppShell><Slot /></AppShell></AccountNavigationProvider>
      </SpellsProvider>
    </ThemeProvider>
    </AuthProvider>
  </SafeAreaProvider>
);

export default RootLayout;
