import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { JustWatchAttribution } from '@/src/features/deck/JustWatchAttribution';
import { ProductTour } from '@/src/features/deck/ProductTour';
import { SwipeDeck } from '@/src/features/deck/SwipeDeck';
import { useDeck } from '@/src/features/deck/useDeck';
import { useExploreFilters } from '@/src/features/deck/useExploreFilters';
import { MoodFilterFields } from '@/src/features/filters/MoodFilterFields';
import { EMPTY_MOOD_FILTERS, isMoodActive } from '@/src/features/filters/types';
import type { MediaItem } from '@/src/features/tmdb/types';
import { AppText, Button, IconButton, TabScreenHeader } from '@/src/ui';
import { radii } from '@/theme/radii';
import { layout, space } from '@/theme/spacing';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { mood, setMood, clearMood } = useExploreFilters();
  const { cards, error, loading, refresh, swipeLike, swipeNope, swipeSeen, unratedCount } = useDeck();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftMood, setDraftMood] = useState(mood);

  function openDetail(item: MediaItem) {
    router.push({
      pathname: '/title/[mediaType]/[id]',
      params: {
        mediaType: item.media_type ?? 'movie',
        id: String(item.id),
      },
    });
  }

  function openFilters() {
    setDraftMood(mood);
    setFiltersOpen(true);
  }

  function applyFilters() {
    setMood(draftMood);
    setFiltersOpen(false);
    void refresh();
  }

  function openBulkRating() {
    router.push({
      pathname: '/(tabs)/vault',
      params: { openBulk: '1', segment: 'diary' },
    } as Href);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.bg, colors.bgGlow]} style={StyleSheet.absoluteFill} />
      <TabScreenHeader
        right={
          <View style={styles.headerActions}>
            <IconButton
              name="search"
              onPress={() => router.push('/search')}
              accessibilityLabel={t('search.title')}
            />
            <IconButton
              name="filters"
              onPress={openFilters}
              active={isMoodActive(mood)}
              accessibilityLabel={t('filters.title')}
            />
          </View>
        }
      />
      <View style={styles.badges}>
        {unratedCount > 0 ? (
          <Pressable
            onPress={openBulkRating}
            style={[styles.badge, { backgroundColor: colors.warningSoft }]}
            accessibilityRole="button"
            accessibilityLabel={t('explore.unratedBadge', { count: unratedCount })}
          >
            <AppText variant="label" color={colors.ink}>
              {t('explore.unratedBadge', { count: unratedCount })}
            </AppText>
          </Pressable>
        ) : null}
        {isMoodActive(mood) ? (
          <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
            <AppText variant="label" color={colors.accentDeep}>
              {t('explore.filtersActive')}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.deckWrap}>
        {cards.length > 0 ? (
          <SwipeDeck
            cards={cards}
            onOpenDetail={openDetail}
            onSwipeLike={(item) => {
              void swipeLike(item);
            }}
            onSwipeNope={(item) => {
              void swipeNope(item);
            }}
            onSwipeSeen={(item) => {
              void swipeSeen(item);
            }}
          />
        ) : loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.cta} size="large" />
          </View>
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <AppText variant="section" style={styles.centerText}>
              {t('explore.emptyTitle')}
            </AppText>
            {error ? (
              <AppText muted style={styles.centerText} color={colors.nope}>
                {error}
              </AppText>
            ) : (
              <AppText muted style={styles.centerText}>
                {t('explore.emptyBody')}
              </AppText>
            )}
            <Button label={t('explore.refresh')} onPress={() => void refresh()} />
          </View>
        )}
      </View>

      <JustWatchAttribution />
      <ProductTour />

      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
          <AppText variant="display">{t('filters.title')}</AppText>
          <View style={styles.modalFields}>
            <MoodFilterFields value={draftMood} onChange={setDraftMood} />
          </View>
          <View style={styles.modalActions}>
            <Button
              label={t('filters.clear')}
              variant="ghost"
              onPress={() => {
                clearMood();
                setDraftMood(EMPTY_MOOD_FILTERS);
                setFiltersOpen(false);
                void refresh();
              }}
              style={styles.modalButton}
            />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setFiltersOpen(false)}
              style={styles.modalButton}
            />
            <Button
              label={t('filters.apply')}
              onPress={applyFilters}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingXCompact,
    paddingBottom: space.sm,
    gap: space.xs + 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    minHeight: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  badge: {
    borderRadius: radii.sm + 2,
    paddingHorizontal: space.xs + 2,
    paddingVertical: 7,
  },
  deckWrap: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.xl + 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPaddingX,
    gap: space.sm,
  },
  centerText: { textAlign: 'center' },
  modalRoot: {
    flex: 1,
    padding: layout.screenPaddingX,
    paddingTop: space.xxxl + space.xs,
    gap: space.sm,
  },
  modalFields: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: space.xs, paddingTop: space.xs },
  modalButton: { flex: 1 },
});
