import type { Profile } from '@/src/features/auth/types';
import { getDiscoverFeed, getSimilar, searchMedia } from '@/src/features/tmdb/client';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';

import type { MoodFilters } from './types';

function itemMediaType(item: MediaItem, fallback: MediaType): MediaType {
  return item.media_type === 'movie' || item.media_type === 'tv' ? item.media_type : fallback;
}

function titleOf(item: MediaItem): string {
  return (item.title ?? item.name ?? '').toLowerCase();
}

function applyClientMoodFilters(
  items: MediaItem[],
  mood: MoodFilters,
  query?: string,
): MediaItem[] {
  let filtered = items;

  if (mood.genreId !== null) {
    filtered = filtered.filter((item) => (item.genre_ids ?? []).includes(mood.genreId!));
  }

  if (query?.trim()) {
    const needle = query.trim().toLowerCase();
    filtered = filtered.filter((item) => titleOf(item).includes(needle));
  }

  return filtered;
}

export type FetchWithMoodOptions = {
  query?: string;
  language?: string;
  page?: number;
};

export async function fetchWithMood(
  profile: Profile | null,
  mood: MoodFilters,
  options: FetchWithMoodOptions = {},
): Promise<MediaItem[]> {
  const language = options.language ?? 'es-ES';
  const region = profile?.region ?? undefined;
  const mediaType = mood.mediaType;
  const page = options.page ?? 1;
  const query = options.query?.trim();

  if (query) {
    const results = await searchMedia(mediaType, query, language, page);
    return applyClientMoodFilters(
      results.map((item) => ({ ...item, media_type: itemMediaType(item, mediaType) })),
      mood,
    );
  }

  if (mood.seedTmdbId && mood.seedMediaType) {
    const similar = await getSimilar(mood.seedMediaType, mood.seedTmdbId, page, language);
    return applyClientMoodFilters(
      similar.map((item) => ({ ...item, media_type: itemMediaType(item, mood.seedMediaType!) })),
      mood,
    );
  }

  if (mood.genreId !== null || mood.maxRuntimeMinutes !== null) {
    return getDiscoverFeed({
      media_type: mediaType,
      region,
      language,
      page,
      with_genres: mood.genreId !== null ? String(mood.genreId) : undefined,
      with_runtime_lte:
        mood.maxRuntimeMinutes !== null ? mood.maxRuntimeMinutes : undefined,
    });
  }

  return [];
}
