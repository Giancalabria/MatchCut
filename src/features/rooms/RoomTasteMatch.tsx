import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import {
  fetchRoomTasteMatch,
  type TasteMatchPair,
  type TasteMatchSuggestion,
} from '@/src/features/rooms/tasteMatchApi';
import { getDetails } from '@/src/features/tmdb/client';
import { posterUrl } from '@/src/features/tmdb/images';
import { AppText, Button } from '@/src/ui';
import { typography } from '@/theme/typography';

type SuggestionRow = TasteMatchSuggestion & {
  title: string;
  poster: string | null;
};

function peerLabel(pair: TasteMatchPair, index: number, t: (key: string, opts?: object) => string): string {
  if (pair.peer_display_name?.trim()) {
    return pair.peer_display_name.trim();
  }
  return t('rooms.memberN', { n: index + 1 });
}

export function RoomTasteMatch({ roomId, memberCount }: { roomId: string; memberCount: number }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<TasteMatchPair[]>([]);
  const [suggestionPosters, setSuggestionPosters] = useState<Record<string, SuggestionRow>>({});

  const load = useCallback(async () => {
    if (memberCount < 2) {
      setPairs([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchRoomTasteMatch(roomId);
      setPairs(response?.pairs ?? []);
    } catch (err) {
      console.warn('Failed to load room taste match', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
      setPairs([]);
    } finally {
      setLoading(false);
    }
  }, [memberCount, roomId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const suggestions = pairs.flatMap((pair) => pair.suggestions).slice(0, 12);
    if (suggestions.length === 0) {
      setSuggestionPosters({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      suggestions.map(async (item) => {
        const key = `${item.media_type}:${item.tmdb_id}`;
        const details = await getDetails(item.media_type, item.tmdb_id);
        return [
          key,
          {
            ...item,
            title:
              details?.title ??
              details?.name ??
              details?.original_title ??
              details?.original_name ??
              `${item.media_type} #${item.tmdb_id}`,
            poster: posterUrl(details?.poster_path, 'w185'),
          } satisfies SuggestionRow,
        ] as const;
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      const next: Record<string, SuggestionRow> = {};
      for (const [key, row] of entries) {
        next[key] = row;
      }
      setSuggestionPosters(next);
    });

    return () => {
      cancelled = true;
    };
  }, [pairs]);

  if (memberCount < 2) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <AppText variant="section">{t('rooms.tasteMatchTitle')}</AppText>
        <AppText muted variant="caption">
          {t('rooms.tasteMatchNeedMembers')}
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.header}>
        <AppText variant="section">{t('rooms.tasteMatchTitle')}</AppText>
        <Button label={t('explore.refresh')} variant="ghost" onPress={() => void load()} />
      </View>
      <AppText muted variant="caption">
        {t('rooms.tasteMatchHint')}
      </AppText>

      {loading ? <ActivityIndicator color={colors.cta} /> : null}
      {error ? (
        <AppText color={colors.nope} variant="caption">
          {error}
        </AppText>
      ) : null}

      {!loading && pairs.length === 0 && !error ? (
        <AppText muted variant="caption">
          {t('rooms.tasteMatchEmpty')}
        </AppText>
      ) : null}

      {pairs.map((pair, index) => {
        const name = peerLabel(pair, index, t);
        return (
          <View key={pair.peer_user_id} style={styles.pairBlock}>
            <View style={styles.pairHeader}>
              <AppText style={{ fontFamily: typography.bodyBold, fontSize: 15 }}>{name}</AppText>
              {pair.score_percent != null ? (
                <AppText variant="title" color={colors.accentDeep}>
                  {t('rooms.tasteMatchPercent', { percent: pair.score_percent })}
                </AppText>
              ) : (
                <AppText variant="label" muted>
                  {t('rooms.tasteMatchMeasuring')}
                </AppText>
              )}
            </View>
            <AppText muted variant="caption">
              {t(`rooms.tasteMatchConfidence.${pair.confidence}`, {
                overlap: pair.overlap_count,
              })}
            </AppText>

            {pair.suggestions.length > 0 ? (
              <View style={styles.suggestBlock}>
                <AppText variant="label">{t('rooms.tasteMatchSuggest')}</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
                  {pair.suggestions.map((item) => {
                    const key = `${item.media_type}:${item.tmdb_id}`;
                    const enriched = suggestionPosters[key];
                    return (
                      <Pressable
                        key={key}
                        onPress={() =>
                          router.push({
                            pathname: '/title/[mediaType]/[id]',
                            params: { mediaType: item.media_type, id: String(item.tmdb_id) },
                          })
                        }
                        style={styles.suggestItem}
                      >
                        {enriched?.poster ? (
                          <Image source={{ uri: enriched.poster }} style={styles.suggestPoster} />
                        ) : (
                          <View style={[styles.suggestPoster, { backgroundColor: colors.line }]} />
                        )}
                        <AppText variant="label" numberOfLines={2} style={styles.suggestTitle}>
                          {enriched?.title ?? `#${item.tmdb_id}`}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {pair.confidence === 'none' || pair.confidence === 'low' ? (
              <Button
                label={t('rooms.tasteMatchRateCta')}
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/vault',
                    params: { segment: 'taste' },
                  })
                }
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pairBlock: {
    gap: 8,
    paddingTop: 4,
  },
  pairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  suggestBlock: { gap: 8 },
  suggestRow: { gap: 10, paddingVertical: 4 },
  suggestItem: { width: 84, gap: 4 },
  suggestPoster: { width: 84, height: 126, borderRadius: 10 },
  suggestTitle: { minHeight: 28 },
});
