import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { JustWatchAttribution } from '@/src/features/deck/JustWatchAttribution';
import { SwipeDeck } from '@/src/features/deck/SwipeDeck';
import { useDeck } from '@/src/features/deck/useDeck';
import { useExploreFilters } from '@/src/features/deck/useExploreFilters';
import { MoodFilterFields } from '@/src/features/filters/MoodFilterFields';
import { EMPTY_MOOD_FILTERS, isMoodActive } from '@/src/features/filters/types';
import type { MediaItem } from '@/src/features/tmdb/types';
import { typography } from '@/theme/typography';

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

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.bg, colors.bgGlow]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
            {t('explore.title')}
          </Text>
          <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body }]}>
            {t('explore.hint')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {unratedCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.seen }]}>
              <Text style={[styles.badgeText, { fontFamily: typography.bodyBold }]}>
                {t('explore.unratedBadge', { count: unratedCount })}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => router.push('/search')}
            style={[styles.iconButton, { borderColor: colors.line, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.ink, fontFamily: typography.bodyBold }}>⌕</Text>
          </Pressable>
          <Pressable
            onPress={openFilters}
            style={[
              styles.iconButton,
              {
                borderColor: isMoodActive(mood) ? colors.accent : colors.line,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text
              style={{
                color: isMoodActive(mood) ? colors.accent : colors.ink,
                fontFamily: typography.bodyBold,
              }}
            >
              ⚙
            </Text>
          </Pressable>
        </View>
      </View>

      {isMoodActive(mood) ? (
        <Text style={[styles.filterHint, { color: colors.accent, fontFamily: typography.bodyMedium }]}>
          {t('explore.filtersActive')}
        </Text>
      ) : null}

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
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {loading ? <ActivityIndicator color={colors.accent} /> : null}
            <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: typography.bodyBold }]}>
              {loading ? t('explore.loading') : t('explore.emptyTitle')}
            </Text>
            {error ? (
              <Text style={[styles.body, { color: colors.nope, fontFamily: typography.body }]}>
                {error}
              </Text>
            ) : (
              <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body }]}>
                {t('explore.emptyBody')}
              </Text>
            )}
            <Pressable
              onPress={() => {
                void refresh();
              }}
              style={[styles.refresh, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.refreshText, { fontFamily: typography.bodyBold }]}>
                {t('explore.refresh')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actionsHint}>
        <Text style={[styles.actionText, { color: colors.nope, fontFamily: typography.bodyBold }]}>
          {t('explore.swipeNope')}
        </Text>
        <Text style={[styles.actionText, { color: colors.seen, fontFamily: typography.bodyBold }]}>
          {t('explore.swipeSeen')}
        </Text>
        <Text style={[styles.actionText, { color: colors.accent, fontFamily: typography.bodyBold }]}>
          {t('explore.swipeLike')}
        </Text>
      </View>
      <JustWatchAttribution />

      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
          <Text style={[styles.modalTitle, { color: colors.ink, fontFamily: typography.display }]}>
            {t('filters.title')}
          </Text>
          <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body }]}>
            {t('filters.subtitle')}
          </Text>
          <View style={styles.modalFields}>
            <MoodFilterFields value={draftMood} onChange={setDraftMood} />
          </View>
          <View style={styles.modalActions}>
            <Pressable
              onPress={() => {
                clearMood();
                setDraftMood(EMPTY_MOOD_FILTERS);
                setFiltersOpen(false);
                void refresh();
              }}
              style={[styles.modalButton, { borderColor: colors.line }]}
            >
              <Text style={{ color: colors.inkMuted, fontFamily: typography.bodyBold }}>
                {t('filters.clear')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFiltersOpen(false)}
              style={[styles.modalButton, { borderColor: colors.line }]}
            >
              <Text style={{ color: colors.inkMuted, fontFamily: typography.bodyBold }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={applyFilters}
              style={[styles.modalButton, { backgroundColor: colors.accent, borderColor: colors.accent }]}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: typography.bodyBold }}>
                {t('filters.apply')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 20,
    paddingBottom: 12,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  title: { fontSize: 30 },
  body: { fontSize: 16, lineHeight: 22 },
  filterHint: { fontSize: 13 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: { color: '#FFFFFF', fontSize: 12 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckWrap: {
    flex: 1,
  },
  empty: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  refresh: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 6,
  },
  refreshText: { color: '#FFFFFF', fontSize: 14 },
  actionsHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionText: { fontSize: 12 },
  modalRoot: { flex: 1, padding: 24, paddingTop: 48, gap: 10 },
  modalTitle: { fontSize: 28 },
  modalFields: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  modalButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
});
