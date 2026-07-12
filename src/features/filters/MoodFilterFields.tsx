import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { MOVIE_GENRES, RUNTIME_PRESETS, TV_GENRES } from '@/src/features/filters/constants';
import type { MoodFilters } from '@/src/features/filters/types';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { searchMedia } from '@/src/features/tmdb/client';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';
import { typography } from '@/theme/typography';

type MoodFilterFieldsProps = {
  value: MoodFilters;
  onChange: (next: MoodFilters) => void;
  showMediaType?: boolean;
};

function titleLabel(item: MediaItem): string {
  return item.title ?? item.name ?? `#${item.id}`;
}

export function MoodFilterFields({ value, onChange, showMediaType = true }: MoodFilterFieldsProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const genres = value.mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES;

  const [seedQuery, setSeedQuery] = useState('');
  const [seedResults, setSeedResults] = useState<MediaItem[]>([]);
  const [seedLoading, setSeedLoading] = useState(false);

  useEffect(() => {
    if (seedQuery.trim().length < 2) {
      setSeedResults([]);
      return;
    }

    const handle = setTimeout(() => {
      setSeedLoading(true);
      void searchMedia(value.mediaType, seedQuery.trim())
        .then(setSeedResults)
        .finally(() => setSeedLoading(false));
    }, 350);

    return () => clearTimeout(handle);
  }, [seedQuery, value.mediaType]);

  function setMediaType(mediaType: MediaType) {
    onChange({
      ...value,
      mediaType,
      genreId: null,
      seedTmdbId: null,
      seedMediaType: null,
      seedTitle: null,
    });
    setSeedQuery('');
    setSeedResults([]);
  }

  function selectSeed(item: MediaItem) {
    const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
    onChange({
      ...value,
      seedTmdbId: item.id,
      seedMediaType: mediaType,
      seedTitle: titleLabel(item),
    });
    setSeedQuery('');
    setSeedResults([]);
  }

  function clearSeed() {
    onChange({
      ...value,
      seedTmdbId: null,
      seedMediaType: null,
      seedTitle: null,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {showMediaType ? (
        <>
          <Text style={[styles.label, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
            {t('filters.mediaType')}
          </Text>
          <View style={styles.row}>
            <SelectChip
              label={t('filters.movies')}
              selected={value.mediaType === 'movie'}
              onPress={() => setMediaType('movie')}
            />
            <SelectChip
              label={t('filters.series')}
              selected={value.mediaType === 'tv'}
              onPress={() => setMediaType('tv')}
            />
          </View>
        </>
      ) : null}

      <Text style={[styles.label, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
        {t('filters.genre')}
      </Text>
      <View style={styles.row}>
        <SelectChip
          label={t('filters.anyGenre')}
          selected={value.genreId === null}
          onPress={() => onChange({ ...value, genreId: null })}
        />
        {genres.map((genre) => (
          <SelectChip
            key={genre.id}
            label={t(genre.nameKey)}
            selected={value.genreId === genre.id}
            onPress={() => onChange({ ...value, genreId: genre.id })}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
        {t('filters.maxRuntime')}
      </Text>
      <View style={styles.row}>
        <SelectChip
          label={t('filters.anyRuntime')}
          selected={value.maxRuntimeMinutes === null}
          onPress={() => onChange({ ...value, maxRuntimeMinutes: null })}
        />
        {RUNTIME_PRESETS.map((minutes) => (
          <SelectChip
            key={minutes}
            label={t('filters.minutes', { count: minutes })}
            selected={value.maxRuntimeMinutes === minutes}
            onPress={() => onChange({ ...value, maxRuntimeMinutes: minutes })}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
        {t('filters.similarTo')}
      </Text>
      {value.seedTitle ? (
        <View style={[styles.seedSelected, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
          <Text style={{ color: colors.ink, fontFamily: typography.bodyMedium, flex: 1 }}>
            {value.seedTitle}
          </Text>
          <Pressable onPress={clearSeed}>
            <Text style={{ color: colors.nope, fontFamily: typography.bodyBold }}>×</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            value={seedQuery}
            onChangeText={setSeedQuery}
            placeholder={t('filters.seedPlaceholder')}
            placeholderTextColor={colors.inkMuted}
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
          {seedLoading ? (
            <Text style={{ color: colors.inkMuted, fontFamily: typography.body, fontSize: 13 }}>
              {t('filters.searching')}
            </Text>
          ) : null}
          {seedResults.map((item) => (
            <Pressable
              key={`${item.media_type ?? value.mediaType}:${item.id}`}
              onPress={() => selectSeed(item)}
              style={[styles.seedResult, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <Text style={{ color: colors.ink, fontFamily: typography.bodyMedium }}>
                {titleLabel(item)}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, paddingBottom: 8 },
  label: { fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  seedSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  seedResult: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
