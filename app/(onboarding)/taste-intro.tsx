import { Stack, router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppText, Button } from '@/src/ui';
import { radii } from '@/theme/radii';
import { layout, space } from '@/theme/spacing';

export default function TasteIntroScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: t('onboarding.tasteIntroTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="display">{t('onboarding.tasteIntroTitle')}</AppText>
        <AppText muted>{t('onboarding.tasteIntroBody')}</AppText>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText variant="section">{t('onboarding.tasteGesturesTitle')}</AppText>
          <AppText color={colors.accent}>{t('onboarding.tasteGestureLike')}</AppText>
          <AppText color={colors.nope}>{t('onboarding.tasteGestureNope')}</AppText>
          <AppText color={colors.seen}>{t('onboarding.tasteGestureUnseen')}</AppText>
        </View>

        <AppText variant="caption" muted>
          {t('onboarding.tasteIntroNote')}
        </AppText>

        <Button
          label={t('onboarding.tasteIntroCta')}
          onPress={() => router.push('/(onboarding)/taste-calibration' as Href)}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: layout.screenPaddingX,
    gap: space.md,
    paddingBottom: space.xxxl,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: space.md,
    gap: space.xs + 2,
  },
});
