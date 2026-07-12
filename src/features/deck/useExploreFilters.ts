import { useCallback, useEffect, useState } from 'react';

import { getStoredString, setStoredString } from '@/lib/storage';
import { EMPTY_MOOD_FILTERS, type MoodFilters } from '@/src/features/filters/types';

const STORAGE_KEY = 'exploreMoodFilters';

function parseStored(raw: string | null): MoodFilters {
  if (!raw) {
    return EMPTY_MOOD_FILTERS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MoodFilters>;
    return {
      ...EMPTY_MOOD_FILTERS,
      ...parsed,
      mediaType: parsed.mediaType === 'tv' ? 'tv' : 'movie',
      genreId: typeof parsed.genreId === 'number' ? parsed.genreId : null,
      maxRuntimeMinutes:
        typeof parsed.maxRuntimeMinutes === 'number' ? parsed.maxRuntimeMinutes : null,
      seedTmdbId: typeof parsed.seedTmdbId === 'number' ? parsed.seedTmdbId : null,
      seedMediaType:
        parsed.seedMediaType === 'movie' || parsed.seedMediaType === 'tv'
          ? parsed.seedMediaType
          : null,
      seedTitle: typeof parsed.seedTitle === 'string' ? parsed.seedTitle : null,
    };
  } catch {
    return EMPTY_MOOD_FILTERS;
  }
}

export function useExploreFilters() {
  const [ready, setReady] = useState(false);
  const [mood, setMoodState] = useState<MoodFilters>(EMPTY_MOOD_FILTERS);

  useEffect(() => {
    let cancelled = false;
    void getStoredString(STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      setMoodState(parseStored(raw));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMood = useCallback((next: MoodFilters) => {
    setMoodState(next);
    void setStoredString(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const clearMood = useCallback(() => {
    setMood(EMPTY_MOOD_FILTERS);
  }, [setMood]);

  return { ready, mood, setMood, clearMood };
}
