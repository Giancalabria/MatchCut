import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import type { TitleInteraction } from '@/src/features/interactions/api';
import { getDetails } from '@/src/features/tmdb/client';
import { posterUrl } from '@/src/features/tmdb/images';
import type { MediaDetails } from '@/src/features/tmdb/types';
import { typography } from '@/theme/typography';

type CollectionItem = {
  interaction: TitleInteraction;
  details: MediaDetails | null;
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
};

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

function titleFor(item: CollectionItem): string {
  const details = item.details;
  return (
    details?.title ??
    details?.name ??
    details?.original_title ??
    details?.original_name ??
    `${item.interaction.media_type.toUpperCase()} #${item.interaction.tmdb_id}`
  );
}

export function TitleCollection({
  interactions,
  actions,
  showRatingButtons = false,
}: TitleCollectionProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    mapWithLimit(interactions, 4, async (interaction) => ({
      interaction,
      details: await getDetails(interaction.media_type, interaction.tmdb_id),
    }))
      .then((nextItems) => {
        if (!cancelled) {
          setItems(nextItems);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [interactions]);

  if (loading && items.length === 0) {
    return <ActivityIndicator color={colors.accent} />;
  }

  if (interactions.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.inkMuted, fontFamily: typography.body }]}>
        {t('vault.empty')}
      </Text>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.interaction.id}
      scrollEnabled={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const image = posterUrl(item.details?.poster_path);
        return (
          <Pressable
            onPress={() => actions?.onOpen?.(item.interaction)}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Image source={{ uri: image ?? undefined }} style={styles.poster} contentFit="cover" />
            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.ink, fontFamily: typography.bodyBold }]} numberOfLines={2}>
                {titleFor(item)}
              </Text>
              <Text style={[styles.meta, { color: colors.inkMuted, fontFamily: typography.body }]}>
                {item.interaction.rating
                  ? t('vault.ratingValue', { rating: item.interaction.rating })
                  : t(`vault.action.${item.interaction.action}`)}
              </Text>
              <View style={styles.actions}>
                {actions?.onRestore ? (
                  <Pressable onPress={() => actions.onRestore?.(item.interaction)} style={[styles.smallButton, { borderColor: colors.accent }]}>
                    <Text style={[styles.smallButtonText, { color: colors.accent, fontFamily: typography.bodyBold }]}>
                      {t('vault.restore')}
                    </Text>
                  </Pressable>
                ) : null}
                {actions?.onMoveToWatchlist ? (
                  <Pressable onPress={() => actions.onMoveToWatchlist?.(item.interaction)} style={[styles.smallButton, { borderColor: colors.accent }]}>
                    <Text style={[styles.smallButtonText, { color: colors.accent, fontFamily: typography.bodyBold }]}>
                      {t('vault.moveToWatchlist')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {showRatingButtons && actions?.onRate ? (
                <View style={styles.ratings}>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
                    <Pressable
                      key={rating}
                      onPress={() => actions.onRate?.(item.interaction, rating)}
                      style={[
                        styles.ratingButton,
                        {
                          backgroundColor:
                            item.interaction.rating === rating ? colors.seen : colors.bg,
                          borderColor: colors.line,
                        },
                      ]}
                    >
                      <Text style={[styles.ratingText, { color: colors.ink, fontFamily: typography.bodyBold }]}>
                        {rating}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
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
    backgroundColor: '#D4DDE6',
  },
  info: { flex: 1, gap: 7 },
  title: { fontSize: 16 },
  meta: { fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  smallButtonText: { fontSize: 12 },
  ratings: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  ratingButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: { fontSize: 12 },
  empty: { fontSize: 14, lineHeight: 20 },
});
