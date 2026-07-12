import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { fetchWithMood } from '@/src/features/filters/fetchWithMood';
import { MoodFilterFields } from '@/src/features/filters/MoodFilterFields';
import { EMPTY_MOOD_FILTERS, type MoodFilters } from '@/src/features/filters/types';
import { posterUrl } from '@/src/features/tmdb/images';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={{ color: colors.accent, fontFamily: typography.bodyBold }}>
            {t('common.back')}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
          {t('search.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: typography.body }]}>
          {t('search.subtitle')}
        </Text>
      </View>

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

      <View style={styles.filtersBox}>
        <Text style={[styles.filtersTitle, { color: colors.ink, fontFamily: typography.bodyBold }]}>
          {t('search.optionalFilters')}
        </Text>
        <MoodFilterFields value={mood} onChange={setMood} />
      </View>

      <Pressable
        onPress={() => {
          void runSearch();
        }}
        disabled={loading}
        style={[styles.searchButton, { backgroundColor: colors.accent, opacity: loading ? 0.6 : 1 }]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.searchButtonText, { fontFamily: typography.bodyBold }]}>
            {t('search.submit')}
          </Text>
        )}
      </Pressable>

      {error ? (
        <Text style={{ color: colors.nope, fontFamily: typography.body, marginTop: 8 }}>{error}</Text>
      ) : null}

      {searched && !loading && results.length === 0 ? (
        <Text style={[styles.empty, { color: colors.inkMuted, fontFamily: typography.body }]}>
          {t('search.noResults')}
        </Text>
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
              <Text style={{ color: colors.ink, fontFamily: typography.bodyBold, fontSize: 16 }}>
                {titleLabel(item)}
              </Text>
              <Text style={{ color: colors.inkMuted, fontFamily: typography.body, fontSize: 13 }}>
                {item.overview?.slice(0, 100) ?? ''}
              </Text>
            </View>
          </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  header: { gap: 6, paddingBottom: 12 },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 15, lineHeight: 21 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  filtersBox: { maxHeight: 320, marginBottom: 12 },
  filtersTitle: { fontSize: 15, marginBottom: 8 },
  searchButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchButtonText: { color: '#FFFFFF', fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 16 },
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
