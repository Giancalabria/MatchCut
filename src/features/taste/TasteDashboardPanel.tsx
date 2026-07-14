import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useInteractions } from '@/providers/InteractionsProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import type { TitleInteraction } from '@/src/features/interactions/api';
import { FavoritesReel } from '@/src/features/taste/FavoritesReel';
import { loadGenreIdsFromCache } from '@/src/features/taste/loadGenreIdsFromCache';
import { MonthWrapModal } from '@/src/features/taste/MonthWrapModal';
import { buildMonthWrap, pickFavoritesReel } from '@/src/features/taste/monthWrap';
import {
  PENDING_TARGET,
  SIGNATURE_MIN_RATINGS,
  buildTasteStats,
  genreNameKeyForId,
  type TasteStats,
} from '@/src/features/taste/tasteStats';
import { BulkRatingSession } from '@/src/features/vault/BulkRatingSession';
import { AppText, Button } from '@/src/ui';
import { typography } from '@/theme/typography';

const EMPTY: TitleInteraction[] = [];

function formatAverage(value: number | null): string {
  if (value == null) {
    return '—';
  }
  return value.toFixed(1);
}

export function TasteDashboardPanel({ onOpenDiary }: { onOpenDiary?: () => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { isConfigured, profile } = useAuth();
  const { ready, interactions: allInteractions, listByAction } = useInteractions();
  const [genreIdsByKey, setGenreIdsByKey] = useState<Record<string, number[]>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLimit, setBulkLimit] = useState<number | null>(null);
  const [wrapOpen, setWrapOpen] = useState(false);

  const interactions = isConfigured && ready ? allInteractions : EMPTY;
  const unratedSeens = useMemo(
    () => (isConfigured && ready ? listByAction('seen').filter((item) => item.rating == null) : EMPTY),
    [isConfigured, listByAction, ready],
  );

  useEffect(() => {
    if (!isConfigured || !ready) {
      setGenreIdsByKey({});
      return;
    }
    let cancelled = false;
    void loadGenreIdsFromCache(interactions, profile?.region).then((next) => {
      if (!cancelled) {
        setGenreIdsByKey(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [interactions, isConfigured, profile?.region, ready]);

  const stats: TasteStats = useMemo(
    () => buildTasteStats(interactions, genreIdsByKey, profile?.liked_genre_ids ?? []),
    [genreIdsByKey, interactions, profile?.liked_genre_ids],
  );

  const genreKeyByTitleKey = useMemo(() => {
    const mapped: Record<string, string[]> = {};
    for (const [titleKey, ids] of Object.entries(genreIdsByKey)) {
      const keys = ids
        .map((id) => genreNameKeyForId(id))
        .filter((key): key is string => Boolean(key));
      if (keys.length > 0) {
        mapped[titleKey] = keys;
      }
    }
    return mapped;
  }, [genreIdsByKey]);

  const favorites = useMemo(() => pickFavoritesReel(interactions), [interactions]);
  const monthWrap = useMemo(
    () => buildMonthWrap(interactions, genreKeyByTitleKey),
    [genreKeyByTitleKey, interactions],
  );

  const signatureReady = stats.ratedCount >= SIGNATURE_MIN_RATINGS && stats.signatureGenreKeys.length > 0;
  const signatureLabel = signatureReady
    ? stats.signatureGenreKeys.map((key) => t(key)).join(' · ')
    : t('taste.signatureEmpty');

  const tuningPercent = Math.round(stats.tuningProgress * 100);
  const bulkQueue =
    bulkLimit != null ? unratedSeens.slice(0, Math.max(bulkLimit, 1)) : unratedSeens;

  function openBulk(limit?: number) {
    setBulkLimit(limit ?? null);
    setBulkOpen(true);
  }

  function monthMarkLine(): string {
    if (stats.ratedThisMonth === 0) {
      return t('taste.monthMarkEmpty');
    }
    if (stats.highScoresThisMonth > 0) {
      return t('taste.monthMarkHigh', {
        count: stats.ratedThisMonth,
        highs: stats.highScoresThisMonth,
      });
    }
    return t('taste.monthMark', { count: stats.ratedThisMonth });
  }

  const maxHist = Math.max(1, ...stats.ratingHistogram);

  if (!isConfigured) {
    return (
      <View style={styles.center}>
        <AppText muted>{t('taste.localOnly')}</AppText>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.cta} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AppText variant="caption" muted style={styles.heroEyebrow}>
            {t('taste.signatureLabel')}
          </AppText>
          <AppText variant="title" style={{ fontFamily: typography.display }}>
            {signatureLabel}
          </AppText>
          <AppText muted>
            {stats.tuningReady ? t('taste.feedTuned') : t('taste.feedTuning')}
          </AppText>
        </View>

        <View style={styles.statsRow}>
          <StatCard label={t('taste.statRated')} value={String(stats.ratedCount)} colors={colors} />
          <Pressable
            style={styles.statFlex}
            onPress={() => {
              if (stats.pendingCount > 0) {
                openBulk();
              }
            }}
            disabled={stats.pendingCount === 0}
          >
            <StatCard
              label={t('taste.statPending')}
              value={String(stats.pendingCount)}
              colors={colors}
              highlight={stats.pendingCount > 0}
            />
          </Pressable>
          <StatCard
            label={t('taste.statAverage')}
            value={formatAverage(stats.averageRating)}
            colors={colors}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeader}>
            <AppText variant="section">{t('taste.tuningTitle')}</AppText>
            <AppText variant="label" color={colors.accentDeep}>
              {tuningPercent}%
            </AppText>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.bg }]}>
            <View
              style={[styles.barFill, { width: `${tuningPercent}%`, backgroundColor: colors.cta }]}
            />
          </View>
          <AppText muted variant="caption">
            {stats.tuningReady
              ? t('taste.tuningReadyBody')
              : t('taste.tuningBody', {
                  rated: stats.ratedCount,
                  target: 40,
                  pending: stats.pendingCount,
                })}
          </AppText>
          {stats.pendingCount > 0 ? (
            <Button
              label={
                stats.pendingCount > PENDING_TARGET
                  ? t('taste.rateFiveCta')
                  : t('taste.ratePendingCta', { count: stats.pendingCount })
              }
              onPress={() => openBulk(stats.pendingCount > PENDING_TARGET ? PENDING_TARGET : undefined)}
            />
          ) : (
            <AppText muted variant="caption">
              {t('taste.noPending')}
            </AppText>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText variant="section">{t('taste.reelTitle')}</AppText>
          <FavoritesReel
            items={favorites}
            region={profile?.region}
            emptyLabel={t('taste.reelEmpty')}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText variant="section">{t('taste.histogramTitle')}</AppText>
          {stats.ratedCount === 0 ? (
            <AppText muted variant="caption">
              {t('taste.histogramEmpty')}
            </AppText>
          ) : (
            <View style={styles.histRow}>
              {stats.ratingHistogram.map((count, index) => {
                const height = Math.max(4, Math.round((count / maxHist) * 56));
                return (
                  <View key={index} style={styles.histCol}>
                    <View
                      style={[
                        styles.histBar,
                        {
                          height,
                          backgroundColor: count > 0 ? colors.cta : colors.line,
                        },
                      ]}
                    />
                    <AppText variant="label" muted>
                      {index + 1}
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppText variant="section">{t('taste.monthTitle')}</AppText>
          <AppText>{monthMarkLine()}</AppText>
          {monthWrap.unlocked ? (
            <Button label={t('taste.wrapOpenCta')} onPress={() => setWrapOpen(true)} />
          ) : (
            <AppText muted variant="caption">
              {t('taste.wrapLocked', { remaining: monthWrap.remainingToUnlock })}
            </AppText>
          )}
        </View>

        {onOpenDiary ? (
          <Button label={t('taste.openDiary')} variant="secondary" onPress={onOpenDiary} />
        ) : null}
      </ScrollView>

      <BulkRatingSession
        visible={bulkOpen}
        queue={bulkQueue}
        feedbackGenreKey={stats.signatureGenreKeys[0] ?? null}
        onClose={() => {
          setBulkOpen(false);
          setBulkLimit(null);
        }}
      />

      <MonthWrapModal visible={wrapOpen} wrap={monthWrap} onClose={() => setWrapOpen(false)} />
    </>
  );
}

function StatCard({
  label,
  value,
  colors,
  highlight = false,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: highlight ? colors.warningSoft : colors.surface,
          borderColor: colors.line,
        },
      ]}
    >
      <AppText variant="display" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hero: { gap: 6 },
  heroEyebrow: { textTransform: 'uppercase', letterSpacing: 0.6 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statFlex: { flex: 1 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 4,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, lineHeight: 32 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 72,
  },
  histCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  histBar: {
    width: '100%',
    borderRadius: 4,
  },
});
