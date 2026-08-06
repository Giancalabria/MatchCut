import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppText, Button } from '@/src/ui';
import { radii } from '@/theme/radii';
import { space } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const ROW_A = RATINGS.slice(0, 5);
const ROW_B = RATINGS.slice(5);

export function RatingBottomSheet({
  visible,
  title,
  currentRating,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  currentRating: number | null;
  onSelect: (rating: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, space.md),
            },
          ]}
        >
          <AppText variant="title" style={styles.centered}>
            {title}
          </AppText>
          <AppText muted style={styles.centered}>
            {t('vault.rateTitle')}
          </AppText>
          <View style={styles.grid}>
            {[ROW_A, ROW_B].map((row) => (
              <View key={row[0]} style={styles.row}>
                {row.map((rating) => {
                  const selected = currentRating === rating;
                  return (
                    <Pressable
                      key={rating}
                      onPress={() => onSelect(rating)}
                      hitSlop={6}
                      style={[
                        styles.ratingCell,
                        {
                          backgroundColor: selected ? colors.cta : colors.bg,
                          borderColor: selected ? colors.cta : colors.line,
                        },
                      ]}
                    >
                      <AppText
                        variant="section"
                        color={selected ? colors.onAccent : colors.ink}
                        style={{ fontFamily: typography.bodyBold }}
                      >
                        {rating}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.xl + 4,
    borderTopRightRadius: radii.xl + 4,
    padding: space.xl,
    gap: space.sm + 2,
  },
  centered: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  grid: {
    gap: space.xs + 2,
  },
  row: {
    flexDirection: 'row',
    gap: space.xs + 2,
  },
  ratingCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
