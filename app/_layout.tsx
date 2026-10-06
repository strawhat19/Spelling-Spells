import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppShell from '../src/components/AppShell';
import PwaRegistration from '../src/shared/pwa/PwaRegistration';
import { ThemeProvider } from '../src/shared/themeContext/ThemeContext';
import { SpellsProvider } from '../src/shared/spellsContext/SpellsContext';

const RootLayout = () => (
  <SafeAreaProvider>
    <ThemeProvider>
      <SpellsProvider>
        <StatusBar style='auto' />
        <PwaRegistration />
        <AppShell><Slot /></AppShell>
      </SpellsProvider>
    </ThemeProvider>
  </SafeAreaProvider>
);

export default RootLayout;
