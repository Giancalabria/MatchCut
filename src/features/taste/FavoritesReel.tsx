import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import type { FavoritesReelItem } from '@/src/features/taste/monthWrap';
import { getCachedVaultSnapshot } from '@/src/features/tmdb/cache';
import { posterUrl } from '@/src/features/tmdb/images';
import { AppText } from '@/src/ui';
import { radii } from '@/theme/radii';
import { space } from '@/theme/spacing';

type ReelRow = FavoritesReelItem & {
  title: string;
  poster: string | null;
};

export function FavoritesReel({
  items,
  region,
  emptyLabel,
}: {
  items: FavoritesReelItem[];
  region?: string | null;
  emptyLabel: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [rows, setRows] = useState<ReelRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      items.map(async (item) => {
        const snapshot = await getCachedVaultSnapshot(item.media_type, item.tmdb_id, region);
        return {
          ...item,
          title: snapshot?.title ?? `${item.media_type} #${item.tmdb_id}`,
          poster: posterUrl(snapshot?.posterPath, 'w185'),
        } satisfies ReelRow;
      }),
    ).then((next) => {
      if (!cancelled) {
        setRows(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [items, region]);

  if (items.length === 0) {
    return (
      <AppText muted variant="caption">
        {emptyLabel}
      </AppText>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {rows.map((row) => (
        <Pressable
          key={`${row.media_type}:${row.tmdb_id}`}
          onPress={() =>
            router.push({
              pathname: '/title/[mediaType]/[id]',
              params: { mediaType: row.media_type, id: String(row.tmdb_id) },
            })
          }
          style={styles.item}
        >
          {row.poster ? (
            <Image source={{ uri: row.poster }} style={styles.poster} />
          ) : (
            <View style={[styles.poster, { backgroundColor: colors.line }]} />
          )}
          <AppText variant="label" style={styles.rating}>
            {t('vault.ratingValue', { rating: row.rating })}
          </AppText>
          <AppText variant="label" numberOfLines={2} style={styles.title}>
            {row.title}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.xs + 2, paddingVertical: space.xxs },
  item: { width: 92, gap: space.xxs },
  poster: { width: 92, height: 138, borderRadius: radii.md },
  rating: { textAlign: 'center' },
  title: { minHeight: 28 },
});
