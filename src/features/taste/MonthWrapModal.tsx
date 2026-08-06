import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '@/providers/PreferencesProvider';
import type { MonthWrap } from '@/src/features/taste/monthWrap';
import { AppText, Button } from '@/src/ui';
import { radii } from '@/theme/radii';
import { layout, space } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function monthLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  month: number,
  year: number,
): string {
  return t(`taste.months.${month}`, { year });
}

export function MonthWrapModal({
  visible,
  wrap,
  onClose,
}: {
  visible: boolean;
  wrap: MonthWrap;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const period = monthLabel(t, wrap.month, wrap.year);
  const genreLine =
    wrap.topGenreKeys.length > 0
      ? wrap.topGenreKeys.map((key) => t(key)).join(' · ')
      : t('taste.wrapNoGenre');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.bg,
            paddingTop: Math.max(insets.top, space.md),
            paddingBottom: Math.max(insets.bottom, space.md),
          },
        ]}
      >
        <LinearGradient colors={[colors.bgGlow, colors.bg]} style={StyleSheet.absoluteFill} />
        <Pressable onPress={onClose} style={styles.closeHit}>
          <AppText muted>{t('common.close')}</AppText>
        </Pressable>

        <View style={styles.hero}>
          <AppText variant="caption" muted style={styles.eyebrow}>
            {t('taste.wrapEyebrow')}
          </AppText>
          <AppText variant="display" style={{ fontFamily: typography.display }}>
            {period}
          </AppText>
          <AppText muted style={styles.center}>
            {t('taste.wrapIntro')}
          </AppText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText variant="section">{t('taste.wrapRated', { count: wrap.ratedCount })}</AppText>
          <AppText muted>
            {wrap.averageRating != null
              ? t('taste.wrapAverage', { avg: wrap.averageRating.toFixed(1) })
              : null}
          </AppText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText variant="section">{t('taste.wrapGenreTitle')}</AppText>
          <AppText>{genreLine}</AppText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText variant="section">{t('taste.wrapHighs', { count: wrap.highScores })}</AppText>
          <AppText muted>{t('taste.wrapHighsBody')}</AppText>
        </View>

        <Button label={t('common.close')} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingX,
    gap: space.md,
  },
  closeHit: {
    alignSelf: 'flex-end',
    padding: space.xs,
  },
  hero: {
    gap: layout.inlineGap,
    paddingVertical: space.sm,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  center: { textAlign: 'left' },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: space.md,
    gap: layout.inlineGap,
  },
});
