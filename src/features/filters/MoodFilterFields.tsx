import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { MOVIE_GENRES, RUNTIME_PRESETS, TV_GENRES } from '@/src/features/filters/constants';
import type { MoodFilters } from '@/src/features/filters/types';
import { SelectChip } from '@/src/features/onboarding/SelectChip';
import { searchMedia } from '@/src/features/tmdb/client';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';
import { AppText, TextField } from '@/src/ui';
import { radii } from '@/theme/radii';
import { layout, space } from '@/theme/spacing';
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
          <AppText muted variant="caption" style={styles.label}>
            {t('filters.mediaType')}
          </AppText>
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

      <AppText muted variant="caption" style={styles.label}>
        {t('filters.genre')}
      </AppText>
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

      <AppText muted variant="caption" style={styles.label}>
        {t('filters.maxRuntime')}
      </AppText>
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

      <AppText muted variant="caption" style={styles.label}>
        {t('filters.similarTo')}
      </AppText>
      {value.seedTitle ? (
        <View style={[styles.seedSelected, { backgroundColor: colors.surface, borderColor: colors.cta }]}>
          <AppText style={{ fontFamily: typography.bodyMedium, flex: 1 }}>{value.seedTitle}</AppText>
          <Pressable onPress={clearSeed} hitSlop={8}>
            <AppText color={colors.nope} style={{ fontFamily: typography.bodyBold }}>
              ×
            </AppText>
          </Pressable>
        </View>
      ) : (
        <>
          <TextField
            value={seedQuery}
            onChangeText={setSeedQuery}
            placeholder={t('filters.seedPlaceholder')}
          />
          {seedLoading ? (
            <AppText muted variant="caption">
              {t('filters.searching')}
            </AppText>
          ) : null}
          {seedResults.map((item) => (
            <Pressable
              key={`${item.media_type ?? value.mediaType}:${item.id}`}
              onPress={() => selectSeed(item)}
              style={[styles.seedResult, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <AppText style={{ fontFamily: typography.bodyMedium }}>{titleLabel(item)}</AppText>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xs + 2, paddingBottom: space.xs },
  label: { marginTop: space.xxs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.inlineGap },
  seedSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inlineGap,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs + 2,
  },
  seedResult: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs + 2,
  },
});
