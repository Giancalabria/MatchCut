import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import i18n, {
  resolveDeviceLanguage,
  type AppLanguage,
  SUPPORTED_LANGUAGES,
} from '@/i18n';
import { getStoredString, setStoredString } from '@/lib/storage';
import {
  darkColors,
  lightColors,
  type ColorTokens,
  type ThemeMode,
} from '@/theme/tokens';

type PreferencesContextValue = {
  ready: boolean;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: ColorTokens;
  resolvedScheme: 'light' | 'dark';
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const LANGUAGE_KEY = 'language';
const THEME_KEY = 'themeMode';

function isAppLanguage(value: string | null): value is AppLanguage {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<AppLanguage>(resolveDeviceLanguage());
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const [storedLanguage, storedTheme] = await Promise.all([
        getStoredString(LANGUAGE_KEY),
        getStoredString(THEME_KEY),
      ]);

      if (cancelled) return;

      const nextLanguage = isAppLanguage(storedLanguage)
        ? storedLanguage
        : resolveDeviceLanguage();
      const nextTheme = isThemeMode(storedTheme) ? storedTheme : 'light';

      setLanguageState(nextLanguage);
      setThemeModeState(nextTheme);
      await i18n.changeLanguage(nextLanguage);
      setReady(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    void setStoredString(LANGUAGE_KEY, next);
    void i18n.changeLanguage(next);
  }, []);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setThemeModeState(next);
    void setStoredString(THEME_KEY, next);
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;

  const colors = resolvedScheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  const value = useMemo(
    () => ({
      ready,
      language,
      setLanguage,
      themeMode,
      setThemeMode,
      colors,
      resolvedScheme,
    }),
    [ready, language, setLanguage, themeMode, setThemeMode, colors, resolvedScheme],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}

export function useThemeColors() {
  return usePreferences().colors;
}
