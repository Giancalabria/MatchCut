import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { MOVIE_GENRES, TV_GENRES } from '@/src/features/filters/constants';
import type { TitleInteraction } from '@/src/features/interactions/api';
import { STREAMING_PLATFORMS } from '@/src/features/onboarding/constants';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { getCachedVaultSnapshot, getVaultTitleEnrichment, peekVaultTitleMemory } from '@/src/features/tmdb/cache';
import { posterUrl } from '@/src/features/tmdb/images';
import type { Genre, WatchProvider } from '@/src/features/tmdb/types';
import { RatingBottomSheet } from '@/src/features/vault/RatingBottomSheet';
import { AppText } from '@/src/ui';
import { typography } from '@/theme/typography';

const PAGE_SIZE = 20;
const ENRICH_CONCURRENCY = 4;

type CollectionItem = {
  interaction: TitleInteraction;
  title: string | null;
  posterPath: string | null;
  voteAverage: number | null;
  genres: Genre[];
  providers: WatchProvider[];
  enriching: boolean;
};

type Actions = {
  onRestore?: (interaction: TitleInteraction) => void;
  onMoveToWatchlist?: (interaction: TitleInteraction) => void;
  onRate?: (interaction: TitleInteraction, rating: number) => void;
  onOpen?: (interaction: TitleInteraction) => void;
};

type TitleCollectionProps = {
  interactions: TitleInteraction[];
  actions?: Actions;
  showRatingButtons?: boolean;
  hideActionMeta?: boolean;
  enableFilters?: boolean;
};

function itemKey(interaction: TitleInteraction): string {
  return `${interaction.media_type}:${interaction.tmdb_id}`;
}

function placeholderItem(interaction: TitleInteraction): CollectionItem {
  return {
    interaction,
    title: null,
    posterPath: null,
    voteAverage: null,
    genres: [],
    providers: [],
    enriching: true,
  };
}

function itemFromSnapshot(
  interaction: TitleInteraction,
  snapshot: {
    title: string | null;
    posterPath: string | null;
    voteAverage: number | null;
    genres: Genre[];
    providers: WatchProvider[];
  },
  enriching: boolean,
): CollectionItem {
  return {
    interaction,
    title: snapshot.title,
    posterPath: snapshot.posterPath,
    voteAverage: snapshot.voteAverage,
    genres: snapshot.genres,
    providers: snapshot.providers,
    enriching,
  };
}

async function mapWithLimit<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

