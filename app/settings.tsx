import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppLanguage } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { usePreferences, useThemeColors } from '@/providers/PreferencesProvider';
import { AppIcon, AppText, Button, ScreenHeader } from '@/src/ui';
import type { ThemeMode } from '@/theme/tokens';
import { typography } from '@/theme/typography';

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.option,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.cta : colors.line,
        },
      ]}
    >
      <AppText
        color={colors.ink}
        style={{
          fontFamily: selected ? typography.bodyBold : typography.body,
          fontSize: 15,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function LinkRow({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.linkRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: typography.bodyMedium, fontSize: 15 }}>{label}</AppText>
        {detail ? (
          <AppText variant="caption" muted>
            {detail}
          </AppText>
        ) : null}
      </View>
      <AppIcon name="chevronForward" size={18} color={colors.cta} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, themeMode, setThemeMode } = usePreferences();
  const { user, profile, isConfigured, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const languages: { id: AppLanguage; label: string }[] = [
    { id: 'es', label: t('settings.languageEs') },
    { id: 'en', label: t('settings.languageEn') },
  ];

  const themes: { id: ThemeMode; label: string }[] = [
    { id: 'dark', label: t('settings.themeDark') },
    { id: 'light', label: t('settings.themeLight') },
    { id: 'system', label: t('settings.themeSystem') },
  ];

  const regionLabel = profile?.region ? t(`regions.${profile.region}` as 'regions.AR') : '—';

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace(isConfigured ? '/(auth)/login' : '/(tabs)/explore');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 32),
        },
      ]}
    >
      <ScreenHeader title={t('settings.title')} onBack={() => router.back()} />

      {user?.email ? (
        <AppText variant="caption" muted>
          {user.email}
        </AppText>
      ) : null}

      {isConfigured && profile ? (
        <>
          <AppText variant="section">{t('settings.account')}</AppText>
          <LinkRow
            label={t('settings.editRegion')}
            detail={regionLabel}
            onPress={() => router.push('/(onboarding)/region?edit=1')}
          />
          <LinkRow
            label={t('settings.editPlatforms')}
            detail={t('settings.platformsValue', { count: profile.platforms?.length ?? 0 })}
            onPress={() => router.push('/(onboarding)/platforms?edit=1')}
          />
          <LinkRow
            label={t('settings.editDiscard')}
            detail={t(`onboarding.policy.${profile.nope_policy}`)}
            onPress={() => router.push('/(onboarding)/discard-policy?edit=1')}
          />
        </>
      ) : null}

      <AppText variant="section">{t('settings.language')}</AppText>
      <View style={styles.row}>
        {languages.map((item) => (
          <OptionRow
            key={item.id}
            label={item.label}
            selected={language === item.id}
            onPress={() => setLanguage(item.id)}
          />
        ))}
      </View>

      <AppText variant="section">{t('settings.theme')}</AppText>
      <View style={styles.row}>
        {themes.map((item) => (
          <OptionRow
            key={item.id}
            label={item.label}
            selected={themeMode === item.id}
            onPress={() => setThemeMode(item.id)}
          />
        ))}
      </View>

      {isConfigured ? (
        <Button
          label={t('settings.signOut')}
          variant="danger"
          loading={signingOut}
          onPress={() => void handleSignOut()}
          style={styles.signOut}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 12,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  linkRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOut: { marginTop: 20 },
});
