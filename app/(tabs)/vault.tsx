import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useInteractions } from '@/providers/InteractionsProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import type { TitleInteraction } from '@/src/features/interactions/api';
import { TasteDashboardPanel } from '@/src/features/taste/TasteDashboardPanel';
import { BulkRatingSession } from '@/src/features/vault/BulkRatingSession';
import { TitleCollection } from '@/src/features/vault/TitleCollection';
import { AppText, Button, IconButton, TabScreenHeader } from '@/src/ui';
import { radii } from '@/theme/radii';
import { layout, space } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Segment = 'taste' | 'watchlist' | 'discards' | 'diary';

const SEGMENTS: Segment[] = ['taste', 'watchlist', 'discards', 'diary'];
const EMPTY: TitleInteraction[] = [];

function parseSegment(value: string | string[] | undefined): Segment | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'taste' || raw === 'watchlist' || raw === 'discards' || raw === 'diary') {
    return raw;
  }
  return null;
}

export default function VaultScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ openBulk?: string; segment?: string }>();
  const { isConfigured } = useAuth();
  const { ready, listByAction, restoreNope, upsert, setRating } = useInteractions();
  const [segment, setSegment] = useState<Segment>('taste');
  const [visited, setVisited] = useState<Record<Segment, boolean>>({
    taste: true,
    watchlist: false,
    discards: false,
    diary: false,
  });
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    setVisited((current) => (current[segment] ? current : { ...current, [segment]: true }));
  }, [segment]);

  useEffect(() => {
    const nextSegment = parseSegment(params.segment);
    if (nextSegment) {
      setSegment(nextSegment);
    }
    const openBulk = Array.isArray(params.openBulk) ? params.openBulk[0] : params.openBulk;
    if (openBulk === '1') {
      setSegment('diary');
      setBulkOpen(true);
      router.setParams({ openBulk: undefined, segment: undefined });
    }
  }, [params.openBulk, params.segment]);

  const likes = isConfigured ? listByAction('like') : EMPTY;
  const nopes = isConfigured ? listByAction('nope') : EMPTY;
  const seens = isConfigured ? listByAction('seen') : EMPTY;

  const sortedDiary = useMemo(
    () => [...seens].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [seens],
  );

  const unratedSeens = useMemo(() => seens.filter((item) => item.rating == null), [seens]);

  function openRandomWatchlist() {
    if (likes.length === 0) {
      return;
    }
    const pick = likes[Math.floor(Math.random() * likes.length)];
    router.push({
      pathname: '/title/[mediaType]/[id]',
      params: { mediaType: pick.media_type, id: String(pick.tmdb_id) },
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.headerBlock}>
        <TabScreenHeader
          title={t('vault.title')}
          right={
            <IconButton
              name="settings"
              onPress={() => router.push('/settings' as Href)}
              accessibilityLabel={t('settings.title')}
            />
          }
        />

        <View style={[styles.segmentTrack, { backgroundColor: colors.surface }]}>
          {SEGMENTS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setSegment(item)}
              style={[
                styles.segmentButton,
                { backgroundColor: segment === item ? colors.cta : 'transparent' },
              ]}
            >
              <AppText
                variant="label"
                color={segment === item ? colors.onAccent : colors.inkMuted}
                style={styles.segmentLabel}
                numberOfLines={1}
              >
                {t(`vault.segments.${item}`)}
              </AppText>
            </Pressable>
          ))}
        </View>

        {isConfigured && !ready && segment !== 'taste' ? (
          <ActivityIndicator color={colors.cta} />
        ) : null}

        {segment === 'watchlist' && likes.length > 0 ? (
          <Button label={t('vault.pickRandom')} onPress={openRandomWatchlist} />
        ) : null}

        {segment === 'diary' && unratedSeens.length > 0 ? (
          <Button label={t('vault.bulkRateCta')} onPress={() => setBulkOpen(true)} />
        ) : null}
      </View>

      <View style={styles.listArea}>
        {visited.taste ? (
          <View
            style={[styles.segmentPane, segment !== 'taste' ? styles.segmentPaneHidden : null]}
            pointerEvents={segment === 'taste' ? 'auto' : 'none'}
          >
            <TasteDashboardPanel onOpenDiary={() => setSegment('diary')} />
          </View>
        ) : null}

        {visited.watchlist ? (
          <View
            style={[styles.segmentPane, segment !== 'watchlist' ? styles.segmentPaneHidden : null]}
            pointerEvents={segment === 'watchlist' ? 'auto' : 'none'}
          >
            <TitleCollection
              interactions={likes}
              hideActionMeta
              enableFilters
              showRatingButtons
              actions={{
                onOpen: (interaction) =>
                  router.push({
                    pathname: '/title/[mediaType]/[id]',
                    params: { mediaType: interaction.media_type, id: String(interaction.tmdb_id) },
                  }),
                onRate: (interaction, rating) => {
                  void setRating(interaction.tmdb_id, interaction.media_type, rating);
                },
              }}
            />
          </View>
        ) : null}

        {visited.discards ? (
          <View
            style={[styles.segmentPane, segment !== 'discards' ? styles.segmentPaneHidden : null]}
            pointerEvents={segment === 'discards' ? 'auto' : 'none'}
          >
            <TitleCollection
              interactions={nopes}
              hideActionMeta
              enableFilters
              showRatingButtons
              actions={{
                onOpen: (interaction) =>
                  router.push({
                    pathname: '/title/[mediaType]/[id]',
                    params: { mediaType: interaction.media_type, id: String(interaction.tmdb_id) },
                  }),
                onRestore: (interaction) => {
                  void restoreNope(interaction.tmdb_id, interaction.media_type);
                },
                onMoveToWatchlist: (interaction) => {
                  void upsert({
                    tmdb_id: interaction.tmdb_id,
                    media_type: interaction.media_type,
                    action: 'like',
                  });
                },
                onRate: (interaction, rating) => {
                  void setRating(interaction.tmdb_id, interaction.media_type, rating);
                },
              }}
            />
          </View>
        ) : null}

        {visited.diary ? (
          <View
            style={[styles.segmentPane, segment !== 'diary' ? styles.segmentPaneHidden : null]}
            pointerEvents={segment === 'diary' ? 'auto' : 'none'}
          >
            <TitleCollection
              interactions={sortedDiary}
              showRatingButtons
              hideActionMeta
              enableFilters
              actions={{
                onOpen: (interaction) =>
                  router.push({
                    pathname: '/title/[mediaType]/[id]',
                    params: { mediaType: interaction.media_type, id: String(interaction.tmdb_id) },
                  }),
                onRate: (interaction, rating) => {
                  void setRating(interaction.tmdb_id, interaction.media_type, rating);
                },
              }}
            />
          </View>
        ) : null}
      </View>

      <BulkRatingSession
        visible={bulkOpen}
        queue={unratedSeens}
        onClose={() => {
          setBulkOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingX,
    gap: space.sm + 2,
  },
  headerBlock: {
    gap: space.sm + 2,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: space.xxs,
    gap: space.xxs,
  },
  segmentButton: {
    flex: 1,
    borderRadius: radii.sm + 2,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontFamily: typography.bodyBold,
    textAlign: 'center',
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  segmentPane: {
    flex: 1,
    minHeight: 0,
  },
  segmentPaneHidden: {
    display: 'none',
  },
});
