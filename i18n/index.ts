import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function resolveDeviceLanguage(): AppLanguage {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  if (code === 'en') return 'en';
  return 'es';
}

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: resolveDeviceLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
