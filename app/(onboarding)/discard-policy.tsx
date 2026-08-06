import { useState } from 'react';
import { Stack, router, useLocalSearchParams, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import type { NopePolicy } from '@/src/features/auth/types';
import {
  COOLDOWN_PRESETS,
  DEFAULT_NOPE_COOLDOWN_DAYS,
  DEFAULT_NOPE_POLICY,
} from '@/src/features/onboarding/constants';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { AppText, Button, TextField } from '@/src/ui';
import { layout, space } from '@/theme/spacing';

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
      });
      if (isEdit) {
        router.back();
      } else {
        router.push('/(onboarding)/taste-intro' as Href);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? t('settings.editDiscard') : t('onboarding.discardTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!isEdit ? (
          <>
            <AppText variant="display">{t('onboarding.discardTitle')}</AppText>
            <AppText muted style={styles.subtitle}>
              {t('onboarding.discardSubtitle')}
            </AppText>
          </>
        ) : null}

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
            <AppText variant="caption" muted style={styles.label}>
              {t('onboarding.cooldownDays')}
            </AppText>
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
            <TextField
              keyboardType="number-pad"
              placeholder={t('onboarding.customDays')}
              value={customDays}
              onChangeText={setCustomDays}
            />
          </>
        ) : null}

        {error ? <AppText color={colors.nope}>{error}</AppText> : null}

        <Button
          label={isEdit ? t('common.save') : t('common.continue')}
          loading={busy}
          onPress={onFinish}
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
  stack: { gap: space.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  label: { marginTop: space.xs },
  cta: { marginTop: space.md },
});
