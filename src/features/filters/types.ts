import type { MediaType } from '@/src/features/tmdb/types';

export type MoodFilters = {
  mediaType: MediaType;
  genreId: number | null;
  maxRuntimeMinutes: number | null;
  seedTmdbId: number | null;
  seedMediaType: MediaType | null;
  seedTitle: string | null;
};

export const EMPTY_MOOD_FILTERS: MoodFilters = {
  mediaType: 'movie',
  genreId: null,
  maxRuntimeMinutes: null,
  seedTmdbId: null,
  seedMediaType: null,
  seedTitle: null,
};

export function isMoodActive(mood: MoodFilters): boolean {
  return (
    mood.genreId !== null ||
    mood.maxRuntimeMinutes !== null ||
    mood.seedTmdbId !== null
  );
}
