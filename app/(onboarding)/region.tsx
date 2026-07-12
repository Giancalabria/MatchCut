import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { REGIONS } from '@/src/features/onboarding/constants';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { typography } from '@/theme/typography';

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
      <Stack.Screen options={{ title: t('settings.editRegion') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
          {t('onboarding.regionTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: typography.body }]}>
          {t('onboarding.regionSubtitle')}
        </Text>

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

        {error ? (
          <Text style={{ color: colors.nope, fontFamily: typography.body }}>{error}</Text>
        ) : null}

        <Pressable
          disabled={busy || !region}
          onPress={onContinue}
          style={[
            styles.cta,
            { backgroundColor: colors.accent, opacity: busy || !region ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.ctaLabel, { fontFamily: typography.bodyBold }]}>
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
  ctaLabel: { color: '#FFFFFF', fontSize: 16 },
});
