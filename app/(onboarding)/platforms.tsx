import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { STREAMING_PLATFORMS } from '@/src/features/onboarding/constants';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { AppText, Button } from '@/src/ui';
import { layout, space } from '@/theme/spacing';

export default function PlatformsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { profile, updateProfile, isConfigured } = useAuth();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEdit = edit === '1';

  const [selected, setSelected] = useState<string[]>(profile?.platforms ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function onContinue() {
    if (!isConfigured) {
      router.replace('/(tabs)/explore');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateProfile({ platforms: selected });
      if (isEdit) {
        router.back();
      } else {
        router.push('/(onboarding)/discard-policy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? t('settings.editPlatforms') : t('onboarding.platformsTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!isEdit ? (
          <>
            <AppText variant="display">{t('onboarding.platformsTitle')}</AppText>
            <AppText muted style={styles.subtitle}>
              {t('onboarding.platformsSubtitle')}
            </AppText>
          </>
        ) : null}

        <View style={styles.wrap}>
          {STREAMING_PLATFORMS.map((item) => (
            <SelectChip
              key={item.id}
              label={t(item.nameKey)}
              selected={selected.includes(item.id)}
              onPress={() => toggle(item.id)}
            />
          ))}
        </View>

        {error ? <AppText color={colors.nope}>{error}</AppText> : null}

        <Button
          label={isEdit ? t('common.save') : t('common.continue')}
          loading={busy}
          disabled={selected.length === 0}
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
