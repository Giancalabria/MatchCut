import { Stack, router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { Button } from '@/src/ui';
import { typography } from '@/theme/typography';

export default function TasteIntroScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: t('onboarding.tasteIntroTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
          {t('onboarding.tasteIntroTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: typography.body }]}>
          {t('onboarding.tasteIntroBody')}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.gestureTitle, { color: colors.ink, fontFamily: typography.bodyBold }]}>
            {t('onboarding.tasteGesturesTitle')}
          </Text>
          <Text style={[styles.gestureLine, { color: colors.accent, fontFamily: typography.body }]}>
            {t('onboarding.tasteGestureLike')}
          </Text>
          <Text style={[styles.gestureLine, { color: colors.nope, fontFamily: typography.body }]}>
            {t('onboarding.tasteGestureNope')}
          </Text>
          <Text style={[styles.gestureLine, { color: colors.seen, fontFamily: typography.body }]}>
            {t('onboarding.tasteGestureUnseen')}
          </Text>
        </View>

        <Text style={[styles.note, { color: colors.inkMuted, fontFamily: typography.body }]}>
          {t('onboarding.tasteIntroNote')}
        </Text>

        <Button
          label={t('onboarding.tasteIntroCta')}
          onPress={() => router.push('/(onboarding)/taste-calibration' as Href)}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  gestureTitle: { fontSize: 15, marginBottom: 4 },
  gestureLine: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 14, lineHeight: 20 },
});