export function TitleCollection({
  interactions,
  actions,
  showRatingButtons = false,
  hideActionMeta = false,
  enableFilters = false,
}: TitleCollectionProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { profile } = useAuth();
  const region = profile?.region ?? undefined;

  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE);
  const [itemsByKey, setItemsByKey] = useState<Record<string, CollectionItem>>({});
  const [genreFilter, setGenreFilter] = useState<number | null>(null);
  const [platformFilter, setPlatformFilter] = useState<number | null>(null);
  const [ratingTarget, setRatingTarget] = useState<CollectionItem | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const enrichingKeysRef = useRef<Set<string>>(new Set());
  const interactionsRef = useRef(interactions);
  interactionsRef.current = interactions;

  const interactionSignature = useMemo(
    () => interactions.map((row) => `${row.id}:${row.action}:${row.rating ?? ''}`).join('|'),
    [interactions],
  );

  useEffect(() => {
    setLoadedCount(PAGE_SIZE);
    setGenreFilter(null);
    setPlatformFilter(null);
  }, [interactionSignature]);

  const visibleInteractions = useMemo(
    () => interactions.slice(0, loadedCount),
    [interactions, loadedCount],
  );

  useEffect(() => {
    let cancelled = false;
    const regionKey = region ?? undefined;

    const pending = visibleInteractions.filter((interaction) => {
      const key = itemKey(interaction);
      if (enrichingKeysRef.current.has(key)) {
        return false;
      }
      const existing = itemsByKey[key];
      if (existing && !existing.enriching && existing.interaction.id === interaction.id) {
        return false;
      }
      return true;
    });

    if (pending.length === 0) {
      return;
    }

    for (const interaction of pending) {
      enrichingKeysRef.current.add(itemKey(interaction));
    }

    // Paint memory hits immediately (sync), then SQLite, then network refresh.
    setItemsByKey((current) => {
      const next = { ...current };
      for (const interaction of pending) {
        const key = itemKey(interaction);
        const memory = peekVaultTitleMemory(
          interaction.media_type,
          interaction.tmdb_id,
          regionKey,
        );
        if (memory) {
          next[key] = itemFromSnapshot(interaction, memory, true);
        } else {
          next[key] = {
            ...(current[key] ?? placeholderItem(interaction)),
            interaction,
            enriching: true,
          };
        }
      }
      return next;
    });

    void (async () => {
      try {
        const snapshots = await mapWithLimit(pending, ENRICH_CONCURRENCY, async (interaction) => {
          const snapshot = await getCachedVaultSnapshot(
            interaction.media_type,
            interaction.tmdb_id,
            regionKey,
          );
          return { interaction, snapshot };
        });

        if (!cancelled) {
          setItemsByKey((current) => {
            const next = { ...current };
            for (const row of snapshots) {
              if (!row.snapshot) {
                continue;
              }
              const key = itemKey(row.interaction);
              next[key] = itemFromSnapshot(row.interaction, row.snapshot, true);
            }
            return next;
          });
        }

        const enriched = await mapWithLimit(pending, ENRICH_CONCURRENCY, async (interaction) => {
          const enrichment = await getVaultTitleEnrichment(
            interaction.media_type,
            interaction.tmdb_id,
            regionKey,
          );
          return { interaction, enrichment };
        });

        if (cancelled) {
          return;
        }

        setItemsByKey((current) => {
          const next = { ...current };
          for (const row of enriched) {
            const key = itemKey(row.interaction);
            next[key] = itemFromSnapshot(row.interaction, row.enrichment, false);
            enrichingKeysRef.current.delete(key);
          }
          return next;
        });
      } catch (err) {
        console.warn('Failed to enrich vault titles', err);
        for (const interaction of pending) {
          enrichingKeysRef.current.delete(itemKey(interaction));
        }
        if (!cancelled) {
          setItemsByKey((current) => {
            const next = { ...current };
            for (const interaction of pending) {
              const key = itemKey(interaction);
              const existing = next[key];
              if (existing) {
                next[key] = { ...existing, enriching: false };
              }
            }
            return next;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // itemsByKey intentionally omitted to avoid re-enrich loops; pending gate uses latest via setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleInteractions, region, interactionSignature]);

  const collectionItems = useMemo(() => {
    return visibleInteractions.map((interaction) => {
      const key = itemKey(interaction);
      const cached = itemsByKey[key];
      if (cached) {
        return { ...cached, interaction };
      }
      const memory = peekVaultTitleMemory(interaction.media_type, interaction.tmdb_id, region);
      if (memory) {
        return itemFromSnapshot(interaction, memory, true);
      }
      return placeholderItem(interaction);
    });
  }, [itemsByKey, region, visibleInteractions]);

  const filteredItems = useMemo(() => {
    return collectionItems.filter((item) => {
      if (genreFilter !== null) {
        if (!item.genres.some((genre) => genre.id === genreFilter)) {
          return false;
        }
      }
      if (platformFilter !== null) {
        if (!item.providers.some((provider) => provider.provider_id === platformFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [collectionItems, genreFilter, platformFilter]);

  const genreOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const item of collectionItems) {
      for (const genre of item.genres) {
        ids.add(genre.id);
      }
    }
    const catalog = [...MOVIE_GENRES, ...TV_GENRES];
    return [...ids]
      .map((id) => {
        const known = catalog.find((genre) => genre.id === id);
        const fromDetails = collectionItems
          .flatMap((item) => item.genres)
          .find((genre) => genre.id === id);
        return {
          id,
          label: known ? t(known.nameKey) : (fromDetails?.name ?? String(id)),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [collectionItems, t]);

  const platformOptions = useMemo(() => {
    const ids = new Set(
      collectionItems.flatMap((item) => item.providers.map((provider) => provider.provider_id)),
    );
    return [...ids]
      .map((id) => {
        const known = STREAMING_PLATFORMS.find((platform) => platform.tmdbProviderId === id);
        const fromItem = collectionItems
          .flatMap((item) => item.providers)
          .find((provider) => provider.provider_id === id);
        return {
          id,
          label: known ? t(known.nameKey) : (fromItem?.provider_name ?? String(id)),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [collectionItems, t]);

  const hasMore = loadedCount < interactions.length;

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setLoadedCount((count) => Math.min(count + PAGE_SIZE, interactionsRef.current.length));
    requestAnimationFrame(() => setLoadingMore(false));
  }, [hasMore, loadingMore]);

  // When filters hide most of the loaded page, keep pulling until we have rows or exhaust.
  useEffect(() => {
    if (genreFilter === null && platformFilter === null) {
      return;
    }
    if (filteredItems.length > 0 || !hasMore) {
      return;
    }
    loadMore();
  }, [filteredItems.length, genreFilter, hasMore, loadMore, platformFilter]);

  if (interactions.length === 0) {
    return <AppText muted>{t('vault.empty')}</AppText>;
  }

  return (
    <View style={styles.root}>
      {enableFilters && (genreOptions.length > 0 || platformOptions.length > 0) ? (
        <View style={styles.filters}>
          {genreOptions.length > 0 ? (
            <View style={styles.filterBlock}>
              <AppText variant="label" muted>
                {t('vault.filterGenre')}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <SelectChip
                  label={t('vault.filterAll')}
                  selected={genreFilter === null}
                  onPress={() => setGenreFilter(null)}
                />
                {genreOptions.map((genre) => (
                  <SelectChip
                    key={genre.id}
                    label={genre.label}
                    selected={genreFilter === genre.id}
                    onPress={() => setGenreFilter(genre.id)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
          {platformOptions.length > 0 ? (
            <View style={styles.filterBlock}>
              <AppText variant="label" muted>
                {t('vault.filterPlatform')}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <SelectChip
                  label={t('vault.filterAll')}
                  selected={platformFilter === null}
                  onPress={() => setPlatformFilter(null)}
                />
                {platformOptions.map((platform) => (
                  <SelectChip
                    key={platform.id}
                    label={platform.label}
                    selected={platformFilter === platform.id}
                    onPress={() => setPlatformFilter(platform.id)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}

      {filteredItems.length === 0 ? (
        <View style={styles.emptyFiltered}>
          {hasMore ? <ActivityIndicator color={colors.cta} /> : null}
          <AppText muted>{t('vault.emptyFiltered')}</AppText>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.interaction.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            hasMore || loadingMore ? (
              <ActivityIndicator color={colors.cta} style={styles.footerSpinner} />
            ) : null
          }
          renderItem={({ item }) => {
            const image = posterUrl(item.posterPath);
            const tmdbRating = item.voteAverage ? item.voteAverage.toFixed(1) : null;
            const genres = item.genres.slice(0, 3).map((genre) => genre.name);
            const platforms = item.providers.slice(0, 3).map((provider) => provider.provider_name);
            const showMeta =
              Boolean(item.interaction.rating) || (!hideActionMeta && !showRatingButtons);
            const showTitleSkeleton = !item.title;

            return (
              <Pressable
                onPress={() => actions?.onOpen?.(item.interaction)}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}
              >
                <View style={[styles.poster, { backgroundColor: colors.line }]}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.posterImage} contentFit="cover" />
                  ) : item.enriching ? (
                    <ActivityIndicator color={colors.cta} style={styles.posterSpinner} />
                  ) : null}
                </View>
                <View style={styles.info}>
                  {showTitleSkeleton ? (
                    <View style={styles.titleSkeletonBlock}>
                      <View style={[styles.titleSkeleton, { backgroundColor: colors.line }]} />
                      <View
                        style={[styles.titleSkeletonShort, { backgroundColor: colors.line }]}
                      />
                    </View>
                  ) : (
                    <AppText style={{ fontFamily: typography.bodyBold, fontSize: 16 }} numberOfLines={2}>
                      {item.title}
                    </AppText>
                  )}
                  <View style={styles.metaRow}>
                    {tmdbRating ? (
                      <AppText variant="caption" color={colors.accentDeep}>
                        ★ {tmdbRating}
                      </AppText>
                    ) : null}
                    {showMeta && item.interaction.rating ? (
                      <AppText variant="caption" muted>
                        {t('vault.ratingValue', { rating: item.interaction.rating })}
                      </AppText>
                    ) : null}
                    {item.enriching && !item.title ? (
                      <AppText variant="caption" muted>
                        …
                      </AppText>
                    ) : null}
                  </View>
                  {genres.length > 0 ? (
                    <AppText variant="caption" muted numberOfLines={1}>
                      {genres.join(' · ')}
                    </AppText>
                  ) : null}
                  {platforms.length > 0 ? (
                    <AppText variant="caption" muted numberOfLines={1}>
                      {platforms.join(' · ')}
                    </AppText>
                  ) : null}
                  <View style={styles.actions}>
                    {actions?.onRestore ? (
                      <Pressable
                        onPress={() => actions.onRestore?.(item.interaction)}
                        style={[styles.smallButton, { borderColor: colors.cta }]}
                      >
                        <Text style={[styles.smallButtonText, { color: colors.cta, fontFamily: typography.bodyBold }]}>
                          {t('vault.restore')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {actions?.onMoveToWatchlist ? (
                      <Pressable
                        onPress={() => actions.onMoveToWatchlist?.(item.interaction)}
                        style={[styles.smallButton, { borderColor: colors.cta }]}
                      >
                        <Text style={[styles.smallButtonText, { color: colors.cta, fontFamily: typography.bodyBold }]}>
                          {t('vault.moveToWatchlist')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {showRatingButtons && actions?.onRate ? (
                      <Pressable
                        onPress={() => setRatingTarget(item)}
                        style={[styles.smallButton, { borderColor: colors.seen, backgroundColor: colors.warningSoft }]}
                      >
                        <Text style={[styles.smallButtonText, { color: colors.ink, fontFamily: typography.bodyBold }]}>
                          {item.interaction.action === 'seen'
                            ? item.interaction.rating
                              ? t('vault.ratingValue', { rating: item.interaction.rating })
                              : t('vault.rateCta')
                            : t('vault.markSeenCta')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <RatingBottomSheet
        visible={ratingTarget !== null}
        title={ratingTarget?.title ?? ''}
        currentRating={ratingTarget?.interaction.rating ?? null}
        onClose={() => setRatingTarget(null)}
        onSelect={(rating) => {
          if (ratingTarget) {
            actions?.onRate?.(ratingTarget.interaction, rating);
          }
          setRatingTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, minHeight: 200 },
  filters: { gap: 10 },
  filterBlock: { gap: 6 },
  chipRow: { gap: 8, paddingRight: 8 },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 24 },
  emptyFiltered: { gap: 10, paddingVertical: 12 },
  footerSpinner: { marginVertical: 12 },
  row: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
  },
  poster: {
    width: 76,
    height: 112,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterSpinner: {
    transform: [{ scale: 0.85 }],
  },
  titleSkeletonBlock: { gap: 8, paddingVertical: 4 },
  titleSkeleton: { height: 14, borderRadius: 6, width: '88%' },
  titleSkeletonShort: { height: 12, borderRadius: 6, width: '52%' },
  info: { flex: 1, gap: 5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  smallButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  smallButtonText: { fontSize: 12 },
});
