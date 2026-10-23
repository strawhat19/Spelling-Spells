import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppShell from '../src/components/AppShell';
import { AuthProvider } from '../src/shared/authContext';
import PwaRegistration from '../src/shared/pwa/PwaRegistration';
import { PlansProvider } from '../src/shared/plans/PlansContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BillingProvider } from '../src/shared/billing/BillingContext';
import { ThemeProvider } from '../src/shared/themeContext/ThemeContext';
import { SpellsProvider } from '../src/shared/spellsContext/SpellsContext';
import { FeatureFlagsProvider } from '../src/shared/featureFlags/FeatureFlagsContext';
import { AccountNavigationProvider } from '../src/components/AccountLayout/navigation';
import { NotificationsProvider } from '../src/shared/notifications/NotificationsContext';

const RootLayout = () => (
  <SafeAreaProvider>
    <AuthProvider>
      <BillingProvider>
        <FeatureFlagsProvider>
          <ThemeProvider>
            <PlansProvider>
              <NotificationsProvider>
                <SpellsProvider>
                  <StatusBar style='auto' />
                  <PwaRegistration />
                  <AccountNavigationProvider><AppShell><Slot /></AppShell></AccountNavigationProvider>
                </SpellsProvider>
              </NotificationsProvider>
            </PlansProvider>
          </ThemeProvider>
        </FeatureFlagsProvider>
      </BillingProvider>
    </AuthProvider>
  </SafeAreaProvider>
);

export default RootLayout;
