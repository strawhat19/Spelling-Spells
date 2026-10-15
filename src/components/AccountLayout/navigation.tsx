import { useAuth } from '../../shared/authContext';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { readStoredPreference, writeStoredPreference, queueStorageOperation } from '../../shared/common/storage';

const defaults = { collapsed: false, desktopDashboard: true, mobileDashboard: true, desktopFeedback: true, mobileFeedback: true };
type NavigationPreferences = typeof defaults;
type NavigationContextValue = NavigationPreferences & {
  error: string | null;
  toggleCollapsed: () => void;
  toggleDashboard: (mobile: boolean) => void;
  toggleFeedback: (mobile: boolean) => void;
};
const NavigationContext = createContext<NavigationContextValue | null>(null);
const isPreference = (value: unknown): value is NavigationPreferences => {
  if (!value || typeof value !== `object`) return false;
  const candidate = value as NavigationPreferences;
  return typeof candidate.collapsed === `boolean` && typeof candidate.desktopDashboard === `boolean` && typeof candidate.mobileDashboard === `boolean`
    && (candidate.desktopFeedback === undefined || typeof candidate.desktopFeedback === `boolean`)
    && (candidate.mobileFeedback === undefined || typeof candidate.mobileFeedback === `boolean`);
};

export const AccountNavigationProvider = ({ children }: PropsWithChildren) => {
  const { account } = useAuth();
  const scope = account?.id ?? `guest`;
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState({ scope, preferences: defaults });
  const generation = useRef(0);
  const preferences = state.scope === scope ? state.preferences : defaults;
  const key = `spelling-spells:account-navigation:v1:${scope}`;
  useEffect(() => {
    const current = ++generation.current;
    setState({ scope, preferences: defaults });
    setError(null);
    void readStoredPreference(key, `Account navigation`, isPreference, defaults).then((saved) => {
      if (generation.current !== current) return;
      setState({ scope, preferences: { ...defaults, ...saved.value } });
      setError(saved.error);
    });
    return () => { generation.current += 1; };
  }, [scope, key]);

  const update = (next: NavigationPreferences) => {
    generation.current += 1;
    const current = generation.current;
    setState({ scope, preferences: next });
    void queueStorageOperation(key, () => writeStoredPreference(key, `Account navigation`, next)).catch((failure: unknown) => {
      if (generation.current === current) setError(failure instanceof Error ? failure.message : `Navigation preferences could not be saved.`);
    });
  };

  return <NavigationContext.Provider value={{
    ...preferences,
    error,
    toggleCollapsed: () => update({ ...preferences, collapsed: !preferences.collapsed }),
    toggleFeedback: (mobile) => update({ ...preferences, [mobile ? `mobileFeedback` : `desktopFeedback`]: !(mobile ? preferences.mobileFeedback : preferences.desktopFeedback) }),
    toggleDashboard: (mobile) => update({ ...preferences, [mobile ? `mobileDashboard` : `desktopDashboard`]: !(mobile ? preferences.mobileDashboard : preferences.desktopDashboard) }),
  }}>{children}</NavigationContext.Provider>;
};

export const useAccountNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error(`AccountNavigationProvider Is Required`);
  return context;
};
