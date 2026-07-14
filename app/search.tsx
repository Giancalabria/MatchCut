import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { fetchWithMood } from '@/src/features/filters/fetchWithMood';
import { MoodFilterFields } from '@/src/features/filters/MoodFilterFields';
import { EMPTY_MOOD_FILTERS, isMoodActive, type MoodFilters } from '@/src/features/filters/types';
import { posterUrl } from '@/src/features/tmdb/images';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';
import { AppText, Button, ScreenHeader } from '@/src/ui';
import { typography } from '@/theme/typography';

function titleLabel(item: MediaItem): string {
  return item.title ?? item.name ?? `#${item.id}`;
}

function resolveMediaType(item: MediaItem, fallback: MediaType): MediaType {
  return item.media_type === 'tv' ? 'tv' : fallback;
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { profile } = useAuth();

  const [query, setQuery] = useState('');
  const [mood, setMood] = useState<MoodFilters>(EMPTY_MOOD_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch() {
    const hasQuery = query.trim().length > 0;
    const hasFilters =
      mood.genreId !== null || mood.maxRuntimeMinutes !== null || mood.seedTmdbId !== null;

    if (!hasQuery && !hasFilters) {
      setError(t('search.needQueryOrFilter'));
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const items = await fetchWithMood(profile, mood, {
        query: hasQuery ? query.trim() : undefined,
      });
      setResults(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function openDetail(item: MediaItem) {
    const mediaType = resolveMediaType(item, mood.mediaType);
    router.push({
      pathname: '/title/[mediaType]/[id]',
      params: { mediaType, id: String(item.id) },
    });
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('search.title')} onBack={() => router.back()} />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('search.placeholder')}
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        onSubmitEditing={() => {
          void runSearch();
        }}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            color: colors.ink,
            fontFamily: typography.body,
          },
        ]}
      />

      <Pressable
        onPress={() => setFiltersOpen((open) => !open)}
        style={[
          styles.filtersToggle,
          {
            borderColor: isMoodActive(mood) ? colors.cta : colors.line,
            backgroundColor: isMoodActive(mood) ? colors.accentSoft : colors.surface,
          },
        ]}
      >
        <AppText style={{ fontFamily: typography.bodyBold, fontSize: 14 }}>
          {filtersOpen ? t('search.hideFilters') : t('search.optionalFilters')}
        </AppText>
      </Pressable>

      {filtersOpen ? (
        <View style={styles.filtersBox}>
          <MoodFilterFields value={mood} onChange={setMood} />
        </View>
      ) : null}

      <Button
        label={t('search.submit')}
        loading={loading}
        onPress={() => void runSearch()}
      />

      {error ? (
        <AppText color={colors.nope} variant="caption">
          {error}
        </AppText>
      ) : null}

      {searched && !loading && results.length === 0 ? (
        <AppText muted style={styles.empty}>
          {t('search.noResults')}
        </AppText>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => `${resolveMediaType(item, mood.mediaType)}:${item.id}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const poster = item.poster_path ? posterUrl(item.poster_path, 'w185') : null;
          return (
            <Pressable
              onPress={() => openDetail(item)}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              {poster ? (
                <Image source={{ uri: poster }} style={styles.poster} />
              ) : (
                <View style={[styles.poster, { backgroundColor: colors.line }]} />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <AppText style={{ fontFamily: typography.bodyBold, fontSize: 16 }}>
                  {titleLabel(item)}
                </AppText>
                <AppText variant="caption" muted numberOfLines={2}>
                  {item.overview?.slice(0, 100) ?? ''}
                </AppText>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  filtersToggle: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  filtersBox: { maxHeight: 280 },
  empty: { textAlign: 'center', marginTop: 8 },
  list: { gap: 10, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  poster: { width: 52, height: 78, borderRadius: 8 },
});
