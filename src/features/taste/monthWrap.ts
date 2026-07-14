import type { TitleInteraction } from '@/src/features/interactions/api';
import { mediaInteractionKey } from '@/src/features/taste/tasteStats';

/** Minimum ratings in the period to unlock the recap. */
export const WRAP_MIN_RATINGS = 15;

export type FavoritesReelItem = {
  tmdb_id: number;
  media_type: TitleInteraction['media_type'];
  rating: number;
  updated_at: string;
};

export type MonthWrap = {
  year: number;
  month: number; // 1–12
  ratedCount: number;
  averageRating: number | null;
  highScores: number;
  topGenreKeys: string[];
  unlocked: boolean;
  remainingToUnlock: number;
  favorites: FavoritesReelItem[];
};

function periodBounds(year: number, monthIndex0: number): { start: string; end: string } {
  const start = new Date(year, monthIndex0, 1);
  const end = new Date(year, monthIndex0 + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function pickFavoritesReel(
  interactions: TitleInteraction[],
  limit = 20,
): FavoritesReelItem[] {
  return interactions
    .filter((item) => item.action === 'seen' && item.rating != null && item.rating >= 9)
    .sort((a, b) => {
      const ratingDelta = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDelta !== 0) {
        return ratingDelta;
      }
      return b.updated_at.localeCompare(a.updated_at);
    })
    .slice(0, limit)
    .map((item) => ({
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      rating: item.rating!,
      updated_at: item.updated_at,
    }));
}

/**
 * Monthly cinema-style recap from local interactions + optional genre map.
 * `genreIdsByKey` keys are `${media_type}:${tmdb_id}`; values map to i18n genre nameKeys separately.
 */
export function buildMonthWrap(
  interactions: TitleInteraction[],
  genreKeyByTitleKey: Record<string, string[]> = {},
  now = new Date(),
): MonthWrap {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { start, end } = periodBounds(year, now.getMonth());

  const rated = interactions.filter(
    (item) =>
      item.action === 'seen' &&
      item.rating != null &&
      item.updated_at >= start &&
      item.updated_at < end,
  );

  let sum = 0;
  let highScores = 0;
  const genreWeights = new Map<string, number>();

  for (const item of rated) {
    sum += item.rating!;
    if (item.rating! >= 9) {
      highScores += 1;
    }
    const titleKey = mediaInteractionKey(item.media_type, item.tmdb_id);
    const keys = genreKeyByTitleKey[titleKey] ?? [];
    for (const genreKey of keys) {
      genreWeights.set(genreKey, (genreWeights.get(genreKey) ?? 0) + Math.max(1, item.rating! - 4));
    }
  }

  const topGenreKeys = [...genreWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)
    .slice(0, 2);

  const ratedCount = rated.length;
  const unlocked = ratedCount >= WRAP_MIN_RATINGS;

  return {
    year,
    month,
    ratedCount,
    averageRating: ratedCount > 0 ? sum / ratedCount : null,
    highScores,
    topGenreKeys,
    unlocked,
    remainingToUnlock: Math.max(0, WRAP_MIN_RATINGS - ratedCount),
    favorites: pickFavoritesReel(rated, 8),
  };
}
