import type { ReactNode } from 'react';
import { themeAPI } from '../../api';
import type { ThemeName } from '../../types/types';
import { themePalettes } from '../../styles/theme/theme';
import type { ThemePalette } from '../../styles/theme/theme';
import { useFeatureFlags } from '../featureFlags/useFeatureFlags';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ThemeContextValue = {
  theme: ThemeName;
  ready: boolean;
  error: string | null;
  palette: ThemePalette;
  themeToggleEnabled: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeName) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const features = useFeatureFlags();
  const hydrated = useRef(false);
  const featureAllowed = useRef(false);
  const requestNumber = useRef(0);
  const themeRef = useRef<ThemeName>(`night`);
  const [ready, setReady] = useState(false);
  const [preferredTheme, updateTheme] = useState<ThemeName>(`night`);
  const [error, setError] = useState<string | null>(null);
  const themeToggleEnabled = ready && hydrated.current && features.themeToggleEnabled;
  const theme = themeToggleEnabled ? preferredTheme : `night`;
  featureAllowed.current = themeToggleEnabled;

  useEffect(() => {
    let active = true;
    void themeAPI.getTheme().then((snapshot) => {
      if (!active) return;
      themeRef.current = snapshot.preference.theme;
      updateTheme(snapshot.preference.theme);
      setError(snapshot.error);
      hydrated.current = true;
      setReady(true);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(failure instanceof Error ? failure.message : `Theme Could Not Be Loaded`);
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof document !== `undefined`) {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme === `night` ? `dark` : `light`;
    }
  }, [theme]);

  const setTheme = useCallback((selected: ThemeName): void => {
    if (!featureAllowed.current) return;
    if (selected !== `night` && selected !== `ivory`) {
      setError(`Unsupported Theme`);
      return;
    }
    if (!hydrated.current) {
      setError(`Your theme preference is still loading. Try again in a moment.`);
      return;
    }
    const request = ++requestNumber.current;
    themeRef.current = selected;
    updateTheme(selected);
    void themeAPI.setTheme(selected).then((snapshot) => {
      if (request !== requestNumber.current) return;
      setError(snapshot.error);
    }).catch((failure: unknown) => {
      if (request !== requestNumber.current) return;
      setError(failure instanceof Error ? failure.message : `Theme Could Not Be Saved`);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(themeRef.current === `night` ? `ivory` : `night`);
  }, [setTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    ready,
    error,
    setTheme,
    toggleTheme,
    themeToggleEnabled,
    palette: themePalettes[theme],
  }), [theme, ready, error, setTheme, toggleTheme, themeToggleEnabled]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
