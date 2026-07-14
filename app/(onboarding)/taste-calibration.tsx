import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { useInteractions } from '@/providers/InteractionsProvider';
import { usePreferences, useThemeColors } from '@/providers/PreferencesProvider';
import { SwipeDeck } from '@/src/features/deck/SwipeDeck';
import { CALIBRATION_MIN_ANSWERS, CALIBRATION_MOVIE_IDS } from '@/src/features/onboarding/calibrationTitles';
import { loadCalibrationDeck } from '@/src/features/onboarding/loadCalibrationDeck';
import type { MediaItem } from '@/src/features/tmdb/types';
import { Button } from '@/src/ui';
import { typography } from '@/theme/typography';

function mergeGenreIds(current: number[], next: number[] | undefined): number[] {
  const set = new Set(current);
  for (const id of next ?? []) {
    set.add(id);
  }
  return [...set];
}

export default function TasteCalibrationScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { language } = usePreferences();
  const { updateProfile, isConfigured } = useAuth();
  const { upsert } = useInteractions();
  const [cards, setCards] = useState<MediaItem[]>([]);
  const [answered, setAnswered] = useState(0);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const likedGenresRef = useRef<number[]>([]);
  const dislikedGenresRef = useRef<number[]>([]);

  const total = CALIBRATION_MOVIE_IDS.length;
  const tmdbLanguage = language === 'en' ? 'en-US' : 'es-ES';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const deck = await loadCalibrationDeck(tmdbLanguage);
        if (!cancelled) {
          setCards(deck);
          setStarted(deck.length > 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('auth.unknownError'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, tmdbLanguage]);

  const finish = useCallback(async () => {
    if (finishing) {
      return;
    }

    setFinishing(true);
    setError(null);
    try {
      if (isConfigured) {
        await updateProfile({
          onboarding_completed: true,
          liked_genre_ids: likedGenresRef.current,
          disliked_genre_ids: dislikedGenresRef.current,
        });
      }
      router.replace('/(tabs)/explore');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
      setFinishing(false);
    }
  }, [finishing, isConfigured, t, updateProfile]);

  const removeCard = useCallback((item: MediaItem) => {
    setCards((current) => current.filter((card) => card.id !== item.id));
  }, []);

  const onLiked = useCallback(
    async (item: MediaItem) => {
      removeCard(item);
      setAnswered((count) => count + 1);
      likedGenresRef.current = mergeGenreIds(likedGenresRef.current, item.genre_ids);
      if (!isConfigured) {
        return;
      }
      try {
        await upsert({
          tmdb_id: item.id,
          media_type: 'movie',
          action: 'seen',
        });
      } catch (err) {
        console.warn('Failed to save calibration like', err);
      }
    },
    [isConfigured, removeCard, upsert],
  );

  const onDisliked = useCallback(
    async (item: MediaItem) => {
      removeCard(item);
      setAnswered((count) => count + 1);
      dislikedGenresRef.current = mergeGenreIds(dislikedGenresRef.current, item.genre_ids);
      if (!isConfigured) {
        return;
      }
      try {
        await upsert({
          tmdb_id: item.id,
          media_type: 'movie',
          action: 'seen',
        });
      } catch (err) {
        console.warn('Failed to save calibration dislike', err);
      }
    },
    [isConfigured, removeCard, upsert],
  );

  const onUnseen = useCallback(
    (item: MediaItem) => {
      removeCard(item);
    },
    [removeCard],
  );

  useEffect(() => {
    if (!loading && started && cards.length === 0 && !finishing) {
      void finish();
    }
  }, [cards.length, finish, finishing, loading, started]);

  const canFinishEarly = answered >= CALIBRATION_MIN_ANSWERS;

  return (
    <>
      <Stack.Screen options={{ title: t('onboarding.tasteCalibrationTitle'), headerBackVisible: false }} />
      <View style={[styles.root, { backgroundColor: colors.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={[styles.progress, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
          {t('onboarding.tasteProgress', { answered, total })}
        </Text>

        <View style={styles.deckWrap}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.cta} />
              <Text style={{ color: colors.inkMuted, fontFamily: typography.body }}>{t('explore.loading')}</Text>
            </View>
          ) : cards.length > 0 ? (
            <SwipeDeck
              cards={cards}
              onOpenDetail={() => undefined}
              onSwipeLike={(item) => {
                void onLiked(item);
              }}
              onSwipeNope={(item) => {
                void onDisliked(item);
              }}
              onSwipeSeen={onUnseen}
              stampLabels={{
                like: t('onboarding.stampLiked'),
                nope: t('onboarding.stampDisliked'),
                seen: t('onboarding.stampUnseen'),
              }}
            />
          ) : error ? (
            <View style={styles.center}>
              <Text style={{ color: colors.nope, fontFamily: typography.body, textAlign: 'center' }}>{error}</Text>
              <Button
                label={t('onboarding.tasteFinishEarly')}
                onPress={() => {
                  void finish();
                }}
              />
            </View>
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color={colors.cta} />
            </View>
          )}
        </View>

        {error && cards.length > 0 ? (
          <Text style={{ color: colors.nope, fontFamily: typography.body, textAlign: 'center' }}>{error}</Text>
        ) : null}

        {canFinishEarly ? (
          <Button
            label={t('onboarding.tasteFinishEarly')}
            variant="secondary"
            loading={finishing}
            onPress={() => {
              void finish();
            }}
          />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  progress: {
    fontSize: 14,
    textAlign: 'center',
  },
  deckWrap: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
