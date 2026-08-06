import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { REGIONS } from '@/src/features/onboarding/constants';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { AppText, Button } from '@/src/ui';
import { layout, space } from '@/theme/spacing';

export default function RegionScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { profile, updateProfile, isConfigured } = useAuth();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEdit = edit === '1';

  const [region, setRegion] = useState(profile?.region ?? 'AR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    if (!isConfigured) {
      router.replace('/(tabs)/explore');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateProfile({ region });
      if (isEdit) {
        router.back();
      } else {
        router.push('/(onboarding)/platforms');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? t('settings.editRegion') : t('onboarding.regionTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!isEdit ? (
          <>
            <AppText variant="display">{t('onboarding.regionTitle')}</AppText>
            <AppText muted style={styles.subtitle}>
              {t('onboarding.regionSubtitle')}
            </AppText>
          </>
        ) : null}

        <View style={styles.wrap}>
          {REGIONS.map((item) => (
            <SelectChip
              key={item.code}
              label={t(item.nameKey)}
              selected={region === item.code}
              onPress={() => setRegion(item.code)}
            />
          ))}
        </View>

        {error ? <AppText color={colors.nope}>{error}</AppText> : null}

        <Button
          label={isEdit ? t('common.save') : t('common.continue')}
          loading={busy}
          disabled={!region}
          onPress={onContinue}
          style={styles.cta}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: layout.screenPaddingX,
    gap: space.sm,
    paddingBottom: space.xxxl,
  },
  subtitle: { marginBottom: space.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  cta: { marginTop: space.md },
});
