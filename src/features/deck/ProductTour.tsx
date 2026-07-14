import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { getStoredString, setStoredString } from '@/lib/storage';
import { AppText, Button } from '@/src/ui';

const TOUR_KEY = 'app_product_tour_seen';

type TourStep = {
  titleKey: string;
  bodyKey: string;
  bullets?: string[];
};

export function ProductTour() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo<TourStep[]>(
    () => [
      {
        titleKey: 'tour.steps.gesturesTitle',
        bodyKey: 'tour.steps.gesturesBody',
        bullets: ['tour.steps.gesturesLike', 'tour.steps.gesturesNope', 'tour.steps.gesturesSeen'],
      },
      {
        titleKey: 'tour.steps.filtersTitle',
        bodyKey: 'tour.steps.filtersBody',
      },
      {
        titleKey: 'tour.steps.searchTitle',
        bodyKey: 'tour.steps.searchBody',
      },
      {
        titleKey: 'tour.steps.vaultTitle',
        bodyKey: 'tour.steps.vaultBody',
        bullets: [
          'tour.steps.vaultWatchlist',
          'tour.steps.vaultDiscards',
          'tour.steps.vaultDiary',
        ],
      },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const seen = await getStoredString(TOUR_KEY);
      if (!cancelled && seen !== '1') {
        setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async () => {
    setVisible(false);
    await setStoredString(TOUR_KEY, '1');
  }, []);

  const onNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      void dismiss();
      return;
    }
    setStepIndex((value) => value + 1);
  }, [dismiss, stepIndex, steps.length]);

  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void dismiss()}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText muted style={styles.stepLabel}>
            {t('tour.stepProgress', { current: stepIndex + 1, total: steps.length })}
          </AppText>
          <AppText variant="display">{t(step.titleKey)}</AppText>
          <AppText muted style={styles.body}>
            {t(step.bodyKey)}
          </AppText>
          {step.bullets ? (
            <View style={styles.bullets}>
              {step.bullets.map((key) => (
                <AppText key={key} color={colors.ink}>
                  {t(key)}
                </AppText>
              ))}
            </View>
          ) : null}
          <View style={styles.dots}>
            {steps.map((item, index) => (
              <View
                key={item.titleKey}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === stepIndex ? colors.cta : colors.line,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.actions}>
            <Button label={t('common.skip')} variant="ghost" onPress={() => void dismiss()} />
            <Button
              label={isLast ? t('tour.finishCta') : t('common.continue')}
              onPress={onNext}
              style={styles.nextButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    gap: 14,
  },
  stepLabel: {
    fontSize: 13,
  },
  body: {
    lineHeight: 22,
  },
  bullets: {
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButton: {
    flex: 1,
  },
});
