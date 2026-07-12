import { type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';
import { AuthProvider } from '@/providers/AuthProvider';
import { PreferencesProvider } from '@/providers/PreferencesProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <PreferencesProvider>
        <AuthProvider>{children}</AuthProvider>
      </PreferencesProvider>
    </I18nextProvider>
  );
}
