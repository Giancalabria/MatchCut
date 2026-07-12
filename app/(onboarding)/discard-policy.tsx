import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import type { NopePolicy } from '@/src/features/auth/types';
import {
  COOLDOWN_PRESETS,
  DEFAULT_NOPE_COOLDOWN_DAYS,
  DEFAULT_NOPE_POLICY,
} from '@/src/features/onboarding/constants';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { typography } from '@/theme/typography';

const POLICIES: NopePolicy[] = ['cooldown', 'session', 'restore_only'];

export default function DiscardPolicyScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { profile, updateProfile, isConfigured } = useAuth();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEdit = edit === '1';

  const initialDays = profile?.nope_cooldown_days ?? DEFAULT_NOPE_COOLDOWN_DAYS;
  const [policy, setPolicy] = useState<NopePolicy>(
    profile?.nope_policy ?? DEFAULT_NOPE_POLICY,
  );
  const [cooldownDays, setCooldownDays] = useState<number>(initialDays);
  const [customDays, setCustomDays] = useState(
    (COOLDOWN_PRESETS as readonly number[]).includes(initialDays) ? '' : String(initialDays),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDays =
    customDays.trim().length > 0 ? Number.parseInt(customDays, 10) : cooldownDays;

  async function onFinish() {
    if (!isConfigured) {
      router.replace('/(tabs)/explore');
      return;
    }

    if (policy === 'cooldown' && (!effectiveDays || effectiveDays < 1)) {
      setError(t('onboarding.invalidCooldown'));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        nope_policy: policy,
        nope_cooldown_days: policy === 'cooldown' ? effectiveDays : null,
        onboarding_completed: true,
      });
      if (isEdit) {
        router.back();
      } else {
        router.replace('/(tabs)/explore');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('settings.editDiscard') }} />
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
        {t('onboarding.discardTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: typography.body }]}>
        {t('onboarding.discardSubtitle')}
      </Text>

      <View style={styles.stack}>
        {POLICIES.map((item) => (
          <SelectChip
            key={item}
            label={t(`onboarding.policy.${item}`)}
            selected={policy === item}
            onPress={() => setPolicy(item)}
          />
        ))}
      </View>

      {policy === 'cooldown' ? (
        <>
          <Text style={[styles.label, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
            {t('onboarding.cooldownDays')}
          </Text>
          <View style={styles.wrap}>
            {COOLDOWN_PRESETS.map((days) => (
              <SelectChip
                key={days}
                label={t('onboarding.days', { count: days })}
                selected={customDays === '' && cooldownDays === days}
                onPress={() => {
                  setCustomDays('');
                  setCooldownDays(days);
                }}
              />
            ))}
          </View>
          <TextInput
            keyboardType="number-pad"
            placeholder={t('onboarding.customDays')}
            placeholderTextColor={colors.inkMuted}
            value={customDays}
            onChangeText={setCustomDays}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                color: colors.ink,
                fontFamily: typography.body,
              },
            ]}
          />
        </>
      ) : null}

      {error ? (
        <Text style={{ color: colors.nope, fontFamily: typography.body }}>{error}</Text>
      ) : null}

      <Pressable
        disabled={busy}
        onPress={onFinish}
        style={[styles.cta, { backgroundColor: colors.accent, opacity: busy ? 0.5 : 1 }]}
      >
        <Text style={[styles.ctaLabel, { fontFamily: typography.bodyBold }]}>
          {isEdit ? t('common.save') : t('onboarding.finish')}
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
  stack: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 13, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  cta: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaLabel: { color: '#FFFFFF', fontSize: 16 },
});
