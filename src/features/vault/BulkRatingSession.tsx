import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useInteractions } from '@/providers/InteractionsProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import type { TitleInteraction } from '@/src/features/interactions/api';
import { getDetails } from '@/src/features/tmdb/client';
import { posterUrl } from '@/src/features/tmdb/images';
import type { MediaDetails } from '@/src/features/tmdb/types';
import { AppText, Button } from '@/src/ui';
import { typography } from '@/theme/typography';

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const ROW_A = RATINGS.slice(0, 5);
const ROW_B = RATINGS.slice(5);

function titleFor(details: MediaDetails | null, interaction: TitleInteraction): string {
  return (
    details?.title ??
    details?.name ??
    details?.original_title ??
    details?.original_name ??
    `${interaction.media_type.toUpperCase()} #${interaction.tmdb_id}`
  );
}

export function BulkRatingSession({
  visible,
  queue,
  onClose,
  feedbackGenreKey = null,
}: {
  visible: boolean;
  queue: TitleInteraction[];
  onClose: () => void;
  /** Optional i18n key like `genres.thriller` for post-session feedback. */
  feedbackGenreKey?: string | null;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { setRating } = useInteractions();
  const [index, setIndex] = useState(0);
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ratedInSession, setRatedInSession] = useState(0);
  const [sessionQueue, setSessionQueue] = useState<TitleInteraction[]>([]);
  const [queueFrozen, setQueueFrozen] = useState(false);

  const activeQueue = queueFrozen ? sessionQueue : queue;
  const total = activeQueue.length;
  const current = activeQueue[index] ?? null;
  const done = visible && total > 0 && index >= total;

  useEffect(() => {
    if (!visible) {
      setIndex(0);
      setDetails(null);
      setSaving(false);
      setRatedInSession(0);
      setSessionQueue([]);
      setQueueFrozen(false);
      return;
    }
    setSessionQueue(queue);
    setQueueFrozen(true);
    setIndex(0);
    setRatedInSession(0);
    // Snapshot queue once when the session opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally ignore later queue updates
  }, [visible]);

  useEffect(() => {
    if (!visible || !current) {
      return;
    }

    let cancelled = false;
    setLoadingDetails(true);
    void getDetails(current.media_type, current.tmdb_id)
      .then((next) => {
        if (!cancelled) {
          setDetails(next);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [current, visible]);

  const advance = useCallback(() => {
    setIndex((value) => value + 1);
  }, []);

  const onSelect = useCallback(
    async (rating: number) => {
      if (!current || saving) {
        return;
      }
      setSaving(true);
      try {
        await setRating(current.tmdb_id, current.media_type, rating);
        setRatedInSession((value) => value + 1);
        advance();
      } catch (err) {
        console.warn('Failed to save bulk rating', err);
      } finally {
        setSaving(false);
      }
    },
    [advance, current, saving, setRating],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.bg,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {total === 0 ? (
          <View style={styles.center}>
            <AppText muted>{t('vault.bulkRateEmpty')}</AppText>
            <Button label={t('vault.bulkRateDone')} onPress={onClose} />
          </View>
        ) : done ? (
          <View style={styles.center}>
            <AppText variant="title">{t('vault.bulkRateDone')}</AppText>
            {ratedInSession > 0 ? (
              <View style={styles.feedbackBlock}>
                <AppText style={styles.feedbackCenter}>
                  {t('vault.bulkRateFeedback', { count: ratedInSession })}
                </AppText>
                <AppText muted style={styles.feedbackCenter}>
                  {feedbackGenreKey
                    ? t('vault.bulkRateFeedbackGenre', { genre: t(feedbackGenreKey) })
                    : t('vault.bulkRateFeedbackHint')}
                </AppText>
              </View>
            ) : (
              <AppText muted style={styles.feedbackCenter}>
                {t('vault.bulkRateFeedbackSkipped')}
              </AppText>
            )}
            <Button label={t('common.close')} onPress={onClose} />
          </View>
        ) : (
          <>
            <View style={styles.topBar}>
              <AppText muted>
                {t('vault.bulkRateProgress', { current: Math.min(index + 1, total), total })}
              </AppText>
              <Button label={t('common.close')} variant="ghost" onPress={onClose} />
            </View>

            <View style={styles.posterWrap}>
              {loadingDetails ? (
                <ActivityIndicator color={colors.cta} />
              ) : (
                <>
                  {posterUrl(details?.poster_path) ? (
                    <Image
                      source={{ uri: posterUrl(details?.poster_path)! }}
                      style={styles.poster}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.poster, { backgroundColor: colors.line }]} />
                  )}
                  <AppText variant="title" style={styles.title} numberOfLines={2}>
                    {titleFor(details, current!)}
                  </AppText>
                  <AppText muted style={styles.subtitle}>
                    {t('vault.rateTitle')}
                  </AppText>
                </>
              )}
            </View>

            <View style={styles.grid}>
              {[ROW_A, ROW_B].map((row) => (
                <View key={row[0]} style={styles.row}>
                  {row.map((rating) => (
                    <Pressable
                      key={rating}
                      disabled={saving}
                      onPress={() => void onSelect(rating)}
                      style={[
                        styles.ratingCell,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.line,
                          opacity: saving ? 0.6 : 1,
                        },
                      ]}
                    >
                      <AppText variant="section" style={{ fontFamily: typography.bodyBold }}>
                        {rating}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            <Button label={t('vault.bulkRateSkip')} variant="secondary" onPress={advance} disabled={saving} />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  feedbackBlock: {
    gap: 8,
    paddingHorizontal: 12,
  },
  feedbackCenter: {
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  poster: {
    width: 180,
    height: 270,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
