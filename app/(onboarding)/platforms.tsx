import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { STREAMING_PLATFORMS } from '@/src/features/onboarding/constants';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { typography } from '@/theme/typography';

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
          <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
            {t('onboarding.platformsTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: typography.body }]}>
            {t('onboarding.platformsSubtitle')}
          </Text>
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

      {error ? (
        <Text style={{ color: colors.nope, fontFamily: typography.body }}>{error}</Text>
      ) : null}

      <Pressable
        disabled={busy || selected.length === 0}
        onPress={onContinue}
        style={[
          styles.cta,
          {
            backgroundColor: colors.cta,
            opacity: busy || selected.length === 0 ? 0.5 : 1,
          },
        ]}
      >
        <Text style={[styles.ctaLabel, { fontFamily: typography.bodyBold, color: colors.onAccent }]}>
          {isEdit ? t('common.save') : t('common.continue')}
        </Text>
      </Pressable>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 16, lineHeight: 22, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cta: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaLabel: { fontSize: 16 },
});
